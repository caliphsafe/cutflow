import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { createProviderCheckout, getPaymentConnection } from "@/lib/payments";
import { isPaymentProvider } from "@/lib/payments/config";
import { hashToken } from "@/lib/security/encryption";
import { appUrl } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const admin = createAdminSupabaseClient();
    if (!admin) return NextResponse.json({ url: `${appUrl()}/dashboard/payments?demo=1`, demo: true });

    let bookingId = String(body.bookingId || "");
    let portalToken = String(body.portalToken || "");
    let customerAuthorized = false;
    if (portalToken) {
      const { data: tokenRow } = await admin.from("customer_portal_tokens").select("booking_id,expires_at,revoked_at").eq("token_hash", hashToken(portalToken)).maybeSingle();
      if (!tokenRow || tokenRow.revoked_at || new Date(tokenRow.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "Appointment access link is invalid or expired." }, { status: 403 });
      bookingId = tokenRow.booking_id;
      customerAuthorized = true;
    }

    const { data: booking, error } = await admin.from("bookings").select("id,booking_code,barber_id,client_id,customer_email,customer_name,balance_cents,payment_status,service:services(name),barber:barber_profiles(display_name,slug,primary_payment_provider)").eq("id", bookingId).single();
    if (error || !booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

    if (!customerAuthorized) {
      const ctx = await getAuthenticatedBarber();
      if (!ctx.user || !ctx.barber || ctx.barber.id !== booking.barber_id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    if (booking.balance_cents <= 0 || booking.payment_status === "paid") return NextResponse.json({ error: "This appointment has no open balance." }, { status: 400 });
    const barber = Array.isArray(booking.barber) ? booking.barber[0] : booking.barber;
    const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;
    const requestedProvider = String(body.paymentProvider || barber?.primary_payment_provider || "stripe");
    const provider = isPaymentProvider(requestedProvider) ? requestedProvider : "stripe";
    const connection = await getPaymentConnection(booking.barber_id, provider);
    if (!connection?.charges_enabled) return NextResponse.json({ error: "That payment service is not ready for this barber." }, { status: 400 });

    const idempotencyKey = `${booking.id}-${provider}-service-balance-${booking.balance_cents}`;
    const { data: existing } = await admin.from("payment_sessions").select("id,status,external_session_id,metadata").eq("idempotency_key", idempotencyKey).maybeSingle();
    let paymentSessionId = existing?.id;
    if (!paymentSessionId || ["failed", "cancelled", "expired"].includes(existing?.status || "")) {
      const { data: created, error: createError } = await admin.from("payment_sessions").insert({ barber_id: booking.barber_id, client_id: booking.client_id, booking_id: booking.id, provider, purpose: "service_balance", amount_cents: booking.balance_cents, status: "created", idempotency_key: `${idempotencyKey}-${Date.now()}`, metadata: { manage_url: portalToken ? `${appUrl()}/manage/${portalToken}` : "", portal_token: portalToken, success_url: portalToken ? `${appUrl()}/manage/${portalToken}?paid=1` : `${appUrl()}/dashboard/payments?paid=${booking.booking_code}` } }).select("id").single();
      if (createError) throw createError;
      paymentSessionId = created.id;
    }

    const successUrl = portalToken ? `${appUrl()}/manage/${portalToken}?paid=1${provider === "stripe" ? "&session_id={CHECKOUT_SESSION_ID}" : ""}` : `${appUrl()}/dashboard/payments?paid=${booking.booking_code}${provider === "stripe" ? "&session_id={CHECKOUT_SESSION_ID}" : ""}`;
    const result = await createProviderCheckout(provider, connection, { barberId: booking.barber_id, bookingId: booking.id, paymentSessionId, bookingCode: booking.booking_code, barberName: barber?.display_name || "Barber", barberSlug: barber?.slug || "", customerEmail: booking.customer_email, customerName: booking.customer_name, serviceName: service?.name || "Appointment", amountCents: booking.balance_cents, purpose: "service_balance", portalToken, successUrl, cancelUrl: portalToken ? `${appUrl()}/manage/${portalToken}` : `${appUrl()}/dashboard/bookings?booking=${booking.id}` });
    await admin.from("payment_sessions").update({ external_session_id: result.externalSessionId, external_order_id: result.externalOrderId || null, status: "pending" }).eq("id", paymentSessionId);
    return NextResponse.json({ url: result.url, provider });
  } catch (error) {
    console.error("create-balance", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create balance checkout." }, { status: 500 });
  }
}
