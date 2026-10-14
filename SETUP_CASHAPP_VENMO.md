# CutFlow v2.8 — Cash App + Venmo launch guide

This is the only setup guide you need for the Cash App + Venmo deposit flow.

## What the finished customer flow does

Book appointment → choose Cash App or Venmo → CutFlow reserves the time → customer opens the payment app → customer sends the exact deposit with the CutFlow booking reference → barber's normal payment email is forwarded to CutFlow → CutFlow matches the payment → the SAME payment page changes to **Booking confirmed** → barber receives the CutFlow booking alert.

**Customers do not receive a CutFlow confirmation email for Cash App/Venmo deposits.** Their live confirmation is shown on the payment/booking page. Normal later reminders can still be used separately.

---

# PHASE 1 — Upload the build

### 1. Upload the patch to GitHub
- Unzip `cutflow-v2.8-onpage-confirmation-patch.zip`.
- Open the `caliphsafe/cutflow` repository in GitHub.
- Stay on the `main` branch.
- Choose **Add file → Upload files**.
- Upload the CONTENTS of the patch folder into the repository root.
- Let the new files replace files with the same names.
- Commit with: `Add Cash App Venmo on-page confirmation`.

### 2. Wait for Vercel
- Vercel should deploy the GitHub commit automatically.
- Do not continue until the deployment says **Ready**.

**Checkpoint:** the live CutFlow site opens normally and the Vercel deployment is green.

---

# PHASE 2 — Update Supabase once

### 3. Run the v2.7 Cash App/Venmo database upgrade
You only need this if you have NOT already run it.

- Open Supabase → your CutFlow project → **SQL Editor**.
- Open `supabase/upgrade-v2.7-cashapp-venmo.sql` from this build.
- Copy the full file into a new SQL query.
- Click **Run** once.

Do NOT rerun the original CutFlow `schema.sql`.

**Checkpoint:** Supabase reports the query completed without an error.

---

# PHASE 3 — Set up Resend receiving

### 4. Create the CutFlow Resend API key
- Sign into Resend.
- Open **API Keys**.
- Create a key named `CutFlow Production`.
- Use a permission level that allows CutFlow to read received email as well as send the barber alert.
- Copy the `re_...` key immediately.
- Never put this key in GitHub.

### 5. Copy the Resend inbound domain
- In Resend open **Receiving Emails**.
- Open the inbound-address option.
- Resend will show an address using a domain like `<id>.resend.app`.
- Copy ONLY the domain after `@`.

Example:
- Resend shows: `anything@abc123.resend.app`
- Put in CutFlow: `abc123.resend.app`

You do NOT need a Resend inbound webhook for this CutFlow version. CutFlow polls Resend's received-email API.

### 6. Test the Resend inbox
- From your own email, send a test message to `test@YOUR-ID.resend.app`.
- Open Resend → **Receiving Emails**.
- Confirm the test message appears.

**Checkpoint:** you can see your test message inside Resend Receiving.

---

# PHASE 4 — Connect Resend to CutFlow and start the checker

### 7. Add the Resend values to Vercel
Open Vercel → CutFlow → **Settings → Environment Variables**.

Add/update:
- `RESEND_API_KEY` = your `re_...` key
- `RESEND_INBOUND_DOMAIN` = your `<id>.resend.app` domain

Keep your existing:
- `CRON_SECRET`

If CutFlow already has a working `RESEND_FROM_EMAIL`, leave it in place. That sender is used for the BARBER'S CutFlow booking alert. The customer does not need a Cash App/Venmo confirmation email anymore.

After saving the variables, redeploy CutFlow so the new environment values are active.

### 8. Start the payment-email checker
- Open `supabase/payment-email-worker.sql`.
- Replace `https://YOUR-CUTFLOW-DOMAIN.com` with your live CutFlow domain.
- Replace `REPLACE_WITH_THE_EXACT_CRON_SECRET_FROM_VERCEL` with the exact `CRON_SECRET` stored in Vercel.
- Copy the edited SQL into Supabase → SQL Editor.
- Run it once.

### 9. Verify the checker
Run this in Supabase SQL Editor:

`select * from cron.job where jobname = 'cutflow-check-payment-emails';`

You should see one row for the CutFlow payment-email checker.

**Checkpoint:** Vercel has the Resend variables and Supabase shows the `cutflow-check-payment-emails` job.

---

# PHASE 5 — Connect a barber's Cash App and Venmo

## Cash App

### 10. Add Cash App in CutFlow
Barber signs into CutFlow → **Payment Methods → Connect Cash App**.

Enter:
- `$Cashtag`
- official Cash App/share payment link when available
- the barber's email address that receives Cash App payment notices

Save it. CutFlow displays a private forwarding address such as:

`pay-xxxxxxxx@YOUR-ID.resend.app`

### 11. Forward only Cash App payment notices
In the barber's email provider:
- approve the private CutFlow forwarding address if the email provider requires verification;
- create a rule/filter for real Cash App **payment received** messages;
- forward ONLY those messages to the private Cash App CutFlow address.

Do not forward the barber's entire inbox.

## Venmo

### 12. Add Venmo in CutFlow
Use a Venmo Business Profile for customer payments.

Barber signs into CutFlow → **Payment Methods → Connect Venmo**.

Enter:
- Venmo Business Profile username
- official profile/share link
- the barber's email address that receives Venmo payment notices

Save it and create the same type of email-forwarding rule for Venmo payment-received notices only.

**Checkpoint:** CutFlow shows Cash App and/or Venmo connected and each enabled method has its private forwarding address.

---

# PHASE 6 — Real payment tests

## Cash App test

### 13. Create a low-cost test booking
- Use a small real deposit while testing.
- Open the barber's public CutFlow storefront as a customer.
- Complete the booking.
- Choose **Cash App**.

### 14. Pay exactly as CutFlow shows
The payment page shows:
- exact deposit amount;
- barber's Cash App account;
- CutFlow booking reference such as `BK-123456-ABC`.

Tap **Copy booking code & open Cash App**.

In Cash App:
- send the exact deposit;
- paste the exact `BK-...` reference into the payment note;
- complete the payment;
- return to the CutFlow payment page.

### 15. Confirm the on-page result
Leave/return to the CutFlow page. It checks automatically and also checks immediately when the browser regains focus.

When the forwarded payment email is matched, the SAME page changes to:
- **Booking confirmed**
- service
- date/time
- deposit paid
- Cash App/Venmo payment method
- booking reference
- barber/shop/location
- **View appointment** button

The barber receives the CutFlow new-booking alert. The customer does NOT receive a duplicate confirmation email.

## Venmo test

### 16. Repeat with Venmo
Create another booking and repeat the same test using Venmo. The customer must use the exact deposit and exact CutFlow `BK-...` reference in the Venmo payment note.

---

# FINAL CHECKLIST

Before calling the system ready, verify all of these:

- [ ] CutFlow v2.8 is deployed successfully.
- [ ] v2.7 Cash App/Venmo Supabase upgrade has been run once.
- [ ] Resend test email appears under Receiving Emails.
- [ ] `RESEND_API_KEY` is in Vercel.
- [ ] `RESEND_INBOUND_DOMAIN` is in Vercel.
- [ ] Vercel has been redeployed after environment changes.
- [ ] `cutflow-check-payment-emails` exists in Supabase Cron.
- [ ] Cash App is connected for the test barber.
- [ ] Cash App payment-received emails forward to its private CutFlow address.
- [ ] A real Cash App deposit changes the customer page to **Booking confirmed**.
- [ ] The barber receives the CutFlow booking alert.
- [ ] Venmo is connected for the test barber.
- [ ] Venmo payment-received emails forward to its private CutFlow address.
- [ ] A real Venmo deposit changes the customer page to **Booking confirmed**.
- [ ] No customer confirmation email is sent for Cash App/Venmo deposit confirmation.

## Safety fallback

If CutFlow cannot confidently match the provider email to the exact booking, it leaves the booking pending. The barber can use **Confirm deposit received** from the dashboard. Keep this fallback even after live testing succeeds.
