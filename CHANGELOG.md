# Changelog

## v2.2.0 — Provider Hardening + Final 43 Build

- Added Stripe connection-revocation handling for disconnects initiated in Stripe
- Added Square `BANK_ACCOUNTS_READ` authorization and verified-bank payout-readiness checks
- Added Square authorization-revocation and bank-account webhook handling
- Added PayPal onboarding, capability and partner-consent webhook synchronization
- Passed the PayPal partner attribution ID securely from the server-rendered checkout
- Added PayPal order/session matching and expiration checks before capture
- Updated provider event checklists and production setup documentation

## v2.1.0 — Production Core + Media and Guided UX

- Added Stripe, Square and PayPal connection hub with primary-provider selection
- Added unified payment sessions and webhook idempotency
- Added payment-method and processor-fee transaction detail
- Added secure customer appointment portal, calendar download, balance payment, rescheduling and cancellation
- Added complete email confirmation and password recovery flows
- Added booking policies, blocked time and notification preferences
- Added server-side subscription enforcement
- Added Supabase Storage media manager for barber, shop, gallery, services and products
- Replaced public placeholder artwork with dashboard-managed images
- Added guided onboarding tutorials, contextual dashboard help and tooltips
- Redesigned booking date selection with separated weekday/date/month treatment
- Rewrote booking copy with professional customer-facing language
- Added Resend/Twilio delivery adapters, immediate post-payment confirmations and secure reminder worker
- Added fresh-install and v1-upgrade SQL paths
