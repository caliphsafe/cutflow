# CutFlow Architecture

## 1. Multi-tenant model

The tenant hierarchy is:

`organization → organization members → barber profiles → services / clients / bookings / products / transactions`

Every private table is protected by Row Level Security. Authenticated users may manage records only when they belong to the owning organization. Public visitors can read only active storefront, service and product information required to book.

Customer booking writes do not use anonymous direct database access. They pass through server routes using the Supabase service-role key so validation, availability checks, inventory reservation and payment creation happen together.

## 2. Payment separation

CutFlow has two independent payment paths.

### Barber software subscription

- Customer: the barber or studio owner
- Destination: CutFlow’s platform Stripe account
- Route: `/api/subscription/checkout`
- Products/prices: Starter, Pro and Studio recurring Stripe prices
- Management: `/api/subscription/portal`

### Appointment and balance payments

- Customer: the barber’s client
- Destination: the barber’s connected Stripe Standard account
- Routes: `/api/bookings/create-deposit` and `/api/payments/create-balance`
- CutFlow application fee: explicitly `0`
- Deposit: fixed at `$10.00`
- Remaining balance: appointment/product total minus the deposit

Stripe processor fees, refunds and disputes remain normal connected-account activity. CutFlow’s business model is the monthly software subscription.

## 3. Smart booking sequence

1. Load the barber’s live service menu and active pickup products.
2. Identify a returning client by matching normalized phone and email.
3. Offer the saved haircut request to repeat or edit.
4. Capture texture, current length, desired style, sides, top, beard, enhancements, sensitivity and reference notes.
5. Suggest products using hair-texture tags and service tags.
6. Load actual availability after subtracting active bookings and blocked time.
7. Insert a 15-minute pending booking hold.
8. Reserve selected product inventory.
9. Open a $10 connected-account Stripe Checkout Session.
10. Confirm the booking through the connected-account webhook after payment.
11. Create ledger entries and queue customer/barber notifications.
12. Release the appointment and inventory automatically if checkout expires.

A PostgreSQL exclusion constraint prevents overlapping active bookings at the database layer, including race conditions between simultaneous customers.

## 4. Client memory

Each client record stores:

- Name, email and normalized phone
- Hair texture
- Preferred style
- Allergies/sensitivities
- Private barber notes
- Last structured haircut request
- Visit count
- Lifetime value
- First and last visit timestamps

The booking engine reuses that record for returning clients and allows the customer to repeat the last request unless changes are needed.

## 5. Reporting

Every payment is represented as a transaction record with:

- Gross amount
- Sales tax amount
- Processor fee
- CutFlow platform fee, constrained to `0`
- Refund amount
- Net amount
- Payment method
- Client and booking references
- Timestamp and transaction type

The dashboard calculates current month, quarter and year summaries and exports source CSV files. These reports organize records for bookkeeping but are not tax advice.

## 6. Notification adapter

`notification_log` stores queued delivery work for:

- Customer booking confirmation
- New booking alert to barber
- 24-hour customer reminder

`public.queue_booking_reminders()` runs from pg_cron. A production provider worker should read queued rows, send through the selected email/SMS provider, and update each row to sent/delivered/failed.

## 7. Authentication

Supabase Auth manages barber sign-up and sessions. The Next.js `proxy.ts` refreshes cookie-based sessions and protects dashboard/onboarding routes on the server.

## 8. Demo behavior

When Supabase or Stripe variables are absent, the interface uses a polished sample workspace so the product can be reviewed immediately. Live tenant data takes over automatically after the environment variables and onboarding are complete.
