import { getCustomerPortalBooking } from "@/lib/customer-portal";

function escapeIcs(value: string) { return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
function stamp(value: string) { return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); }

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getCustomerPortalBooking(token);
  if (!data) return new Response("Appointment link is invalid or expired.", { status: 404 });
  const booking = data.booking;
  const barber = Array.isArray(booking.barber_profiles) ? booking.barber_profiles[0] : booking.barber_profiles;
  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
  const start = booking.starts_at || `${booking.appointment_date}T${booking.appointment_time}`;
  const end = booking.ends_at || new Date(new Date(start).getTime() + Number(booking.duration_minutes || 45) * 60000).toISOString();
  const location = [barber?.address, barber?.city].filter(Boolean).join(", ");
  const manageUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"}/manage/${token}`;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CutFlow//Booking//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${booking.id}@cutflow`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeIcs(`${service?.name || "Barber appointment"} with ${barber?.display_name || "your barber"}`)}`,
    `LOCATION:${escapeIcs(location)}`, `DESCRIPTION:${escapeIcs(`Booking ${booking.booking_code}. Manage appointment: ${manageUrl}`)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="cutflow-${booking.booking_code}.ics"`, "Cache-Control": "private, no-store" } });
}
