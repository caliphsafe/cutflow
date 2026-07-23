import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";

export async function GET() {
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const checks = [
    {
      id: "stripe",
      label: "Customer payments",
      ready: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CONNECT_WEBHOOK_SECRET),
      note: "Stripe Connect and connected-account payment confirmation",
    },
    {
      id: "subscription",
      label: "CutFlow subscription",
      ready: Boolean(process.env.STRIPE_PRICE_PRO && process.env.STRIPE_WEBHOOK_SECRET),
      note: "Monthly billing and subscription-status updates",
    },
    {
      id: "email",
      label: "Booking emails",
      ready: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
      note: "Customer confirmations and barber booking alerts",
    },
    {
      id: "reminders",
      label: "Reminder worker credentials",
      ready: Boolean(process.env.CRON_SECRET && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
      note: "Credentials are present; confirm the Supabase worker schedule is active",
    },
    {
      id: "sms",
      label: "Text messages",
      ready: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
      optional: true,
      note: "Optional SMS confirmations and reminders",
    },
    {
      id: "app",
      label: "Home Screen app",
      ready: true,
      note: "Installable on supported iPhone and Android devices",
    },
  ];

  return NextResponse.json({ checks, ready: checks.filter((item) => !item.optional).every((item) => item.ready) });
}
