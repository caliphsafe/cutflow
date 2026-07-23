import crypto from "node:crypto";
import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { isPaymentProvider } from "@/lib/payments/config";
import { getPayPalPlatformToken, paypalBaseUrl } from "@/lib/payments/paypal";
import { squareBaseUrl } from "@/lib/payments/square";
import { isDeletedStripeAccount, stripeConnectionValues } from "@/lib/payments/stripe-connect";
import { appUrl, getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function finishUrl(provider: string, status: "connected" | "error", message?: string) {
  const query = new URLSearchParams({ provider, status });
  if (message) query.set("message", message);
  return `${appUrl()}/payments/connect/complete?${query}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const popup = request.nextUrl.searchParams.get("popup") === "1";
  if (!isPaymentProvider(provider)) return NextResponse.redirect(`${appUrl()}/dashboard/connections?error=unsupported`);
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.redirect(`${appUrl()}/login?next=/dashboard/connections`);

  const state = crypto.randomBytes(24).toString("hex");
  const callback = `${appUrl()}/api/payments/connect/${provider}/callback`;
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.redirect(popup ? finishUrl(provider, "error", "CutFlow could not reach the payment database.") : `${appUrl()}/dashboard/connections?provider=${provider}&error=database`);

  const { data: existingConnection } = await admin
    .from("payment_connections")
    .select("*")
    .eq("barber_id", ctx.barber.id)
    .eq("provider", provider)
    .maybeSingle();

  await admin.from("payment_connections").upsert({
    barber_id: ctx.barber.id,
    provider,
    status: "pending",
    metadata: { ...(existingConnection?.metadata || {}), oauth_state: state, initiated_by: ctx.user.id, cutflow_disabled: false },
    last_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "barber_id,provider" });

  let destination = "";
  if (provider === "stripe") {
    try {
      const stripe = getStripe();
      if (!stripe) throw new Error("Stripe is not configured for this deployment.");

      let account: Stripe.Account | null = null;
      const existingAccountId = existingConnection?.external_account_id || ctx.barber.stripe_account_id || null;
      if (existingAccountId) {
        try {
          const retrieved = await stripe.accounts.retrieve(existingAccountId);
          if (!isDeletedStripeAccount(retrieved)) account = retrieved;
        } catch (error) {
          console.error("stripe-account-retrieve", error);
        }
      }

      if (!account) {
        const country = process.env.STRIPE_CONNECTED_ACCOUNT_COUNTRY?.trim().toUpperCase();
        const createParams: Stripe.AccountCreateParams = {
          type: "standard",
          email: ctx.barber.email || ctx.user.email || undefined,
          business_profile: {
            name: ctx.barber.shop_name || ctx.barber.display_name || undefined,
            url: ctx.barber.slug ? `${appUrl()}/b/${ctx.barber.slug}` : undefined,
            product_description: "Barbershop appointments and pickup products booked through CutFlow.",
          },
          metadata: {
            cutflow_barber_id: ctx.barber.id,
            cutflow_owner_user_id: ctx.user.id,
          },
        };
        if (country) createParams.country = country;
        account = await stripe.accounts.create(createParams);
      }

      const connectionValues = stripeConnectionValues(account);
      await admin.from("payment_connections").upsert({
        barber_id: ctx.barber.id,
        provider: "stripe",
        external_account_id: account.id,
        connected_at: existingConnection?.connected_at || new Date().toISOString(),
        ...connectionValues,
        metadata: { ...connectionValues.metadata, oauth_state: state, initiated_by: ctx.user.id },
      }, { onConflict: "barber_id,provider" });
      await admin.from("barber_profiles").update({
        stripe_account_id: account.id,
        stripe_connected_at: existingConnection?.connected_at || new Date().toISOString(),
        primary_payment_provider: "stripe",
      }).eq("id", ctx.barber.id);

      if (account.charges_enabled && account.payouts_enabled) {
        return NextResponse.redirect(popup ? finishUrl("stripe", "connected") : `${appUrl()}/dashboard/connections?provider=stripe&connected=1`);
      }

      const popupQuery = popup ? "&popup=1" : "";
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${appUrl()}/api/payments/connect/stripe?refresh=1${popup ? "&popup=1" : ""}`,
        return_url: `${callback}?state=${state}${popupQuery}`,
        type: "account_onboarding",
        collection_options: { fields: "eventually_due" },
      });
      destination = accountLink.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stripe setup could not be opened.";
      console.error("stripe-onboarding", error);
      await admin.from("payment_connections").update({ status: "error", last_error: message }).eq("barber_id", ctx.barber.id).eq("provider", "stripe");
      return NextResponse.redirect(popup ? finishUrl("stripe", "error", message) : `${appUrl()}/dashboard/connections?provider=stripe&error=setup`);
    }
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
          operations: [{ operation: "API_INTEGRATION", api_integration_preference: { rest_api_integration: { integration_method: "PAYPAL", integration_type: "THIRD_PARTY", third_party_details: { features: ["PAYMENT", "REFUND"] } } } }],
          legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
          partner_config_override: { return_url: `${callback}?state=${state}`, return_url_description: "Return to CutFlow payment connections", show_add_credit_card: true },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || payload?.details?.[0]?.description || "PayPal referral failed.");
      const action = payload.links?.find((link: { rel: string }) => link.rel === "action_url")?.href;
      const self = payload.links?.find((link: { rel: string }) => link.rel === "self")?.href;
      if (!action) throw new Error("PayPal did not return an onboarding URL.");
      await admin.from("payment_connections").update({ metadata: { oauth_state: state, referral_url: self, initiated_by: ctx.user.id } }).eq("barber_id", ctx.barber.id).eq("provider", "paypal");
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
