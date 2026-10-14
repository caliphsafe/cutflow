# Start Here — Upgrade CutFlow to v2.5

This release completes the launch-facing cleanup requested after v2.4.1. It keeps the mobile menu and private storefront preview fixes, removes developer language from the barber dashboard, expands the marketing home page and protects the $0 CutFlow appointment commission.

## 1. Upload the build

Upload the contents of this folder to the root of the existing `caliphsafe/cutflow` GitHub repository and replace matching files.

Keep these items at the repository root:

- `app`
- `components`
- `lib`
- `public`
- `scripts`
- `supabase`
- `package.json`
- `.npmrc`

Do not upload a local `.env` file and do not add `package-lock.json`.

## 2. Supabase

No new SQL migration is required for v2.5.

## 3. Vercel

No new required environment variable was added.

Leave text messages disabled until the CutFlow platform is ready to support them:

```text
NEXT_PUBLIC_SMS_ENABLED=false
```

Redeploy once without using the previous build cache.

## 4. Confirm the customer-facing update

- The home page explains the complete feature set.
- The pricing comparison shows fixed monthly pricing versus an illustrative commission.
- The dashboard contains no Vercel, Supabase, Resend, Twilio, API-key, worker, credential or SQL instructions.
- Booking confirmations and reminders are simple barber-controlled switches.
- The mobile menu opens above the blur layer.
- The barber can always open a private storefront preview.
- Stripe remains the only visible payment service.

## 5. Platform-owner launch work

Read `OWNER_LAUNCH_SETUP.md`. Those steps are for the CutFlow owner only and are intentionally hidden from barbers.
