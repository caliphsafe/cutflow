"use client";

import { Check, CircleAlert, LoaderCircle, PlugZap, RefreshCcw, ShieldCheck, Unplug, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { HelpTip } from "@/components/HelpTip";

type Connection = {
  provider: "stripe";
  label: string;
  description: string;
  customerMethods: string[];
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  verificationStatus: string;
  environmentReady: boolean;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  externalAccountId?: string | null;
};

export function PaymentConnections() {
  const [data, setData] = useState<{ primaryProvider: string | null; connections: Connection[] } | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/payments/connections", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setData(payload);
  }

  useEffect(() => {
    load();
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "cutflow-payment-connection") return;
      setBusy("");
      setMessage(event.data.status === "connected" ? "Stripe connection updated." : event.data.message || "Stripe setup was not completed.");
      load();
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  function connectStripe() {
    setMessage("");
    setBusy("stripe");
    const width = Math.min(620, window.screen.availWidth - 24);
    const height = Math.min(820, window.screen.availHeight - 40);
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
      "/api/payments/connect/stripe?popup=1",
      "cutflow-stripe-connect",
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );
    if (!popup) {
      window.location.href = "/api/payments/connect/stripe";
      return;
    }
    popup.focus();
    const timer = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(timer);
      setBusy("");
      load();
    }, 600);
  }

  async function post(url: string) {
    setBusy("stripe");
    setMessage("");
    const response = await fetch(url, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(payload.error || "The connection could not be updated.");
    await load();
    setBusy("");
  }

  if (!data) return <div className="dashboard-card loading-card"><LoaderCircle className="spin" /> Loading payment setup…</div>;
  const item = data.connections[0];
  if (!item) return <div className="dashboard-card empty-state"><CircleAlert/><h2>Stripe is not available in this deployment.</h2></div>;
  const ready = item.status === "connected" && item.chargesEnabled;

  return <>
    <section className="connections-intro dashboard-card">
      <div><span className="connection-hero-icon"><WalletCards /></span><div><p className="eyebrow">CUSTOMER PAYMENTS</p><h2>Connect Stripe once. Get paid directly. <HelpTip text="Stripe securely collects the barber’s business, identity and bank details. CutFlow never asks barbers to enter API keys." /></h2><p>Customers can pay booking deposits by card and eligible digital wallets. Payments are processed through the barber’s connected Stripe account.</p></div></div>
      <ul><li><Check />Customer payments go to the barber’s Stripe account.</li><li><Check />Booking deposits are credited toward the appointment total.</li><li><Check />Stripe’s normal processing fees still apply.</li></ul>
    </section>

    <section className="connection-grid stripe-only">
      <article className={`connection-card dashboard-card ${ready ? "ready" : ""}`}>
        <header><span className="provider-logo stripe">S</span><div><h3>Stripe</h3><p>{item.description}</p></div><span className={`connection-status ${ready ? "connected" : item.status}`}>{ready ? <ShieldCheck /> : <CircleAlert />}{ready ? "Connected" : item.status.replaceAll("_", " ")}</span></header>
        <div className="method-chip-row">{item.customerMethods.map((method) => <span key={method}>{method}</span>)}</div>
        <dl>
          <div><dt>Accepting payments <HelpTip text="Yes means customers can complete secure deposit checkout for this barber." /></dt><dd>{item.chargesEnabled ? "Yes" : "Not yet"}</dd></div>
          <div><dt>Payout ready <HelpTip text="Yes means Stripe has the identity and bank information needed to send the barber’s funds." /></dt><dd>{item.payoutsEnabled ? "Yes" : "Not yet"}</dd></div>
          <div><dt>Verification <HelpTip text="Requirements due means Stripe needs more business, identity or bank information." /></dt><dd>{item.verificationStatus.replaceAll("_", " ")}</dd></div>
        </dl>
        {item.lastError && <p className="connection-error">{item.lastError}</p>}
        <footer>
          {!item.environmentReady ? <span className="connection-config-note">Stripe is not configured yet.</span> : !ready ? <button className="button" onClick={connectStripe} disabled={busy === "stripe"}><PlugZap /> {busy === "stripe" ? "Opening Stripe…" : item.externalAccountId ? "Continue Stripe setup" : "Connect Stripe"}</button> : <>
            <button className="button secondary" disabled={busy === "stripe"} onClick={() => post("/api/payments/sync/stripe")}><RefreshCcw /> Refresh status</button>
            <button className="button ghost-danger" disabled={busy === "stripe"} onClick={() => confirm("Stop accepting Stripe payments through CutFlow?") && post("/api/payments/disconnect/stripe")}><Unplug /> Disconnect</button>
          </>}
          {ready && <span className="primary-badge"><Check /> Customer checkout active</span>}
        </footer>
      </article>
    </section>
    {message && <p className={message.includes("updated") ? "auth-success" : "form-error"}>{message}</p>}
  </>;
}
