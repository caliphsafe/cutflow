"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Scissors,
  Settings,
  Store,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";

const links = [
  ["Overview", "/dashboard", LayoutDashboard],
  ["Bookings", "/dashboard/bookings", CalendarDays],
  ["Clients", "/dashboard/clients", Users],
  ["Payments", "/dashboard/payments", CreditCard],
  ["Reports", "/dashboard/reports", BarChart3],
  ["Services", "/dashboard/services", Scissors],
  ["Products", "/dashboard/products", Package],
  ["Storefront", "/dashboard/storefront", Store],
  ["Subscription", "/dashboard/subscription", ReceiptText],
  ["Settings", "/dashboard/settings", Settings],
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="dashboard-shell">
      <aside className={open ? "dashboard-sidebar open" : "dashboard-sidebar"}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-button sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="shop-switcher">
          <span className="avatar dark">MR</span>
          <div><b>REED / Studio</b><small>Owner workspace</small></div>
          <ChevronRight size={16} />
        </div>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {links.map(([label, href, Icon]) => {
            const exact = href === "/dashboard";
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? "active" : ""} onClick={() => setOpen(false)}>
                <Icon size={18} strokeWidth={2.1} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <Link href="/b/marcus-studio" target="_blank">
            <ExternalLink size={17} />
            <span>Open booking page</span>
          </Link>
          <Link href="/login">
            <LogOut size={17} />
            <span>Sign out</span>
          </Link>
          <small>CutFlow 43 Build · Demo workspace</small>
        </div>
      </aside>

      {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}

      <main className="dashboard-main">
        <header className="mobile-dashboard-bar">
          <button className="icon-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <Logo compact />
          <Link className="icon-button" href="/b/marcus-studio" aria-label="Open booking page"><ExternalLink size={18} /></Link>
        </header>
        {children}
      </main>
    </div>
  );
}
