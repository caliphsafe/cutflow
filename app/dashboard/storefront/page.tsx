"use client";

import Link from "next/link";
import { Check, Copy, ExternalLink, Eye, Images, LoaderCircle, Palette, Save, Smartphone, Store, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/format";
import type { Service } from "@/lib/types";
import { SetupChecklist, type SetupStatus } from "@/components/SetupChecklist";
import { HelpTip } from "@/components/HelpTip";

type StorefrontForm = {
  displayName: string;
  shopName: string;
  headline: string;
  bio: string;
  accent: string;
  slug: string;
  acceptingBookings: boolean;
  storefrontPublished: boolean;
  phone: string;
  address: string;
  city: string;
  timezone: string;
  depositCents: number;
  allowOnlineBalancePayment: boolean;
  allowCashPayment: boolean;
  profileImageUrl: string;
  coverImageUrl: string;
  shopImageUrl: string;
  logoImageUrl: string;
  galleryImageUrls: string[];
};

const emptyForm: StorefrontForm = {
  displayName: "",
  shopName: "",
  headline: "",
  bio: "",
  accent: "#d8ff5f",
  slug: "",
  acceptingBookings: true,
  storefrontPublished: false,
  phone: "",
  address: "",
  city: "",
  timezone: "America/New_York",
  depositCents: 1000,
  allowOnlineBalancePayment: true,
  allowCashPayment: true,
  profileImageUrl: "",
  coverImageUrl: "",
  shopImageUrl: "",
  logoImageUrl: "",
  galleryImageUrls: [],
};

const emptySetup: SetupStatus = {
  steps: { profile: false, media: false, services: false, availability: false, payments: false, subscription: false },
  ready: false,
  published: false,
};

export default function StorefrontPage() {
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<StorefrontForm>(emptyForm);
  const [services, setServices] = useState<Service[]>([]);
  const [setup, setSetup] = useState<SetupStatus>(emptySetup);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    const [profilePayload, servicePayload, setupPayload] = await Promise.all([
      fetch("/api/dashboard/data?resource=profile").then((response) => response.json()),
      fetch("/api/dashboard/data?resource=services").then((response) => response.json()),
      fetch("/api/dashboard/data?resource=setup").then((response) => response.json()),
    ]);
    if (profilePayload.data) setData((current) => ({ ...current, ...profilePayload.data }));
    setServices(Array.isArray(servicePayload.data) ? servicePayload.data : []);
    if (setupPayload.data) setSetup(setupPayload.data);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const publicPath = useMemo(() => `/b/${data.slug || "your-booking-url"}`, [data.slug]);

  function copy() {
    navigator.clipboard?.writeText(`${window.location.origin}${publicPath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function save(overrides?: Partial<StorefrontForm>) {
    setSaving(true);
    setNotice("");
    const next = { ...data, ...overrides };
    const response = await fetch("/api/dashboard/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: "profile", item: next }),
    });
    const payload = await response.json();
    if (response.ok && payload.data) {
      setData((current) => ({ ...current, ...payload.data }));
      setNotice(overrides?.storefrontPublished === true ? "Storefront published." : overrides?.storefrontPublished === false ? "Storefront unpublished." : "Storefront saved.");
      await load();
    } else {
      setNotice(payload.error || "Storefront could not be saved.");
    }
    setSaving(false);
  }

  if (loading) return <div className="dashboard-page"><section className="dashboard-card empty-state"><LoaderCircle className="spin"/><h2>Loading storefront…</h2></section></div>;

  return <div className="dashboard-page storefront-admin-page">
    <header className="page-header">
      <div><p className="eyebrow">PUBLIC CUSTOMER EXPERIENCE</p><h1>Storefront</h1><p>Control the barber page customers share, browse and use to book.</p></div>
      <div className="page-actions">
        {data.storefrontPublished && <Link className="button secondary" href={publicPath} target="_blank"><ExternalLink/> Open live page</Link>}
        <button className="button secondary" onClick={() => save()} disabled={saving}><Save/> {saving ? "Saving…" : "Save"}</button>
        <button className="button" onClick={() => save({ storefrontPublished: !data.storefrontPublished })} disabled={saving || (!setup.ready && !data.storefrontPublished)}><UploadCloud/> {data.storefrontPublished ? "Unpublish" : "Publish storefront"}</button>
      </div>
    </header>

    {notice && <div className={notice.includes("saved") || notice.includes("published") ? "inline-notice success" : "inline-notice error"}>{notice}</div>}
    <SetupChecklist status={{ ...setup, published: data.storefrontPublished }}/>

    <section className="storefront-editor-layout">
      <article className="dashboard-card storefront-editor">
        <header><span><Store/></span><div><p className="eyebrow">PAGE IDENTITY</p><h2>Build a recognizable customer experience.</h2></div><HelpTip text="These fields control the public booking page. Photos are managed separately so images can be replaced without changing the written content."/></header>
        <div className="form-grid two">
          <label><span>Barber display name</span><input value={data.displayName} onChange={(event) => setData({ ...data, displayName: event.target.value })}/></label>
          <label><span>Shop or studio name</span><input value={data.shopName} onChange={(event) => setData({ ...data, shopName: event.target.value })}/></label>
          <label className="full"><span>Booking URL <HelpTip text="This is the permanent public link customers can bookmark and share. Changing it later will break old links."/></span><div className="slug-field"><span>/b/</span><input value={data.slug} onChange={(event) => setData({ ...data, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}/></div></label>
          <label className="full"><span>Headline</span><input value={data.headline} onChange={(event) => setData({ ...data, headline: event.target.value })}/></label>
          <label className="full"><span>About the experience</span><textarea value={data.bio} onChange={(event) => setData({ ...data, bio: event.target.value })}/></label>
          <label><span>Accent color</span><div className="color-field"><input type="color" value={data.accent} onChange={(event) => setData({ ...data, accent: event.target.value })}/><input value={data.accent} onChange={(event) => setData({ ...data, accent: event.target.value })}/></div></label>
          <label><span>Booking status</span><select value={data.acceptingBookings ? "open" : "closed"} onChange={(event) => setData({ ...data, acceptingBookings: event.target.value === "open" })}><option value="open">Accepting bookings</option><option value="closed">Temporarily closed</option></select></label>
          <label><span>Booking deposit <HelpTip text="This amount is charged when the customer books and credited toward the final appointment total."/></span><div className="money-input"><span>$</span><input type="number" min="0.50" step="0.50" value={(data.depositCents / 100).toFixed(2)} onChange={(event) => setData({ ...data, depositCents: Math.round(Number(event.target.value || 0) * 100) })}/></div></label>
          <label><span>Balance options</span><select value={`${data.allowOnlineBalancePayment}-${data.allowCashPayment}`} onChange={(event) => { const [online, cash] = event.target.value.split("-"); setData({ ...data, allowOnlineBalancePayment: online === "true", allowCashPayment: cash === "true" }); }}><option value="true-true">Online or cash</option><option value="true-false">Online only</option><option value="false-true">Cash at shop only</option></select></label>
        </div>

        <div className="storefront-media-bridge">
          <div>{data.profileImageUrl ? <img src={data.profileImageUrl} alt=""/> : <span><Images/></span>}<div><small>PHOTOS & MEDIA</small><b>{data.profileImageUrl && (data.coverImageUrl || data.shopImageUrl) ? "Customer photography ready" : "Add real barber and shop images"}</b><p>Manage the portrait, cover, shop, logo and gallery images used throughout the public page.</p></div></div>
          <Link className="button secondary" href="/dashboard/media"><Images/> Manage photos</Link>
        </div>
        <div className="share-url"><div><small>{data.storefrontPublished ? "LIVE SHAREABLE LINK" : "PRIVATE PREVIEW LINK"}</small><b>{typeof window === "undefined" ? "cutflow.app" : window.location.host}{publicPath}</b></div><button onClick={copy}>{copied ? <Check/> : <Copy/>}{copied ? "Copied" : "Copy"}</button></div>
      </article>

      <aside className="storefront-phone-preview">
        <header><div><Smartphone/><span><small>MOBILE PREVIEW</small><b>Customer page</b></span></div>{data.storefrontPublished && <Link href={publicPath} target="_blank"><Eye/> Preview</Link>}</header>
        <div className="preview-phone"><div className="phone-island"/><div className="preview-phone-nav"><b>{data.shopName || data.displayName || "Your studio"}</b><span>•••</span></div><div className={data.coverImageUrl ? "preview-phone-hero has-image" : "preview-phone-hero"} style={{ "--preview-accent": data.accent, ...(data.coverImageUrl ? { backgroundImage: `linear-gradient(rgba(10,10,10,.48),rgba(10,10,10,.72)),url(${data.coverImageUrl})` } : {}) } as React.CSSProperties}>{data.profileImageUrl && <img className="preview-barber-avatar" src={data.profileImageUrl} alt=""/>}<small>{data.acceptingBookings ? "ACCEPTING BOOKINGS" : "BOOKING PAUSED"}</small><h2>{data.headline || "Your best cut starts with a clearer request."}</h2><p>{(data.bio || "Tell clients what makes your chair and service experience different.").slice(0, 120)}{data.bio.length > 120 ? "…" : ""}</p><button>{data.acceptingBookings ? "View availability →" : "View services"}</button></div><div className="preview-phone-services"><small>SERVICES</small>{services.filter((service) => service.active).slice(0, 3).map((service) => <div key={service.id}><span><b>{service.name}</b><small>{service.durationMinutes} min</small></span><strong>{money(service.priceCents)}</strong></div>)}</div></div>
      </aside>
    </section>

    <section className="dashboard-card branding-controls"><div><Palette/><span><p className="eyebrow">DESIGN SYSTEM</p><h2>Built to feel premium on every barber page.</h2><p>CutFlow keeps spacing, contrast, booking clarity and mobile behavior consistent while allowing each barber’s name, color, copy, services and products to lead.</p></span></div><div><span><Check/> Mobile-first booking</span><span><Check/> Accessible contrast</span><span><Check/> Clear deposit language</span><span><Check/> Barber-owned branding</span></div></section>
  </div>;
}
