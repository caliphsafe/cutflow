# CutFlow v2.5 Build Report

## Product changes

- Barber-facing setup language is business-focused and contains no Vercel, Supabase, Resend, Twilio, API-key, credential, SQL, worker or deployment instructions.
- Customer messages are controlled with simple confirmation, reminder and alert switches.
- SMS controls remain disabled and clearly marked as coming soon unless the platform owner enables them.
- The marketing home page now covers the full booking, CRM, payments, products, reporting, storefront, customer portal and mobile-app experience.
- The pricing section clearly separates the $69 CutFlow subscription, $0 CutFlow booking commission and normal Stripe processing fees.

## Fee safety

`scripts/verify-no-appointment-fee.mjs` verifies that appointment checkout:

- remains a direct charge on the barber's Stripe account;
- does not include `application_fee_amount`;
- does not include `transfer_data`;
- does not include `on_behalf_of`.

The script runs automatically before production builds.

## Verification completed in this environment

- 103 TypeScript and TSX source files passed syntax transpilation.
- All local `@/` and relative imports resolve to existing files.
- The global stylesheet has balanced rule braces.
- `scripts/verify-no-appointment-fee.mjs` passed.
- No `package-lock.json`, `node_modules` or `.next` folder is included.

The package registry returned a temporary 503 response, so the optimized Next.js build could not be repeated locally. Vercel will run the final dependency installation, type check and production build during deployment.
