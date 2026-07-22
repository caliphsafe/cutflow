import type { PaymentProvider } from "./types";

export const paymentProviderDetails: Record<PaymentProvider, {
  label: string;
  description: string;
  customerMethods: string[];
  environmentReady: () => boolean;
}> = {
  stripe: {
    label: "Stripe",
    description: "Cards, Apple Pay, Google Pay and Cash App Pay through Stripe Checkout.",
    customerMethods: ["Cards", "Apple Pay", "Google Pay", "Cash App Pay"],
    environmentReady: () => Boolean(process.env.STRIPE_SECRET_KEY),
  },
  square: {
    label: "Square",
    description: "Square-hosted checkout using the barber’s own Square account.",
    customerMethods: ["Cards", "Apple Pay", "Google Pay", "Cash App Pay"],
    environmentReady: () => Boolean(process.env.SQUARE_APPLICATION_ID && process.env.SQUARE_APPLICATION_SECRET && process.env.PAYMENT_TOKEN_ENCRYPTION_KEY),
  },
  paypal: {
    label: "PayPal & Venmo",
    description: "PayPal Complete Payments with Venmo when CutFlow and the seller are eligible.",
    customerMethods: ["PayPal", "Venmo", "Pay Later", "Cards"],
    environmentReady: () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_PARTNER_MERCHANT_ID),
  },
};

export const providers = Object.keys(paymentProviderDetails) as PaymentProvider[];

export function isPaymentProvider(value: string): value is PaymentProvider {
  return providers.includes(value as PaymentProvider);
}
