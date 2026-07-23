# Customer-Ready Checklist

## Already connected in CutFlow

- Supabase authentication and Google sign-in
- Stripe subscription billing routes
- Stripe-hosted barber onboarding
- Stripe connected-account deposit and balance checkout
- Signed Stripe webhook confirmation
- Customer appointment portal
- Services, products, media and storefront management
- Mobile booking experience
- Installable Home Screen web app

## Must be verified before public customer use

1. `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set in Vercel.
2. The Resend sending domain is verified.
3. `CRON_SECRET` is set and `supabase/notification-worker.sql` has been run with the live domain and matching secret.
4. A live $10 booking confirms the appointment, ledger entry, customer email and barber email.
5. The storefront includes a real barber portrait, cover/shop image, services, hours, policies and a connected Stripe account.
6. A custom domain, support email, terms, privacy policy and refund/cancellation language are reviewed before broad commercial launch.

SMS remains hidden by default and should only be enabled after Twilio and consent requirements are complete.
