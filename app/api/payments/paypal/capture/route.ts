import { NextResponse } from "next/server";
import { finalizeBookingPayment } from "@/lib/payments/finalize";
import { paypalRequest } from "@/lib/payments/paypal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { paymentSessionId, orderId } = await request.json();
    const admin = createAdminSupabaseClient();
    if (!admin) return NextResponse.json({ error: "Database is not configured." }, { status: 500 });
    const { data: session } = await admin.from("payment_sessions").select("*").eq("id", paymentSessionId).eq("provider", "paypal").maybeSingle();
    if (!session) return NextResponse.json({ error: "Payment session not found." }, { status: 404 });
    if (!["created", "pending"].includes(session.status)) return NextResponse.json({ error: "This payment session is no longer available." }, { status: 409 });
    if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "This payment session has expired." }, { status: 410 });
    if (!session.external_order_id || session.external_order_id !== orderId) return NextResponse.json({ error: "PayPal order does not match this booking." }, { status: 400 });
    const { data: connection } = await admin.from("payment_connections").select("external_merchant_id,status").eq("barber_id", session.barber_id).eq("provider", "paypal").maybeSingle();
    const merchantId = connection?.external_merchant_id;
    if (!merchantId) return NextResponse.json({ error: "PayPal connection is incomplete." }, { status: 400 });
    const captureResponse = await paypalRequest<any>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", headers: { "PayPal-Request-Id": `${session.idempotency_key}-capture` } }, merchantId);
    const capture = captureResponse.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture || capture.status !== "COMPLETED") return NextResponse.json({ error: "PayPal has not completed this payment." }, { status: 409 });
    const breakdown = capture.seller_receivable_breakdown || {};
    await finalizeBookingPayment({
      provider: "paypal",
      bookingId: session.booking_id,
      purpose: session.purpose,
      externalSessionId: orderId,
      externalPaymentId: capture.id,
      grossCents: Math.round(Number(capture.amount?.value || 0) * 100),
      processorFeeCents: Math.round(Number(breakdown.paypal_fee?.value || 0) * 100),
      paymentMethodType: captureResponse.payment_source ? Object.keys(captureResponse.payment_source)[0] : "paypal",
      paymentMethodLabel: captureResponse.payment_source?.venmo ? "Venmo" : "PayPal",
      occurredAt: capture.create_time || new Date().toISOString(),
    });
    return NextResponse.json({ captured: true });
  } catch (error) {
    console.error("paypal-capture", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not capture PayPal payment." }, { status: 500 });
  }
}
