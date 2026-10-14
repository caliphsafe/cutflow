# v2.5.0

- Removed developer and infrastructure language from the barber experience.
- Added customer-message switches and a barber-focused launch guide.
- Expanded the marketing home page and fixed-price comparison.
- Added a build guard that protects the $0 CutFlow appointment commission.

# Changelog

## v2.3.0 — Stripe-Hosted Connect Onboarding

- Replaced Standard-account OAuth with Stripe-hosted Account Links
- Removed the `STRIPE_CONNECT_CLIENT_ID` requirement
- Added automatic creation and reuse of barber Standard connected accounts
- Added up-front Stripe requirement collection through single-use onboarding links
- Added safe return and refresh handling for expired or revisited Account Links
- Added detailed connected-account requirement, verification, charge and payout status synchronization
- Changed Stripe disconnect behavior to disable CutFlow checkout without closing the barber's Stripe account
- Preserved Stripe direct charges with a CutFlow application fee of $0
- Removed `package-lock.json` from the 43 Build to avoid the user's recurring Vercel npm lockfile failures

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
