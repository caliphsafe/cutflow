# CutFlow — 43 Build

CutFlow is a multi-tenant booking and business-management SaaS for independent barbers and barber studios.

Each subscribed barber receives:

- A branded public page at `/b/[slug]`
- A guided, mobile-first booking engine
- A fixed **$10 booking deposit** that is credited toward the final amount
- Direct Stripe Connect payments with **$0 CutFlow application fee**
- Saved haircut requests and client preference memory
- Hair-texture and service-aware pickup product suggestions
- Booking, client, service, product, payment and reporting dashboards
- Month, quarter and year transaction exports
- SaaS subscription plans separate from customer appointment payments
- Appointment collision protection and 15-minute unpaid checkout holds
- Queued booking confirmations, barber alerts and 24-hour reminders ready for an email/SMS provider

## Start here

1. Read `SETUP_GUIDE.md`.
2. Create a new Supabase project.
3. Run `supabase/schema.sql` and then `supabase/cron.sql`.
4. Upload this folder to a new GitHub repository.
5. Import the repository into Vercel.
6. Add the environment variables from `.env.example`.
7. Configure Supabase Auth and Stripe using the exact checklist in `SETUP_GUIDE.md`.
8. Sign up, complete onboarding and connect the barber’s Stripe account.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | CutFlow SaaS marketing and plan page |
| `/signup` | Barber account creation |
| `/onboarding` | Barber workspace, public page and service setup |
| `/dashboard` | Live business overview |
| `/dashboard/bookings` | Calendar, status changes and manual bookings |
| `/dashboard/clients` | Client CRM and new-client entry |
| `/dashboard/services` | Service pricing and duration |
| `/dashboard/products` | Pickup products, inventory and recommendation tags |
| `/dashboard/payments` | Ledger and manual transaction entry |
| `/dashboard/reports` | Month, quarter and year reports/CSV |
| `/dashboard/storefront` | Public page branding and URL |
| `/dashboard/settings` | Availability, profile and Stripe connection |
| `/dashboard/subscription` | CutFlow plan and billing portal |
| `/b/[slug]` | Barber’s customer-facing page |
| `/book/[slug]` | Smart customer booking engine |

## Technical stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth, Postgres, RLS and pg_cron
- Stripe Billing for CutFlow subscriptions
- Stripe Connect Standard for barber-owned customer payments
- Vercel hosting

## Important production note

The database queues notification records, but this repository intentionally does not lock the product to one delivery vendor. Connect an email/SMS provider such as Resend and/or Twilio before relying on automatic messages. Review taxes, cancellation terms, refund procedures, privacy language and payment disputes with the appropriate professional before launch.
