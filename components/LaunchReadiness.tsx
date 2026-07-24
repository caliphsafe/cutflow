"use client";

import Link from "next/link";
import { CheckCircle2, CircleAlert, LoaderCircle, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { InstallAppButton } from "@/components/InstallAppButton";

type CheckItem = { id: string; label: string; ready: boolean; optional?: boolean; note: string; href?: string; action?: string };

export function LaunchReadiness() {
  const [checks, setChecks] = useState<CheckItem[] | null>(null);
  useEffect(() => { fetch("/api/system/readiness", { cache: "no-store" }).then(r=>r.json()).then(p=>setChecks(p.checks||[])).catch(()=>setChecks([])); }, []);
  if (!checks) return <section className="dashboard-card readiness-card"><LoaderCircle className="spin"/><span>Checking your launch progress…</span></section>;
  return <section className="dashboard-card readiness-card">
    <header><div><p className="eyebrow">GET READY TO BOOK</p><h2>Your launch checklist</h2><p>Finish the business details customers need. CutFlow manages the technical services behind the scenes.</p></div><Smartphone/></header>
    <div className="readiness-grid">{checks.map(item=>{
      const content=<>{item.ready?<CheckCircle2/>:<CircleAlert/>}<div><b>{item.label}</b><p>{item.note}</p>{item.action&&<strong>{item.action} →</strong>}</div><span>{item.ready?"Ready":item.optional?"Optional":"Finish setup"}</span></>;
      return item.href?<Link href={item.href} key={item.id} className={item.ready?"ready":item.optional?"optional":"missing"}>{content}</Link>:<article key={item.id} className={item.ready?"ready":item.optional?"optional":"missing"}>{content}</article>;
    })}</div>
    <footer><InstallAppButton compact/><small>Add CutFlow to your phone for faster access.</small></footer>
  </section>;
}
