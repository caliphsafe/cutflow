# CutFlow v2.2 Launch Checklist

## Database, authentication and storage

- [ ] Correct fresh-install or upgrade SQL completed
- [ ] `supabase/verify-install.sql` returns expected tables, functions, media columns, bucket, cron jobs and RLS checks
- [ ] Supabase Site URL and redirects match production/custom domains
- [ ] Sign-up confirmation works
- [ ] Forgot-password and reset-password flows work
- [ ] Service-role key exists only in Vercel server variables
- [ ] `cutflow-media` bucket exists
- [ ] Barber can upload portrait, cover/shop, gallery, service and product images
- [ ] Another user cannot modify that barber's media or data

## Stripe subscription and Connect

- [ ] CutFlow Complete $69 monthly recurring price exists
- [ ] Stripe test secret and price IDs are in Vercel
- [ ] Billing portal is enabled
- [ ] Platform subscription webhook verifies correctly
- [ ] Trial/active subscription grants dashboard access
- [ ] Expired/cancelled subscription redirects to Subscription
- [ ] Stripe Connect OAuth is enabled
- [ ] Redirect URI matches `/api/payments/connect/stripe/callback`
- [ ] Connected-account webhook receives `checkout.session.completed`, `account.updated`, `account.application.deauthorized` and `charge.refunded`
- [ ] Revoking CutFlow in Stripe disables that connection in CutFlow
- [ ] Cash App Pay and wallets are enabled where eligible
- [ ] Test barber can sign in, connect, receive a deposit and view the payment in Stripe

## Square

- [ ] Square sandbox application exists
- [ ] OAuth callback matches `/api/payments/connect/square/callback`
- [ ] Webhook URL exactly matches `/api/webhooks/square`
- [ ] Webhook signature key and URL are in Vercel
- [ ] Test seller connects by signing in
- [ ] Active Square location is stored
- [ ] Verified Square bank account updates payout readiness
- [ ] Square OAuth revocation disables the connection
- [ ] Test deposit confirms only after the signed Square webhook

## PayPal / Venmo

- [ ] Sandbox application and partner credentials exist
- [ ] Seller-onboarding callback matches `/api/payments/connect/paypal/callback`
- [ ] Webhook ID is in Vercel
- [ ] `PAYMENT.CAPTURE.COMPLETED` passes signature verification
- [ ] Onboarding/capability webhooks refresh seller readiness
- [ ] Partner-consent revocation disables the PayPal connection
- [ ] Sandbox seller connects and receives a test payment
- [ ] PayPal confirms CutFlow's live multiparty eligibility
- [ ] Venmo availability is approved/confirmed before it is advertised as guaranteed

## Notifications

- [ ] Resend sending domain is verified
- [ ] Booking confirmation email sends immediately after verified deposit
- [ ] Barber alert sends
- [ ] Optional Twilio setup and customer consent are complete
- [ ] `supabase/notification-worker.sql` is edited and running
- [ ] 24-hour reminders send at the expected time
- [ ] Failed deliveries retry and ultimately show `failed`
- [ ] Only one reminder worker is enabled

## Barber onboarding and help

- [ ] Every onboarding tutorial reads clearly on mobile
- [ ] Setup checklist accurately reports missing requirements
- [ ] Each dashboard section opens the correct help tutorial
- [ ] Tooltips are keyboard accessible and understandable
- [ ] No barber-facing step asks for an API key
- [ ] Payment cards clearly show connected, verification and payout status

## Storefront and media

- [ ] Publication is blocked until required setup is complete
- [ ] Portrait, cover/shop image, logo and gallery render correctly
- [ ] Service and product images render correctly
- [ ] Missing optional images degrade gracefully without broken placeholders
- [ ] Mobile and desktop layouts pass visual review
- [ ] Business address, hours, policies and contact information are accurate

## Booking UX

- [ ] Date cards clearly separate weekday, date and month
- [ ] Professional copy is used throughout
- [ ] Exact appointment time is visible before checkout
- [ ] Minimum notice, advance limit and same-day rules work
- [ ] Blocked time, vacation and lunch remove availability
- [ ] Existing appointments and buffers remove availability
- [ ] Concurrent customers cannot reserve the same time
- [ ] Pending hold expires after 15 minutes
- [ ] Returning client can reuse or change the previous request
- [ ] Product recommendations match service/texture tags
- [ ] Inventory reserves and restores correctly

## Customer portal

- [ ] Confirmation page uses live booking data
- [ ] Private management link works
- [ ] Calendar file downloads and imports correctly
- [ ] Printable receipt contains correct amounts
- [ ] Reschedule cutoff and maximum count are enforced
- [ ] Cancellation policy and deposit disposition are enforced
- [ ] Remaining-balance payment works with connected providers
- [ ] Invalid/expired portal token does not expose booking data

## Transactions and reports

- [ ] Deposit appears once in ledger
- [ ] Actual provider/method label is recorded
- [ ] Processor fee is recorded when supplied by provider
- [ ] CutFlow appointment platform fee remains zero
- [ ] Refund webhook creates a negative/refund ledger entry
- [ ] Manual cash, external Cash App and external Venmo entries work
- [ ] Monthly, quarterly and annual CSVs reconcile to provider reports
- [ ] Accountant reviews categories, sales tax and tax-reserve treatment

## Legal, security and operations

- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Barber platform agreement published
- [ ] Cancellation/refund/no-show policy language reviewed
- [ ] SMS consent and opt-out process reviewed
- [ ] Provider approval and prohibited-business rules reviewed
- [ ] Error monitoring and alerts enabled
- [ ] Supabase backups and restore procedure tested
- [ ] Support email and incident process documented
- [ ] Live credentials replace sandbox credentials only after every test passes
