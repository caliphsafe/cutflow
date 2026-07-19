import { NextResponse } from "next/server";
import { appUrl, getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json();
    const stripe = getStripe();
    const admin = createAdminSupabaseClient();
    if (!stripe || !admin) return NextResponse.json({ url: `${appUrl()}/dashboard/payments?demo=1`, demo: true });

    const { data: booking, error } = await admin
      .from("bookings")
      .select("id, booking_code, customer_email, customer_name, balance_cents, service:services(name), barber:barber_profiles(display_name,stripe_account_id)")
      .eq("id", bookingId)
      .single();
    if (error || !booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    const barber = Array.isArray(booking.barber) ? booking.barber[0] : booking.barber;
    const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;
    if (!barber?.stripe_account_id || booking.balance_cents <= 0) return NextResponse.json({ error: "No connected payment account or open balance." }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.customer_email,
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: booking.balance_cents, product_data: { name: `${service?.name || "Appointment"} remaining balance`, description: `Booking ${booking.booking_code}` } } }],
      payment_intent_data: { metadata: { booking_id: booking.id, booking_code: booking.booking_code, payment_kind: "service_balance" } },
      metadata: { booking_id: booking.id, booking_code: booking.booking_code, payment_kind: "service_balance" },
      success_url: `${appUrl()}/dashboard/payments?paid=${booking.booking_code}`,
      cancel_url: `${appUrl()}/dashboard/bookings?booking=${booking.id}`,
    }, { stripeAccount: barber.stripe_account_id });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("create-balance", error);
    return NextResponse.json({ error: "Could not create balance checkout." }, { status: 500 });
  }
}
