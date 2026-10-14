# Upgrade CutFlow to v2.5

This release is a code-only customer-readiness update. No new Supabase SQL migration is required.

## Changes

- Removes hosting, email-provider, database, worker, credential and API terminology from the barber-facing dashboard.
- Replaces technical readiness screens with business actions and simple customer-message switches.
- Expands the public home page to explain the complete CutFlow feature set.
- Adds a fixed-price versus percentage-commission comparison calculator.
- Adds a build-time safety check that prevents appointment application fees from being introduced accidentally.
- Keeps Stripe processing fees separate and preserves a $0 CutFlow commission on appointments.

Upload the files over the existing CutFlow repository and redeploy without the previous build cache. Do not add `package-lock.json`.
