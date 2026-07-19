# CutFlow v2.2 — Production Core 43 Build

CutFlow is a multi-tenant booking, client-management, payments and reporting platform for independent barbers and barber studios. Barbers subscribe to CutFlow monthly, connect the payment companies they already use by signing in, and keep their appointment revenue. CutFlow does not add an application percentage to appointment transactions; each payment processor's ordinary fees still apply.

## What this build includes

### Barber-facing system

- Guided account creation, email confirmation, password recovery and secure dashboard sessions
- Step-by-step onboarding with setup progress, tutorials, page-specific help and inline tooltips
- Branded public barber page at `/b/[slug]`
- Dashboard-managed barber portrait, logo, cover image, shop image, work gallery, service images and product photos
- Service pricing, duration, active/inactive status and recommendation tags
- Weekly hours, minimum notice, same-day controls, advance-booking limits and blocked time
- Customer cancellation, rescheduling, no-show and deposit-retention policies
- Booking calendar, manual appointments, status management and client CRM
- Structured haircut profiles and repeat-last-request memory
- Pickup products, inventory and texture/service-aware recommendations
- Payment ledger, cash/external payment entry and monthly/quarterly/yearly CSV reporting
- Stripe, Square and PayPal connection dashboard with primary-provider selection
- CutFlow subscription checkout, billing portal and server-side access enforcement

### Customer-facing system

- Professional mobile-first barber storefront with real uploaded photography
- Service and product images throughout the booking experience
- Clear date cards with separate weekday, date and month presentation
- Live availability based on service duration, working hours, policies, blocked time and existing appointments
- Detailed haircut request covering texture, length, desired style, sides, top, beard, enhancements, sensitivities and notes
- Returning-customer recognition and repeat-request option
- Product suggestions based on the selected service and saved hair profile
- Fixed booking deposit, credited toward the appointment total
- Customer choice among the barber's connected and payment-ready providers
- Secure appointment portal for details, cancellation, rescheduling, balance payment, calendar download and printable receipt

### Payment architecture

- **Stripe Connect:** cards, wallets and Cash App Pay when enabled and eligible
- **Square OAuth:** connected Square seller account and Square-hosted checkout
- **PayPal multiparty:** PayPal checkout plus Venmo when CutFlow and the seller are approved/eligible
- OAuth/hosted onboarding: barbers do not enter API keys
- Signed provider webhooks confirm payments; redirect pages alone never confirm a booking
- Idempotent webhook event log prevents duplicate transactions
- Provider-side revocation events automatically disable disconnected accounts
- Square payout readiness reflects whether a verified linked bank account is available
- Appointment deposits and balances are separated from CutFlow's software subscription billing

### Notifications

- Resend email delivery
- Optional Twilio SMS delivery
- Immediate booking confirmations after a verified payment webhook
- Queued barber alerts, 24-hour reminders and retry tracking
- Supabase `pg_cron` + `pg_net` worker option that does not require Vercel Pro

## Start here

Use `SETUP_GUIDE.md` for the complete browser-based installation.

- **Fresh Supabase project:** run `supabase/schema.sql`, `supabase/cron.sql`, then `supabase/verify-install.sql`.
- **Existing CutFlow v1 project:** run `supabase/upgrade-v2.sql`, `supabase/cron.sql`, then `supabase/verify-install.sql`.
- After Vercel is deployed and notifications are configured, edit and run `supabase/notification-worker.sql`.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | CutFlow marketing and pricing |
| `/signup` | Barber registration |
| `/auth/confirm` | Supabase email confirmation callback |
| `/forgot-password` | Password recovery request |
| `/reset-password` | Secure password update |
| `/onboarding` | Guided barber setup |
| `/dashboard` | Live overview and launch checklist |
| `/dashboard/bookings` | Calendar and appointment management |
| `/dashboard/clients` | Client CRM and haircut memory |
| `/dashboard/services` | Services, prices, durations and images |
| `/dashboard/products` | Products, inventory, tags and photos |
| `/dashboard/media` | Portrait, cover, shop, logo and gallery uploads |
| `/dashboard/connections` | Stripe, Square and PayPal connections |
| `/dashboard/payments` | Transaction ledger and manual entries |
| `/dashboard/reports` | Period reporting and CSV exports |
| `/dashboard/policies` | Booking rules, blocked time and notifications |
| `/dashboard/storefront` | Public-page copy, styling and publication |
| `/dashboard/subscription` | CutFlow plan and billing portal |
| `/b/[slug]` | Public barber storefront |
| `/book/[slug]` | Smart booking engine |
| `/manage/[token]` | Secure customer appointment portal |

## External accounts required for a complete live launch

- Supabase
- Vercel
- Stripe platform account and Connect activation
- Square developer application, when offering Square
- PayPal partner/multiparty approval, when offering PayPal or Venmo
- Resend for transactional email
- Twilio only when SMS is enabled

The software contains the provider integrations, but CutFlow cannot approve itself for financial services or skip provider identity/bank verification. Keep all provider platform secrets in Vercel; barbers only use provider-hosted sign-in and authorization.

## Technical stack

- Next.js 16 App Router
- React 19 and TypeScript
- Supabase Auth, Postgres, Row Level Security, Storage, `pg_cron` and `pg_net`
- Stripe Billing and Stripe Connect
- Square OAuth, automatic token renewal and Online Checkout
- PayPal multiparty Orders API and webhooks
- Resend and optional Twilio
- Vercel hosting

## Before public launch

Complete `LAUNCH_CHECKLIST.md`, test every provider in sandbox/test mode, add legal policies, verify refund/dispute procedures, and have an accountant review the reporting categories and sales-tax treatment.
