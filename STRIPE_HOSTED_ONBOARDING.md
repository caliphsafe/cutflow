# Stripe-Hosted Connect Onboarding

CutFlow v2.3 uses Stripe-hosted Account Links instead of Connect OAuth.

## Vercel variables

Required:

```text
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
```

Recommended for a US-only launch:

```text
STRIPE_CONNECTED_ACCOUNT_COUNTRY=US
```

Remove this old variable from Vercel if it exists:

```text
STRIPE_CONNECT_CLIENT_ID
```

## Stripe destinations

### CutFlow subscription events

Source: **Your account**

Endpoint:

```text
https://YOUR-DOMAIN.com/api/stripe/webhook
```

Events:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

Signing secret:

```text
STRIPE_WEBHOOK_SECRET
```

### Barber connected-account events

Source: **Connected accounts**

Endpoint:

```text
https://YOUR-DOMAIN.com/api/stripe/webhook
```

Events:

```text
checkout.session.completed
account.updated
charge.refunded
```

Signing secret:

```text
STRIPE_CONNECT_WEBHOOK_SECRET
```

## Barber flow

1. Barber signs into CutFlow.
2. Barber opens **Dashboard → Connections**.
3. Barber presses **Connect Stripe**.
4. CutFlow creates or reuses the barber's `acct_...` connected account.
5. CutFlow creates a single-use Stripe Account Link.
6. Stripe collects business, identity, tax and payout information.
7. Stripe returns the barber to CutFlow.
8. CutFlow retrieves the account and records charge, payout and verification readiness.
9. If requirements remain, the barber sees **Continue Stripe setup**.

## Important behavior

Returning from Stripe does not automatically mean onboarding is complete. CutFlow retrieves the account and checks Stripe's actual status. Customer checkout is enabled only when the connected account can accept charges.

The **Stop using Stripe** button disables Stripe within CutFlow but intentionally does not close the barber's Stripe account.
