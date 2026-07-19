import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPayPalCheckout } from "./paypal";
import { createSquareCheckout } from "./square";
import { createStripeCheckout } from "./stripe-provider";
import type { CheckoutInput, PaymentConnectionRecord, PaymentProvider } from "./types";

export async function getPaymentConnection(barberId: string, provider: PaymentProvider) {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;
  const { data } = await admin
    .from("payment_connections")
    .select("*")
    .eq("barber_id", barberId)
    .eq("provider", provider)
    .eq("status", "connected")
    .maybeSingle();
  return data as PaymentConnectionRecord | null;
}

export async function createProviderCheckout(provider: PaymentProvider, connection: PaymentConnectionRecord, input: CheckoutInput) {
  if (provider === "stripe") return createStripeCheckout(connection, input);
  if (provider === "square") return createSquareCheckout(connection, input);
  return createPayPalCheckout(connection, input);
}
