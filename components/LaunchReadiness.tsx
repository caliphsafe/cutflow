"use client";

import { CheckCircle2, CircleAlert, LoaderCircle, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { InstallAppButton } from "@/components/InstallAppButton";

type CheckItem = { id: string; label: string; ready: boolean; optional?: boolean; note: string };

export function LaunchReadiness() {
  const [checks, setChecks] = useState<CheckItem[] | null>(null);
  useEffect(() => {
    fetch("/api/system/readiness", { cache: "no-store" }).then((response) => response.json()).then((payload) => setChecks(payload.checks || [])).catch(() => setChecks([]));
  }, []);
  if (!checks) return <section className="dashboard-card readiness-card"><LoaderCircle className="spin"/><span>Checking customer readiness…</span></section>;
  return <section className="dashboard-card readiness-card">
    <header><div><p className="eyebrow">CUSTOMER READINESS</p><h2>Live service check</h2><p>These platform services support booking, payment confirmation and customer communication.</p></div><Smartphone/></header>
    <div className="readiness-grid">{checks.map((item) => <article key={item.id} className={item.ready ? "ready" : item.optional ? "optional" : "missing"}>{item.ready ? <CheckCircle2/> : <CircleAlert/>}<div><b>{item.label}</b><p>{item.note}</p></div><span>{item.ready ? "Ready" : item.optional ? "Optional" : "Needs setup"}</span></article>)}</div>
    <footer><InstallAppButton compact/><small>iPhone installation uses Safari’s “Add to Home Screen.” Android uses the browser install prompt when available.</small></footer>
  </section>;
}
