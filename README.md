# CutFlow v2.4 — Customer-Ready Mobile 43 Build

CutFlow is a multi-tenant booking, client-management, payment and reporting platform for independent barbers. Barbers subscribe monthly, connect Stripe through a secure hosted setup, and receive their customer payments in their own connected Stripe account. CutFlow does not add an appointment transaction percentage; Stripe’s normal processing fees still apply.

## Current production experience

### Barber workspace

- Guided registration, Google sign-in, email confirmation and password recovery
- Step-by-step onboarding, page tutorials, tooltips and a launch checklist
- Mobile-first dashboard for bookings, clients, services, products, media, payments and reports
- Dashboard-managed barber portrait, logo, cover image, shop image, gallery, service images and product photos
- Stripe-hosted account onboarding with no API keys entered by barbers
- Focused Stripe setup popup on desktop, with status refresh when it closes
- Customer-readiness panel for payments, subscription billing, email, reminders, optional SMS and app installation
- Install CutFlow on supported phones as a Progressive Web App

### Customer booking

- Branded barber storefront using real uploaded photography
- Clear services, prices, appointment lengths and available times
- Returning-customer recognition and previous haircut-request reuse
- Detailed haircut preferences and texture-aware product recommendations
- Stripe deposit checkout using cards and eligible wallets
- Private appointment portal for details, rescheduling, cancellation, balance payment, calendar download and receipt printing

### Active payment model

Stripe is the only payment provider currently shown in the production interface. Square and PayPal/Venmo code is retained for future activation but is intentionally hidden until those integrations are separately configured and verified.

## Upgrade from v2.3.1

Read `UPGRADE_V2_4.md`. This is a code-only update and does not require another Supabase migration.

## Customer communication

Email confirmation and reminder delivery require Resend. Scheduled reminders require `CRON_SECRET` plus the Supabase notification worker described in `SETUP_GUIDE.md`. SMS stays hidden unless Twilio is configured and `NEXT_PUBLIC_SMS_ENABLED=true`.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | CutFlow marketing and pricing |
| `/signup` | Barber registration |
| `/login` | Barber sign-in |
| `/onboarding` | Guided business setup |
| `/dashboard` | Business overview and readiness |
| `/dashboard/connections` | Stripe connection and payout status |
| `/dashboard/media` | Customer-facing image management |
| `/dashboard/storefront` | Public-page content and publication |
| `/b/[slug]` | Public barber storefront |
| `/book/[slug]` | Customer booking flow |
| `/manage/[token]` | Secure customer appointment portal |

CutFlow intentionally does not include `package-lock.json`.
