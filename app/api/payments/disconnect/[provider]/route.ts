import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { isPaymentProvider } from "@/lib/payments/config";
import { decryptSecret } from "@/lib/security/encryption";
import { squareApiVersion, squareBaseUrl } from "@/lib/payments/square";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isPaymentProvider(provider)) return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ disconnected: true, demo: true });
  const { data: connection } = await admin.from("payment_connections").select("*").eq("barber_id", ctx.barber.id).eq("provider", provider).maybeSingle();

  try {
    if (provider === "stripe" && connection?.external_account_id) {
      const stripe = getStripe();
      const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
      if (stripe && clientId) await stripe.oauth.deauthorize({ client_id: clientId, stripe_user_id: connection.external_account_id });
    }
    if (provider === "square" && connection?.encrypted_access_token) {
      const token = decryptSecret(connection.encrypted_access_token);
      await fetch(`${squareBaseUrl}/oauth2/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Square-Version": squareApiVersion, Authorization: `Client ${process.env.SQUARE_APPLICATION_SECRET}` },
        body: JSON.stringify({ client_id: process.env.SQUARE_APPLICATION_ID, access_token: token }),
      });
    }
  } catch (error) {
    console.error("provider-revoke", provider, error);
  }

  await admin.from("payment_connections").update({ status: "disconnected", charges_enabled: false, payouts_enabled: false, encrypted_access_token: null, encrypted_refresh_token: null, disconnected_at: new Date().toISOString() }).eq("barber_id", ctx.barber.id).eq("provider", provider);
  if (ctx.barber.primary_payment_provider === provider) await admin.from("barber_profiles").update({ primary_payment_provider: null }).eq("id", ctx.barber.id);
  return NextResponse.json({ disconnected: true });
}
