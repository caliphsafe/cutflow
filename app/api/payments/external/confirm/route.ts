import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { finalizeExternalDeposit, type ExternalProvider } from "@/lib/payments/external";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json();
  const bookingId = String(body.bookingId || "");
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Payment confirmation is unavailable." }, { status: 500 });
  const { data: booking } = await admin.from("bookings").select("id,barber_id,deposit_cents,payment_status").eq("id", bookingId).eq("barber_id", ctx.barber.id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.payment_status !== "deposit_due") return NextResponse.json({ saved: true });
  const { data: intent } = await admin.from("external_payment_intents").select("provider").eq("booking_id", booking.id).maybeSingle();
  if (!intent) return NextResponse.json({ error: "This booking is not waiting for an external payment." }, { status: 400 });
  await finalizeExternalDeposit({ bookingId: booking.id, provider: intent.provider as ExternalProvider, externalPaymentId: `manual-${booking.id}-${Date.now()}`, grossCents: booking.deposit_cents, paymentMethodLabel: `${intent.provider.replaceAll("_", " ")} — barber confirmed` });
  return NextResponse.json({ saved: true });
}
