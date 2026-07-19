import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { finalizeBookingPayment, markWebhookEvent, recordWebhookEvent } from "@/lib/payments/finalize";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function verifyEvent(stripe: Stripe, payload: string, signature: string) {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  let lastError: unknown;
  for (const secret of secrets) {
    try { return stripe.webhooks.constructEvent(payload, signature, secret); } catch (error) { lastError = error; }
  }
  throw lastError || new Error("No Stripe webhook signing secret is configured.");
}

async function stripePaymentDetails(stripe: Stripe, session: Stripe.Checkout.Session, account?: string | null) {
  let processorFee = 0;
  let methodType = "card";
  let paymentId = typeof session.payment_intent === "string" ? session.payment_intent : session.id;
  if (account && typeof session.payment_intent === "string") {
    const intent = await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ["latest_charge.balance_transaction", "payment_method"] }, { stripeAccount: account });
    paymentId = intent.id;
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    const balance = charge && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
    processorFee = balance?.fee || 0;
    const paymentMethod = typeof intent.payment_method === "object" ? intent.payment_method : null;
    methodType = paymentMethod?.type || charge?.payment_method_details?.type || "card";
  }
  const labels: Record<string, string> = { cashapp: "Cash App Pay", card: "Card / wallet", link: "Link", us_bank_account: "US bank account" };
  return { processorFee, methodType, label: labels[methodType] || `Stripe ${methodType}`, paymentId };
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !signature) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 400 });
  const body = await request.text();
  let event: Stripe.Event;
  try { event = verifyEvent(stripe, body, signature); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid signature." }, { status: 400 }); }

  const logged = await recordWebhookEvent("stripe", event.id, event.type, JSON.parse(body));
  if (logged.duplicate) return NextResponse.json({ received: true, duplicate: true });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ received: true, demo: true });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;
      const kind = session.metadata?.payment_kind;
      if (bookingId && (kind === "deposit" || kind === "service_balance")) {
        const details = await stripePaymentDetails(stripe, session, event.account);
        await finalizeBookingPayment({ provider: "stripe", bookingId, purpose: kind, externalSessionId: session.id, externalPaymentId: details.paymentId, externalEventId: event.id, grossCents: session.amount_total || 0, processorFeeCents: details.processorFee, paymentMethodType: details.methodType, paymentMethodLabel: details.label, occurredAt: new Date(event.created * 1000).toISOString() });
      }
      if (session.mode === "subscription") {
        const userId = session.metadata?.user_id;
        if (userId && userId !== "unknown") {
          await admin.from("subscriptions").upsert({ owner_user_id: userId, plan_code: session.metadata?.plan_code || "pro", status: "active", stripe_customer_id: typeof session.customer === "string" ? session.customer : null, stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null, updated_at: new Date().toISOString() }, { onConflict: "owner_user_id" });
        }
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      await admin.from("payment_connections").update({ status: account.charges_enabled ? "connected" : "restricted", charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled, verification_status: account.details_submitted ? (account.charges_enabled ? "verified" : "requirements_due") : "onboarding", capabilities: account.capabilities || {}, last_synced_at: new Date().toISOString() }).eq("provider", "stripe").eq("external_account_id", account.id);
    }

    if (event.type === "account.application.deauthorized" && event.account) {
      await admin.from("payment_connections").update({
        status: "disconnected",
        charges_enabled: false,
        payouts_enabled: false,
        disconnected_at: new Date().toISOString(),
        last_error: "Stripe access was revoked from the Stripe Dashboard.",
      }).eq("provider", "stripe").eq("external_account_id", event.account);
      await admin.from("barber_profiles").update({ primary_payment_provider: null }).eq("stripe_account_id", event.account).eq("primary_payment_provider", "stripe");
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (paymentIntentId) {
        const { data: original } = await admin.from("transactions").select("barber_id,client_id,booking_id,gross_cents").eq("provider", "stripe").eq("provider_transaction_id", paymentIntentId).neq("type", "refund").maybeSingle();
        if (original) {
          const refunded = charge.amount_refunded || charge.amount;
          await admin.from("transactions").insert({ barber_id: original.barber_id, client_id: original.client_id, booking_id: original.booking_id, provider: "stripe", provider_transaction_id: `${charge.id}-refund-${event.id}`, provider_payment_id: charge.id, stripe_payment_intent_id: paymentIntentId, stripe_event_id: event.id, type: "refund", status: "refunded", gross_cents: refunded, refund_cents: refunded, processor_fee_cents: 0, platform_fee_cents: 0, net_cents: -refunded, payment_method_type: "refund", payment_method_label: "Stripe refund", occurred_at: new Date(event.created * 1000).toISOString() });
          if (original.booking_id) await admin.from("bookings").update({ payment_status: refunded >= original.gross_cents ? "refunded" : "partially_refunded", refund_total_cents: refunded, deposit_disposition: "refunded" }).eq("id", original.booking_id);
        }
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const periodEnd = subscription.items.data[0]?.current_period_end;
      await admin.from("subscriptions").update({ status: subscription.status, current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null, updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
    }
    await markWebhookEvent(logged.id, "processed");
  } catch (error) {
    console.error("stripe-webhook-handler", event.type, error);
    await markWebhookEvent(logged.id, "failed", error instanceof Error ? error.message : "Database update failed");
    return NextResponse.json({ error: "Webhook received but processing failed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
