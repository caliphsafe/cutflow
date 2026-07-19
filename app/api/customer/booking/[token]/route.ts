import { NextResponse } from "next/server";
import { getCustomerPortalBooking } from "@/lib/customer-portal";
import { minutesFromClock, validateBookingWindow, zonedDateTimeToUtc } from "@/lib/booking-time";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function overlaps(start: number, end: number, busyStart: number, busyEnd: number) {
  return start < busyEnd && end > busyStart;
}

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getCustomerPortalBooking(token);
  if (!data) return NextResponse.json({ error: "Appointment link is invalid or expired." }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getCustomerPortalBooking(token);
  if (!data) return NextResponse.json({ error: "Appointment link is invalid or expired." }, { status: 404 });

  const body = await request.json();
  const action = String(body.action || "");
  const booking = data.booking;
  const policy = data.policy || {};
  const barber = Array.isArray(booking.barber_profiles) ? booking.barber_profiles[0] : booking.barber_profiles;
  const timezone = barber?.timezone || booking.timezone || "America/New_York";
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Database is unavailable." }, { status: 500 });

  const appointmentUtc = zonedDateTimeToUtc(booking.appointment_date, booking.appointment_time.slice(0, 5), timezone);
  const hoursAway = (appointmentUtc.getTime() - Date.now()) / 3_600_000;

  if (action === "cancel") {
    if (policy.customer_cancellation_enabled === false) return NextResponse.json({ error: "Online cancellation is disabled. Contact the barber." }, { status: 403 });
    if (["cancelled", "completed"].includes(booking.status)) return NextResponse.json({ error: "This appointment can no longer be cancelled." }, { status: 400 });
    const late = hoursAway < Number(policy.cancellation_window_hours || 24);
    const retained = late && policy.retain_late_cancellation_deposit !== false;
    await admin.from("bookings").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "customer",
      cancellation_reason: late ? "Customer cancellation inside policy window" : "Customer cancellation",
      deposit_disposition: retained ? "retained" : "refundable",
    }).eq("id", booking.id);
    await admin.from("product_reservations").update({ status: "cancelled" }).eq("booking_id", booking.id).eq("status", "reserved");
    await admin.from("booking_events").insert({ booking_id: booking.id, event_type: "customer_cancelled", details: { late, deposit_retained: retained } });
    return NextResponse.json({ message: retained ? "Appointment cancelled. The deposit is retained under the barber’s late-cancellation policy." : "Appointment cancelled. The barber can process any eligible deposit refund." });
  }

  if (action === "reschedule") {
    if (policy.customer_reschedule_enabled === false) return NextResponse.json({ error: "Online rescheduling is disabled. Contact the barber." }, { status: 403 });
    if (["cancelled", "completed"].includes(booking.status)) return NextResponse.json({ error: "This appointment can no longer be rescheduled." }, { status: 400 });
    if (hoursAway < Number(policy.reschedule_window_hours || 12)) return NextResponse.json({ error: "This appointment is inside the online rescheduling cutoff." }, { status: 403 });
    if (Number(booking.reschedule_count || 0) >= Number(policy.max_reschedules || 2)) return NextResponse.json({ error: "This appointment has reached its reschedule limit." }, { status: 403 });

    const selectedDate = String(body.selectedDate || "");
    const selectedTime = String(body.selectedTime || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || !/^\d{2}:\d{2}$/.test(selectedTime)) return NextResponse.json({ error: "Choose a valid new date and time." }, { status: 400 });

    const bookingWindow = validateBookingWindow({ date: selectedDate, time: selectedTime, timezone, policy });
    if (!bookingWindow.valid) return NextResponse.json({ error: bookingWindow.reason }, { status: 400 });

    const weekday = new Date(`${selectedDate}T12:00:00`).getDay();
    const [{ data: rule }, { data: barberSettings }, { data: blocks }, { data: otherBookings }] = await Promise.all([
      admin.from("availability_rules").select("start_time,end_time,active").eq("barber_id", booking.barber_id).eq("weekday", weekday).maybeSingle(),
      admin.from("barber_profiles").select("slot_interval_minutes,buffer_minutes").eq("id", booking.barber_id).maybeSingle(),
      admin.from("blocked_times").select("starts_at,ends_at").eq("barber_id", booking.barber_id).lt("starts_at", new Date(bookingWindow.appointmentUtc.getTime() + 86_400_000).toISOString()).gt("ends_at", new Date(bookingWindow.appointmentUtc.getTime() - 86_400_000).toISOString()),
      admin.from("bookings").select("id,appointment_time,duration_minutes,status,deposit_expires_at").eq("barber_id", booking.barber_id).eq("appointment_date", selectedDate).neq("id", booking.id).in("status", ["pending_deposit", "confirmed", "checked_in"]),
    ]);

    const startMinutes = minutesFromClock(selectedTime);
    const duration = Number(booking.duration_minutes || 0);
    const buffer = Number(barberSettings?.buffer_minutes || 0);
    const opening = rule?.start_time ? minutesFromClock(rule.start_time) : -1;
    const closing = rule?.end_time ? minutesFromClock(rule.end_time) : -1;
    const interval = Math.max(5, Number(barberSettings?.slot_interval_minutes || 30));

    if (!rule?.active || opening < 0 || startMinutes < opening || startMinutes + duration > closing || (startMinutes - opening) % interval !== 0) {
      return NextResponse.json({ error: "That time is outside the barber’s available booking schedule." }, { status: 400 });
    }

    const startUtc = bookingWindow.appointmentUtc.getTime();
    const endUtc = startUtc + (duration + buffer) * 60_000;
    if ((blocks || []).some((block) => overlaps(startUtc, endUtc, new Date(block.starts_at).getTime(), new Date(block.ends_at).getTime()))) {
      return NextResponse.json({ error: "That time is blocked on the barber’s calendar. Choose another opening." }, { status: 409 });
    }

    const now = Date.now();
    const overlapsBooking = (otherBookings || [])
      .filter((other) => other.status !== "pending_deposit" || !other.deposit_expires_at || new Date(other.deposit_expires_at).getTime() > now)
      .some((other) => {
        const otherStart = minutesFromClock(other.appointment_time);
        const otherEnd = otherStart + Number(other.duration_minutes || 0) + buffer;
        return overlaps(startMinutes, startMinutes + duration + buffer, otherStart, otherEnd);
      });
    if (overlapsBooking) return NextResponse.json({ error: "That time was just taken. Choose another opening." }, { status: 409 });

    const { error } = await admin.from("bookings").update({ appointment_date: selectedDate, appointment_time: selectedTime, reschedule_count: Number(booking.reschedule_count || 0) + 1 }).eq("id", booking.id);
    if (error?.code === "23P01") return NextResponse.json({ error: "That time was just taken. Choose another opening." }, { status: 409 });
    if (error) throw error;
    await admin.from("booking_events").insert({ booking_id: booking.id, event_type: "customer_rescheduled", details: { from_date: booking.appointment_date, from_time: booking.appointment_time, to_date: selectedDate, to_time: selectedTime } });
    return NextResponse.json({ message: "Your appointment has been rescheduled." });
  }

  return NextResponse.json({ error: "Unsupported appointment action." }, { status: 400 });
}
