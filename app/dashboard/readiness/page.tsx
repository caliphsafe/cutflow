import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CreditCard,
  Mail,
  MessageSquareText,
  ReceiptText,
  Smartphone,
} from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";

const businessTools = [
  {
    id: "stripe",
    eyebrow: "CUSTOMER PAYMENTS",
    title: "Accept deposits and balances",
    copy: "Connect your Stripe account once. Customers can pay securely, and the money is processed through your Stripe account without a CutFlow booking commission.",
    href: "/dashboard/connections",
    action: "Open payment setup",
    icon: CreditCard,
  },
  {
    id: "subscription",
    eyebrow: "YOUR CUTFLOW PLAN",
    title: "Keep your business tools active",
    copy: "Review your trial, monthly plan and billing details. Appointment payments remain separate from your CutFlow subscription.",
    href: "/dashboard/subscription",
    action: "Manage my plan",
    icon: ReceiptText,
  },
  {
    id: "email",
    eyebrow: "BOOKING CONFIRMATIONS",
    title: "Keep customers informed",
    copy: "Choose the confirmation emails customers receive after booking and the new-booking alerts sent to you. CutFlow handles delivery for you.",
    href: "/dashboard/policies#notifications",
    action: "Choose email messages",
    icon: Mail,
  },
  {
    id: "reminders",
    eyebrow: "APPOINTMENT REMINDERS",
    title: "Reduce forgotten appointments",
    copy: "Turn appointment reminders on or off and choose the messages that make sense for your business.",
    href: "/dashboard/policies#notifications",
    action: "Choose reminders",
    icon: CalendarCheck2,
  },
  {
    id: "sms",
    eyebrow: "OPTIONAL TEXT MESSAGES",
    title: "Reach customers by text",
    copy: "Text confirmations and reminders can be enabled when text messaging is available for your CutFlow account. Customers must agree to receive them.",
    href: "/dashboard/policies#notifications",
    action: "Review text options",
    icon: MessageSquareText,
  },
];

export default function ReadinessPage() {
  return <div className="dashboard-page readiness-setup-page">
    <header className="page-header"><div><p className="eyebrow">BUSINESS SETUP</p><h1>Finish the experience your customers will use.</h1><p>You only choose your business settings. CutFlow handles payment connections and message delivery behind the scenes.</p></div></header>

    <section className="readiness-setup-grid barber-tools-grid">
      {businessTools.map(({ id, eyebrow, title, copy, href, action, icon: Icon }) => <article id={id} className="dashboard-card service-setup-card" key={id}>
        <header><span className="service-setup-icon"><Icon/></span><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><span className="service-status ready">Included</span></header>
        <p>{copy}</p>
        <div className="service-action-row"><Link className="button" href={href}>{action} <ArrowRight/></Link></div>
      </article>)}

      <article id="app" className="dashboard-card service-setup-card">
        <header><span className="service-setup-icon"><Smartphone/></span><div><p className="eyebrow">PHONE ACCESS</p><h2>Add CutFlow to your Home Screen</h2></div><span className="service-status ready">Available</span></header>
        <p>Open your dashboard like an app for quicker access to bookings, clients and daily business activity.</p>
        <div className="service-action-row"><InstallAppButton/></div>
      </article>
    </section>
  </div>;
}
