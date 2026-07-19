"use client";

import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";

declare global {
  interface Window { paypal?: any; }
}

export function PayPalCheckoutClient({ sessionId, clientId, merchantId, partnerAttributionId, amountCents, shopName, bookingCode, successUrl, environment }: {
  sessionId: string;
  clientId: string;
  merchantId: string;
  partnerAttributionId: string;
  amountCents: number;
  shopName: string;
  bookingCode: string;
  successUrl: string;
  environment: "sandbox" | "live";
}) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading PayPal and Venmo…");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const script = document.createElement("script");
    const base = environment === "live" ? "https://www.paypal.com/sdk/js" : "https://www.sandbox.paypal.com/sdk/js";
    const query = new URLSearchParams({ "client-id": clientId, "merchant-id": merchantId, currency: "USD", intent: "capture", components: "buttons", "enable-funding": "venmo" });
    script.src = `${base}?${query}`;
    script.async = true;
    if (partnerAttributionId) script.dataset.partnerAttributionId = partnerAttributionId;
    script.onload = () => {
      if (cancelled || !window.paypal || !container.current) return;
      setStatus("Choose PayPal or Venmo below.");
      window.paypal.Buttons({
        style: { layout: "vertical", shape: "pill", label: "paypal" },
        createOrder: async () => {
          const response = await fetch("/api/payments/paypal/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentSessionId: sessionId }) });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Could not create PayPal order.");
          return payload.orderId;
        },
        onApprove: async (data: { orderID: string }) => {
          setStatus("Confirming payment…");
          const response = await fetch("/api/payments/paypal/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentSessionId: sessionId, orderId: data.orderID }) });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "PayPal could not confirm the payment.");
          window.location.href = successUrl;
        },
        onCancel: () => setStatus("Payment cancelled. Your chair is held briefly while you decide."),
        onError: (err: unknown) => { console.error(err); setError(err instanceof Error ? err.message : "PayPal checkout failed."); },
      }).render(container.current);
    };
    script.onerror = () => setError("PayPal checkout could not load.");
    document.body.appendChild(script);
    return () => { cancelled = true; script.remove(); };
  }, [clientId, environment, merchantId, partnerAttributionId, sessionId, successUrl]);

  return <main className="provider-checkout-page"><section className="provider-checkout-card glass-card"><header><span className="provider-mark">P</span><div><small>SECURE CHECKOUT</small><h1>{shopName}</h1><p>Booking {bookingCode}</p></div></header><div className="provider-checkout-total"><span>Deposit due now</span><strong>{money(amountCents)}</strong><small>Applied to the final appointment total.</small></div><div ref={container} className="paypal-buttons"/><div className="provider-status">{error ? <><ShieldCheck/><span>{error}</span></> : status.includes("Confirming") ? <><LoaderCircle className="spin"/><span>{status}</span></> : <><CheckCircle2/><span>{status}</span></>}</div><p className="provider-disclaimer">Available buttons depend on device, location, account eligibility and PayPal partner approval. Venmo normally appears for eligible US mobile customers.</p></section></main>;
}
