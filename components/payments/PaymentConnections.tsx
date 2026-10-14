"use client";

import { Check, CircleAlert, LoaderCircle, PlugZap, RefreshCcw, ShieldCheck, Unplug, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { HelpTip } from "@/components/HelpTip";
import { ExternalPaymentMethods } from "@/components/payments/ExternalPaymentMethods";

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
  if (!item) return <div className="dashboard-card empty-state"><CircleAlert/><h2>Stripe setup is temporarily unavailable.</h2></div>;
  const ready = item.status === "connected" && item.chargesEnabled;

  return <>
    <ExternalPaymentMethods />
    <section className="connections-intro dashboard-card optional-stripe-intro">
      <div><span className="connection-hero-icon"><WalletCards /></span><div><p className="eyebrow">OPTIONAL CARD PAYMENTS</p><h2>Keep Stripe as an additional way to pay. <HelpTip text="Cash App and Venmo can be your main deposit options. Stripe is available for clients who prefer cards or digital wallets." /></h2><p>Stripe is optional. If you connect it, clients can also pay deposits by card and eligible digital wallets.</p></div></div>
      <ul><li><Check />Cash App and Venmo can remain your primary deposit methods.</li><li><Check />Stripe gives clients an additional card and wallet option.</li><li><Check />CutFlow does not add a percentage fee to Stripe appointment payments.</li></ul>
    </section>

    <section className="connection-grid stripe-only">
      <article className={`connection-card dashboard-card ${ready ? "ready" : ""}`}>
        <header><span className="provider-logo stripe">S</span><div><h3>Stripe</h3><p>{item.description}</p></div><span className={`connection-status ${ready ? "connected" : item.status}`}>{ready ? <ShieldCheck /> : <CircleAlert />}{ready ? "Connected" : item.status.replaceAll("_", " ")}</span></header>
        <div className="method-chip-row">{item.customerMethods.map((method) => <span key={method}>{method}</span>)}</div>
        <dl>
          <div><dt>Accepting payments <HelpTip text="Yes means customers can pay a deposit when they book." /></dt><dd>{item.chargesEnabled ? "Yes" : "Not yet"}</dd></div>
          <div><dt>Payout ready <HelpTip text="Yes means Stripe has the information needed to send your payouts." /></dt><dd>{item.payoutsEnabled ? "Yes" : "Not yet"}</dd></div>
          <div><dt>Verification <HelpTip text="If more information is needed, Stripe will guide you through the remaining steps." /></dt><dd>{item.verificationStatus.replaceAll("_", " ")}</dd></div>
        </dl>
        {item.lastError && <p className="connection-error">{item.lastError}</p>}
        <footer>
          {!item.environmentReady ? <span className="connection-config-note">Stripe setup is temporarily unavailable. Please contact CutFlow support.</span> : !ready ? <button className="button" onClick={connectStripe} disabled={busy === "stripe"}><PlugZap /> {busy === "stripe" ? "Opening Stripe…" : item.externalAccountId ? "Continue Stripe setup" : "Connect Stripe"}</button> : <>
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
