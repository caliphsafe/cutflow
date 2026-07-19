import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { isPaymentProvider } from "@/lib/payments/config";
import { getPayPalPlatformToken, paypalBaseUrl } from "@/lib/payments/paypal";
import { squareBaseUrl } from "@/lib/payments/square";
import { appUrl } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isPaymentProvider(provider)) return NextResponse.redirect(`${appUrl()}/dashboard/connections?error=unsupported`);
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.redirect(`${appUrl()}/login?next=/dashboard/connections`);

  const state = crypto.randomBytes(24).toString("hex");
  const callback = `${appUrl()}/api/payments/connect/${provider}/callback`;
  const admin = createAdminSupabaseClient();
  if (admin) {
    await admin.from("payment_connections").upsert({
      barber_id: ctx.barber.id,
      provider,
      status: "pending",
      metadata: { oauth_state: state, initiated_by: ctx.user.id },
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "barber_id,provider" });
  }

  let destination = "";
  if (provider === "stripe") {
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    if (!clientId) return NextResponse.redirect(`${appUrl()}/dashboard/connections?provider=stripe&error=not_configured`);
    const query = new URLSearchParams({ response_type: "code", client_id: clientId, scope: "read_write", redirect_uri: callback, state });
    destination = `https://connect.stripe.com/oauth/authorize?${query}`;
  }

  if (provider === "square") {
    const clientId = process.env.SQUARE_APPLICATION_ID;
    if (!clientId) return NextResponse.redirect(`${appUrl()}/dashboard/connections?provider=square&error=not_configured`);
    const scope = ["MERCHANT_PROFILE_READ", "MERCHANT_PROFILE_WRITE", "PAYMENTS_READ", "PAYMENTS_WRITE", "ORDERS_READ", "ORDERS_WRITE", "CUSTOMERS_READ", "CUSTOMERS_WRITE", "ITEMS_READ", "PAYMENT_METHODS_READ", "BANK_ACCOUNTS_READ"].join(" ");
    const query = new URLSearchParams({ client_id: clientId, scope, state, redirect_uri: callback });
    destination = `${squareBaseUrl}/oauth2/authorize?${query}`;
  }

  if (provider === "paypal") {
    if (!process.env.PAYPAL_PARTNER_MERCHANT_ID) return NextResponse.redirect(`${appUrl()}/dashboard/connections?provider=paypal&error=not_configured`);
    try {
      const token = await getPayPalPlatformToken();
      const response = await fetch(`${paypalBaseUrl}/v2/customer/partner-referrals`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_id: ctx.barber.id,
          email: ctx.barber.email || ctx.user.email,
          preferred_language_code: "en-US",
          products: ["PPCP"],
          operations: [{
            operation: "API_INTEGRATION",
            api_integration_preference: {
              rest_api_integration: {
                integration_method: "PAYPAL",
                integration_type: "THIRD_PARTY",
                third_party_details: { features: ["PAYMENT", "REFUND"] },
              },
            },
          }],
          legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
          partner_config_override: {
            return_url: `${callback}?state=${state}`,
            return_url_description: "Return to CutFlow payment connections",
            show_add_credit_card: true,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || payload?.details?.[0]?.description || "PayPal referral failed.");
      const action = payload.links?.find((link: { rel: string }) => link.rel === "action_url")?.href;
      const self = payload.links?.find((link: { rel: string }) => link.rel === "self")?.href;
      if (!action) throw new Error("PayPal did not return an onboarding URL.");
      if (admin) {
        await admin.from("payment_connections").update({ metadata: { oauth_state: state, referral_url: self, initiated_by: ctx.user.id } }).eq("barber_id", ctx.barber.id).eq("provider", "paypal");
      }
      destination = action;
    } catch (error) {
      console.error("paypal-onboarding", error);
      return NextResponse.redirect(`${appUrl()}/dashboard/connections?provider=paypal&error=approval_or_configuration`);
    }
  }

  const response = NextResponse.redirect(destination);
  response.cookies.set(`cutflow_${provider}_state`, state, { httpOnly: true, sameSite: "lax", secure: appUrl().startsWith("https"), maxAge: 900, path: "/" });
  return response;
}
