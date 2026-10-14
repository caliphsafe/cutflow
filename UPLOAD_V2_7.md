# Upload CutFlow v2.7

1. Unzip `cutflow-v2.7-cashapp-venmo-patch.zip`.
2. Upload everything inside the extracted folder to the root of `caliphsafe/cutflow` in GitHub and replace matching files.
3. Commit: `Add Cash App and Venmo deposit confirmation flow`.
4. In Vercel, redeploy without the previous build cache.
5. Run `supabase/upgrade-v2.7-cashapp-venmo.sql` once in Supabase SQL Editor.
6. Complete the one-time Resend inbound setup in `SETUP_CASHAPP_VENMO.md`.
7. Edit and run `supabase/payment-email-worker.sql` once.

No package-lock.json is included.
