import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { externalProviderLabels, type ExternalProvider } from "@/lib/payments/external";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const allowed = new Set<ExternalProvider>(["cash_app", "venmo"]);

function forwardingAddress(token: string) {
  const domain = String(process.env.RESEND_INBOUND_DOMAIN || "").trim().replace(/^@/, "");
  return domain ? `pay-${token}@${domain}` : "";
}

export async function GET() {
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ methods: [], receivingReady: false });
  const { data, error } = await admin.from("external_payment_methods").select("*").eq("barber_id", ctx.barber.id).order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    receivingReady: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_INBOUND_DOMAIN),
    methods: (data || []).map((row) => ({
      id: row.id,
      provider: row.provider,
      label: row.label,
      accountHandle: row.account_handle,
      paymentUrl: row.payment_url,
      notificationEmail: row.notification_email,
      enabled: row.enabled,
      emailConfirmationEnabled: row.email_confirmation_enabled,
      forwardingAddress: forwardingAddress(row.forwarding_token),
    })),
  });
}

export async function POST(request: Request) {
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json();
  const provider = String(body.provider || "") as ExternalProvider;
  if (!allowed.has(provider)) return NextResponse.json({ error: "Choose a supported payment method." }, { status: 400 });
  const accountHandle = String(body.accountHandle || "").trim();
  const paymentUrl = String(body.paymentUrl || "").trim();
  const notificationEmail = String(body.notificationEmail || "").trim().toLowerCase();
  if (!accountHandle) return NextResponse.json({ error: provider === "cash_app" ? "Add your $Cashtag." : "Add your Venmo Business Profile username." }, { status: 400 });
  if (!notificationEmail || !/^\S+@\S+\.\S+$/.test(notificationEmail)) return NextResponse.json({ error: "Add the email address that receives your payment notices." }, { status: 400 });
  if (paymentUrl && !/^https:\/\//i.test(paymentUrl)) return NextResponse.json({ error: "Payment links must start with https://" }, { status: 400 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Payment setup is unavailable." }, { status: 500 });
  const { data: existing } = await admin.from("external_payment_methods").select("forwarding_token").eq("barber_id", ctx.barber.id).eq("provider", provider).maybeSingle();
  const token = existing?.forwarding_token || crypto.randomBytes(12).toString("hex");
  const { error } = await admin.from("external_payment_methods").upsert({
    barber_id: ctx.barber.id,
    provider,
    label: externalProviderLabels[provider],
    account_handle: accountHandle,
    payment_url: paymentUrl,
    notification_email: notificationEmail,
    forwarding_token: token,
    enabled: body.enabled !== false,
    email_confirmation_enabled: body.emailConfirmationEnabled !== false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "barber_id,provider" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, forwardingAddress: forwardingAddress(token) });
}

export async function DELETE(request: Request) {
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const provider = new URL(request.url).searchParams.get("provider") || "";
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Payment setup is unavailable." }, { status: 500 });
  const { error } = await admin.from("external_payment_methods").delete().eq("barber_id", ctx.barber.id).eq("provider", provider);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
