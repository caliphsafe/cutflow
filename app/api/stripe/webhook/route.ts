import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function verifyEvent(stripe: Stripe, payload: string, signature: string) {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No Stripe webhook signing secret is configured.");
}

async function paymentNetDetails(stripe: Stripe, session: Stripe.Checkout.Session, connectedAccount?: string | null) {
  let processorFee = 0;
  let netAmount = session.amount_total || 0;
  if (connectedAccount && typeof session.payment_intent === "string") {
    const intent = await stripe.paymentIntents.retrieve(
      session.payment_intent,
      { expand: ["latest_charge.balance_transaction"] },
      { stripeAccount: connectedAccount },
    );
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    const balance = charge && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
    processorFee = balance?.fee || 0;
    netAmount = balance?.net || netAmount;
  }
  return { processorFee, netAmount };
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !signature) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = verifyEvent(stripe, await request.text(), signature);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ received: true, demo: true });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;
      const kind = session.metadata?.payment_kind;

      if (bookingId && (kind === "deposit" || kind === "service_balance")) {
        const { data: bookingRecord } = await admin
          .from("bookings")
          .select("barber_id,client_id")
          .eq("id", bookingId)
          .maybeSingle();
        if (!bookingRecord) return NextResponse.json({ received: true, ignored: true });

        const { processorFee, netAmount } = await paymentNetDetails(stripe, session, event.account);
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

        if (kind === "deposit") {
          await admin.from("bookings").update({
            status: "confirmed",
            payment_status: "deposit_paid",
            stripe_payment_intent_id: paymentIntentId,
            deposit_paid_at: new Date().toISOString(),
            deposit_expires_at: new Date("2999-01-01T00:00:00.000Z").toISOString(),
          }).eq("id", bookingId);
        } else {
          await admin.from("bookings").update({
            payment_status: "paid",
            balance_cents: 0,
            status: "completed",
          }).eq("id", bookingId);
        }

        await admin.from("transactions").upsert({
          barber_id: bookingRecord.barber_id,
          client_id: bookingRecord.client_id,
          booking_id: bookingId,
          stripe_account_id: event.account || null,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          stripe_event_id: event.id,
          type: kind === "deposit" ? "deposit" : "service_balance",
          status: "paid",
          gross_cents: session.amount_total || (kind === "deposit" ? 1000 : 0),
          tax_cents: session.total_details?.amount_tax || 0,
          processor_fee_cents: processorFee,
          platform_fee_cents: 0,
          net_cents: netAmount,
          payment_method_label: "Stripe Checkout",
          occurred_at: new Date().toISOString(),
        }, { onConflict: "stripe_checkout_session_id" });

        if (kind === "deposit") {
          const { data: barberProfile } = await admin.from("barber_profiles").select("email").eq("id", bookingRecord.barber_id).maybeSingle();
          const notices: Array<{ barber_id: string; booking_id: string; channel: "email"; template_code: string; destination: string; status: "queued" }> = [];
          if (session.customer_email) notices.push({ barber_id: bookingRecord.barber_id, booking_id: bookingId, channel: "email", template_code: "booking_confirmation", destination: session.customer_email, status: "queued" });
          if (barberProfile?.email) notices.push({ barber_id: bookingRecord.barber_id, booking_id: bookingId, channel: "email", template_code: "new_booking_alert", destination: barberProfile.email, status: "queued" });
          if (notices.length) await admin.from("notification_log").upsert(notices, { onConflict: "booking_id,template_code,destination", ignoreDuplicates: true });
        }
      }

      if (session.mode === "subscription") {
        const userId = session.metadata?.user_id;
        if (userId && userId !== "unknown") {
          await admin.from("subscriptions").upsert({
            owner_user_id: userId,
            plan_code: session.metadata?.plan_code || "pro",
            status: "trialing",
            stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
            stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "owner_user_id" });
        }
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (paymentIntentId) {
        const { data: original } = await admin.from("transactions").select("barber_id,client_id,booking_id,gross_cents").eq("stripe_payment_intent_id", paymentIntentId).neq("type", "refund").order("occurred_at", { ascending: false }).limit(1).maybeSingle();
        if (original) {
          const refunded = charge.amount_refunded || charge.amount;
          await admin.from("transactions").upsert({
            barber_id: original.barber_id,
            client_id: original.client_id,
            booking_id: original.booking_id,
            stripe_account_id: event.account || null,
            stripe_payment_intent_id: paymentIntentId,
            stripe_event_id: event.id,
            type: "refund",
            status: "refunded",
            gross_cents: refunded,
            refund_cents: refunded,
            processor_fee_cents: 0,
            platform_fee_cents: 0,
            net_cents: -refunded,
            payment_method_label: "Stripe refund",
            description: "Refund recorded from connected Stripe account",
            occurred_at: new Date(event.created * 1000).toISOString(),
          }, { onConflict: "stripe_event_id" });
          if (original.booking_id && refunded >= original.gross_cents) {
            await admin.from("bookings").update({ payment_status: "refunded", refund_total_cents: refunded }).eq("id", original.booking_id);
          }
        }
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const periodEnd = subscription.items.data[0]?.current_period_end;
      await admin.from("subscriptions").update({
        status: subscription.status,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("stripe_subscription_id", subscription.id);
    }
  } catch (error) {
    console.error("stripe-webhook-handler", event.type, error);
    return NextResponse.json({ error: "Webhook received but database update failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
