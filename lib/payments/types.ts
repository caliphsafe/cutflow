export type PaymentProvider = "stripe" | "square" | "paypal";
export type PaymentPurpose = "deposit" | "service_balance" | "product";

export type PaymentConnectionRecord = {
  id: string;
  barber_id: string;
  provider: PaymentProvider;
  status: string;
  external_account_id: string | null;
  external_merchant_id: string | null;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  token_expires_at: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  verification_status: string;
  capabilities: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

export type CheckoutInput = {
  barberId: string;
  bookingId: string;
  paymentSessionId: string;
  bookingCode: string;
  barberName: string;
  barberSlug: string;
  customerEmail: string;
  customerName: string;
  serviceName: string;
  amountCents: number;
  purpose: PaymentPurpose;
  successUrl: string;
  cancelUrl: string;
  portalToken: string;
};

export type CheckoutResult = {
  provider: PaymentProvider;
  externalSessionId: string;
  externalOrderId?: string | null;
  url: string;
};
