"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck2, CircleDollarSign, Clock3, CreditCard, LoaderCircle, PackageCheck, Plus, Sparkles, UserPlus, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { RevenueBars } from "@/components/RevenueBars";
import { StatusPill } from "@/components/StatusPill";
import { dateTime, initials, money } from "@/lib/format";
import type { Booking, Customer, Product, Transaction } from "@/lib/types";

type Profile = { displayName?: string; stripeConnected?: boolean };

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    Promise.all(["profile", "bookings", "clients", "products", "transactions"].map((resource) => fetch(`/api/dashboard/data?resource=${resource}`).then((response) => response.json())))
      .then(([profilePayload, bookingsPayload, clientsPayload, productsPayload, transactionsPayload]) => {
        setProfile(profilePayload.data || {});
        setBookings(Array.isArray(bookingsPayload.data) ? bookingsPayload.data : []);
        setClients(Array.isArray(clientsPayload.data) ? clientsPayload.data : []);
        setProducts(Array.isArray(productsPayload.data) ? productsPayload.data : []);
        setTransactions(Array.isArray(transactionsPayload.data) ? transactionsPayload.data : []);
        setDemo(Boolean(profilePayload.demo));
      }).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const tomorrowBookings = bookings.filter((booking) => {
    const startsAt = new Date(booking.startsAt);
    return startsAt >= tomorrowStart && startsAt < tomorrowEnd && !["cancelled", "no_show"].includes(booking.status);
  });
  const upcoming = useMemo(() => bookings.filter((booking) => new Date(booking.endsAt) >= now && !["cancelled", "no_show"].includes(booking.status)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)).slice(0, 6), [bookings]);
  const schedule = upcoming.length ? upcoming : bookings.slice(0, 6);
  const expectedTomorrow = tomorrowBookings.reduce((sum, booking) => sum + booking.totalCents, 0);
  const tomorrowDeposits = tomorrowBookings.reduce((sum, booking) => sum + (booking.paymentStatus === "deposit_paid" || booking.paymentStatus === "paid" ? booking.depositCents : 0), 0);
  const openBalances = bookings.filter((booking) => ["confirmed", "checked_in"].includes(booking.status) && booking.paymentStatus !== "paid").reduce((sum, booking) => sum + booking.balanceCents, 0);
  const firstBooking = schedule[0];
  const firstClient = firstBooking ? clients.find((client) => client.id === firstBooking.customerId || client.name === firstBooking.customerName) : clients[0];
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const weekTransactions = transactions.filter((transaction) => new Date(transaction.date) >= weekStart && transaction.status === "paid");
  const serviceRevenue = weekTransactions.filter((transaction) => ["deposit", "service_balance", "cash"].includes(transaction.type)).reduce((sum, transaction) => sum + transaction.grossCents, 0);
  const productRevenue = weekTransactions.filter((transaction) => transaction.type === "product").reduce((sum, transaction) => sum + transaction.grossCents, 0);
  const tipRevenue = weekTransactions.filter((transaction) => transaction.type === "tip").reduce((sum, transaction) => sum + transaction.grossCents, 0);
  const revenueTotal = Math.max(1, serviceRevenue + productRevenue + tipRevenue);
  const dateHeader = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(now).toUpperCase();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (loading) return <div className="dashboard-page"><section className="dashboard-card empty-state"><LoaderCircle className="spin"/><h2>Loading live workspace…</h2></section></div>;

  return <div className="dashboard-page">
    <header className="page-header"><div><p className="eyebrow">{dateHeader}</p><h1>{greeting}, {profile.displayName?.split(" ")[0] || "Barber"}.</h1><p>Your chair activity, client memory and payment ledger are connected here.</p></div><div className="page-actions"><Link className="button secondary" href="/dashboard/clients"><UserPlus/> Add client</Link><Link className="button" href="/dashboard/bookings"><Plus/> Add booking</Link></div></header>
    {demo && <div className="setup-callout compact"><Sparkles/><div><b>Preview workspace is active.</b><p>Create a Supabase account through onboarding to replace sample activity with live tenant data.</p></div></div>}
    <section className="metric-grid"><MetricCard label="Tomorrow’s bookings" value={String(tomorrowBookings.length)} note={`${tomorrowBookings.filter((booking) => booking.paymentStatus !== "deposit_due").length} deposits paid`} icon={CalendarCheck2}/><MetricCard label="Expected tomorrow" value={money(expectedTomorrow)} note={`${money(tomorrowDeposits)} collected in deposits`} icon={CircleDollarSign}/><MetricCard label="Open balances" value={money(openBalances)} note="Due after confirmed services" icon={CreditCard}/><MetricCard label="Active clients" value={String(clients.length)} note={`${clients.filter((client) => new Date(client.joinedAt).getMonth() === now.getMonth() && new Date(client.joinedAt).getFullYear() === now.getFullYear()).length} new this month`} icon={UsersRound}/></section>
    <section className="overview-grid">
      <article className="dashboard-card schedule-card"><header><div><p className="eyebrow">UPCOMING CHAIR ACTIVITY</p><h2>Next appointments</h2></div><Link href="/dashboard/bookings">Full calendar <ArrowRight/></Link></header><div className="schedule-list">{schedule.length ? schedule.map((booking, index) => <article key={booking.id}><time><b>{new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(booking.startsAt))}</b><small>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(booking.startsAt))}</small></time><span className="avatar">{initials(booking.customerName)}</span><div className="schedule-client"><b>{booking.customerName}</b><span>{booking.serviceName}</span><small>{booking.haircutRequest?.desiredStyle || "Request details saved"}</small></div><div className="schedule-money"><StatusPill status={booking.paymentStatus}/><b>{money(booking.balanceCents)} due</b></div>{index === 0 && <span className="next-badge">NEXT</span>}</article>) : <div className="empty-row"><CalendarCheck2/><span><b>No upcoming appointments</b><small>Your confirmed bookings will appear here.</small></span></div>}</div></article>
      <article className="dashboard-card revenue-card"><header><div><p className="eyebrow">MONEY IN THE CHAIR</p><h2>Revenue pulse</h2></div><span className="status-pill status-paid">7 days</span></header><RevenueBars transactions={transactions}/><div className="revenue-breakdown"><div><span>Services</span><b>{money(serviceRevenue)}</b><small>{(serviceRevenue / revenueTotal * 100).toFixed(1)}%</small></div><div><span>Products</span><b>{money(productRevenue)}</b><small>{(productRevenue / revenueTotal * 100).toFixed(1)}%</small></div><div><span>Tips</span><b>{money(tipRevenue)}</b><small>{(tipRevenue / revenueTotal * 100).toFixed(1)}%</small></div></div><Link className="card-link" href="/dashboard/reports">Open tax-ready reports <ArrowRight/></Link></article>
    </section>
    <section className="lower-overview-grid">
      <article className="dashboard-card client-intelligence"><header><div><p className="eyebrow">CLIENT INTELLIGENCE</p><h2>Before they sit down</h2></div><Sparkles/></header>{firstClient ? <><div className="insight-client"><span className="avatar large">{initials(firstClient.name)}</span><div><b>{firstClient.name}</b><p>{firstBooking ? dateTime(firstBooking.startsAt) : "Client profile"}</p></div><span>{firstClient.visits} visits</span></div><div className="insight-grid"><div><small>SAVED REQUEST</small><b>{firstClient.lastRequest?.desiredStyle || firstClient.preferredStyle}</b><p>{firstClient.lastRequest?.referenceNote || firstClient.notes || "No extra request note yet."}</p></div><div><small>TEXTURE + CARE</small><b>{firstClient.texture}</b><p>{firstClient.allergies || "No sensitivities noted."}</p></div></div><footer><span><PackageCheck/> Request memory ready</span><Link href={`/dashboard/clients/${firstClient.id}`}>Open profile <ArrowRight/></Link></footer></> : <div className="empty-row"><UsersRound/><span><b>No clients yet</b><small>Add a client or accept the first booking.</small></span></div>}</article>
      <article className="dashboard-card quick-actions"><header><p className="eyebrow">QUICK ACTIONS</p><h2>Move the day forward.</h2></header><div><Link href="/dashboard/bookings"><span><CalendarCheck2/></span><div><b>Add manual booking</b><small>For calls and walk-ins.</small></div><ArrowRight/></Link><Link href="/dashboard/clients"><span><UserPlus/></span><div><b>Create client profile</b><small>Add notes before first booking.</small></div><ArrowRight/></Link><Link href="/dashboard/payments"><span><CreditCard/></span><div><b>Record a payment</b><small>Cash, card or product sale.</small></div><ArrowRight/></Link><Link href="/dashboard/reports"><span><CircleDollarSign/></span><div><b>Export this month</b><small>Income and transaction CSV.</small></div><ArrowRight/></Link></div></article>
      <article className="dashboard-card inventory-watch"><header><div><p className="eyebrow">PICKUP INVENTORY</p><h2>Products to watch</h2></div><Link href="/dashboard/products">Manage</Link></header>{products.filter((product) => product.active).slice(0, 5).map((product) => <div className="inventory-row" key={product.id}><span className="product-dot">{product.name[0]}</span><div><b>{product.name}</b><small>{product.inventory} units · {product.textureTags.slice(0, 3).join(", ")}</small></div><span className={product.inventory < 7 ? "stock-pill low" : "stock-pill"}>{product.inventory < 7 ? "Low" : "In stock"}</span></div>)}</article>
    </section>
    {!profile.stripeConnected && <section className="setup-callout"><span><Clock3/></span><div><b>Connect Stripe to begin collecting live $10 deposits.</b><p>Connected-account onboarding activates direct payments to the barber.</p></div><Link className="button" href="/dashboard/settings">Finish payment setup <ArrowRight/></Link></section>}
  </div>;
}
