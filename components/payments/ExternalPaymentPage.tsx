"use client";

import { CalendarDays, CheckCircle2, Copy, ExternalLink, LoaderCircle, MapPin, Scissors, ShieldCheck, WalletCards } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { money } from "@/lib/format";

const providerCopy: Record<string, string> = {
  cash_app: "Open Cash App, send the exact deposit to your barber, and include the booking reference in the payment note.",
  venmo: "Open Venmo, pay your barber’s Business Profile, and include the booking reference in the payment note.",
};

function humanDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}

function humanTime(value: string) {
  if (!value) return "";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

type ExternalPaymentPageProps = {
  token: string;
  bookingCode: string;
  customerName: string;
  amountCents: number;
  barberName: string;
  shopName: string;
  provider: string;
  label: string;
  accountHandle: string;
  paymentUrl: string;
  initiallyConfirmed: boolean;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  address: string;
  city: string;
};

export function ExternalPaymentPage(props: ExternalPaymentPageProps) {
  const [confirmed, setConfirmed] = useState(props.initiallyConfirmed);
  const [copied, setCopied] = useState("");

  const checkPayment = useCallback(async () => {
    if (confirmed) return;
    try {
      const response = await fetch(`/api/payments/external/status?token=${encodeURIComponent(props.token)}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (data.confirmed) setConfirmed(true);
    } catch {
      // Keep the page in its waiting state and try again on the next poll/focus.
    }
  }, [confirmed, props.token]);

  useEffect(() => {
    if (confirmed) return;
    void checkPayment();
    const timer = window.setInterval(checkPayment, 3500);
    const onFocus = () => void checkPayment();
    const onVisibility = () => { if (document.visibilityState === "visible") void checkPayment(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkPayment, confirmed]);

  async function copy(value: string, label: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1600);
  }

  async function openPayment() {
    await copy(props.bookingCode, "code");
    const fallback = props.provider === "cash_app" ? "https://cash.app/send" : "https://venmo.com/";
    window.location.href = props.paymentUrl || fallback;
  }

  if (confirmed) {
    const location = [props.address, props.city].filter(Boolean).join(", ");
    return <main className="external-pay-page">
      <section className="external-pay-card confirmed booking-confirmation-card">
        <CheckCircle2 className="confirmation-check" />
        <p className="eyebrow">BOOKING CONFIRMED</p>
        <h1>You’re booked, {props.customerName.split(" ")[0]}.</h1>
        <p>Your {money(props.amountCents)} {props.label} deposit was received and matched to this appointment. You can use this page as your confirmation.</p>

        <div className="onpage-confirmation-summary">
          <div><Scissors /><span><small>SERVICE</small><b>{props.serviceName || "Appointment"}</b></span></div>
          <div><CalendarDays /><span><small>DATE & TIME</small><b>{humanDate(props.appointmentDate)}</b><em>{humanTime(props.appointmentTime)}</em></span></div>
          <div><WalletCards /><span><small>DEPOSIT PAID</small><b>{money(props.amountCents)} · {props.label}</b></span></div>
          <div><ShieldCheck /><span><small>BOOKING REFERENCE</small><b>{props.bookingCode}</b></span></div>
          {location && <div><MapPin /><span><small>LOCATION</small><b>{props.shopName || props.barberName}</b><em>{location}</em></span></div>}
        </div>

        <div className="confirmation-barber-note">
          <CheckCircle2 />
          <span><b>{props.barberName} has been notified.</b><small>No customer confirmation email is required—this page is your live CutFlow confirmation.</small></span>
        </div>

        <div className="confirmation-actions">
          <Link className="button" href={`/manage/${props.token}`}>View appointment</Link>
          <button className="button secondary" onClick={() => copy(props.bookingCode, "confirmation-code")}><Copy /> {copied === "confirmation-code" ? "Copied" : "Copy booking reference"}</button>
        </div>
        <small className="confirmation-save-note">Keep this page open, bookmark it, or take a screenshot for your records.</small>
      </section>
    </main>;
  }

  return <main className="external-pay-page"><section className="external-pay-card"><div className={`external-provider-mark ${props.provider}`}>{props.provider === "cash_app" ? "$" : "V"}</div><p className="eyebrow">FINAL STEP · RESERVATION DEPOSIT</p><h1>Pay {money(props.amountCents)} with {props.label}.</h1><p>{providerCopy[props.provider]}</p>
    <div className="external-pay-details">
      <div><span>DEPOSIT</span><strong>{money(props.amountCents)}</strong><button onClick={() => copy((props.amountCents / 100).toFixed(2), "amount")}><Copy/> {copied === "amount" ? "Copied" : "Copy"}</button></div>
      <div><span>PAY</span><strong>{props.accountHandle || props.barberName}</strong><button onClick={() => copy(props.accountHandle, "account")}><Copy/> {copied === "account" ? "Copied" : "Copy"}</button></div>
      <div className="booking-code-row"><span>PAYMENT NOTE</span><strong>{props.bookingCode}</strong><button onClick={() => copy(props.bookingCode, "code")}><Copy/> {copied === "code" ? "Copied" : "Copy"}</button></div>
    </div>
    <p className="external-note"><ShieldCheck/> Put <b>{props.bookingCode}</b> in the payment note. This is how CutFlow safely matches your payment to the correct appointment.</p>
    <button className="button external-pay-open" onClick={openPayment}>Copy booking code & open {props.label} <ExternalLink/></button>
    <small className="external-open-hint">Your booking code is copied automatically. In {props.label}, enter {money(props.amountCents)}, paste the code into the payment note, and send.</small>
    <div className="external-waiting"><LoaderCircle className="spin"/><span><b>Waiting for your payment</b><small>After you pay, return to this page. It will automatically change to your booking confirmation as soon as CutFlow matches the barber’s payment notice.</small></span></div>
    <p className="external-safety">Do not pay twice if confirmation is delayed. Your appointment stays pending until the deposit is matched, and your barber can verify it if needed.</p>
  </section></main>;
}
