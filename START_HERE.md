# Start Here — Upgrade CutFlow to v2.4

This package adds the customer-ready copy, Stripe-only production interface, Stripe popup onboarding, mobile optimization and installable Home Screen app behavior requested after v2.3.1.

## 1. Upload the build

Upload the contents of this folder to the root of the existing `caliphsafe/cutflow` GitHub repository and replace matching files. Keep `app`, `components`, `lib`, `public`, `supabase`, `package.json` and `.npmrc` at the root.

Do not add `package-lock.json` and do not upload a local `.env` file.

## 2. Supabase

No new SQL migration is required for v2.4. Keep the existing v2.2/v2.3 database and Storage configuration.

## 3. Vercel

No new required variable is needed for app installation. Keep the existing Supabase and Stripe variables.

Optional SMS control:

```text
NEXT_PUBLIC_SMS_ENABLED=false
```

Leave it false until Twilio is fully configured.

Redeploy once without reusing the previous build cache.

## 4. Confirm the update

- The mobile home header shows **Sign in** and **Try free**.
- Dashboard → Connections shows only Stripe.
- **Connect Stripe** opens a focused setup window on desktop.
- The dashboard offers **Install CutFlow** / **Add CutFlow to phone**.
- The dashboard Customer Readiness card shows whether booking emails and automatic reminders still need setup.

## 5. Finish customer communication

Before broad public use, complete Resend and the Supabase notification worker. See `CUSTOMER_READY_CHECKLIST.md`.
