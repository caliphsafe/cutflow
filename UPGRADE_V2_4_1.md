# CutFlow v2.4.1 Mobile Menu, Readiness and Storefront Preview Fix

This update fixes the iPhone dashboard menu, makes every Customer Readiness card actionable and guarantees that the barber can privately preview an unpublished storefront.

## Changes

- Places the mobile sidebar above the blurred scrim.
- Gives the sidebar independent scrolling and safe-area spacing.
- Locks the page behind an open menu and supports Escape-to-close.
- Adds a Customer Readiness navigation item.
- Makes every readiness card open the matching setup section.
- Adds a guided service setup page for Stripe, subscriptions, Resend email, the Supabase reminder worker, optional Twilio SMS and Home Screen installation.
- Keeps **Preview storefront** available whether or not the storefront is published.
- Allows the signed-in barber to open a secure owner-only preview before subscription, checklist and publication requirements are complete.
- Keeps customer booking and checkout disabled inside the private preview.
- Leaves public storefront access and publishing protections unchanged.

## Database

No Supabase SQL migration is required for this update.

The existing `supabase/notification-worker.sql` is still used when activating scheduled reminders.
