# CutFlow Launch Checklist

## Database and authentication

- [ ] `supabase/schema.sql` completed without errors
- [ ] `supabase/cron.sql` completed without errors
- [ ] `supabase/verify-install.sql` returns all expected checks
- [ ] Supabase Site URL is the production Vercel/custom domain
- [ ] Production and preview redirect URLs are allowed
- [ ] Email confirmation is enabled for public launch
- [ ] RLS remains enabled on all CutFlow tables
- [ ] Service-role key exists only in Vercel server environment variables

## Stripe platform setup

- [ ] Three recurring prices exist for Starter, Pro and Studio
- [ ] Price IDs are in Vercel
- [ ] Connect OAuth is enabled
- [ ] Connect client ID is in Vercel
- [ ] OAuth redirect URL matches `/api/stripe/connect/callback`
- [ ] Platform webhook is created and secret added
- [ ] Connected-account webhook is created and secret added
- [ ] Test mode works before live keys are used
- [ ] Connected barber account can complete onboarding and receive a test deposit
- [ ] Billing portal is enabled in Stripe Billing settings

## Barber setup

- [ ] Public booking name and URL are correct
- [ ] Address, city, phone and bio are complete
- [ ] Weekly availability is correct
- [ ] Service prices and durations are correct
- [ ] Products have inventory and accurate texture/service tags
- [ ] Barber Stripe account shows Connected
- [ ] Public page opens on mobile and desktop

## End-to-end booking test

- [ ] New customer can select a service
- [ ] Exact available date/time is visible before payment
- [ ] Detailed haircut request saves correctly
- [ ] Suggested product can be added for pickup
- [ ] Checkout charges exactly $10
- [ ] Successful payment changes booking to Confirmed
- [ ] Deposit is shown as credited toward the remaining total
- [ ] Client profile appears automatically
- [ ] Product inventory decreases while reserved
- [ ] A second customer cannot book the same time
- [ ] Abandoned checkout releases after the hold expires
- [ ] Returning customer is offered the saved request
- [ ] Remaining balance checkout works
- [ ] Refund webhook creates a refund ledger entry

## Reporting and operations

- [ ] Manual cash/card/product transaction can be recorded
- [ ] Monthly CSV opens correctly
- [ ] Quarterly CSV opens correctly
- [ ] Annual CSV opens correctly
- [ ] Gross, processor fee, refund and net values reconcile with Stripe
- [ ] Accountant reviews the category structure
- [ ] Tax reserve language is treated as planning only

## Notification provider

- [ ] Email/SMS provider selected
- [ ] Queued notification worker implemented
- [ ] Booking confirmation template approved
- [ ] Barber alert template approved
- [ ] 24-hour reminder template approved
- [ ] Failed deliveries are monitored

## Policies and safety

- [ ] Privacy policy explains client profile and haircut preference storage
- [ ] Terms explain deposit, cancellation, no-show and refund rules
- [ ] Barber confirms product pickup and inventory policy
- [ ] Production backup and incident process documented
- [ ] MFA enabled for barber/admin accounts
