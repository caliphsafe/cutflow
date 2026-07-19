"use client";

import { BarChart3, CalendarRange, Download, FileSpreadsheet, Landmark, LoaderCircle, ReceiptText, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type Period = "month" | "quarter" | "year";

function periodBounds(period: Period, now = new Date()) {
  const year = now.getFullYear();
  if (period === "month") return { start: new Date(year, now.getMonth(), 1), end: new Date(year, now.getMonth() + 1, 1) };
  if (period === "quarter") {
    const firstMonth = Math.floor(now.getMonth() / 3) * 3;
    return { start: new Date(year, firstMonth, 1), end: new Date(year, firstMonth + 3, 1) };
  }
  return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
}

function transactionsForPeriod(items: Transaction[], period: Period) {
  const { start, end } = periodBounds(period);
  return items.filter((transaction) => {
    const date = new Date(transaction.date);
    return date >= start && date < end;
  });
}

function periodLabel(period: Period) {
  const now = new Date();
  const { start, end } = periodBounds(period, now);
  const lastDay = new Date(end.getTime() - 1);
  if (period === "month") return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).formatRange(start, lastDay);
  if (period === "quarter") return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
  return `${now.getFullYear()} calendar year`;
}

function downloadCsv(items: Transaction[], period: Period) {
  const filtered = transactionsForPeriod(items, period);
  const headers = ["Transaction ID", "Booking ID", "Date", "Customer", "Type", "Gross", "Tax", "Processor Fee", "Net", "Method", "Status"];
  const rows = filtered.map((transaction) => [
    transaction.id,
    transaction.bookingId || "",
    transaction.date,
    transaction.customerName,
    transaction.type,
    (transaction.grossCents / 100).toFixed(2),
    (transaction.taxCents / 100).toFixed(2),
    (transaction.processorFeeCents / 100).toFixed(2),
    (transaction.netCents / 100).toFixed(2),
    transaction.method,
    transaction.status,
  ]);
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cutflow-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/dashboard/data?resource=transactions")
      .then((response) => response.json())
      .then((payload) => {
        if (!mounted) return;
        setTransactions(Array.isArray(payload.data) ? payload.data : []);
        setDemo(Boolean(payload.demo));
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => transactionsForPeriod(transactions, period), [period, transactions]);
  const summary = useMemo(() => {
    const successful = filtered.filter((transaction) => ["paid", "refunded", "partially_refunded"].includes(transaction.status));
    const value = (types: Transaction["type"][]) => successful.filter((transaction) => types.includes(transaction.type)).reduce((sum, transaction) => sum + Math.max(0, transaction.grossCents), 0);
    const refunds = successful.filter((transaction) => transaction.type === "refund" || transaction.status === "refunded").reduce((sum, transaction) => sum + Math.abs(transaction.grossCents), 0);
    const gross = successful.filter((transaction) => transaction.type !== "refund").reduce((sum, transaction) => sum + Math.max(0, transaction.grossCents), 0);
    const fees = successful.reduce((sum, transaction) => sum + Math.max(0, transaction.processorFeeCents), 0);
    const tax = successful.reduce((sum, transaction) => sum + Math.max(0, transaction.taxCents), 0);
    const net = successful.reduce((sum, transaction) => sum + transaction.netCents, 0);
    return {
      gross,
      service: value(["deposit", "service_balance", "cash"]),
      product: value(["product"]),
      tips: value(["tip"]),
      other: value(["adjustment"]),
      tax,
      fees,
      refunds,
      net,
    };
  }, [filtered]);

  const revenueBase = Math.max(1, summary.service + summary.product + summary.tips + summary.other);
  const paymentMethods = useMemo(() => {
    const map = new Map<string, number>();
    filtered.filter((transaction) => transaction.status === "paid" && transaction.type !== "refund").forEach((transaction) => {
      const method = transaction.method || "Other";
      map.set(method, (map.get(method) || 0) + Math.max(0, transaction.grossCents));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const reserve = Math.max(0, Math.round(summary.net * 0.25));
  const weeklyReserve = Math.round(reserve / (period === "month" ? 4 : period === "quarter" ? 13 : 52));
  const tabs: Array<[Period, string]> = [
    ["month", "This month"],
    ["quarter", `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`],
    ["year", `${new Date().getFullYear()} year`],
  ];

  return <div className="dashboard-page reports-page">
    <header className="page-header"><div><p className="eyebrow">TAX-READY BUSINESS REPORTING</p><h1>Reports</h1><p>Review collected income by month, quarter or year and export the underlying transaction record.</p></div><button className="button" onClick={() => downloadCsv(transactions, period)} disabled={loading}><Download/> Export CSV</button></header>
    {demo && <div className="setup-callout compact"><ReceiptText/><div><b>Preview data is showing.</b><p>Connect Supabase and record transactions to replace this sample ledger automatically.</p></div></div>}
    <section className="report-period dashboard-card"><div className="period-tabs">{tabs.map(([value, label]) => <button key={value} className={period === value ? "active" : ""} onClick={() => setPeriod(value)}>{label}</button>)}</div><div className="custom-range"><CalendarRange/><span>{periodLabel(period)}</span></div></section>
    {loading ? <section className="dashboard-card empty-state"><LoaderCircle className="spin"/><h2>Loading ledger…</h2></section> : <>
      <section className="report-summary"><article className="tax-hero-card"><div><p className="eyebrow">ESTIMATED NET CASH COLLECTED</p><strong>{money(summary.net)}</strong><span>Recorded net after refunds and processor fees</span></div><TrendingUp/><footer><div><span>Gross collected</span><b>{money(summary.gross)}</b></div><div><span>Refunds</span><b>-{money(summary.refunds)}</b></div><div><span>Processor fees</span><b>-{money(summary.fees)}</b></div></footer></article><article className="dashboard-card report-checklist"><p className="eyebrow">BOOKKEEPING SNAPSHOT</p><h2>What is included</h2><ul><li><span><ReceiptText/></span><div><b>Appointment deposits and balances</b><small>Each collection is retained as its own ledger entry.</small></div></li><li><span><BarChart3/></span><div><b>Service, product and tip totals</b><small>Separated for cleaner categorization.</small></div></li><li><span><Landmark/></span><div><b>Processor fees and refunds</b><small>Visible separately from gross collections.</small></div></li></ul></article></section>
      <section className="report-breakdown-grid"><article className="dashboard-card"><header><p className="eyebrow">REVENUE MIX</p><h2>Where collections came from</h2></header>{[["Services + deposits", summary.service], ["Products", summary.product], ["Tips", summary.tips], ["Adjustments", summary.other]].map(([label, value]) => { const numeric = Number(value); const pct = numeric / revenueBase * 100; return <div className="mix-row" key={String(label)}><div><span>{label}</span><b>{money(numeric)}</b></div><div className="mix-track"><i style={{ width: `${Math.min(100, pct)}%` }}/></div><small>{pct.toFixed(1)}%</small></div>; })}</article><article className="dashboard-card"><header><p className="eyebrow">PAYMENT METHODS</p><h2>How customers paid</h2></header>{paymentMethods.length ? paymentMethods.map(([label, value]) => <div className="method-row" key={label}><span>{label}</span><b>{money(value)}</b><small>{summary.gross ? (value / summary.gross * 100).toFixed(1) : "0.0"}%</small></div>) : <p className="muted-copy">No paid transactions in this period.</p>}</article><article className="dashboard-card tax-estimate"><header><p className="eyebrow">PLANNING ESTIMATE</p><h2>Tax reserve example</h2></header><strong>{money(reserve)}</strong><p>Example 25% reserve based on recorded net collections. This is a planning aid, not tax advice.</p><div><span>Average weekly reserve</span><b>{money(weeklyReserve)}</b></div><div><span>Recorded sales tax</span><b>{money(summary.tax)}</b></div></article></section>
      <section className="dashboard-card export-center"><div><span><FileSpreadsheet/></span><div><p className="eyebrow">EXPORT CENTER</p><h2>Give your accountant clean source data.</h2><p>Each CSV includes gross payments, taxes, processor fees, net amounts, payment method, client, booking reference and status.</p></div></div><div><button className="button secondary" onClick={() => downloadCsv(transactions, "month")}>Monthly transactions</button><button className="button secondary" onClick={() => downloadCsv(transactions, "quarter")}>Quarterly transactions</button><button className="button" onClick={() => downloadCsv(transactions, "year")}>Annual transactions</button></div></section>
    </>}
  </div>;
}
