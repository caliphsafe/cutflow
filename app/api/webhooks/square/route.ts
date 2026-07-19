import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { finalizeBookingPayment, markWebhookEvent, recordWebhookEvent } from "@/lib/payments/finalize";
import { getValidSquareAccessToken, squareRequest } from "@/lib/payments/square";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function validSignature(body: string, signature: string | null) {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL;
  if (!key || !notificationUrl || !signature) return false;
  const expected = crypto.createHmac("sha256", key).update(notificationUrl + body).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-square-hmacsha256-signature"))) return NextResponse.json({ error: "Invalid Square signature." }, { status: 401 });
  const event = JSON.parse(body);
  const eventId = String(event.event_id || event.id || "");
  const logged = await recordWebhookEvent("square", eventId, String(event.type || "unknown"), event);
  if (logged.duplicate) return NextResponse.json({ received: true, duplicate: true });
  try {
    const admin = createAdminSupabaseClient();
    if (event.type === "oauth.authorization.revoked" && admin && event.merchant_id) {
      const { data: connection } = await admin.from("payment_connections").select("barber_id").eq("provider", "square").eq("external_merchant_id", event.merchant_id).maybeSingle();
      await admin.from("payment_connections").update({ status: "disconnected", charges_enabled: false, payouts_enabled: false, encrypted_access_token: null, encrypted_refresh_token: null, disconnected_at: event.created_at || new Date().toISOString(), last_error: "Square access was revoked from the Square Dashboard." }).eq("provider", "square").eq("external_merchant_id", event.merchant_id);
      if (connection?.barber_id) await admin.from("barber_profiles").update({ primary_payment_provider: null }).eq("id", connection.barber_id).eq("primary_payment_provider", "square");
    }

    if (["bank_account.created", "bank_account.verified", "bank_account.disabled"].includes(event.type) && admin && event.merchant_id) {
      const { data: connection } = await admin.from("payment_connections").select("*").eq("provider", "square").eq("external_merchant_id", event.merchant_id).maybeSingle();
      if (connection?.encrypted_access_token) {
        const token = await getValidSquareAccessToken(connection);
        const locationId = String(connection.metadata?.location_id || "");
        const accounts = await squareRequest<{ bank_accounts?: Array<{ status?: string; creditable?: boolean }> }>(`/v2/bank-accounts${locationId ? `?location_id=${encodeURIComponent(locationId)}` : ""}`, token);
        const payoutReady = Boolean(accounts.bank_accounts?.some((account) => account.status === "VERIFIED" && account.creditable !== false));
        await admin.from("payment_connections").update({ payouts_enabled: payoutReady, metadata: { ...(connection.metadata || {}), verified_bank_account: payoutReady }, last_synced_at: new Date().toISOString() }).eq("id", connection.id);
      }
    }

    if (["payment.created", "payment.updated"].includes(event.type)) {
      const payment = event.data?.object?.payment;
      if (payment?.status === "COMPLETED") {
        const note = String(payment.note || "");
        const parts = note.split("|");
        const bookingId = parts.length >= 3 ? parts[1] : "";
        const purpose = parts.length >= 3 ? parts[2] : "deposit";
        let paymentSession: any = null;
        if (admin && payment.order_id) {
          const result = await admin.from("payment_sessions").select("*").eq("provider", "square").eq("external_order_id", payment.order_id).maybeSingle();
          paymentSession = result.data;
        }
        const resolvedBookingId = bookingId || paymentSession?.booking_id;
        const resolvedPurpose = (parts.length >= 3 ? purpose : paymentSession?.purpose) || "deposit";
        if (resolvedBookingId && (resolvedPurpose === "deposit" || resolvedPurpose === "service_balance")) {
          const fee = (payment.processing_fee || []).reduce((sum: number, item: any) => sum + Number(item.amount_money?.amount || 0), 0);
          await finalizeBookingPayment({ provider: "square", bookingId: resolvedBookingId, purpose: resolvedPurpose, externalSessionId: payment.order_id || null, externalPaymentId: payment.id, externalEventId: eventId, grossCents: Number(payment.amount_money?.amount || 0), processorFeeCents: fee, paymentMethodType: payment.source_type || "square", paymentMethodLabel: payment.source_type === "CASH_APP" ? "Cash App Pay via Square" : "Square Checkout", occurredAt: payment.created_at || new Date().toISOString() });
        }
      }
    }
    await markWebhookEvent(logged.id, "processed");
  } catch (error) {
    await markWebhookEvent(logged.id, "failed", error instanceof Error ? error.message : "Square processing failed");
    return NextResponse.json({ error: "Square webhook processing failed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
