# CutFlow v2.4 Customer-Ready Mobile Upgrade

This release is a code-only upgrade over v2.3.1. No Supabase SQL migration is required.

## What changed

- Stripe is the only payment service shown to barbers and customers.
- Stripe-hosted onboarding opens in a focused popup window on desktop and a separate browser view on mobile.
- The dashboard stays open and refreshes the connection status when Stripe setup finishes.
- Added a Progressive Web App manifest, service worker and app icons.
- Added an Install CutFlow option in the dashboard and landing page.
- Added iPhone and Android Home Screen instructions.
- Kept Sign in and Try free visible in the mobile landing-page header.
- Improved mobile dashboard, storefront and booking layouts.
- Cleaned demo/developer wording from live-facing pages.
- Added a Customer Readiness panel for payments, billing, email, reminders, optional SMS and app installation.
- SMS consent is hidden unless `NEXT_PUBLIC_SMS_ENABLED=true`.

## Vercel variables

No new required variables are needed for the app-install feature.

Optional:

```text
NEXT_PUBLIC_SMS_ENABLED=false
```

Keep this false until Twilio is fully configured and customer consent/opt-out procedures are ready.

## Upload

Upload all files in this build to the root of the existing GitHub repository and replace matching files. Do not add `package-lock.json`.

Redeploy once without the previous Vercel build cache.
