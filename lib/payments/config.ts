import type { PaymentProvider } from "./types";

export const paymentProviderDetails: Record<PaymentProvider, {
  label: string;
  description: string;
  customerMethods: string[];
  environmentReady: () => boolean;
}> = {
  stripe: {
    label: "Stripe",
    description: "Secure customer payments by card, Apple Pay, Google Pay and eligible digital wallets.",
    customerMethods: ["Cards", "Apple Pay", "Google Pay", "Cash App Pay"],
    environmentReady: () => Boolean(process.env.STRIPE_SECRET_KEY),
  },
  square: {
    label: "Square",
    description: "Square-hosted checkout using the barber’s own Square account.",
    customerMethods: ["Cards", "Apple Pay", "Google Pay", "Cash App Pay"],
    environmentReady: () => false,
  },
  paypal: {
    label: "PayPal & Venmo",
    description: "PayPal and Venmo checkout when CutFlow and the seller are eligible.",
    customerMethods: ["PayPal", "Venmo", "Pay Later", "Cards"],
    environmentReady: () => false,
  },
};

// Stripe is the only provider exposed in the production interface until
// additional provider onboarding and live webhook verification are complete.
export const providers: PaymentProvider[] = ["stripe"];
const knownProviders: PaymentProvider[] = ["stripe", "square", "paypal"];

export function isPaymentProvider(value: string): value is PaymentProvider {
  return knownProviders.includes(value as PaymentProvider);
}
