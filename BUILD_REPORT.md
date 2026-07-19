# CutFlow v2.2 43 Build Verification

Verification completed against a clean copy of the packaged source on July 19, 2026.

## Automated checks

- Clean `npm ci` install from the public npm registry: passed
- TypeScript `tsc --noEmit`: passed
- Next.js 16 production build: passed
- App Router entries: 25 pages and 24 API/route handlers
- Static page generation: 40 pages generated successfully
- Production dependency audit from the installed lockfile/cache: 0 known vulnerabilities

## Production-server smoke tests

The optimized build was started with `next start`. These routes returned HTTP 200:

- Landing page
- Demo barber storefront
- Smart booking engine
- Dashboard overview
- Bookings
- Clients
- Payment connections
- Payments ledger
- Media manager
- Booking policies
- Products
- Reports
- Services
- Settings
- Storefront editor
- Subscription billing page
- Onboarding
- Login
- Signup
- Forgot password
- Reset password

The demo availability API returned HTTP 200 with valid appointment slots.

## Important external verification still required

The Supabase SQL files were reviewed and packaged, but they were not run against the user's hosted Supabase project from this build environment. Stripe, Square, PayPal, Resend and Twilio live flows also require the user's own platform accounts, credentials, approvals and sandbox/live testing.

For an existing CutFlow v1 database, run `supabase/upgrade-v2.sql`, then `supabase/cron.sql`, then `supabase/verify-install.sql`. Do not run the fresh-install schema over an existing database.
