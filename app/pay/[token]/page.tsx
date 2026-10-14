import { notFound } from "next/navigation";
import { ExternalPaymentPage } from "@/components/payments/ExternalPaymentPage";
import { hashToken } from "@/lib/security/encryption";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function ExternalPaymentRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminSupabaseClient();
  if (!admin) notFound();
  const { data: tokenRow } = await admin.from("customer_portal_tokens").select("booking_id,expires_at,revoked_at").eq("token_hash", hashToken(token)).maybeSingle();
  if (!tokenRow || tokenRow.revoked_at || new Date(tokenRow.expires_at).getTime() < Date.now()) notFound();
  const [{ data: booking }, { data: intent }] = await Promise.all([
    admin.from("bookings").select("id,booking_code,customer_name,deposit_cents,status,payment_status,appointment_date,appointment_time,services(name),barber_profiles(display_name,shop_name,address,city)").eq("id", tokenRow.booking_id).maybeSingle(),
    admin.from("external_payment_intents").select("*,external_payment_methods(label,provider,account_handle,payment_url)").eq("booking_id", tokenRow.booking_id).maybeSingle(),
  ]);
  if (!booking || !intent) notFound();
  const barber = Array.isArray(booking.barber_profiles) ? booking.barber_profiles[0] : booking.barber_profiles;
  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
  const method = Array.isArray(intent.external_payment_methods) ? intent.external_payment_methods[0] : intent.external_payment_methods;
  if (!method) notFound();
  return <ExternalPaymentPage
    token={token}
    bookingCode={booking.booking_code}
    customerName={booking.customer_name}
    amountCents={booking.deposit_cents}
    barberName={barber?.display_name || "your barber"}
    shopName={barber?.shop_name || ""}
    provider={method.provider}
    label={method.label}
    accountHandle={method.account_handle || ""}
    paymentUrl={method.payment_url || ""}
    initiallyConfirmed={booking.payment_status !== "deposit_due" || booking.status === "confirmed"}
    serviceName={service?.name || "Appointment"}
    appointmentDate={booking.appointment_date || ""}
    appointmentTime={booking.appointment_time || ""}
    address={barber?.address || ""}
    city={barber?.city || ""}
  />;
}
