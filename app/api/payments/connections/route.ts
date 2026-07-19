import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { paymentProviderDetails, providers } from "@/lib/payments/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getAuthenticatedBarber();
  if (ctx.demo) {
    return NextResponse.json({
      primaryProvider: "stripe",
      connections: providers.map((provider) => ({
        provider,
        ...paymentProviderDetails[provider],
        status: provider === "stripe" ? "connected" : "not_connected",
        chargesEnabled: provider === "stripe",
        payoutsEnabled: provider === "stripe",
        verificationStatus: provider === "stripe" ? "verified" : "not_started",
        environmentReady: paymentProviderDetails[provider].environmentReady(),
      })),
      demo: true,
    });
  }
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: rows } = admin
    ? await admin.from("payment_connections").select("provider,status,external_account_id,external_merchant_id,charges_enabled,payouts_enabled,verification_status,capabilities,last_synced_at,connected_at,last_error").eq("barber_id", ctx.barber.id)
    : { data: [] };
  const byProvider = new Map((rows || []).map((row) => [row.provider, row]));

  return NextResponse.json({
    primaryProvider: ctx.barber.primary_payment_provider,
    connections: providers.map((provider) => {
      const row = byProvider.get(provider);
      return {
        provider,
        ...paymentProviderDetails[provider],
        status: row?.status || "not_connected",
        externalAccountId: row?.external_account_id || row?.external_merchant_id || null,
        chargesEnabled: Boolean(row?.charges_enabled),
        payoutsEnabled: Boolean(row?.payouts_enabled),
        verificationStatus: row?.verification_status || "not_started",
        capabilities: row?.capabilities || {},
        lastSyncedAt: row?.last_synced_at || null,
        connectedAt: row?.connected_at || null,
        lastError: row?.last_error || null,
        environmentReady: paymentProviderDetails[provider].environmentReady(),
      };
    }),
  });
}
