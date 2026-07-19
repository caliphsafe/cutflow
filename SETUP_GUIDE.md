# CutFlow 43 Build — Supabase, GitHub, Vercel and Stripe Setup

This guide uses the browser dashboards. Terminal access is not required for the standard deployment.

---

# Part 1 — Create the Supabase project

## 1. Create the project

1. Sign in to Supabase.
2. Click **New project**.
3. Choose the organization.
4. Project name: `cutflow` or your preferred name.
5. Create a strong database password and save it securely.
6. Choose the region closest to the primary customers.
7. Wait for the project to finish provisioning.

## 2. Install the database

1. Open **SQL Editor**.
2. Click **New query**.
3. In this downloaded project, open `supabase/schema.sql`.
4. Copy the entire file.
5. Paste it into the Supabase SQL Editor.
6. Click **Run**.
7. Confirm that the query completes without an error.

This creates the organizations, memberships, subscriptions, barber profiles, availability, clients, services, bookings, products, inventory reservations, transactions, notification queue, reporting view, Row Level Security policies, onboarding function and booking collision protection.

## 3. Install the scheduled jobs

1. Open a new SQL query.
2. Open `supabase/cron.sql` from the downloaded project.
3. Copy the entire file into Supabase.
4. Click **Run**.

The jobs:

- Release unpaid appointment/product holds after the 15-minute deposit window.
- Queue 24-hour reminder records every 15 minutes.

## 4. Verify the installation

1. Open another SQL query.
2. Run `supabase/verify-install.sql`.
3. Confirm:
   - Every table check is `true`.
   - All three function checks are `true`.
   - Both cron jobs appear as active.
   - All listed private tables show Row Level Security enabled.

## 5. Copy the project credentials

Open **Project Settings → API** and copy:

- Project URL
- Publishable/anon key
- Service-role key

The service-role key is private. It must only be entered in Vercel’s encrypted server environment variables. Never paste it into a public file or a variable beginning with `NEXT_PUBLIC_`.

---

# Part 2 — Upload CutFlow to GitHub

## 1. Unzip the build

Unzip `cutflow-43-build.zip`. The repository root is the folder containing:

- `app`
- `components`
- `lib`
- `public`
- `supabase`
- `package.json`

Do not upload a parent folder that contains the project as one extra nested level.

## 2. Create the repository

1. Sign in to GitHub.
2. Click **New repository**.
3. Name it `cutflow-platform`.
4. Choose **Private** for the first deployment.
5. Do not initialize it with another README, `.gitignore` or license.
6. Create the repository.

## 3. Upload the files in the browser

1. On the empty repository page, choose **uploading an existing file**.
2. Drag every file and folder from inside the unzipped `cutflow-43-build` folder into GitHub.
3. Confirm that `package.json` is visible at the repository root.
4. Commit with the message `Initial CutFlow 43 Build`.

The ZIP excludes `node_modules`, `.next` and private environment files.

---

# Part 3 — Import the project into Vercel

## 1. Create the Vercel project

1. Sign in to Vercel.
2. Click **Add New → Project**.
3. Import the `cutflow-platform` GitHub repository.
4. Framework Preset: **Next.js**.
5. Root Directory: leave blank.
6. Do not deploy until the environment variables are added.

## 2. Add the Supabase variables

In the Vercel project’s **Environment Variables**, add:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Use the matching Supabase values.

Apply them to **Production**, **Preview** and **Development** unless you intentionally use separate Supabase projects.

## 3. Add the first public URL variable

Add:

```text
NEXT_PUBLIC_APP_URL
```

For the first deployment, use a temporary value such as:

```text
https://cutflow-platform.vercel.app
```

If Vercel later assigns a different production URL, update this variable and redeploy.

## 4. Deploy the first version

Click **Deploy**.

When deployment finishes:

1. Open the generated Vercel URL.
2. Confirm that the CutFlow landing page loads.
3. Copy the exact production URL.
4. Update `NEXT_PUBLIC_APP_URL` if needed.
5. Redeploy the latest deployment after any environment-variable change.

---

# Part 4 — Configure Supabase Authentication

## 1. Set the production Site URL

In Supabase, open **Authentication → URL Configuration**.

Set **Site URL** to the exact Vercel production URL, for example:

```text
https://cutflow-platform.vercel.app
```

## 2. Add redirect URLs

Add:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/**
```

For local development, optionally add:

```text
http://localhost:3000/**
```

After connecting a custom domain, also add:

```text
https://YOUR-CUSTOM-DOMAIN/**
```

## 3. Configure email sign-up

Open **Authentication → Providers → Email**.

For a public launch:

- Keep email sign-up enabled.
- Keep email confirmation enabled.
- Customize the confirmation email and sender before inviting customers.

For a controlled internal test only, email confirmation can be temporarily disabled and then re-enabled before launch.

## 4. Test the first barber account

1. Open `/signup` on the Vercel site.
2. Create the owner account.
3. Confirm the email if required.
4. Complete onboarding.
5. Use a unique booking slug.
6. Confirm that `/dashboard` opens.
7. Open **Storefront** and then **Open live page**.

Onboarding creates:

- Organization
- Owner membership
- 14-day trial subscription record
- Barber profile
- Default weekly availability
- Starter services
- Public booking page

---

# Part 5 — Create CutFlow subscription prices in Stripe

CutFlow’s monthly subscription is separate from barber appointment payments.

## 1. Create the products

In the CutFlow platform Stripe account, create three recurring monthly products:

- **CutFlow Starter** — `$39/month`
- **CutFlow Pro** — `$69/month`
- **CutFlow Studio** — `$119/month`

Create one monthly recurring price for each product.

## 2. Copy the recurring price IDs

Each price ID begins with `price_`.

Add these Vercel variables:

```text
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_STUDIO=price_...
```

## 3. Add platform Stripe keys

From the same platform Stripe account, add:

```text
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

Start with test-mode keys. Use live-mode keys only after the entire test checklist passes.

---

# Part 6 — Enable Stripe Connect for barbers

CutFlow uses Stripe Connect Standard so each barber connects an account and customer appointment payments are created directly on that account.

## 1. Activate Connect

In Stripe, open the Connect section and complete the platform profile if Stripe requests it.

## 2. Enable OAuth for Standard accounts

In the Connect integration settings:

1. Enable OAuth.
2. Copy the platform’s Connect client ID. It begins with `ca_`.
3. Add the production redirect URI:

```text
https://YOUR-DOMAIN/api/stripe/connect/callback
```

4. Add the matching preview/custom-domain callback only when it is intentionally supported.

Add this Vercel variable:

```text
STRIPE_CONNECT_CLIENT_ID=ca_...
```

## 3. Test the connected-account flow

1. Redeploy after adding the variable.
2. Sign in to CutFlow.
3. Open **Dashboard → Settings → Payments**.
4. Click **Connect Stripe**.
5. Complete Stripe’s connected-account onboarding.
6. Return to CutFlow.
7. Confirm the settings page displays **Connected**.

---

# Part 7 — Create the Stripe webhooks

Both webhook endpoints use this CutFlow URL:

```text
https://YOUR-DOMAIN/api/stripe/webhook
```

CutFlow keeps two signing secrets because platform events and connected-account events are configured separately.

## 1. Platform-account webhook

Create a webhook for events on the CutFlow platform account.

Select:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

Copy its signing secret and add:

```text
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 2. Connected-account webhook

Create a second webhook and set its event source/scope to **Connected accounts**.

Select:

```text
checkout.session.completed
charge.refunded
```

Copy its different signing secret and add:

```text
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
```

## 3. Redeploy

After adding or changing either secret, redeploy the latest Vercel deployment.

## 4. What the webhooks do

- Confirm a pending appointment after the $10 deposit succeeds.
- Preserve the deposit as its own transaction record.
- Record the processor fee and net amount returned for the connected account.
- Mark the final balance paid when balance checkout succeeds.
- Create queued booking-confirmation and barber-alert records.
- Record connected-account refunds in the CutFlow ledger.
- Update the CutFlow software subscription status.

---

# Part 8 — Configure the Stripe Billing Portal

In Stripe Billing settings:

1. Open the Customer Portal configuration.
2. Enable the actions the barber may use, such as updating payment methods, viewing invoices and cancelling/changing the subscription.
3. Save the portal configuration.

CutFlow’s **Dashboard → Subscription → Billing portal** button uses that configuration.

---

# Part 9 — Complete the barber workspace

Sign in and complete these pages in order.

## 1. Storefront

Open **Dashboard → Storefront**.

Set:

- Barber display name
- Shop/studio name
- Booking URL
- Headline
- Bio
- Accent color
- Accepting-bookings status

Save and open the live page.

## 2. Services

Open **Dashboard → Services**.

For each service, confirm:

- Name
- Description
- Category
- Price
- Duration
- Active status

Duration controls which times can be shown as available.

## 3. Products

Open **Dashboard → Products**.

For every pickup product, add:

- Name and description
- Price
- Inventory quantity
- Hair-texture tags
- Related service tags
- Active status

Texture and service tags power customer recommendations during booking.

## 4. Availability

Open **Dashboard → Settings → Availability**.

Set each working day’s opening and closing time. Closed days should be unchecked.

## 5. Payments

Connect or update the barber’s Stripe account.

The booking deposit is fixed at `$10.00` and is automatically subtracted from the customer’s remaining appointment/product total.

---

# Part 10 — Test the complete customer flow

Use Stripe test mode for the first full test.

## 1. New customer booking

1. Open `/b/YOUR-SLUG` in a private/incognito window.
2. Start a booking.
3. Enter a new client email and phone.
4. Choose a service.
5. Confirm that only available dates/times appear.
6. Complete the detailed haircut request.
7. Add a suggested pickup product.
8. Review the exact date, time, $10 deposit and remaining balance.
9. Continue to Stripe Checkout.
10. Complete the test payment using a Stripe test card.

Confirm in CutFlow:

- Booking changes from Pending deposit to Confirmed.
- Client is created automatically.
- Hair texture and request are saved.
- Product reservation appears through reduced inventory.
- Deposit transaction appears in Payments and Reports.
- Remaining balance is correct.

## 2. Collision test

Before paying a second test booking, try to choose the same barber/time from another browser session.

Confirm that CutFlow rejects the overlap or removes the time from availability.

## 3. Returning customer test

Start another booking using the same email and phone.

Confirm that CutFlow:

- Recognizes the returning client.
- Offers the last haircut request.
- Allows the request to be repeated or changed.
- Uses the saved hair texture for product recommendations.

## 4. Abandoned checkout test

1. Start a booking.
2. Reach Stripe Checkout but do not pay.
3. Wait beyond the 15-minute hold.
4. Confirm the cron job changes the hold to Cancelled and restores reserved product inventory.

## 5. Balance and refund test

1. Open the confirmed booking in the dashboard.
2. Use the balance-payment workflow when ready.
3. Confirm the transaction and paid status.
4. Issue a controlled test refund in the connected Stripe account.
5. Confirm a refund entry appears in the CutFlow ledger after the webhook is delivered.

---

# Part 11 — Connect a notification provider

CutFlow already queues notification records, but this build does not expose any provider credentials or make a vendor choice for you.

Before relying on automatic messages, add a small server worker that:

1. Reads `notification_log` rows where `status = 'queued'`.
2. Sends the matching template through the chosen provider.
3. Updates the row to `sent`, `delivered` or `failed`.
4. Stores the provider message ID.

The included queue creates:

- `booking_confirmation`
- `new_booking_alert`
- `customer_reminder_24h`

The recommended production configuration is email confirmation plus optional SMS reminders after the barber has collected proper customer consent.

---

# Part 12 — Connect a custom domain

In Vercel:

1. Open **Project Settings → Domains**.
2. Add the domain or subdomain.
3. Follow the displayed DNS instructions.
4. Wait for Vercel to confirm the domain.
5. Change `NEXT_PUBLIC_APP_URL` to the final custom domain.
6. Redeploy.

Then update:

- Supabase Site URL
- Supabase redirect URLs
- Stripe Connect OAuth redirect URI
- Stripe platform webhook URL
- Stripe connected-account webhook URL

Do not remove the old Vercel URL from Supabase until production sign-in and OAuth work correctly on the custom domain.

---

# Part 13 — Environment variable reference

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_STUDIO=

NEXT_PUBLIC_APP_URL=https://YOUR-DOMAIN
PLATFORM_ADMIN_EMAIL=YOUR-ADMIN-EMAIL
```

All Vercel environment-variable changes require a new deployment before the running application receives them.

---

# Part 14 — Before accepting real appointments

Complete `LAUNCH_CHECKLIST.md`.

At minimum, verify:

- Real service prices and durations
- Real availability
- Real address/contact information
- Connected live Stripe account
- Both live webhook secrets
- Live subscription prices
- Mobile booking test
- Deposit/cancellation/no-show policy
- Privacy policy for saved client information
- Notification delivery provider
- Accountant review of reports and tax categories
- MFA for owner/admin accounts

CutFlow organizes transaction records and provides exportable summaries. It does not replace legal, tax or accounting advice.
