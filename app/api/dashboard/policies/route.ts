import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getAuthenticatedBarber();
  if (ctx.demo) return NextResponse.json({ policy: { minimum_notice_minutes: 120, max_advance_days: 60, cancellation_window_hours: 24, reschedule_window_hours: 12, max_reschedules: 2, same_day_booking: true, customer_cancellation_enabled: true, customer_reschedule_enabled: true, retain_late_cancellation_deposit: true, retain_no_show_deposit: true, policy_text: "Your deposit reserves the appointment and is applied to your total." }, notifications: { customer_confirmation_email: true, customer_confirmation_sms: false, reminder_24h_email: true, reminder_24h_sms: false, reminder_2h_sms: false, barber_new_booking_email: true, barber_new_booking_sms: false }, blocks: [], demo: true });
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Database is not configured." }, { status: 500 });
  const [{ data: policy }, { data: notifications }, { data: blocks }] = await Promise.all([
    admin.from("booking_policies").select("*").eq("barber_id", ctx.barber.id).maybeSingle(),
    admin.from("notification_preferences").select("*").eq("barber_id", ctx.barber.id).maybeSingle(),
    admin.from("blocked_times").select("*").eq("barber_id", ctx.barber.id).gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);
  return NextResponse.json({ policy, notifications, blocks: blocks || [] });
}

export async function POST(request: Request) {
  const ctx = await getAuthenticatedBarber();
  if (ctx.demo) return NextResponse.json({ saved: true, demo: true });
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Database is not configured." }, { status: 500 });
  const body = await request.json();
  const action = String(body.action || "save");

  if (action === "add_block") {
    const item = body.item || {};
    const startsAt = new Date(item.startsAt);
    const endsAt = new Date(item.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) return NextResponse.json({ error: "Choose a valid start and end time." }, { status: 400 });
    const { error } = await admin.from("blocked_times").insert({ barber_id: ctx.barber.id, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), reason: item.reason || "Unavailable", block_type: item.blockType || "personal", created_by: ctx.user.id });
    if (error) throw error;
    return GET();
  }
  if (action === "delete_block") {
    await admin.from("blocked_times").delete().eq("id", body.id).eq("barber_id", ctx.barber.id);
    return GET();
  }

  const policy = body.policy || {};
  const notifications = body.notifications || {};
  const { error: policyError } = await admin.from("booking_policies").upsert({
    barber_id: ctx.barber.id,
    minimum_notice_minutes: Number(policy.minimum_notice_minutes ?? 120),
    max_advance_days: Number(policy.max_advance_days ?? 60),
    cancellation_window_hours: Number(policy.cancellation_window_hours ?? 24),
    reschedule_window_hours: Number(policy.reschedule_window_hours ?? 12),
    max_reschedules: Number(policy.max_reschedules ?? 2),
    same_day_booking: Boolean(policy.same_day_booking),
    auto_confirm_after_payment: policy.auto_confirm_after_payment !== false,
    retain_late_cancellation_deposit: policy.retain_late_cancellation_deposit !== false,
    retain_no_show_deposit: policy.retain_no_show_deposit !== false,
    require_customer_phone: policy.require_customer_phone !== false,
    customer_cancellation_enabled: policy.customer_cancellation_enabled !== false,
    customer_reschedule_enabled: policy.customer_reschedule_enabled !== false,
    policy_text: String(policy.policy_text || ""),
  }, { onConflict: "barber_id" });
  if (policyError) throw policyError;
  const { error: notificationError } = await admin.from("notification_preferences").upsert({
    barber_id: ctx.barber.id,
    customer_confirmation_email: notifications.customer_confirmation_email !== false,
    customer_confirmation_sms: Boolean(notifications.customer_confirmation_sms),
    reminder_24h_email: notifications.reminder_24h_email !== false,
    reminder_24h_sms: Boolean(notifications.reminder_24h_sms),
    reminder_2h_sms: Boolean(notifications.reminder_2h_sms),
    barber_new_booking_email: notifications.barber_new_booking_email !== false,
    barber_new_booking_sms: Boolean(notifications.barber_new_booking_sms),
    review_request_email: notifications.review_request_email !== false,
  }, { onConflict: "barber_id" });
  if (notificationError) throw notificationError;
  await admin.from("barber_profiles").update({ cancellation_window_hours: Number(policy.cancellation_window_hours ?? 24) }).eq("id", ctx.barber.id);
  return GET();
}
