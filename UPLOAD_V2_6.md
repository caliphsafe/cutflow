# Upload CutFlow v2.6

1. Upload the v2.6 patch files to the root of the CutFlow GitHub repository and replace matching files.
2. Run `supabase/upgrade-v2.6-email-payments.sql` once in Supabase.
3. In Resend → Receiving, copy the inbound domain and add it to Vercel as `RESEND_INBOUND_DOMAIN` without `@`.
4. Redeploy CutFlow.
5. Edit and run `supabase/payment-email-worker.sql` after replacing its CutFlow URL and CRON secret placeholders.
6. In CutFlow → Payments, add a Cash App, Venmo, Zelle or other payment method and follow the forwarding instructions shown to the barber.
