"use client";

import Link from "next/link";
import { Check, Copy, ExternalLink, Eye, LoaderCircle, Palette, Save, Smartphone, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/format";
import type { Service } from "@/lib/types";

type StorefrontForm = {
  displayName: string;
  shopName: string;
  headline: string;
  bio: string;
  accent: string;
  slug: string;
  acceptingBookings: boolean;
  phone: string;
  address: string;
  city: string;
  timezone: string;
  depositCents: number;
};

const emptyForm: StorefrontForm = {
  displayName: "",
  shopName: "",
  headline: "",
  bio: "",
  accent: "#d8ff5f",
  slug: "",
  acceptingBookings: true,
  phone: "",
  address: "",
  city: "",
  timezone: "America/New_York",
  depositCents: 1000,
};

export default function StorefrontPage() {
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<StorefrontForm>(emptyForm);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/data?resource=profile").then((response) => response.json()),
      fetch("/api/dashboard/data?resource=services").then((response) => response.json()),
    ]).then(([profilePayload, servicePayload]) => {
      if (profilePayload.data) setData((current) => ({ ...current, ...profilePayload.data }));
      setServices(Array.isArray(servicePayload.data) ? servicePayload.data : []);
    }).finally(() => setLoading(false));
  }, []);

  const publicPath = useMemo(() => `/b/${data.slug || "your-booking-url"}`, [data.slug]);

  function copy() {
    navigator.clipboard?.writeText(`${window.location.origin}${publicPath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function save() {
    setSaving(true);
    setNotice("");
    const response = await fetch("/api/dashboard/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: "profile", item: data }),
    });
    const payload = await response.json();
    if (response.ok && payload.data) {
      setData((current) => ({ ...current, ...payload.data }));
      setNotice("Storefront saved.");
    } else setNotice(payload.error || "Storefront could not be saved.");
    setSaving(false);
  }

  if (loading) return <div className="dashboard-page"><section className="dashboard-card empty-state"><LoaderCircle className="spin"/><h2>Loading storefront…</h2></section></div>;

  return <div className="dashboard-page storefront-admin-page">
    <header className="page-header"><div><p className="eyebrow">PUBLIC CUSTOMER EXPERIENCE</p><h1>Storefront</h1><p>Control the barber page customers share, browse and use to book.</p></div><div className="page-actions"><Link className="button secondary" href={publicPath} target="_blank"><ExternalLink/> Open live page</Link><button className="button" onClick={save} disabled={saving}><Save/> {saving ? "Saving…" : "Save storefront"}</button></div></header>
    {notice && <div className={notice.includes("saved") ? "inline-notice success" : "inline-notice error"}>{notice}</div>}
    <section className="storefront-editor-layout"><article className="dashboard-card storefront-editor"><header><span><Store/></span><div><p className="eyebrow">PAGE IDENTITY</p><h2>Brand the chair, not CutFlow.</h2></div></header><div className="form-grid two"><label><span>Barber display name</span><input value={data.displayName} onChange={(event) => setData({ ...data, displayName: event.target.value })}/></label><label><span>Shop or studio name</span><input value={data.shopName} onChange={(event) => setData({ ...data, shopName: event.target.value })}/></label><label className="full"><span>Booking URL</span><div className="slug-field"><span>/b/</span><input value={data.slug} onChange={(event) => setData({ ...data, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}/></div></label><label className="full"><span>Headline</span><input value={data.headline} onChange={(event) => setData({ ...data, headline: event.target.value })}/></label><label className="full"><span>About the experience</span><textarea value={data.bio} onChange={(event) => setData({ ...data, bio: event.target.value })}/></label><label><span>Accent color</span><div className="color-field"><input type="color" value={data.accent} onChange={(event) => setData({ ...data, accent: event.target.value })}/><input value={data.accent} onChange={(event) => setData({ ...data, accent: event.target.value })}/></div></label><label><span>Booking status</span><select value={data.acceptingBookings ? "open" : "closed"} onChange={(event) => setData({ ...data, acceptingBookings: event.target.value === "open" })}><option value="open">Accepting bookings</option><option value="closed">Temporarily closed</option></select></label></div><div className="share-url"><div><small>SHAREABLE LINK</small><b>{typeof window === "undefined" ? "cutflow.app" : window.location.host}{publicPath}</b></div><button onClick={copy}>{copied ? <Check/> : <Copy/>}{copied ? "Copied" : "Copy"}</button></div></article>
      <aside className="storefront-phone-preview"><header><div><Smartphone/><span><small>LIVE MOBILE PREVIEW</small><b>Customer page</b></span></div><Link href={publicPath} target="_blank"><Eye/> Preview</Link></header><div className="preview-phone"><div className="phone-island"/><div className="preview-phone-nav"><b>{data.shopName || data.displayName || "Your studio"}</b><span>•••</span></div><div className="preview-phone-hero" style={{ "--preview-accent": data.accent } as React.CSSProperties}><small>{data.acceptingBookings ? "ACCEPTING BOOKINGS" : "BOOKING PAUSED"}</small><h2>{data.headline || "Your best cut starts with a clearer request."}</h2><p>{(data.bio || "Tell clients what makes your chair and service experience different.").slice(0, 120)}{data.bio.length > 120 ? "…" : ""}</p><button>{data.acceptingBookings ? "Find a time →" : "View services"}</button></div><div className="preview-phone-services"><small>SERVICES</small>{services.filter((service) => service.active).slice(0, 3).map((service) => <div key={service.id}><span><b>{service.name}</b><small>{service.durationMinutes} min</small></span><strong>{money(service.priceCents)}</strong></div>)}</div></div></aside></section>
    <section className="dashboard-card branding-controls"><div><Palette/><span><p className="eyebrow">DESIGN SYSTEM</p><h2>Built to feel premium on every barber page.</h2><p>CutFlow keeps spacing, contrast, booking clarity and mobile behavior consistent while allowing each barber’s name, color, copy, services and products to lead.</p></span></div><div><span><Check/> Mobile-first booking</span><span><Check/> Accessible contrast</span><span><Check/> Clear deposit language</span><span><Check/> Barber-owned branding</span></div></section>
  </div>;
}
