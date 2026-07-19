import type { CheckoutInput, CheckoutResult, PaymentConnectionRecord } from "./types";

export const paypalBaseUrl = process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export async function getPayPalPlatformToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal platform credentials are not configured.");
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error_description || "PayPal authentication failed.");
  return String(payload.access_token);
}

export function paypalAuthAssertion(merchantId: string) {
  const clientId = process.env.PAYPAL_CLIENT_ID || "";
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ iss: clientId, payer_id: merchantId })}.`;
}

export async function paypalRequest<T>(path: string, init: RequestInit = {}, merchantId?: string): Promise<T> {
  const token = await getPayPalPlatformToken();
  const response = await fetch(`${paypalBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(process.env.PAYPAL_PARTNER_ATTRIBUTION_ID ? { "PayPal-Partner-Attribution-Id": process.env.PAYPAL_PARTNER_ATTRIBUTION_ID } : {}),
      ...(merchantId ? { "PayPal-Auth-Assertion": paypalAuthAssertion(merchantId) } : {}),
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.details?.[0]?.description || "PayPal request failed.");
  return payload as T;
}

export async function createPayPalCheckout(connection: PaymentConnectionRecord, input: CheckoutInput): Promise<CheckoutResult> {
  const merchantId = connection.external_merchant_id || connection.external_account_id;
  if (!merchantId) throw new Error("PayPal is not fully connected.");
  return {
    provider: "paypal",
    externalSessionId: input.bookingId,
    url: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"}/checkout/paypal/${input.paymentSessionId}`,
  };
}
