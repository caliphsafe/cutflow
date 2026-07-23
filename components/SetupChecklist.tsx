"use client";

import Link from "next/link";
import { Check, Circle, ExternalLink } from "lucide-react";

export type SetupStatus = {
  steps: { profile: boolean; media: boolean; services: boolean; availability: boolean; payments: boolean; subscription: boolean };
  ready: boolean;
  published: boolean;
};

const rows = [
  ["profile", "Complete shop profile", "/dashboard/storefront"],
  ["media", "Add barber and shop photos", "/dashboard/media"],
  ["services", "Add at least one service", "/dashboard/services"],
  ["availability", "Set weekly availability", "/dashboard/settings"],
  ["payments", "Connect Stripe", "/dashboard/connections"],
  ["subscription", "Activate CutFlow subscription", "/dashboard/subscription"],
] as const;

export function SetupChecklist({ status }: { status: SetupStatus }) {
  const complete = Object.values(status.steps).filter(Boolean).length;
  return <section className="dashboard-card setup-checklist">
    <header><div><p className="eyebrow">LAUNCH CHECKLIST</p><h2>{status.ready ? "Ready to publish" : `${complete} of ${rows.length} complete`}</h2></div><span>{Math.round((complete / rows.length) * 100)}%</span></header>
    <div className="setup-progress"><i style={{ width: `${(complete / rows.length) * 100}%` }}/></div>
    <div className="setup-rows">{rows.map(([key, label, href]) => <Link href={href} key={key} className={status.steps[key] ? "done" : ""}>{status.steps[key] ? <Check/> : <Circle/>}<span>{label}</span><ExternalLink/></Link>)}</div>
  </section>;
}
