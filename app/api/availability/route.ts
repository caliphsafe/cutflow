import { NextResponse } from "next/server";
import { availability as demoAvailability, bookings as demoBookings, demoBarber, services as demoServices } from "@/lib/demo-data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function minutesFromTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return (hours * 60) + minutes;
}

function timeFromMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function overlaps(start: number, end: number, busyStart: number, busyEnd: number) {
  return start < busyEnd && end > busyStart;
}

function localParts(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function buildSlots(startTime: string, endTime: string, duration: number, interval: number, buffer: number, busy: Array<[number, number]>) {
  const slots: string[] = [];
  const opening = minutesFromTime(startTime);
  const closing = minutesFromTime(endTime);
  for (let start = opening; start + duration <= closing; start += interval) {
    const end = start + duration + buffer;
    if (!busy.some(([busyStart, busyEnd]) => overlaps(start, end, busyStart, busyEnd))) {
      slots.push(timeFromMinutes(start));
    }
  }
  return slots;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barberSlug = searchParams.get("barberSlug") || "";
  const serviceId = searchParams.get("serviceId") || "";
  const date = searchParams.get("date") || "";
  if (!barberSlug || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Barber, service and date are required." }, { status: 400 });
  }

  const weekday = new Date(`${date}T12:00:00`).getDay();
  const admin = createAdminSupabaseClient();

  if (!admin) {
    const service = demoServices.find((item) => item.id === serviceId);
    const rule = demoAvailability[weekday]?.[0];
    if (!service || !rule || barberSlug !== demoBarber.slug) return NextResponse.json({ slots: [] });
    const busy = demoBookings
      .filter((booking) => booking.startsAt.slice(0, 10) === date && ["pending_deposit", "confirmed", "checked_in"].includes(booking.status))
      .map((booking) => [
        minutesFromTime(booking.startsAt.slice(11, 16)),
        minutesFromTime(booking.endsAt.slice(11, 16)),
      ] as [number, number]);
    return NextResponse.json({ slots: buildSlots(rule[0], rule[1], service.durationMinutes, 30, 0, busy), demo: true });
  }

  const { data: barber } = await admin
    .from("barber_profiles")
    .select("id,timezone,slot_interval_minutes,buffer_minutes,accepting_bookings")
    .eq("slug", barberSlug)
    .eq("active", true)
    .maybeSingle();
  if (!barber || !barber.accepting_bookings) return NextResponse.json({ slots: [] });

  const [{ data: service }, { data: rule }, { data: bookings }, { data: blocks }] = await Promise.all([
    admin.from("services").select("id,duration_minutes").eq("id", serviceId).eq("barber_id", barber.id).eq("active", true).maybeSingle(),
    admin.from("availability_rules").select("start_time,end_time,active").eq("barber_id", barber.id).eq("weekday", weekday).maybeSingle(),
    admin.from("bookings").select("appointment_time,duration_minutes,status,deposit_expires_at").eq("barber_id", barber.id).eq("appointment_date", date).in("status", ["pending_deposit", "confirmed", "checked_in"]),
    admin.from("blocked_times").select("starts_at,ends_at").eq("barber_id", barber.id).lt("starts_at", `${date}T23:59:59.999Z`).gt("ends_at", `${date}T00:00:00.000Z`),
  ]);

  if (!service || !rule?.active || !rule.start_time || !rule.end_time) return NextResponse.json({ slots: [] });

  const now = Date.now();
  const busy: Array<[number, number]> = (bookings || [])
    .filter((booking) => booking.status !== "pending_deposit" || !booking.deposit_expires_at || new Date(booking.deposit_expires_at).getTime() > now)
    .map((booking) => {
      const start = minutesFromTime(booking.appointment_time);
      return [start, start + booking.duration_minutes + barber.buffer_minutes] as [number, number];
    });

  for (const block of blocks || []) {
    const start = localParts(block.starts_at, barber.timezone);
    const end = localParts(block.ends_at, barber.timezone);
    if (start.date === date || end.date === date) {
      busy.push([
        start.date < date ? 0 : minutesFromTime(start.time),
        end.date > date ? 24 * 60 : minutesFromTime(end.time),
      ]);
    }
  }

  return NextResponse.json({
    slots: buildSlots(rule.start_time, rule.end_time, service.duration_minutes, barber.slot_interval_minutes, barber.buffer_minutes, busy),
  });
}
