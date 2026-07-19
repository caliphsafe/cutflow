# CutFlow v2.2 Production Setup Guide

This guide uses the Supabase, GitHub, Vercel, Stripe, Square, PayPal, Resend and Twilio browser dashboards. Barbers never handle platform API keys. Only the CutFlow platform owner performs this setup.

---

# 1. Choose fresh install or upgrade

## Fresh Supabase project

Run these files in **Supabase → SQL Editor**, in this order:

1. `supabase/schema.sql`
2. `supabase/cron.sql`
3. `supabase/verify-install.sql`

## Existing CutFlow v1 database

Keep the existing data and run:

1. `supabase/upgrade-v2.sql`
2. `supabase/cron.sql`
3. `supabase/verify-install.sql`

Do not run `schema.sql` over an existing production database unless you have first backed it up and reviewed the migration.

The v2 SQL adds payment connections, payment sessions, customer portal tokens, webhook event logging, booking policies, notification preferences, media fields and the `cutflow-media` Storage bucket with barber-specific policies.

---

# 2. Create or configure Supabase

## Project credentials

Open **Supabase → Project Settings → API** and copy:

- Project URL
- Publishable/anon key
- Service-role key

These become:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The service-role key belongs only in Vercel. Never put it in a browser-exposed variable or commit it to GitHub.

## Authentication URLs

Open **Authentication → URL Configuration**.

Set **Site URL** to the exact production URL:

```text
https://YOUR-CUTFLOW-DOMAIN.com
```

Add redirect URLs:

```text
https://YOUR-CUTFLOW-DOMAIN.com/**
https://YOUR-PROJECT.vercel.app/**
http://localhost:3000/**
```

The application includes:

```text
/auth/confirm
/auth/callback
/forgot-password
/reset-password
```

Keep email confirmation enabled for a public launch. Test sign-up, confirmation, password recovery and password reset before inviting barbers.

## Storage

`schema.sql` and `upgrade-v2.sql` create the public `cutflow-media` bucket and Row Level Security policies. A signed-in barber can upload only inside that barber's folder. The dashboard accepts JPG, PNG, WebP and AVIF files up to 8 MB.

After setup, open **Storage** and confirm that `cutflow-media` exists.

---

# 3. Upload to GitHub

1. Unzip the CutFlow v2.2 ZIP.
2. Open the folder containing `package.json`, `app`, `components`, `lib` and `supabase`.
3. Create or open the GitHub repository.
4. Upload the **contents inside** the project folder, not an extra parent folder.
5. Confirm `package.json` is at the repository root.
6. Commit the files.

The ZIP excludes `.env`, `node_modules`, `.next` and TypeScript build caches.

---

# 4. Deploy to Vercel

1. In Vercel, choose **Add New → Project**.
2. Import the GitHub repository.
3. Framework Preset: **Next.js**.
4. Root Directory: leave blank.
5. Add the required environment variables below.
6. Deploy.

The project pins Node.js 22 in `package.json` and uses the public npm registry.

## Core Vercel variables

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://YOUR-CUTFLOW-DOMAIN.com
PAYMENT_TOKEN_ENCRYPTION_KEY=
CRON_SECRET=
PLATFORM_ADMIN_EMAIL=
```

### `PAYMENT_TOKEN_ENCRYPTION_KEY`

Use a unique cryptographically random key that is exactly 32 bytes, represented as either:

- 64 hexadecimal characters, or
- valid base64 for 32 bytes

It encrypts seller OAuth tokens before they are written to Supabase. Do not reuse a password or publish this value.

### `CRON_SECRET`

Use a long URL-safe random value. Add the exact same value later in `supabase/notification-worker.sql`.

Every Vercel environment-variable change requires a new deployment.

---

# 5. Configure CutFlow subscription billing in Stripe

Appointment payments belong to barbers. CutFlow's monthly subscription belongs to the CutFlow platform Stripe account.

## Create recurring prices

Create one monthly recurring price:

- CutFlow Complete — `$69/month`

Add:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_PRO=price_...
```

The application creates a 14-day trial through Stripe Checkout and enforces subscription/trial status on protected dashboard routes.

## Platform webhook

Create a Stripe webhook endpoint:

```text
https://YOUR-CUTFLOW-DOMAIN.com/api/stripe/webhook
```

Select platform events:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

Copy its signing secret into:

```text
STRIPE_WEBHOOK_SECRET=whsec_...
```

Enable the Stripe customer billing portal in Stripe Billing settings.

---

# 6. Configure Stripe Connect for barbers

Stripe is the recommended first provider because it can offer cards, Apple Pay, Google Pay and Cash App Pay when those methods are enabled and eligible.

## Platform setup

1. Open Stripe Connect and complete the CutFlow platform profile.
2. Enable Standard account OAuth.
3. Add this redirect URI:

```text
https://YOUR-CUTFLOW-DOMAIN.com/api/payments/connect/stripe/callback
```

4. Copy the Connect client ID beginning with `ca_`.
5. Add:

```text
STRIPE_CONNECT_CLIENT_ID=ca_...
```

## Connected-account webhook

Create a webhook for **events on connected accounts** using the same endpoint:

```text
https://YOUR-CUTFLOW-DOMAIN.com/api/stripe/webhook
```

Select:

```text
checkout.session.completed
account.updated
account.application.deauthorized
charge.refunded
```

Copy its separate signing secret into:

```text
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
```

## Enable payment methods

In Stripe's payment-method settings for connected accounts, enable the methods CutFlow should offer, including Cash App Pay where available. Stripe decides eligibility based on the account, customer, currency and other provider rules.

## Barber experience

The barber uses **Dashboard → Connections → Connect Stripe**, signs into Stripe or creates an account, completes Stripe's hosted identity/bank steps, and returns to CutFlow. No API key is shown to the barber.

---

# 7. Configure Square OAuth

Square support lets a barber connect an existing Square seller account by signing in.

## Create the Square application

1. Open the Square Developer Dashboard.
2. Create an application for CutFlow.
3. Add the OAuth redirect URL:

```text
https://YOUR-CUTFLOW-DOMAIN.com/api/payments/connect/square/callback
```

4. Add the application's ID and secret to Vercel:

```text
SQUARE_ENVIRONMENT=sandbox
SQUARE_APPLICATION_ID=
SQUARE_APPLICATION_SECRET=
SQUARE_API_VERSION=2026-07-15
```

Use sandbox while testing. Change `SQUARE_ENVIRONMENT` to `production` only after end-to-end tests pass.

## Square webhook

Create a webhook subscription with this exact notification URL:

```text
https://YOUR-CUTFLOW-DOMAIN.com/api/webhooks/square
```

Subscribe to:

```text
payment.created
payment.updated
oauth.authorization.revoked
bank_account.created
bank_account.verified
bank_account.disabled
```

Add:

```text
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_WEBHOOK_URL=https://YOUR-CUTFLOW-DOMAIN.com/api/webhooks/square
```

`SQUARE_WEBHOOK_URL` must exactly match the URL registered in Square because it is part of signature verification.

## Barber experience

The barber presses **Connect Square**, signs into Square, selects/authorizes the business, and returns to CutFlow. CutFlow securely stores encrypted OAuth tokens and selects an active Square location.

---

# 8. Configure PayPal and Venmo

PayPal/Venmo is built using PayPal's multiparty platform model. Sandbox can be configured during development, but live multiparty seller onboarding and live Venmo availability can require PayPal partner approval and eligibility.

## Platform credentials

Create the PayPal developer application and add:

```text
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_PARTNER_MERCHANT_ID=
PAYPAL_PARTNER_ATTRIBUTION_ID=
```

Set the seller-onboarding return URL to:

```text
https://YOUR-CUTFLOW-DOMAIN.com/api/payments/connect/paypal/callback
```

## PayPal webhook

Create a webhook endpoint:

```text
https://YOUR-CUTFLOW-DOMAIN.com/api/webhooks/paypal
```

At minimum, subscribe to:

```text
PAYMENT.CAPTURE.COMPLETED
MERCHANT.ONBOARDING.COMPLETED
MERCHANT.PARTNER-CONSENT.REVOKED
CUSTOMER.MERCHANT-INTEGRATION.CAPABILITY-UPDATED
```

Add the webhook ID:

```text
PAYPAL_WEBHOOK_ID=
```

The PayPal webhook signature is verified server-side before CutFlow records the transaction or confirms a booking.

## Barber experience

The barber selects **Connect PayPal & Venmo**, completes PayPal-hosted seller onboarding, and returns to CutFlow. The connection becomes available to customers only after the seller is payment-ready.

---

# 9. Configure transactional email

Create a Resend account and verify the sending domain.

Add:

```text
RESEND_API_KEY=
RESEND_FROM_EMAIL=CutFlow <bookings@YOUR-DOMAIN.com>
```

When Resend is configured, a verified deposit webhook immediately sends the booking's queued confirmation and barber alert. The scheduled worker handles reminders and retries.

---

# 10. Configure optional SMS

Create a Twilio account and add:

```text
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

SMS remains off by default in barber notification settings. Enable SMS only after consent language, opt-out handling and applicable messaging registration are completed.

---

# 11. Activate notification reminders without Vercel Pro

CutFlow includes `supabase/notification-worker.sql`. It uses Supabase Cron and `pg_net` to call the secure Vercel notification route every five minutes.

1. Confirm the production site is deployed.
2. Confirm `CRON_SECRET` exists in Vercel.
3. Open `supabase/notification-worker.sql`.
4. Replace:

```text
https://YOUR-CUTFLOW-DOMAIN.com
REPLACE_WITH_THE_EXACT_CRON_SECRET_FROM_VERCEL
```

5. Copy the entire edited file into Supabase SQL Editor.
6. Click **Run**.
7. Inspect `cron.job` and `net._http_response` if delivery troubleshooting is needed.

The optional `vercel-pro.json` contains the equivalent five-minute Vercel Cron configuration. Only rename it to `vercel.json` when using a Vercel plan that allows that schedule. Do not enable both workers at once.

---

# 12. Complete the first barber workspace

After signing up and confirming the email:

1. Finish `/onboarding`.
2. Open **Photos & media** and add:
   - barber portrait
   - cover or shop photo
   - optional logo
   - gallery images
3. Open **Services** and add service photos, prices and durations.
4. Open **Products** and add photos, inventory and recommendation tags.
5. Open **Policies** and set booking notice, cancellation and rescheduling rules.
6. Open **Connections** and connect at least one payment-ready provider.
7. Open **Subscription** and start the appropriate CutFlow plan/trial.
8. Open **Storefront**, preview it, then publish.

CutFlow's publication gate requires the essential profile, service, availability, media, payment and subscription setup so customers do not see an unfinished page.

---

# 13. End-to-end test before live mode

Use provider test/sandbox environments and complete all of these:

1. Create a new barber account.
2. Confirm the email.
3. Recover and reset the password.
4. Upload every media type and verify it appears publicly.
5. Connect Stripe and/or Square through sign-in.
6. Publish the storefront.
7. Book as a new customer.
8. Confirm date formatting and exact appointment time.
9. Submit a detailed haircut request.
10. Add a recommended pickup product.
11. Pay the deposit.
12. Confirm the signed webhook changes the booking to `confirmed`.
13. Confirm transaction, customer and product reservation records appear.
14. Open the private appointment link.
15. Download the calendar event and print the receipt.
16. Test rescheduling, cancellation and remaining-balance payment.
17. Test an abandoned checkout and confirm the hold releases.
18. Test a duplicate-time race and confirm the second booking is rejected.
19. Test email delivery, reminder delivery and failure retries.
20. Export monthly, quarterly and yearly CSV files.

Only replace sandbox/test credentials with live credentials after this checklist succeeds.

---

# 14. Production responsibilities outside the code

Before selling CutFlow publicly, complete:

- Platform Terms of Service
- Privacy Policy
- Barber agreement
- Deposit, cancellation, no-show, refund and dispute language
- SMS consent and opt-out compliance
- Payment-provider platform approvals
- Sales-tax and bookkeeping review
- Error monitoring and operational alerts
- Database backups and recovery testing
- Support email and escalation process

CutFlow organizes transaction data but is not a substitute for licensed tax, legal or accounting advice.
