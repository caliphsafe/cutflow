import { NextResponse } from "next/server";
import { finalizeBookingPayment, markWebhookEvent, recordWebhookEvent } from "@/lib/payments/finalize";
import { getPayPalPlatformToken, paypalBaseUrl } from "@/lib/payments/paypal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function verifyPayPal(request: Request, event: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const token = await getPayPalPlatformToken();
  const response = await fetch(`${paypalBaseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: request.headers.get("paypal-auth-algo"),
      cert_url: request.headers.get("paypal-cert-url"),
      transmission_id: request.headers.get("paypal-transmission-id"),
      transmission_sig: request.headers.get("paypal-transmission-sig"),
      transmission_time: request.headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  const payload = await response.json();
  return response.ok && payload.verification_status === "SUCCESS";
}

function merchantIdFromEvent(event: any) {
  const resource = event?.resource || {};
  return String(
    resource.merchant_id ||
    resource.merchant_id_in_paypal ||
    resource.merchantIdInPayPal ||
    resource.payer_id ||
    resource.merchant_integration?.merchant_id ||
    resource.merchant_integrations?.[0]?.merchant_id ||
    ""
  );
}

async function syncMerchantConnection(admin: ReturnType<typeof createAdminSupabaseClient>, merchantId: string) {
  if (!admin || !merchantId) return;
  const partnerId = process.env.PAYPAL_PARTNER_MERCHANT_ID;
  if (!partnerId) return;
  const token = await getPayPalPlatformToken();
  const response = await fetch(`${paypalBaseUrl}/v1/customer/partners/${partnerId}/merchant-integrations/${merchantId}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  const status = await response.json().catch(() => ({}));
  if (!response.ok) return;
  await admin.from("payment_connections").update({
    status: status.payments_receivable ? "connected" : "restricted",
    charges_enabled: Boolean(status.payments_receivable),
    payouts_enabled: Boolean(status.primary_email_confirmed),
    verification_status: status.payments_receivable ? "verified" : "requirements_due",
    capabilities: status,
    last_synced_at: new Date().toISOString(),
    last_error: null,
  }).eq("provider", "paypal").eq("external_merchant_id", merchantId);
}

export async function POST(request: Request) {
  const event = await request.json();
  if (!await verifyPayPal(request, event)) return NextResponse.json({ error: "Invalid PayPal signature." }, { status: 401 });
  const eventId = String(event.id || "");
  const logged = await recordWebhookEvent("paypal", eventId, String(event.event_type || "unknown"), event);
  if (logged.duplicate) return NextResponse.json({ received: true, duplicate: true });
  try {
    const admin = createAdminSupabaseClient();
    const merchantId = merchantIdFromEvent(event);
    if (event.event_type === "MERCHANT.PARTNER-CONSENT.REVOKED" && admin && merchantId) {
      const { data: connection } = await admin.from("payment_connections").select("barber_id").eq("provider", "paypal").eq("external_merchant_id", merchantId).maybeSingle();
      await admin.from("payment_connections").update({ status: "disconnected", charges_enabled: false, payouts_enabled: false, disconnected_at: new Date().toISOString(), last_error: "PayPal access was revoked from the PayPal account." }).eq("provider", "paypal").eq("external_merchant_id", merchantId);
      if (connection?.barber_id) await admin.from("barber_profiles").update({ primary_payment_provider: null }).eq("id", connection.barber_id).eq("primary_payment_provider", "paypal");
    }

    if (["MERCHANT.ONBOARDING.COMPLETED", "CUSTOMER.MERCHANT-INTEGRATION.CAPABILITY-UPDATED"].includes(event.event_type) && admin && merchantId) {
      await syncMerchantConnection(admin, merchantId);
    }

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const capture = event.resource;
      const orderId = capture?.supplementary_data?.related_ids?.order_id;
      const { data: session } = admin ? await admin.from("payment_sessions").select("*").eq("provider", "paypal").eq("external_order_id", orderId).maybeSingle() : { data: null };
      if (session) {
        const breakdown = capture.seller_receivable_breakdown || {};
        await finalizeBookingPayment({ provider: "paypal", bookingId: session.booking_id, purpose: session.purpose, externalSessionId: orderId, externalPaymentId: capture.id, externalEventId: eventId, grossCents: Math.round(Number(capture.amount?.value || 0) * 100), processorFeeCents: Math.round(Number(breakdown.paypal_fee?.value || 0) * 100), paymentMethodType: "paypal", paymentMethodLabel: "PayPal / Venmo", occurredAt: capture.create_time || new Date().toISOString() });
      }
    }
    await markWebhookEvent(logged.id, "processed");
  } catch (error) {
    await markWebhookEvent(logged.id, "failed", error instanceof Error ? error.message : "PayPal processing failed");
    return NextResponse.json({ error: "PayPal webhook processing failed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
