import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { isPaymentProvider } from "@/lib/payments/config";

import { getPayPalPlatformToken, paypalBaseUrl } from "@/lib/payments/paypal";
import { getValidSquareAccessToken, squareRequest } from "@/lib/payments/square";
import { stripeConnectionValues } from "@/lib/payments/stripe-connect";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isPaymentProvider(provider)) return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ synced: true, demo: true });
  const { data: connection } = await admin.from("payment_connections").select("*").eq("barber_id", ctx.barber.id).eq("provider", provider).maybeSingle();
  if (!connection) return NextResponse.json({ error: "Provider is not connected." }, { status: 404 });

  try {
    const updates: Record<string, unknown> = { last_synced_at: new Date().toISOString(), last_error: null };
    if (provider === "stripe") {
      const stripe = getStripe();
      if (!stripe || !connection.external_account_id) throw new Error("Stripe connection is incomplete.");
      const account = await stripe.accounts.retrieve(connection.external_account_id);
      if ("deleted" in account && account.deleted) throw new Error("Stripe connected account is no longer available.");
      Object.assign(updates, stripeConnectionValues(account));
    }
    if (provider === "square") {
      const token = await getValidSquareAccessToken(connection);
      const merchant = await squareRequest<{ merchant: { id: string; status: string } }>(`/v2/merchants/${connection.external_merchant_id || "me"}`, token);
      const locationId = String(connection.metadata?.location_id || "");
      const bankAccounts = await squareRequest<{ bank_accounts?: Array<{ status?: string; creditable?: boolean }> }>(`/v2/bank-accounts${locationId ? `?location_id=${encodeURIComponent(locationId)}` : ""}`, token).catch(() => ({ bank_accounts: [] }));
      const payoutReady = Boolean(bankAccounts.bank_accounts?.some((account) => account.status === "VERIFIED" && account.creditable !== false));
      Object.assign(updates, { status: merchant.merchant?.status === "ACTIVE" ? "connected" : "restricted", charges_enabled: merchant.merchant?.status === "ACTIVE", payouts_enabled: payoutReady, verification_status: merchant.merchant?.status === "ACTIVE" ? "verified" : "requirements_due", metadata: { ...(connection.metadata || {}), verified_bank_account: payoutReady } });
    }
    if (provider === "paypal") {
      const partnerId = process.env.PAYPAL_PARTNER_MERCHANT_ID;
      const merchantId = connection.external_merchant_id;
      if (!partnerId || !merchantId) throw new Error("PayPal connection is incomplete.");
      const token = await getPayPalPlatformToken();
      const response = await fetch(`${paypalBaseUrl}/v1/customer/partners/${partnerId}/merchant-integrations/${merchantId}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      const status = await response.json();
      if (!response.ok) throw new Error(status?.message || "PayPal status check failed.");
      Object.assign(updates, { status: status.payments_receivable ? "connected" : "restricted", charges_enabled: Boolean(status.payments_receivable), payouts_enabled: Boolean(status.primary_email_confirmed), verification_status: status.payments_receivable ? "verified" : "requirements_due", capabilities: status });
    }
    await admin.from("payment_connections").update(updates).eq("id", connection.id);
    return NextResponse.json({ synced: true });
  } catch (error) {
    await admin.from("payment_connections").update({ status: "error", last_error: error instanceof Error ? error.message : "Sync failed", last_synced_at: new Date().toISOString() }).eq("id", connection.id);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed." }, { status: 500 });
  }
}
