# Production Readiness: What Code Can Do vs. What Requires Approval

## Implemented in this repository

- Multi-tenant Supabase schema and RLS
- Dashboard and public barber pages
- Media uploads and public image rendering
- Booking availability and collision protection
- Structured client/haircut memory
- Product recommendations and inventory reservations
- Stripe, Square and PayPal provider adapters
- OAuth/hosted seller connection flows
- Signed webhooks and idempotency logs
- Deposit and balance payment sessions
- Customer self-service portal
- Resend/Twilio delivery adapters
- Subscription access enforcement
- Reporting and CSV exports
- Guided onboarding, dashboard help and tooltips

## Platform-owner setup required

- Supabase project and SQL installation
- Production domain
- Vercel environment variables
- Stripe products, Connect and webhooks
- Square developer application and webhook
- PayPal multiparty application/approval and webhook
- Resend domain verification
- Optional Twilio registration/configuration
- Notification worker activation
- Legal documents and customer support process

## Provider-controlled requirements

CutFlow cannot bypass these:

- Identity and bank verification for each barber
- Stripe/Square/PayPal account eligibility
- Payment-method availability by account, geography, currency and risk review
- PayPal multiparty and Venmo partner approval
- Chargebacks, reserves, holds and payout timing
- Processor pricing and policy changes

## Recommended release gates

### Internal alpha

- Supabase installed
- Stripe test mode connected
- Email delivery configured
- Owner and two test barber accounts
- All booking/customer-portal flows tested

### Private barber beta

- Stripe live approval complete
- Square sandbox complete and live review started
- Terms/privacy published
- Monitoring/backups active
- Support workflow active

### Public release

- At least one live payment provider proven end-to-end
- Provider webhook monitoring
- Notification retries monitored
- Subscription enforcement tested
- Tax/reporting language reviewed
- Incident and data-deletion processes documented

PayPal/Venmo can remain labeled “Coming soon” until live multiparty approval is confirmed without blocking a Stripe/Square launch.
