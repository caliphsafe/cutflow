import { NextResponse } from "next/server";
import { paypalRequest } from "@/lib/payments/paypal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { paymentSessionId } = await request.json();
    const admin = createAdminSupabaseClient();
    if (!admin) return NextResponse.json({ error: "Database is not configured." }, { status: 500 });
    const { data: session } = await admin.from("payment_sessions").select("*,bookings(booking_code,customer_name,customer_email),barber_profiles(display_name)").eq("id", paymentSessionId).eq("provider", "paypal").maybeSingle();
    if (!session || !["created", "pending"].includes(session.status)) return NextResponse.json({ error: "This payment session is unavailable." }, { status: 404 });
    const booking = Array.isArray(session.bookings) ? session.bookings[0] : session.bookings;
    const { data: connection } = await admin.from("payment_connections").select("external_merchant_id,status").eq("barber_id", session.barber_id).eq("provider", "paypal").maybeSingle();
    const merchantId = connection?.external_merchant_id;
    if (!merchantId || connection.status !== "connected") return NextResponse.json({ error: "PayPal is not ready for this barber." }, { status: 400 });

    if (session.external_order_id) return NextResponse.json({ orderId: session.external_order_id });
    const order = await paypalRequest<any>("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": session.idempotency_key },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: session.id,
          custom_id: session.id,
          invoice_id: `${booking?.booking_code || session.id}-${session.purpose}`,
          description: `${session.purpose === "deposit" ? "Booking deposit" : "Appointment balance"} · ${booking?.booking_code || ""}`,
          amount: { currency_code: "USD", value: (session.amount_cents / 100).toFixed(2) },
          payee: { merchant_id: merchantId },
        }],
        application_context: { brand_name: "CutFlow", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" },
      }),
    }, merchantId);
    await admin.from("payment_sessions").update({ external_order_id: order.id, status: "pending" }).eq("id", session.id);
    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error("paypal-create-order", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create PayPal order." }, { status: 500 });
  }
}
