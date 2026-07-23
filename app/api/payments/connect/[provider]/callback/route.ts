import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { isPaymentProvider } from "@/lib/payments/config";
import { encryptSecret } from "@/lib/security/encryption";
import { getPayPalPlatformToken, paypalBaseUrl } from "@/lib/payments/paypal";
import { squareApiVersion, squareBaseUrl, squareRequest } from "@/lib/payments/square";
import { stripeConnectionValues } from "@/lib/payments/stripe-connect";
import { appUrl, getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const popup = request.nextUrl.searchParams.get("popup") === "1";
  const finishUrl = (status: "connected" | "error", message?: string) => { const query = new URLSearchParams({ provider, status }); if (message) query.set("message", message); return `${appUrl()}/payments/connect/complete?${query}`; };
  if (!isPaymentProvider(provider)) return NextResponse.redirect(`${appUrl()}/dashboard/connections?error=unsupported`);
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.redirect(`${appUrl()}/login?next=/dashboard/connections`);
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get(`cutflow_${provider}_state`)?.value;
  if (!state || state !== expected) return NextResponse.redirect(popup ? finishUrl("error", "The secure connection session expired. Please try again.") : `${appUrl()}/dashboard/connections?provider=${provider}&error=state`);
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.redirect(`${appUrl()}/dashboard/connections?provider=${provider}&error=database`);

  try {
    if (provider === "stripe") {
      const stripe = getStripe();
      if (!stripe) throw new Error("Stripe is not configured.");
      const { data: connection } = await admin
        .from("payment_connections")
        .select("*")
        .eq("barber_id", ctx.barber.id)
        .eq("provider", "stripe")
        .maybeSingle();
      if (!connection?.external_account_id) throw new Error("Stripe connected account is missing.");
      const account = await stripe.accounts.retrieve(connection.external_account_id);
      if ("deleted" in account && account.deleted) throw new Error("Stripe connected account is no longer available.");
      const connectionValues = stripeConnectionValues(account);
      await admin.from("payment_connections").upsert({
        barber_id: ctx.barber.id,
        provider: "stripe",
        external_account_id: account.id,
        connected_at: connection.connected_at || new Date().toISOString(),
        ...connectionValues,
      }, { onConflict: "barber_id,provider" });
      await admin.from("barber_profiles").update({
        stripe_account_id: account.id,
        stripe_connected_at: connection.connected_at || new Date().toISOString(),
        primary_payment_provider: ctx.barber.primary_payment_provider || "stripe",
      }).eq("id", ctx.barber.id);
    }

    if (provider === "square") {
      const code = request.nextUrl.searchParams.get("code");
      if (!code) throw new Error("Square authorization code is missing.");
      const response = await fetch(`${squareBaseUrl}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Square-Version": squareApiVersion },
        body: JSON.stringify({
          client_id: process.env.SQUARE_APPLICATION_ID,
          client_secret: process.env.SQUARE_APPLICATION_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: `${appUrl()}/api/payments/connect/square/callback`,
        }),
      });
      const token = await response.json();
      if (!response.ok) throw new Error(token?.message || token?.errors?.[0]?.detail || "Square token exchange failed.");
      const locations = await squareRequest<{ locations?: Array<{ id: string; status: string; name: string }> }>("/v2/locations", token.access_token);
      const location = locations.locations?.find((item) => item.status === "ACTIVE") || locations.locations?.[0];
      const bankAccounts = await squareRequest<{ bank_accounts?: Array<{ status?: string; creditable?: boolean }> }>(`/v2/bank-accounts${location?.id ? `?location_id=${encodeURIComponent(location.id)}` : ""}`, token.access_token).catch(() => ({ bank_accounts: [] }));
      const payoutReady = Boolean(bankAccounts.bank_accounts?.some((account) => account.status === "VERIFIED" && account.creditable !== false));
      await admin.from("payment_connections").upsert({
        barber_id: ctx.barber.id,
        provider: "square",
        status: "connected",
        external_account_id: token.merchant_id,
        external_merchant_id: token.merchant_id,
        encrypted_access_token: encryptSecret(token.access_token),
        encrypted_refresh_token: token.refresh_token ? encryptSecret(token.refresh_token) : null,
        token_expires_at: token.expires_at || null,
        charges_enabled: true,
        payouts_enabled: payoutReady,
        verification_status: "verified",
        capabilities: { scopes: token.scopes || [] },
        metadata: { location_id: location?.id || null, location_name: location?.name || null, verified_bank_account: payoutReady },
        connected_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        last_error: null,
      }, { onConflict: "barber_id,provider" });
      if (!ctx.barber.primary_payment_provider) await admin.from("barber_profiles").update({ primary_payment_provider: "square" }).eq("id", ctx.barber.id);
    }

    if (provider === "paypal") {
      const merchantId = request.nextUrl.searchParams.get("merchantIdInPayPal") || request.nextUrl.searchParams.get("merchant_id") || request.nextUrl.searchParams.get("merchantId");
      const permissionsGranted = request.nextUrl.searchParams.get("permissionsGranted") !== "false";
      if (!merchantId) throw new Error("PayPal did not return the seller merchant ID. Platform approval may still be pending.");
      const accessToken = await getPayPalPlatformToken();
      const partnerId = process.env.PAYPAL_PARTNER_MERCHANT_ID;
      let statusPayload: Record<string, unknown> = {};
      if (partnerId) {
        const statusResponse = await fetch(`${paypalBaseUrl}/v1/customer/partners/${partnerId}/merchant-integrations/${merchantId}`, { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } });
        statusPayload = await statusResponse.json().catch(() => ({}));
      }
      const paymentsReceivable = statusPayload.payments_receivable !== false;
      await admin.from("payment_connections").upsert({
        barber_id: ctx.barber.id,
        provider: "paypal",
        status: permissionsGranted && paymentsReceivable ? "connected" : "restricted",
        external_account_id: merchantId,
        external_merchant_id: merchantId,
        charges_enabled: permissionsGranted && paymentsReceivable,
        payouts_enabled: statusPayload.primary_email_confirmed !== false,
        verification_status: statusPayload.payments_receivable === true ? "verified" : "requirements_due",
        capabilities: statusPayload,
        metadata: { consent_status: request.nextUrl.searchParams.get("consentStatus") },
        connected_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        last_error: null,
      }, { onConflict: "barber_id,provider" });
      if (!ctx.barber.primary_payment_provider) await admin.from("barber_profiles").update({ primary_payment_provider: "paypal" }).eq("id", ctx.barber.id);
    }

    const response = NextResponse.redirect(popup ? finishUrl("connected") : `${appUrl()}/dashboard/connections?provider=${provider}&connected=1`);
    response.cookies.delete(`cutflow_${provider}_state`);
    return response;
  } catch (error) {
    console.error(`${provider}-callback`, error);
    await admin.from("payment_connections").update({ status: "error", last_error: error instanceof Error ? error.message : "Connection failed" }).eq("barber_id", ctx.barber.id).eq("provider", provider);
    const message = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.redirect(popup ? finishUrl("error", message) : `${appUrl()}/dashboard/connections?provider=${provider}&error=callback`);
  }
}
