import { processQueuedNotifications } from "@/lib/notifications/send";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ExternalProvider = "cash_app" | "venmo";

export const externalProviderLabels: Record<ExternalProvider, string> = {
  cash_app: "Cash App",
  venmo: "Venmo",
};

export async function finalizeExternalDeposit(input: {
  bookingId: string;
  provider: ExternalProvider;
  externalPaymentId: string;
  grossCents: number;
  occurredAt?: string;
  paymentMethodLabel?: string;
}) {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("Payment confirmation is unavailable.");

  const { data: booking, error } = await admin
    .from("bookings")
    .select("*,barber_profiles(email,phone,shop_name,display_name),clients(communication_preference,sms_consent)")
    .eq("id", input.bookingId)
    .maybeSingle();
  if (error || !booking) throw error || new Error("Booking not found.");

  const { data: existing } = await admin.from("transactions").select("id").eq("provider_transaction_id", input.externalPaymentId).maybeSingle();
  if (existing) return { duplicate: true, booking };

  const paidAt = input.occurredAt || new Date().toISOString();
  await admin.from("bookings").update({ status:"confirmed", payment_status:"deposit_paid", payment_provider:"external", deposit_paid_at:paidAt, deposit_expires_at:"2999-01-01T00:00:00.000Z" }).eq("id", booking.id);
  await admin.from("external_payment_intents").update({ status:"paid", paid_at:paidAt }).eq("booking_id", booking.id);
  await admin.from("transactions").insert({ barber_id:booking.barber_id, client_id:booking.client_id, booking_id:booking.id, provider:input.provider, provider_transaction_id:input.externalPaymentId, provider_payment_id:input.externalPaymentId, type:"deposit", status:"paid", gross_cents:input.grossCents, processor_fee_cents:0, platform_fee_cents:0, net_cents:input.grossCents, payment_method_type:input.provider, payment_method_label:input.paymentMethodLabel||externalProviderLabels[input.provider], occurred_at:paidAt });

  const { data: intent } = await admin.from("external_payment_intents").select("manage_url").eq("booking_id", booking.id).maybeSingle();
  const manageUrl = String(intent?.manage_url || "");
  const barber = Array.isArray(booking.barber_profiles) ? booking.barber_profiles[0] : booking.barber_profiles;
  const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
  const { data: prefs } = await admin.from("notification_preferences").select("*").eq("barber_id", booking.barber_id).maybeSingle();
  const notices: Array<Record<string, unknown>> = [];
  if (prefs?.customer_confirmation_sms && client?.sms_consent && booking.customer_phone) notices.push({ barber_id:booking.barber_id, booking_id:booking.id, channel:"sms", template_code:"booking_confirmation", destination:booking.customer_phone, status:"queued", manage_url:manageUrl });
  if (prefs?.barber_new_booking_email !== false && barber?.email) notices.push({ barber_id:booking.barber_id, booking_id:booking.id, channel:"email", template_code:"new_booking_alert", destination:barber.email, status:"queued" });
  if (prefs?.barber_new_booking_sms && barber?.phone) notices.push({ barber_id:booking.barber_id, booking_id:booking.id, channel:"sms", template_code:"new_booking_alert", destination:barber.phone, status:"queued" });
  if (notices.length) await admin.from("notification_log").upsert(notices, { onConflict:"booking_id,template_code,destination", ignoreDuplicates:true });

  await admin.from("booking_events").insert({ booking_id:booking.id, event_type:"deposit_paid", details:{ provider:input.provider, external_payment_id:input.externalPaymentId, amount_cents:input.grossCents, confirmation_source:"barber_payment_email" } });
  if (process.env.RESEND_API_KEY || process.env.TWILIO_ACCOUNT_SID) await processQueuedNotifications(8, booking.id);
  return { booking };
}
