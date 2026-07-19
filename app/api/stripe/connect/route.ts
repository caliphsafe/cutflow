import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { appUrl, getStripe } from "@/lib/stripe";

export async function POST() {
  const stripe = getStripe();
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!stripe || !clientId) {
    return NextResponse.json({ url: `${appUrl()}/dashboard/settings?stripe=demo-connected`, demo: true });
  }

  const state = randomUUID();
  const response = NextResponse.json({
    url: `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&scope=read_write&redirect_uri=${encodeURIComponent(`${appUrl()}/api/stripe/connect/callback`)}&state=${encodeURIComponent(state)}&stripe_landing=register`,
  });
  response.cookies.set("cutflow_stripe_state", state, { httpOnly: true, sameSite: "lax", secure: appUrl().startsWith("https"), maxAge: 600, path: "/" });
  return response;
}
