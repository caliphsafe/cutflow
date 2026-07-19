"use client";

import { Bell, CheckCircle2, Clock3, CreditCard, ExternalLink, LoaderCircle, LockKeyhole, Mail, Save, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Profile = {
  displayName: string;
  shopName: string;
  email: string;
  phone: string;
  timezone: string;
  address: string;
  city: string;
  headline: string;
  bio: string;
  accent: string;
  slug: string;
  acceptingBookings: boolean;
  stripeConnected: boolean;
  depositCents: number;
};

type AvailabilityRow = { weekday: number; active: boolean; startTime: string; endTime: string };

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultProfile: Profile = { displayName: "", shopName: "", email: "", phone: "", timezone: "America/New_York", address: "", city: "", headline: "", bio: "", accent: "#d8ff5f", slug: "", acceptingBookings: true, stripeConnected: false, depositCents: 1000 };
const defaultAvailability: AvailabilityRow[] = dayNames.map((_, weekday) => ({ weekday, active: weekday !== 0, startTime: weekday === 6 ? "08:00" : "09:00", endTime: weekday === 6 ? "17:00" : "18:00" }));

function normalizeAvailability(value: unknown): AvailabilityRow[] {
  const rows = defaultAvailability.map((row) => ({ ...row, active: false }));
  if (Array.isArray(value)) {
    value.forEach((item) => {
      const weekday = Number(item.weekday);
      if (weekday >= 0 && weekday <= 6) rows[weekday] = { weekday, active: item.active !== false, startTime: String(item.start_time || item.startTime || "09:00").slice(0, 5), endTime: String(item.end_time || item.endTime || "18:00").slice(0, 5) };
    });
    return rows;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, string[][]>).forEach(([key, ranges]) => {
      const weekday = Number(key);
      const first = Array.isArray(ranges) ? ranges[0] : undefined;
      if (weekday >= 0 && weekday <= 6 && first) rows[weekday] = { weekday, active: true, startTime: first[0], endTime: first[1] };
    });
  }
  return rows;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [availability, setAvailability] = useState<AvailabilityRow[]>(defaultAvailability);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/data?resource=profile").then((response) => response.json()),
      fetch("/api/dashboard/data?resource=availability").then((response) => response.json()),
    ]).then(([profilePayload, availabilityPayload]) => {
      if (profilePayload.data) setProfile((current) => ({ ...current, ...profilePayload.data }));
      setAvailability(normalizeAvailability(availabilityPayload.data));
    }).finally(() => setLoading(false));
  }, []);

  const orderedAvailability = useMemo(() => [1, 2, 3, 4, 5, 6, 0].map((weekday) => availability[weekday]), [availability]);

  async function connect() {
    setConnecting(true);
    const response = await fetch("/api/stripe/connect", { method: "POST" });
    const data = await response.json();
    if (data.url) window.location.href = data.url;
    else {
      setNotice(data.error || "Stripe Connect is not configured yet.");
      setConnecting(false);
    }
  }

  async function save() {
    setSaving(true);
    setNotice("");
    const [profileResponse, availabilityResponse] = await Promise.all([
      fetch("/api/dashboard/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "profile", item: profile }) }),
      fetch("/api/dashboard/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "availability", items: availability }) }),
    ]);
    const profilePayload = await profileResponse.json();
    const availabilityPayload = await availabilityResponse.json();
    if (profileResponse.ok && availabilityResponse.ok) {
      if (profilePayload.data) setProfile((current) => ({ ...current, ...profilePayload.data }));
      setAvailability(normalizeAvailability(availabilityPayload.data));
      setNotice("Settings saved.");
    } else setNotice(profilePayload.error || availabilityPayload.error || "Settings could not be saved.");
    setSaving(false);
  }

  function updateDay(weekday: number, patch: Partial<AvailabilityRow>) {
    setAvailability((current) => current.map((row) => row.weekday === weekday ? { ...row, ...patch } : row));
  }

  if (loading) return <div className="dashboard-page"><section className="dashboard-card empty-state"><LoaderCircle className="spin"/><h2>Loading settings…</h2></section></div>;

  return <div className="dashboard-page settings-page">
    <header className="page-header"><div><p className="eyebrow">WORKSPACE CONTROLS</p><h1>Settings</h1><p>Manage the owner profile, availability, fixed deposit and connected payment account.</p></div><button className="button" onClick={save} disabled={saving}><Save/> {saving ? "Saving…" : "Save settings"}</button></header>
    {notice && <div className={notice.includes("saved") ? "inline-notice success" : "inline-notice error"}>{notice}</div>}
    <section className="settings-layout"><nav className="settings-nav dashboard-card"><a href="#profile" className="active"><UserRound/> Profile</a><a href="#payments"><CreditCard/> Payments</a><a href="#availability"><Clock3/> Availability</a><a href="#notifications"><Bell/> Notifications</a><a href="#security"><LockKeyhole/> Security</a></nav><div className="settings-sections">
      <article id="profile" className="dashboard-card settings-card"><header><span><UserRound/></span><div><p className="eyebrow">OWNER PROFILE</p><h2>Business contact details</h2></div></header><div className="form-grid two"><label><span>Barber name</span><input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}/></label><label><span>Business email</span><input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })}/></label><label><span>Phone</span><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })}/></label><label><span>Time zone</span><select value={profile.timezone} onChange={(event) => setProfile({ ...profile, timezone: event.target.value })}><option value="America/New_York">Eastern time</option><option value="America/Chicago">Central time</option><option value="America/Denver">Mountain time</option><option value="America/Los_Angeles">Pacific time</option></select></label><label><span>Street address</span><input value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })}/></label><label><span>City / state</span><input value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })}/></label></div></article>
      <article id="payments" className="dashboard-card settings-card"><header><span><CreditCard/></span><div><p className="eyebrow">DIRECT PAYMENTS</p><h2>Connected barber account</h2></div></header><div className="connect-card"><span className="stripe-mark">S</span><div><b>Stripe Connect Standard</b><p>Direct charges, barber-owned payouts and access to the connected Stripe account.</p></div><span className={profile.stripeConnected ? "connection-status" : "connection-status pending"}>{profile.stripeConnected ? <CheckCircle2/> : <Clock3/>}{profile.stripeConnected ? "Connected" : "Not connected"}</span></div><div className="payment-settings-grid"><label><span>Booking deposit</span><div className="money-input"><span>$</span><input value={(profile.depositCents / 100).toFixed(2)} readOnly/></div><small>Fixed at $10 and deducted from the final balance.</small></label><label><span>Customer payment destination</span><input value="Barber connected account" readOnly/><small>CutFlow does not add an application percentage.</small></label></div><div className="fee-explainer"><ShieldCheck/><div><b>CutFlow application fee is intentionally $0.</b><p>The barber’s connected account receives the transaction, minus ordinary processor fees, refunds or disputes. CutFlow revenue comes from the software subscription.</p></div></div><footer><button className="button" onClick={connect} disabled={connecting}>{connecting ? "Opening Stripe…" : profile.stripeConnected ? "Update Stripe connection" : "Connect Stripe"}<ExternalLink/></button><a className="button secondary" href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">Open Stripe dashboard</a></footer></article>
      <article id="availability" className="dashboard-card settings-card"><header><span><Clock3/></span><div><p className="eyebrow">BOOKING HOURS</p><h2>Weekly chair availability</h2></div></header><div className="availability-editor">{orderedAvailability.map((day) => <div key={day.weekday}><label><input type="checkbox" checked={day.active} onChange={(event) => updateDay(day.weekday, { active: event.target.checked })}/><b>{dayNames[day.weekday]}</b></label><input type="time" value={day.startTime} disabled={!day.active} onChange={(event) => updateDay(day.weekday, { startTime: event.target.value })}/><span>to</span><input type="time" value={day.endTime} disabled={!day.active} onChange={(event) => updateDay(day.weekday, { endTime: event.target.value })}/></div>)}</div></article>
      <article id="notifications" className="dashboard-card settings-card"><header><span><Bell/></span><div><p className="eyebrow">MESSAGES</p><h2>Notification workflow</h2></div></header><div className="notification-list"><label><span><Mail/></span><div><b>Booking confirmation</b><small>Exact date, time, location, request and remaining balance are stored for delivery.</small></div><input type="checkbox" checked readOnly/></label><label><span><Smartphone/></span><div><b>24-hour reminder</b><small>The notification log is ready for a production email/SMS provider.</small></div><input type="checkbox" checked readOnly/></label><label><span><Bell/></span><div><b>New booking alert</b><small>Successful deposits confirm the booking and create the event source for an alert.</small></div><input type="checkbox" checked readOnly/></label></div><p className="settings-provider-note">Email and SMS delivery credentials are intentionally provider-agnostic in this build. Connect Resend, Twilio or another provider before relying on automated delivery.</p></article>
      <article id="security" className="dashboard-card settings-card"><header><span><LockKeyhole/></span><div><p className="eyebrow">SECURITY</p><h2>Account protection</h2></div></header><div className="security-row"><div><b>Supabase email authentication</b><small>Dashboard routes validate the server session before allowing access.</small></div><span className="status-pill status-paid">active</span></div><div className="security-row"><div><b>Two-factor authentication</b><small>Enable MFA inside Supabase Auth before a public production launch.</small></div><span className="status-pill status-pending">setup step</span></div></article>
    </div></section>
  </div>;
}
