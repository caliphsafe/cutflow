# Upgrade v2.2 to v2.3

This upgrade changes only Stripe barber onboarding from OAuth to Stripe-hosted Account Links.

## No Supabase SQL is required

The existing `payment_connections` and `barber_profiles` fields already support this change.

## Vercel environment changes

Delete:

```text
STRIPE_CONNECT_CLIENT_ID
```

Add:

```text
STRIPE_CONNECTED_ACCOUNT_COUNTRY=US
```

Keep:

```text
STRIPE_SECRET_KEY
STRIPE_PRICE_PRO
STRIPE_WEBHOOK_SECRET
STRIPE_CONNECT_WEBHOOK_SECRET
```

## Stripe setup changes

You no longer need to open OAuth settings or copy a `ca_...` value.

Keep the connected-account event destination pointed to:

```text
https://YOUR-DOMAIN.com/api/stripe/webhook
```

with:

```text
checkout.session.completed
account.updated
charge.refunded
```

## GitHub/Vercel

Replace the repository files with this build, make sure there is no `package-lock.json`, commit the changes, and redeploy without the previous build cache.

## Barber experience

The barber presses **Connect Stripe**, completes Stripe-hosted onboarding, and returns to CutFlow. If requirements remain, CutFlow shows **Continue Stripe setup** and creates a fresh single-use link.
