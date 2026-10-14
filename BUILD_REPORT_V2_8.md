# CutFlow v2.8 build report

## Customer confirmation change
- Cash App and Venmo customers remain on the CutFlow payment page while payment confirmation is pending.
- The page polls every 3.5 seconds and rechecks immediately when the browser regains focus/visibility after returning from Cash App or Venmo.
- When the deposit is matched, the same page changes to a full Booking Confirmed screen with service, date/time, deposit, payment method, booking reference, barber/shop/location and a View appointment button.
- Cash App/Venmo external-payment finalization no longer queues a customer booking-confirmation email.
- Barber new-booking email/SMS preferences remain intact.
- Customer SMS confirmation remains optional if the barber/platform has explicitly enabled it; only the duplicate customer email confirmation was removed.

## Validation
- Appointment fee guard: PASS.
- TypeScript transpilation for modified TS/TSX files: PASS.
- No package-lock.json included.
- Full production Next.js build was not run in this packaging environment; Vercel remains the production build/type check.
