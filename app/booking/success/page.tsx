import Link from "next/link";
import { CalendarPlus, CheckCircle2, MapPin, ReceiptText } from "lucide-react";
import { demoBarber } from "@/lib/demo-data";

export default async function BookingSuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const values = await searchParams;
  const booking = typeof values.booking === "string" ? values.booking : "BK-DEMO";
  return <main className="success-page"><section className="success-card glass-card"><span className="success-icon"><CheckCircle2/></span><p className="eyebrow">YOUR CHAIR IS RESERVED</p><h1>Booking confirmed.</h1><p>Your $10 deposit has been applied to the appointment. A confirmation has been sent with the exact date, start time and request details.</p><div className="success-details"><div><span>CONFIRMATION</span><b>{booking}</b></div><div><span>BARBER</span><b>{demoBarber.displayName}</b></div><div><span>LOCATION</span><b>{demoBarber.address}, {demoBarber.city}</b></div><div><span>DEPOSIT</span><b>$10 paid</b></div></div><div className="success-actions"><button className="button"><CalendarPlus/> Add to calendar</button><button className="button secondary"><ReceiptText/> View receipt</button></div><div className="arrival-note"><MapPin/><p>Please arrive on time. Your remaining service and pickup-product balance is due directly to the barber at the appointment.</p></div><Link href={`/b/${demoBarber.slug}`}>Return to {demoBarber.shopName}</Link></section></main>;
}
