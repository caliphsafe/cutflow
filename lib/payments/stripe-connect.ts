import type Stripe from "stripe";

export function stripeConnectionValues(account: Stripe.Account) {
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);
  const currentlyDue = account.requirements?.currently_due || [];
  const pastDue = account.requirements?.past_due || [];
  const pendingVerification = account.requirements?.pending_verification || [];
  const disabledReason = account.requirements?.disabled_reason || null;

  return {
    status: chargesEnabled ? "connected" : "restricted",
    charges_enabled: chargesEnabled,
    payouts_enabled: payoutsEnabled,
    verification_status: detailsSubmitted
      ? chargesEnabled
        ? "verified"
        : "requirements_due"
      : "onboarding",
    capabilities: account.capabilities || {},
    metadata: {
      onboarding_method: "stripe_hosted_account_link",
      stripe_account_type: account.type,
      country: account.country,
      business_type: account.business_type,
      details_submitted: detailsSubmitted,
      currently_due: currentlyDue,
      past_due: pastDue,
      pending_verification: pendingVerification,
      disabled_reason: disabledReason,
      cutflow_disabled: false,
    },
    last_synced_at: new Date().toISOString(),
    last_error: disabledReason || null,
  };
}

export function isDeletedStripeAccount(account: Stripe.Account | Stripe.DeletedAccount): account is Stripe.DeletedAccount {
  return "deleted" in account && account.deleted === true;
}
