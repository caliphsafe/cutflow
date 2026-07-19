import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { CheckoutInput, CheckoutResult, PaymentConnectionRecord } from "./types";

export const squareBaseUrl = process.env.SQUARE_ENVIRONMENT === "sandbox"
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";

export const squareApiVersion = process.env.SQUARE_API_VERSION || "2026-07-15";

export async function squareRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${squareBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Square-Version": squareApiVersion,
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.errors?.[0]?.detail || payload?.message || "Square request failed.");
  return payload as T;
}

/**
 * Return a usable seller access token and renew it before expiration.
 * Square access tokens expire, so customer checkout cannot depend on the
 * barber remembering to manually refresh the dashboard connection.
 */
export async function getValidSquareAccessToken(connection: PaymentConnectionRecord) {
  let accessToken = decryptSecret(connection.encrypted_access_token);
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  const needsRefresh = Boolean(expiresAt && expiresAt < Date.now() + 7 * 86_400_000);
  if (!needsRefresh) return accessToken;
  if (!connection.encrypted_refresh_token) throw new Error("Square authorization needs to be reconnected before accepting payments.");

  const response = await fetch(`${squareBaseUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Square-Version": squareApiVersion },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID,
      client_secret: process.env.SQUARE_APPLICATION_SECRET,
      grant_type: "refresh_token",
      refresh_token: decryptSecret(connection.encrypted_refresh_token),
    }),
  });
  const refreshed = await response.json().catch(() => ({}));
  if (!response.ok || !refreshed.access_token) throw new Error(refreshed?.message || refreshed?.errors?.[0]?.detail || "Square authorization renewal failed.");

  accessToken = refreshed.access_token;
  const admin = createAdminSupabaseClient();
  if (admin) {
    await admin.from("payment_connections").update({
      encrypted_access_token: encryptSecret(refreshed.access_token),
      encrypted_refresh_token: refreshed.refresh_token ? encryptSecret(refreshed.refresh_token) : connection.encrypted_refresh_token,
      token_expires_at: refreshed.expires_at || null,
      status: "connected",
      last_error: null,
      last_synced_at: new Date().toISOString(),
    }).eq("id", connection.id);
  }
  return accessToken;
}

export async function createSquareCheckout(connection: PaymentConnectionRecord, input: CheckoutInput): Promise<CheckoutResult> {
  const token = await getValidSquareAccessToken(connection);
  const locationId = String(connection.metadata?.location_id || "");
  if (!locationId) throw new Error("Square is connected but no active location is available.");

  const payload = await squareRequest<{ payment_link: { id: string; url: string; order_id?: string }; related_resources?: { orders?: Array<{ id: string }> } }>("/v2/online-checkout/payment-links", token, {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: `${input.bookingId}-${input.purpose}`,
      quick_pay: {
        name: `${input.serviceName} ${input.purpose === "deposit" ? "booking deposit" : "balance"}`,
        price_money: { amount: input.amountCents, currency: "USD" },
        location_id: locationId,
      },
      checkout_options: {
        redirect_url: input.successUrl,
        ask_for_shipping_address: false,
        allow_tipping: input.purpose === "service_balance",
      },
      pre_populated_data: {
        buyer_email: input.customerEmail,
      },
      payment_note: `${input.bookingCode}|${input.bookingId}|${input.purpose}`,
      description: `${input.barberName} · Booking ${input.bookingCode}`,
    }),
  });

  return {
    provider: "square",
    externalSessionId: payload.payment_link.id,
    externalOrderId: payload.payment_link.order_id || payload.related_resources?.orders?.[0]?.id || null,
    url: payload.payment_link.url,
  };
}
