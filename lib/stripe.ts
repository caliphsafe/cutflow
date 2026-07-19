import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    appInfo: { name: "CutFlow", version: "1.0.0" },
  });
}

export function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return value.replace(/\/$/, "");
}
