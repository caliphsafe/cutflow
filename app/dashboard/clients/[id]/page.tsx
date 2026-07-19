"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarPlus, CheckCircle2, Clock3, CreditCard, LoaderCircle, Mail, PackageCheck, Phone, Scissors, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { dateTime, initials, money, shortDate } from "@/lib/format";
import type { Booking, Customer, Product, Transaction } from "@/lib/types";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [clients, setClients] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(["clients", "bookings", "products", "transactions"].map((resource) => fetch(`/api/dashboard/data?resource=${resource}`).then((response) => response.json())))
      .then(([clientPayload, bookingPayload, productPayload, transactionPayload]) => {
        setClients(Array.isArray(clientPayload.data) ? clientPayload.data : []);
        setBookings(Array.isArray(bookingPayload.data) ? bookingPayload.data : []);
        setProducts(Array.isArray(productPayload.data) ? productPayload.data : []);
        setTransactions(Array.isArray(transactionPayload.data) ? transactionPayload.data : []);
      }).finally(() => setLoading(false));
  }, []);

  const customer = clients.find((item) => item.id === params.id);
  const clientBookings = useMemo(() => customer ? bookings.filter((item) => item.customerId === customer.id || item.customerName === customer.name).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt)) : [], [bookings, customer]);
  const clientTransactions = useMemo(() => customer ? transactions.filter((item) => item.customerName === customer.name) : [], [customer, transactions]);
  const recommendation = useMemo(() => {
    if (!customer) return products[0];
    const texture = customer.texture.toLowerCase();
    return products.find((product) => product.active && product.inventory > 0 && product.textureTags.some((tag) => tag === "all" || texture.includes(tag.toLowerCase()) || tag.toLowerCase().includes(texture))) || products.find((product) => product.active && product.inventory > 0);
  }, [customer, products]);
  const averageGap = useMemo(() => {
    if (clientBookings.length < 2) return null;
    const gaps = clientBookings.slice(0, -1).map((booking, index) => Math.round((+new Date(booking.startsAt) - +new Date(clientBookings[index + 1].startsAt)) / 86400000)).filter((gap) => gap > 0);
    return gaps.length ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : null;
  }, [clientBookings]);

  if (loading) return <div className="dashboard-page"><section className="dashboard-card empty-state"><LoaderCircle className="spin"/><h2>Loading client profile…</h2></section></div>;
  if (!customer) return <div className="dashboard-page"><Link className="back-link" href="/dashboard/clients"><ArrowLeft/> Back to clients</Link><section className="dashboard-card empty-state"><h2>Client not found</h2><p>This profile may have been removed or belongs to another barber workspace.</p></section></div>;

  const request = customer.lastRequest || {} as Customer["lastRequest"];
  const averageVisit = customer.visits ? Math.round(customer.lifetimeValueCents / customer.visits) : 0;

  return <div className="dashboard-page client-detail-page">
    <Link className="back-link" href="/dashboard/clients"><ArrowLeft/> Back to clients</Link>
    <header className="client-profile-header dashboard-card"><span className="avatar profile-avatar">{initials(customer.name)}</span><div className="profile-title"><p className="eyebrow">CLIENT SINCE {new Date(customer.joinedAt).getFullYear()}</p><h1>{customer.name}</h1><div><a href={`tel:${customer.phone}`}><Phone/> {customer.phone || "No phone"}</a><a href={`mailto:${customer.email}`}><Mail/> {customer.email}</a></div></div><div className="profile-actions"><Link className="button" href="/dashboard/bookings"><CalendarPlus/> Book appointment</Link></div></header>
    <section className="profile-metrics metric-grid compact"><article className="metric-card glass-card"><p>Total visits</p><strong>{customer.visits}</strong><small>Last: {shortDate(customer.lastVisit)}</small></article><article className="metric-card glass-card"><p>Lifetime value</p><strong>{money(customer.lifetimeValueCents)}</strong><small>{money(averageVisit)} average visit</small></article><article className="metric-card glass-card"><p>Hair texture</p><strong>{customer.texture || "Not set"}</strong><small>{customer.preferredStyle || "No preferred style"}</small></article><article className="metric-card glass-card"><p>Rebooking pattern</p><strong>{averageGap ? `${averageGap} days` : "Learning"}</strong><small>{averageGap ? "Average time between visits" : "More visits will improve this insight"}</small></article></section>
    <section className="client-detail-grid"><article className="dashboard-card saved-request-card"><header><div><p className="eyebrow">SAVED HAIRCUT REQUEST</p><h2>Ready to repeat next time.</h2></div><span className="repeat-pill">↻ Client memory</span></header><div className="request-profile"><div><span>Requested style</span><b>{request.desiredStyle || customer.preferredStyle || "Not set"}</b></div><div><span>Current length</span><b>{request.currentLength || "Not set"}</b></div><div><span>Sides + back</span><b>{request.sides || "Not set"}</b></div><div><span>Top</span><b>{request.top || "Not set"}</b></div><div><span>Line-up</span><b>{typeof request.lineUp === "boolean" ? request.lineUp ? "Yes" : "No" : "Not set"}</b></div><div><span>Beard</span><b>{request.beard || "Not set"}</b></div><div><span>Enhancements</span><b>{typeof request.enhancements === "boolean" ? request.enhancements ? "Requested" : "No" : "Not set"}</b></div><div><span>Sensitivity</span><b>{request.sensitivity || customer.allergies || "None noted"}</b></div><div className="full"><span>Reference note</span><b>{request.referenceNote || "No reference note saved."}</b></div></div><footer><Link className="button" href="/dashboard/bookings"><CalendarPlus/> Book with this request</Link></footer></article>
      <aside className="dashboard-card client-notes"><header><p className="eyebrow">BARBER NOTES</p></header><p>{customer.notes || "No private barber notes yet."}</p><div><small>ALLERGIES / SENSITIVITIES</small><b>{customer.allergies || "None noted"}</b></div><div><small>PREFERRED STYLE</small><b>{customer.preferredStyle || "Not set"}</b></div></aside>
    </section>
    <section className="client-detail-grid lower"><article className="dashboard-card history-card"><header><div><p className="eyebrow">APPOINTMENT HISTORY</p><h2>Recent chair activity</h2></div></header>{clientBookings.length ? clientBookings.slice(0, 8).map((booking) => <div key={booking.id} className="history-row"><span><Scissors/></span><div><b>{booking.serviceName}</b><small>{dateTime(booking.startsAt)}</small><p>{booking.haircutRequest?.desiredStyle || "Request stored with booking"}</p></div><strong>{money(booking.totalCents)}</strong></div>) : <div className="empty-row"><Clock3/><span><b>No appointment history yet</b><small>The first booking will appear here.</small></span></div>}</article>
      <article className="dashboard-card product-pattern"><header><div><p className="eyebrow">PRODUCT INTELLIGENCE</p><h2>Suggested next pickup</h2></div><Sparkles/></header>{recommendation ? <><div className="recommended-product"><span className="product-dot large">{recommendation.name[0]}</span><div><b>{recommendation.name}</b><p>{recommendation.description}</p><small><PackageCheck/> {recommendation.inventory} in stock · matched to {customer.texture || "client profile"}</small></div><strong>{money(recommendation.priceCents)}</strong></div><Link className="button secondary" href="/dashboard/products">Manage product</Link></> : <div className="empty-row"><PackageCheck/><span><b>No active products</b><small>Add pickup products to activate recommendations.</small></span></div>}</article>
    </section>
    <section className="dashboard-card client-money"><header><div><p className="eyebrow">PAYMENT HISTORY</p><h2>Transactions tied to {customer.name.split(" ")[0]}</h2></div><CreditCard/></header>{clientTransactions.length ? clientTransactions.map((transaction) => <div key={transaction.id}><span>{transaction.status === "paid" ? <CheckCircle2/> : <Clock3/>}</span><div><b>{transaction.type.replaceAll("_", " ")}</b><small>{shortDate(transaction.date)} · {transaction.method}</small></div><strong>{money(transaction.grossCents)}</strong></div>) : <div><span><Clock3/></span><div><b>No transactions attached</b><small>Live payments and manually recorded payments will appear here.</small></div><strong>—</strong></div>}</section>
  </div>;
}
