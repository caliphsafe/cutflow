# CutFlow v2.2 Architecture

## 1. Tenant and permissions model

The data hierarchy is:

```text
organization
  → memberships
  → barber profiles
  → services / availability / blocked time
  → clients / bookings / products / transactions
```

Supabase Row Level Security restricts private data to members of the owning organization. Public visitors receive only published barber, active service, available product and booking information required for the customer experience.

Anonymous customers do not write directly to private tables. Next.js server routes validate the request, enforce policies, reserve inventory, create appointment holds and start payment checkout with the Supabase service-role client.

## 2. Authentication and subscription enforcement

Supabase Auth supports:

- Email/password sign-up
- Email confirmation callback
- Password recovery and reset
- Cookie-based SSR sessions

`proxy.ts` refreshes sessions, protects dashboard/onboarding routes, requires an initialized barber profile and redirects expired/cancelled accounts to subscription management. A trial or valid paid subscription is required for normal dashboard access.

## 3. Media system

The public `cutflow-media` Supabase Storage bucket contains:

- Barber portraits
- Cover and shop images
- Logos
- Work-gallery images
- Service images
- Product photos

Storage policies use the first object-path folder as the barber ID. The signed-in user must be authorized to manage that barber. Public pages can read published media URLs, while uploads, replacements and deletes remain protected.

The dashboard's media manager writes URLs into structured barber, service and product records, so the same images appear consistently across storefronts, booking, product recommendations and dashboards.

## 4. Guided barber experience

The system has three help levels:

1. Onboarding tutorials explain the full setup sequence.
2. A launch checklist reports incomplete requirements.
3. Each dashboard page has a contextual help drawer and inline tooltips.

The storefront cannot publish until core profile, media, service, schedule, subscription and payment-readiness requirements are satisfied.

## 5. Booking and client memory

The booking engine:

1. Loads the published barber, services, products and connected payment providers.
2. Finds a returning client by normalized contact information.
3. Offers the last structured haircut request to repeat or edit.
4. Captures haircut, texture, beard, enhancement, sensitivity and note details.
5. Suggests products by service and texture tags.
6. Calculates slots using the barber's time zone, service duration, availability, policy notice, advance limits, blocked time and active appointments.
7. Creates one 15-minute appointment/product hold.
8. Starts checkout with the selected connected provider.
9. Waits for the provider's signed webhook.
10. Confirms the booking, records the ledger entry and queues notifications.

A PostgreSQL exclusion constraint protects against overlapping active bookings, including simultaneous requests.

## 6. Unified payment providers

The internal provider interface normalizes:

```text
create checkout
connect seller
refresh account status
verify webhook
record transaction
refund synchronization
```

### Stripe

- Standard account OAuth
- Direct connected-account Checkout
- No CutFlow application fee
- Actual payment-method and processor-fee logging
- Connected account status and refund webhooks

### Square

- Seller OAuth with encrypted access/refresh tokens
- Active location selection
- Verified-bank-account payout-readiness checks
- Square-hosted payment links
- Signature-verified payment, bank-status and authorization-revocation webhooks

### PayPal / Venmo

- PayPal multiparty seller onboarding
- Partner-authenticated Orders/Capture requests
- PayPal-hosted wallet selection
- Signature-verified capture, onboarding, capability and consent-revocation webhooks
- Venmo subject to PayPal platform/seller eligibility

The customer sees only providers whose connection is marked connected and able to accept charges. The barber can choose a primary provider while still offering multiple services.

## 7. Payment truth and idempotency

A browser redirect is never treated as proof of payment. Each provider webhook must pass signature verification.

`webhook_events` stores the provider event ID and processing state. Unique constraints prevent duplicate event and transaction processing. `payment_sessions` links the internal booking/purpose to the external checkout/order. `transactions` stores gross, tax, provider fee, platform fee, refund, net and payment-method information.

Appointment transactions and CutFlow software subscriptions are separate money paths.

## 8. Customer appointment portal

A random token provides private, revocable access to one booking without requiring a customer password. The portal supports:

- Appointment and haircut-request review
- Deposit and remaining balance review
- Provider choice for balance payment
- Policy-controlled rescheduling
- Policy-controlled cancellation
- Calendar download
- Printable receipt

The portal token is stored as a hash rather than plain text.

## 9. Notifications

Payment confirmation queues customer and barber notifications. When Resend/Twilio is configured, the payment webhook immediately processes notifications for that booking.

Supabase scheduled functions queue future reminders. `supabase/notification-worker.sql` uses `pg_cron` + `pg_net` to call the secure Next.js worker every five minutes for reminders and retries. `notification_log` tracks channel, template, destination, attempts, provider ID, delivery status and failure reason.

## 10. Reporting

Transactions are normalized across providers and manual entries. Reports support month, quarter and year views and CSV export for:

- Deposits
- Service balances
- Products
- Tips
- Cash/external entries
- Processor fees
- Refunds
- Net collected

These are bookkeeping source records, not filed tax returns or accounting advice.

## 11. Demo mode

When production environment variables are absent, public and dashboard screens use a polished demo workspace so the design can be evaluated. Financial and private persistence requires Supabase and provider credentials.
