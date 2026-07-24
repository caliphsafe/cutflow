import Link from "next/link";
import { ArrowRight, CalendarCheck2, CheckCircle2, CreditCard, Images, ReceiptText, Scissors, Smartphone, Store } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";

const items = [
  [Store, "Storefront", "Add your business name, booking link, description, location and customer-facing details.", "/dashboard/storefront", "Edit storefront"],
  [Images, "Photos and branding", "Upload the images customers see across your storefront, services and products.", "/dashboard/media", "Manage photos"],
  [Scissors, "Services and prices", "Choose what customers can book, how long each service takes and what it costs.", "/dashboard/services", "Manage services"],
  [CalendarCheck2, "Hours and booking rules", "Set your weekly schedule, notice requirements, cancellation policy and reminder preferences.", "/dashboard/policies", "Set booking rules"],
  [CreditCard, "Customer payments", "Connect Stripe so deposits and balances are paid to your own connected account.", "/dashboard/connections", "Review Stripe"],
  [ReceiptText, "CutFlow plan", "Review your free trial, monthly membership and billing information.", "/dashboard/subscription", "Review plan"],
] as const;

export default function ReadinessPage(){return <div className="dashboard-page readiness-setup-page">
  <header className="page-header"><div><p className="eyebrow">BUSINESS SETUP</p><h1>Get ready for customers.</h1><p>Choose how your business should look and operate. CutFlow handles payment confirmation, email delivery and reminder technology behind the scenes.</p></div></header>
  <section className="readiness-setup-grid customer-setup-grid">{items.map(([Icon,title,copy,href,action])=><article className="dashboard-card service-setup-card" key={title}><header><span className="service-setup-icon"><Icon/></span><div><p className="eyebrow">BUSINESS SETUP</p><h2>{title}</h2></div><CheckCircle2 className="customer-setup-check"/></header><p>{copy}</p><div className="service-action-row"><Link className="button" href={href}>{action}<ArrowRight/></Link></div></article>)}</section>
  <section className="dashboard-card service-setup-card app-setup-card"><header><span className="service-setup-icon"><Smartphone/></span><div><p className="eyebrow">QUICK ACCESS</p><h2>Add CutFlow to your phone</h2></div></header><p>Use CutFlow like an app from your Home Screen.</p><InstallAppButton/></section>
</div>}
