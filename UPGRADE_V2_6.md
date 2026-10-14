# CutFlow v2.6 — Payment Apps Without Provider APIs

This release adds barber-owned Cash App, Venmo, Zelle and other payment-app options alongside Stripe.

## What barbers see

Barbers add the account or payment link customers already use. CutFlow gives each payment method a private forwarding address. The barber creates an automatic email-forwarding rule for payment-received messages. Customers see the exact deposit, the barber's account and a CutFlow booking code to include in the payment note.

## How automatic confirmation works

CutFlow checks its own inbound payment inbox once per minute. It only auto-confirms when it can match the exact deposit amount and CutFlow booking code to a live pending appointment. Ambiguous emails stay pending for barber review. Barbers can also use **Confirm deposit received** from the booking after checking their payment app/email themselves.

This flow does not require Cash App, Venmo or Zelle API credentials or webhooks.

## One-time platform setup

1. Run `supabase/upgrade-v2.6-email-payments.sql` in the Supabase SQL Editor.
2. In Resend, enable **Receiving** and copy the inbound domain shown there.
3. Add `RESEND_INBOUND_DOMAIN` in Vercel. Example: `abc123.resend.app` (no `@`). Keep the existing `RESEND_API_KEY` and `CRON_SECRET`.
4. Redeploy CutFlow.
5. Edit `supabase/payment-email-worker.sql`, replace the CutFlow domain and CRON secret placeholders, then run it in Supabase. It checks the CutFlow inbox once per minute.

No payment-provider developer account is required for these fallback methods.

## Important

Email-confirmed payments are a fallback, not the same level of settlement proof as Stripe. CutFlow requires the booking code + exact amount before automatic confirmation. If those cannot be matched, the booking remains pending for the barber to verify.
