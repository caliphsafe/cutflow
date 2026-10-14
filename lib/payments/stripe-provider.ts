import { getStripe } from "@/lib/stripe";
import type { CheckoutInput, CheckoutResult, PaymentConnectionRecord } from "./types";

export async function createStripeCheckout(connection: PaymentConnectionRecord, input: CheckoutInput): Promise<CheckoutResult> {
  const stripe = getStripe();
  const account = connection.external_account_id;
  if (!stripe || !account) throw new Error("Stripe is not fully connected.");

  // Direct charge on the barber's Stripe account. CutFlow does not request an application fee.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: input.amountCents,
        product_data: {
          name: `${input.serviceName} ${input.purpose === "deposit" ? "booking deposit" : "remaining balance"}`,
          description: input.purpose === "deposit" ? "Applied to the final appointment total" : `Booking ${input.bookingCode}`,
        },
      },
    }],
    payment_intent_data: {
      description: `${input.barberName} booking ${input.purpose}`,
      metadata: { booking_id: input.bookingId, booking_code: input.bookingCode, payment_kind: input.purpose, portal_token: input.portalToken, cutflow_platform_fee_cents: "0" },
    },
    metadata: { booking_id: input.bookingId, booking_code: input.bookingCode, payment_kind: input.purpose, portal_token: input.portalToken, cutflow_platform_fee_cents: "0" },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  }, { stripeAccount: account });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { provider: "stripe", externalSessionId: session.id, url: session.url };
}
