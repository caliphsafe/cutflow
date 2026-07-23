"use client";

import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function CompleteConnection() {
  const params = useSearchParams();
  const status = params.get("status") || "connected";
  const provider = params.get("provider") || "stripe";
  const message = params.get("message") || (status === "connected" ? "Stripe setup is complete." : "Stripe setup was not completed.");

  useEffect(() => {
    window.opener?.postMessage({ type: "cutflow-payment-connection", provider, status, message }, window.location.origin);
    const timer = window.setTimeout(() => window.close(), 900);
    return () => window.clearTimeout(timer);
  }, [message, provider, status]);

  const success = status === "connected";
  return <main className="connection-complete-page"><section className="connection-complete-card">{success ? <CheckCircle2 /> : <CircleAlert />}<h1>{success ? "Stripe connected" : "Stripe setup paused"}</h1><p>{message}</p><span><LoaderCircle className="spin" /> Returning to CutFlow…</span><button className="button secondary" onClick={() => window.close()}>Close this window</button></section></main>;
}

export default function ConnectionCompletePage() {
  return <Suspense><CompleteConnection /></Suspense>;
}
