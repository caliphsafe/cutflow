# CutFlow Owner Launch Setup

This file is for the CutFlow platform owner only. Barbers should never be asked to configure hosting, email delivery, databases, scheduled jobs, API keys, webhooks, or text-message providers.

## Booking email delivery

Configure the CutFlow sending domain and transactional email service once at the platform level. Barbers only choose their message preferences inside **Booking policies → Customer messages**.

Required private variables:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## Automatic reminder delivery

Run the Supabase notification schedule once for the CutFlow platform using `supabase/notification-worker.sql`. The worker secret must match the private `CRON_SECRET` value.

Barbers do not see or manage this schedule.

## Optional text messages

Configure the platform text-message service only when CutFlow is ready to support consent, opt-out handling, messaging registration and ongoing message costs.

Private variables:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `NEXT_PUBLIC_SMS_ENABLED=true`

Until then, leave `NEXT_PUBLIC_SMS_ENABLED=false`. The barber dashboard will show text messages as coming soon rather than exposing technical setup.

## Appointment-payment fee policy

CutFlow appointment checkout uses direct Stripe charges on the barber's connected account. The checkout code does not send `application_fee_amount`, `transfer_data`, or `on_behalf_of`.

The production build now runs `scripts/verify-no-appointment-fee.mjs` before every Next.js build. A deployment fails if platform-fee routing is added to appointment checkout.

Stripe's normal payment-processing fees still apply to the barber's Stripe account.

## Stripe Dashboard confirmation before launch

In the live Stripe account, open **Connect → Settings / Pricing** and confirm:

- Stripe handles payment pricing for connected barbers.
- No platform pricing rule or application fee has been enabled.
- The **Collected fees** area does not show CutFlow appointment fees.

The code safeguard protects the checkout request. This dashboard check protects against a fee rule being added outside the code.
