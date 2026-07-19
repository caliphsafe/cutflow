import Link from "next/link";
import { CalendarPlus, CheckCircle2, Clock3, MapPin, ReceiptText } from "lucide-react";
import { getCustomerPortalBooking } from "@/lib/customer-portal";
import { money } from "@/lib/format";

function humanDate(value: string) { return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function humanTime(value: string) { const [hour, minute] = value.slice(0,5).split(":").map(Number); const date = new Date(); date.setHours(hour, minute); return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date); }

export default async function BookingSuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const values = await searchParams;
  const token = typeof values.portal_token === "string" ? values.portal_token : "";
  const data = token ? await getCustomerPortalBooking(token) : null;
  if (!data) return <main className="success-page"><section className="success-card glass-card"><span className="success-icon"><Clock3/></span><p className="eyebrow">PAYMENT SUBMITTED</p><h1>Confirmation is being finalized.</h1><p>Your payment provider has returned you to CutFlow. The appointment will be confirmed after the secure payment notification is verified.</p><Link className="button" href="/">Return to CutFlow</Link></section></main>;

  const booking = data.booking;
  const barber = Array.isArray(booking.barber_profiles) ? booking.barber_profiles[0] : booking.barber_profiles;
  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
  const confirmed = booking.status === "confirmed" || booking.payment_status === "deposit_paid" || booking.payment_status === "paid";
  return <main className="success-page"><section className="success-card glass-card">
    <span className="success-icon">{confirmed ? <CheckCircle2/> : <Clock3/>}</span>
    <p className="eyebrow">{confirmed ? "APPOINTMENT CONFIRMED" : "PAYMENT VERIFICATION IN PROGRESS"}</p>
    <h1>{confirmed ? "Your appointment is reserved." : "We are confirming your payment."}</h1>
    <p>{confirmed ? `${money(booking.deposit_cents)} has been credited toward your appointment total. Keep the private management link below for rescheduling, cancellation, balance payment and receipts.` : "This page updates only after the payment provider sends a verified confirmation. Your selected time remains held during processing."}</p>
    <div className="success-details"><div><span>CONFIRMATION</span><b>{booking.booking_code}</b></div><div><span>SERVICE</span><b>{service?.name || "Appointment"}</b></div><div><span>DATE & TIME</span><b>{humanDate(booking.appointment_date)} · {humanTime(booking.appointment_time)}</b></div><div><span>DEPOSIT</span><b>{confirmed ? `${money(booking.deposit_cents)} paid` : "Processing"}</b></div></div>
    <div className="success-actions"><a className="button" href={`/api/customer/booking/${encodeURIComponent(token)}/calendar`}><CalendarPlus/> Add to calendar</a><Link className="button secondary" href={`/manage/${encodeURIComponent(token)}`}><ReceiptText/> Manage & view receipt</Link></div>
    <div className="arrival-note"><MapPin/><p>{barber?.address}, {barber?.city}. The remaining {money(booking.balance_cents)} can be paid through the private appointment page when online balance payment is available.</p></div>
    <Link href={`/b/${barber?.slug}`}>Return to {barber?.shop_name}</Link>
  </section></main>;
}
