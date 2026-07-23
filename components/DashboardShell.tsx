"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlugZap,
  ReceiptText,
  Scissors,
  Settings,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Logo } from "./Logo";
import { InstallAppButton } from "./InstallAppButton";
import { DashboardHelpCenter } from "./help/DashboardHelpCenter";

const links = [
  ["Overview", "/dashboard", LayoutDashboard],
  ["Bookings", "/dashboard/bookings", CalendarDays],
  ["Clients", "/dashboard/clients", Users],
  ["Payments", "/dashboard/payments", CreditCard],
  ["Connections", "/dashboard/connections", PlugZap],
  ["Reports", "/dashboard/reports", BarChart3],
  ["Services", "/dashboard/services", Scissors],
  ["Products", "/dashboard/products", Package],
  ["Photos & media", "/dashboard/media", Images],
  ["Storefront", "/dashboard/storefront", Store],
  ["Booking policies", "/dashboard/policies", ShieldCheck],
  ["Subscription", "/dashboard/subscription", ReceiptText],
  ["Settings", "/dashboard/settings", Settings],
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({ displayName: "Barber", shopName: "CutFlow Studio", slug: "marcus-studio", profileImageUrl: "" });

  useEffect(() => {
    fetch("/api/dashboard/data?resource=profile").then((response) => response.json()).then((payload) => {
      if (payload?.data) setProfile((current) => ({ ...current, ...payload.data }));
    }).catch(() => undefined);
  }, []);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = profile.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const bookingUrl = `/b/${profile.slug}`;

  return (
    <div className="dashboard-shell">
      <aside className={open ? "dashboard-sidebar open" : "dashboard-sidebar"}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-button sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="shop-switcher">
          <span className={profile.profileImageUrl ? "avatar dark has-photo" : "avatar dark"}>{profile.profileImageUrl ? <img src={profile.profileImageUrl} alt=""/> : initials}</span>
          <div><b>{profile.shopName}</b><small>{profile.displayName} · Owner workspace</small></div>
          <ChevronRight size={16} />
        </div>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {links.map(([label, href, Icon]) => {
            const exact = href === "/dashboard";
            const active = exact ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} className={active ? "active" : ""} onClick={() => setOpen(false)}><Icon size={18} strokeWidth={2.1} /><span>{label}</span></Link>;
          })}
        </nav>

        <div className="sidebar-bottom">
          <Link href={bookingUrl} target="_blank"><ExternalLink size={17} /><span>Open booking page</span></Link>
          <InstallAppButton compact className="sidebar-install" />
          <button onClick={signOut}><LogOut size={17} /><span>Sign out</span></button>
          <small>CutFlow</small>
        </div>
      </aside>

      {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}

      <main className="dashboard-main">
        <header className="mobile-dashboard-bar">
          <button className="icon-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <Logo compact />
          <Link className="icon-button" href={bookingUrl} aria-label="Open booking page"><ExternalLink size={18} /></Link>
        </header>
        {children}
        <DashboardHelpCenter />
      </main>
    </div>
  );
}
