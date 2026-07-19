"use client";

import { Check, CreditCard, Crown, ExternalLink, LoaderCircle, ReceiptText, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const plans = [
  {
    code: "pro",
    name: "Complete",
    price: 69,
    features: [
      "Smart booking and deposits",
      "Client profiles and haircut memory",
      "Multiple payment connections",
      "Products, reminders and reports",
      "Customer self-service portal",
    ],
    featured: true,
  },
];

type SubscriptionData = { planCode: string; status: string; trialEndsAt?: string; currentPeriodEnd?: string; hasBillingCustomer: boolean; hasSubscription: boolean };

export default function SubscriptionPage() {
  const [loading, setLoading] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/data?resource=subscription").then((response) => response.json()).then((payload) => setSubscription(payload.data || null));
  }, []);

  const trialDays = useMemo(() => {
    if (!subscription?.trialEndsAt) return 0;
    return Math.max(0, Math.ceil((+new Date(subscription.trialEndsAt) - Date.now()) / 86400000));
  }, [subscription]);

  async function checkout(plan: string) {
    setLoading(plan);
    setNotice("");
    const response = await fetch("/api/subscription/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    const data = await response.json();
    if (data.url) window.location.href = data.url;
    else { setNotice(data.error || "Checkout could not be opened."); setLoading(""); }
  }

  async function portal() {
    setLoading("portal");
    setNotice("");
    const response = await fetch("/api/subscription/portal", { method: "POST" });
    const data = await response.json();
    if (data.url) window.location.href = data.url;
    else { setNotice(data.error || "Billing portal could not be opened."); setLoading(""); }
  }

  const currentPlan = plans.find((plan) => plan.code === subscription?.planCode) || plans[0];
  return <div className="dashboard-page subscription-page">
    <header className="page-header"><div><p className="eyebrow">CUTFLOW ACCOUNT</p><h1>Subscription</h1><p>CutFlow is paid through a predictable software plan—not a percentage of customer payments.</p></div><button className="button secondary" onClick={portal} disabled={loading === "portal"}>{loading === "portal" ? <LoaderCircle className="spin"/> : <ExternalLink/>} Billing portal</button></header>
    {notice && <div className="inline-notice error">{notice}</div>}
    <section className="current-plan-card"><div><span><Crown/></span><div><small>CURRENT PLAN</small><h2>{currentPlan.name} {subscription?.status === "trialing" ? "trial" : "plan"}</h2><p>{subscription?.trialEndsAt ? `Trial access through ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(subscription.trialEndsAt))}` : subscription?.currentPeriodEnd ? `Current period through ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(subscription.currentPeriodEnd))}` : "Choose a Stripe-backed plan when ready"}</p></div></div><div><span>{subscription?.status === "trialing" ? "Trial remaining" : "Account status"}</span><b>{subscription?.status === "trialing" ? `${trialDays} days` : subscription?.status || "preview"}</b><div className="trial-track"><i style={{ width: `${Math.min(100, trialDays / 14 * 100)}%` }}/></div></div><button className="button" onClick={() => checkout(currentPlan.code)} disabled={Boolean(loading)}><CreditCard/> {subscription?.hasSubscription ? "Update plan" : "Add payment method"}</button></section>
    <section className="subscription-principle"><ShieldCheck/><div><b>The subscription and appointment payments are separate.</b><p>Your monthly CutFlow bill is paid to CutFlow. Customer deposits, balances and product payments are direct barber transactions with no CutFlow application percentage.</p></div></section>
    <section className="dashboard-plan-grid single-plan">{plans.map((plan) => <article className={plan.code === currentPlan.code ? "dashboard-plan featured" : "dashboard-plan"} key={plan.code}>{plan.code === currentPlan.code && <span className="popular">CURRENT</span>}<p>{plan.name}</p><h2>${plan.price}<small>/month</small></h2><ul>{plan.features.map((feature) => <li key={feature}><Check/>{feature}</li>)}</ul><button className={plan.code === currentPlan.code ? "button" : "button secondary"} onClick={() => checkout(plan.code)} disabled={Boolean(loading)}>{loading === plan.code ? "Opening checkout…" : plan.code === currentPlan.code ? `Keep ${plan.name}` : `Choose ${plan.name}`}</button></article>)}</section>
    <section className="dashboard-card billing-history"><header><div><ReceiptText/><span><p className="eyebrow">BILLING STATUS</p><h2>Software billing</h2></span></div></header><div><span><b>{subscription?.status === "trialing" ? "Trial active" : "Subscription record"}</b><small>{subscription?.trialEndsAt ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(subscription.trialEndsAt)) : "Managed through Stripe Billing"}</small></span><span>{currentPlan.name}</span><strong>{subscription?.status === "trialing" ? "$0.00" : `$${currentPlan.price}.00`}</strong><span className="status-pill status-paid">{subscription?.status || "preview"}</span></div></section>
  </div>;
}
