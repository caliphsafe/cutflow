# Start Here — Upgrade Your Existing CutFlow to v2.2

This package is a complete replacement build. It includes the original MVP capabilities plus the Production Core, media manager, tutorials, redesigned booking calendar, customer portal and multi-provider payment connection system.

## 1. Back up first

In Supabase, open **Project Settings → Database → Backups** and confirm a current backup exists before applying the migration.

## 2. Replace the GitHub project

Upload the contents of this folder to the root of the existing `cutflow` repository and replace the old files. Keep `package.json`, `package-lock.json`, `.npmrc`, `app`, `components`, `lib`, `public` and `supabase` at the repository root.

Do not upload a local `.env` file. Add secrets only through Vercel.

## 3. Upgrade the existing Supabase database

Because the current project already used CutFlow v1, use **Supabase → SQL Editor** and run these files in order:

1. `supabase/upgrade-v2.sql`
2. `supabase/cron.sql`
3. `supabase/verify-install.sql`

Do **not** run `supabase/schema.sql` on the existing database. That file is only for a completely new Supabase project.

The upgrade creates the payment-connection, customer-portal, booking-policy, notification, audit and media infrastructure. It also creates the public `cutflow-media` Storage bucket and barber-specific upload policies.

## 4. Add the new Vercel variables

Open `.env.example`, then create the matching variables in **Vercel → Project → Settings → Environment Variables**. At minimum, complete Supabase, the public app URL, token encryption, Stripe subscription billing, one barber payment provider, Resend and `CRON_SECRET`.

After changing environment variables, redeploy the project without reusing the previous build cache.

## 5. Update Supabase Auth URLs

Set the production site URL and add the production wildcard redirect described in `SETUP_GUIDE.md`. This activates email confirmation and password recovery callbacks.

## 6. Configure payment connections

Start with Stripe Connect, then Square OAuth. PayPal/Venmo can be activated after PayPal approves the CutFlow multiparty platform configuration.

The platform owner configures provider credentials once in Vercel. Barbers only open **Dashboard → Connections**, press **Connect**, sign in to their provider and approve access.

## 7. Activate real notifications

Configure Resend and optionally Twilio. After the deployed notification route is working, edit the two placeholders in `supabase/notification-worker.sql` and run it in Supabase SQL Editor.

## 8. Complete the first barber workspace

Create a barber account, finish onboarding, upload real barber/shop/service/product photos, add services and products, set hours and policies, connect a payment provider, preview the public page, and publish it.

## 9. Test before accepting money

Complete every item in `LAUNCH_CHECKLIST.md` in provider sandbox/test mode. Confirm that a payment webhook—not a browser redirect—changes a booking to confirmed and that the customer receives a working private management link.

The detailed provider, webhook and notification instructions are in `SETUP_GUIDE.md`.
