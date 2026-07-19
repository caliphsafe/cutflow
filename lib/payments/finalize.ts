import { processQueuedNotifications } from "@/lib/notifications/send";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { PaymentProvider, PaymentPurpose } from "./types";

export type FinalizePaymentInput = {
  provider: PaymentProvider;
  bookingId: string;
  purpose: PaymentPurpose;
  externalSessionId?: string | null;
  externalPaymentId: string;
  externalEventId?: string | null;
  grossCents: number;
  processorFeeCents?: number;
  paymentMethodType?: string;
  paymentMethodLabel?: string;
  occurredAt?: string;
};

export async function recordWebhookEvent(provider: PaymentProvider, externalEventId: string, eventType: string, payload: unknown) {
  const admin = createAdminSupabaseClient();
  if (!admin) return { duplicate: false, id: null };
  const { data, error } = await admin.from("webhook_events").insert({ provider, external_event_id: externalEventId, event_type: eventType, payload, processing_status: "received" }).select("id").maybeSingle();
  if (error?.code === "23505") return { duplicate: true, id: null };
  if (error) throw error;
  return { duplicate: false, id: data?.id || null };
}

export async function markWebhookEvent(id: string | null, status: "processed" | "ignored" | "failed", errorMessage?: string) {
  if (!id) return;
  const admin = createAdminSupabaseClient();
  if (!admin) return;
  await admin.from("webhook_events").update({ processing_status: status, processed_at: new Date().toISOString(), error_message: errorMessage || null }).eq("id", id);
}

export async function finalizeBookingPayment(input: FinalizePaymentInput) {
  const admin = createAdminSupabaseClient();
  if (!admin) return { demo: true };
  const { data: booking, error } = await admin
    .from("bookings")
    .select("*,barber_profiles(email,phone,shop_name,display_name),clients(communication_preference,sms_consent)")
    .eq("id", input.bookingId)
    .maybeSingle();
  if (error || !booking) throw error || new Error("Booking not found for payment confirmation.");

  const already = await admin.from("transactions").select("id").eq("provider", input.provider).eq("provider_transaction_id", input.externalPaymentId).maybeSingle();
  if (already.data) return { duplicate: true, booking };

  const processorFee = input.processorFeeCents || 0;
  const net = input.grossCents - processorFee;
  if (input.purpose === "deposit") {
    await admin.from("bookings").update({
      status: "confirmed",
      payment_status: "deposit_paid",
      payment_provider: input.provider,
      external_payment_session_id: input.externalSessionId || null,
      deposit_paid_at: input.occurredAt || new Date().toISOString(),
      deposit_expires_at: "2999-01-01T00:00:00.000Z",
    }).eq("id", booking.id);
  } else {
    await admin.from("bookings").update({
      payment_status: "paid",
      balance_cents: 0,
      payment_provider: input.provider,
      external_payment_session_id: input.externalSessionId || null,
    }).eq("id", booking.id);
  }

  await admin.from("payment_sessions").update({
    status: "paid",
    external_payment_id: input.externalPaymentId,
    completed_at: input.occurredAt || new Date().toISOString(),
  }).eq("booking_id", booking.id).eq("provider", input.provider).eq("purpose", input.purpose).in("status", ["created", "pending"]);

  await admin.from("transactions").insert({
    barber_id: booking.barber_id,
    client_id: booking.client_id,
    booking_id: booking.id,
    provider: input.provider,
    provider_transaction_id: input.externalPaymentId,
    provider_payment_id: input.externalPaymentId,
    stripe_checkout_session_id: input.provider === "stripe" ? input.externalSessionId : null,
    stripe_payment_intent_id: input.provider === "stripe" ? input.externalPaymentId : null,
    stripe_event_id: input.provider === "stripe" ? input.externalEventId : null,
    type: input.purpose,
    status: "paid",
    gross_cents: input.grossCents,
    processor_fee_cents: processorFee,
    platform_fee_cents: 0,
    net_cents: net,
    payment_method_type: input.paymentMethodType || input.provider,
    payment_method_label: input.paymentMethodLabel || input.provider,
    occurred_at: input.occurredAt || new Date().toISOString(),
  });

  if (input.purpose === "deposit") {
    const { data: sessionRow } = await admin.from("payment_sessions").select("metadata").eq("booking_id", booking.id).eq("provider", input.provider).eq("purpose", input.purpose).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const manageUrl = String(sessionRow?.metadata?.manage_url || "");
    const barber = Array.isArray(booking.barber_profiles) ? booking.barber_profiles[0] : booking.barber_profiles;
    const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
    const { data: prefs } = await admin.from("notification_preferences").select("*").eq("barber_id", booking.barber_id).maybeSingle();
    const notices: Array<Record<string, unknown>> = [];
    if (prefs?.customer_confirmation_email !== false && booking.customer_email) notices.push({ barber_id: booking.barber_id, booking_id: booking.id, channel: "email", template_code: "booking_confirmation", destination: booking.customer_email, status: "queued", manage_url: manageUrl });
    if (prefs?.customer_confirmation_sms && client?.sms_consent && booking.customer_phone) notices.push({ barber_id: booking.barber_id, booking_id: booking.id, channel: "sms", template_code: "booking_confirmation", destination: booking.customer_phone, status: "queued", manage_url: manageUrl });
    if (prefs?.barber_new_booking_email !== false && barber?.email) notices.push({ barber_id: booking.barber_id, booking_id: booking.id, channel: "email", template_code: "new_booking_alert", destination: barber.email, status: "queued" });
    if (prefs?.barber_new_booking_sms && barber?.phone) notices.push({ barber_id: booking.barber_id, booking_id: booking.id, channel: "sms", template_code: "new_booking_alert", destination: barber.phone, status: "queued" });
    if (notices.length) await admin.from("notification_log").upsert(notices, { onConflict: "booking_id,template_code,destination", ignoreDuplicates: true });
  }

  await admin.from("booking_events").insert({ booking_id: booking.id, event_type: `${input.purpose}_paid`, details: { provider: input.provider, external_payment_id: input.externalPaymentId, amount_cents: input.grossCents } });

  // Payment webhooks send this booking's confirmation immediately when a
  // delivery provider is configured. The scheduled worker remains responsible
  // for reminders and retrying any transient failures.
  if (input.purpose === "deposit" && (process.env.RESEND_API_KEY || process.env.TWILIO_ACCOUNT_SID)) {
    await processQueuedNotifications(8, booking.id);
  }
  return { booking };
}
