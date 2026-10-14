import { NextResponse } from "next/server";
import { finalizeExternalDeposit, type ExternalProvider } from "@/lib/payments/external";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function emailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim().toLowerCase();
}

function plain(value: string) {
  return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function moneyValues(text: string) {
  const values = new Set<number>();
  for (const match of text.matchAll(/\$\s*([0-9]{1,6}(?:,[0-9]{3})*(?:\.\d{2})?)/g)) {
    const amount = Number(match[1].replaceAll(",", ""));
    if (Number.isFinite(amount)) values.add(Math.round(amount * 100));
  }
  return [...values];
}

function trustedProviderSender(provider: string, sender: string) {
  const domain = sender.split("@")[1] || "";
  if (provider === "venmo") return domain === "venmo.com" || domain.endsWith(".venmo.com");
  if (provider === "cash_app") return domain === "cash.app" || domain.endsWith(".cash.app") || domain === "square.com" || domain.endsWith(".square.com");
  return false;
}


function providerClue(provider: string, content: string) {
  const value = content.toLowerCase();
  if (provider === "cash_app") return value.includes("cash app") || value.includes("cash.app") || value.includes("cashtag");
  if (provider === "venmo") return value.includes("venmo");
  return false;
}

async function resendGet(path: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Payment email receiving is not configured.");
  const response = await fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || "Could not read payment confirmation email.");
  return payload;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const domain = String(process.env.RESEND_INBOUND_DOMAIN || "").trim().replace(/^@/, "").toLowerCase();
  if (!domain) return NextResponse.json({ error: "Payment email receiving is not configured." }, { status: 503 });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Database unavailable." }, { status: 500 });

  const list = await resendGet("/emails/receiving?limit=50");
  let matched = 0;
  let review = 0;
  let ignored = 0;

  for (const item of list.data || []) {
    const emailId = String(item.id || "");
    if (!emailId) continue;
    const { data: seen } = await admin.from("external_payment_receipts").select("id").eq("inbound_email_id", emailId).maybeSingle();
    if (seen) continue;

    const recipients = [...(item.to || []), ...(item.received_for || [])].map((value: string) => emailAddress(value));
    const target = recipients.find((value: string) => value.endsWith(`@${domain}`) && /^pay-[a-f0-9]{24}@/i.test(value));
    if (!target) { ignored += 1; continue; }
    const token = target.split("@")[0].replace(/^pay-/i, "");
    const { data: method } = await admin.from("external_payment_methods").select("*").eq("forwarding_token", token).eq("enabled", true).maybeSingle();
    if (!method || !method.email_confirmation_enabled) { ignored += 1; continue; }

    const email = await resendGet(`/emails/receiving/${encodeURIComponent(emailId)}`);
    const sender = emailAddress(String(email.from || item.from || ""));
    const content = `${email.subject || ""} ${email.text || ""} ${plain(String(email.html || ""))}`.slice(0, 120000);
    const expectedForwarder = String(method.notification_email || "").trim().toLowerCase();
    const fromExpectedInbox = Boolean(expectedForwarder && sender === expectedForwarder);
    const hasProviderClue = providerClue(method.provider, content);
    const amounts = moneyValues(content);
    const { data: intents } = await admin
      .from("external_payment_intents")
      .select("*,bookings(customer_name,payment_status,status)")
      .eq("barber_id", method.barber_id)
      .eq("payment_method_id", method.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    let best: any = null;
    let bestScore = 0;
    for (const intent of intents || []) {
      const booking = Array.isArray(intent.bookings) ? intent.bookings[0] : intent.bookings;
      if (!booking || booking.payment_status !== "deposit_due" || booking.status !== "pending_deposit") continue;
      let score = 0;
      const code = String(intent.booking_code || "");
      if (code && content.toUpperCase().includes(code.toUpperCase())) score += 50;
      if (amounts.includes(Number(intent.amount_cents))) score += 30;
      const nameParts = String(booking.customer_name || "").toLowerCase().split(/\s+/).filter((part: string) => part.length >= 3);
      if (nameParts.length && nameParts.some((part: string) => content.toLowerCase().includes(part))) score += 15;
      const fromTrustedProvider = trustedProviderSender(method.provider, sender);
      if (fromTrustedProvider) score += 10;
      if (fromExpectedInbox) score += 10;
      if (hasProviderClue) score += 10;
      if (score > bestScore) { bestScore = score; best = intent; }
    }

    const exactCode = Boolean(best?.booking_code && content.toUpperCase().includes(String(best.booking_code).toUpperCase()));
    const exactDeposit = Boolean(best && amounts.includes(Number(best.amount_cents)));
    const fromTrustedProvider = trustedProviderSender(method.provider, sender);
    // Automatic forwarding can preserve the original Cash App/Venmo sender instead
    // of rewriting From: to the barber's mailbox. The private forwarding address
    // identifies the barber/method, while exact code + exact amount + provider
    // identity make the match unique. A mismatch remains manual review.
    const autoMatch = Boolean(
      best &&
      exactCode &&
      exactDeposit &&
      hasProviderClue &&
      (fromExpectedInbox || fromTrustedProvider) &&
      bestScore >= 100
    );
    const exactAmount = best ? amounts.find((value) => value === Number(best.amount_cents)) : undefined;
    const { error: receiptError } = await admin.from("external_payment_receipts").insert({
      inbound_email_id: emailId,
      barber_id: method.barber_id,
      payment_method_id: method.id,
      booking_id: best?.booking_id || null,
      provider: method.provider,
      sender_email: sender,
      subject: String(email.subject || "").slice(0, 500),
      amount_cents: exactAmount ?? amounts[0] ?? null,
      booking_code: bestScore >= 50 ? best?.booking_code || null : null,
      status: autoMatch ? "matched" : "needs_review",
      confidence: Math.min(100, bestScore),
      received_at: email.created_at || item.created_at || new Date().toISOString(),
    });
    if (receiptError?.code === "23505") continue;
    if (receiptError) throw receiptError;

    if (autoMatch) {
      await finalizeExternalDeposit({
        bookingId: best.booking_id,
        provider: method.provider as ExternalProvider,
        externalPaymentId: `email-${emailId}`,
        grossCents: Number(best.amount_cents),
        occurredAt: email.created_at || item.created_at || new Date().toISOString(),
      });
      matched += 1;
    } else {
      if (best) await admin.from("external_payment_intents").update({ status: "needs_review" }).eq("id", best.id);
      review += 1;
    }
  }

  return NextResponse.json({ processed: matched + review, matched, review, ignored });
}
