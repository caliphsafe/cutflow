"use client";

import { ArrowRight, CheckCircle2, CircleAlert, LoaderCircle, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InstallAppButton } from "@/components/InstallAppButton";

 type SetupStatus = {
  steps: { profile: boolean; media: boolean; services: boolean; availability: boolean; payments: boolean; subscription: boolean };
  ready: boolean;
  published: boolean;
};

type NotificationSettings = Record<string, boolean>;

type GuideItem = {
  id: string;
  label: string;
  note: string;
  href: string;
  ready: boolean;
  action: string;
};

export function LaunchReadiness() {
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/data?resource=setup", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/dashboard/policies", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([setupPayload, policyPayload]) => {
      setSetup(setupPayload.data || null);
      setNotifications(policyPayload.notifications || {});
    }).catch(() => setSetup(null));
  }, []);

  const items = useMemo<GuideItem[]>(() => {
    if (!setup) return [];
    const messagesReady = Boolean(notifications.customer_confirmation_email && notifications.barber_new_booking_email);
    return [
      { id: "storefront", label: "Storefront identity", note: "Add a barber portrait or brand logo; cover, shop and gallery photos are optional.", href: "/dashboard/storefront", ready: setup.steps.profile && setup.steps.media, action: "Edit storefront" },
      { id: "services", label: "Services and pricing", note: "Add the appointments customers can book, including price and duration.", href: "/dashboard/services", ready: setup.steps.services, action: "Manage services" },
      { id: "availability", label: "Hours and availability", note: "Choose when customers can see and reserve open appointment times.", href: "/dashboard/settings#availability", ready: setup.steps.availability, action: "Set hours" },
      { id: "payments", label: "Customer payments", note: "Enable Cash App or Venmo, or connect a payment processor. Any active method meets the storefront requirement.", href: "/dashboard/connections", ready: setup.steps.payments, action: "Open payments" },
      { id: "subscription", label: "CutFlow plan", note: "Keep your workspace, booking page and business tools active.", href: "/dashboard/subscription", ready: setup.steps.subscription, action: "Manage plan" },
      { id: "messages", label: "Customer messages", note: "Choose confirmation emails, reminders and your own new-booking alerts.", href: "/dashboard/policies#notifications", ready: messagesReady, action: "Choose messages" },
    ];
  }, [notifications, setup]);

  if (!setup) return <section className="dashboard-card readiness-card"><LoaderCircle className="spin"/><span>Loading your launch guide…</span></section>;

  const complete = items.filter((item) => item.ready).length;
  return <section className="dashboard-card readiness-card">
    <header><div><p className="eyebrow">YOUR LAUNCH GUIDE</p><h2>{setup.ready ? "Ready to welcome customers" : `${complete} of ${items.length} business steps complete`}</h2><p>Every item below opens the exact place where you can finish it. CutFlow handles the behind-the-scenes delivery and payment connections.</p></div><Smartphone/></header>
    <div className="readiness-grid">{items.map((item) => <Link href={item.href} key={item.id} className={`readiness-item ${item.ready ? "ready" : "missing"}`}>{item.ready ? <CheckCircle2/> : <CircleAlert/>}<div><b>{item.label}</b><p>{item.note}</p><small>{item.action} <ArrowRight/></small></div><span>{item.ready ? "Complete" : "Finish"}</span></Link>)}</div>
    <footer><InstallAppButton compact/><small>Add CutFlow to your phone for quick, full-screen access to your bookings and clients.</small></footer>
  </section>;
}
