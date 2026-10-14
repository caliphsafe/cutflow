import { NextResponse } from "next/server";
import { getCustomerPortalBooking } from "@/lib/customer-portal";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token) return NextResponse.json({ error: "Payment link is invalid." }, { status: 400 });
  const data = await getCustomerPortalBooking(token);
  if (!data) return NextResponse.json({ error: "Payment link is invalid or expired." }, { status: 404 });
  const booking = data.booking;
  return NextResponse.json({
    confirmed: booking.status === "confirmed" || booking.payment_status === "deposit_paid" || booking.payment_status === "paid",
    status: booking.status,
    paymentStatus: booking.payment_status,
    bookingCode: booking.booking_code,
  });
}
