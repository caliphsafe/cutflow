import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  ExternalLink,
  Mail,
  MessageSquareText,
  ReceiptText,
  RefreshCcw,
  Smartphone,
} from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";

const vercelEnvironmentUrl = "https://vercel.com/caliphs-projects-1777db52/cutflow/settings/environment-variables";
const resendDomainsUrl = "https://resend.com/domains";
const twilioConsoleUrl = "https://console.twilio.com/";
const workerFileUrl = "https://github.com/caliphsafe/cutflow/blob/main/supabase/notification-worker.sql";

function getSupabaseSqlUrl() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    const projectRef = url.hostname.split(".")[0];
    return projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : "https://supabase.com/dashboard/projects";
  } catch {
    return "https://supabase.com/dashboard/projects";
  }
}

function Status({ ready, optional = false }: { ready: boolean; optional?: boolean }) {
  return <span className={ready ? "service-status ready" : optional ? "service-status optional" : "service-status missing"}>{ready ? <CheckCircle2/> : <CircleAlert/>}{ready ? "Ready" : optional ? "Optional" : "Needs setup"}</span>;
}

function Variables({ values }: { values: string[] }) {
  return <div className="setup-variable-list">{values.map((value) => <code key={value}>{value}</code>)}</div>;
}

export default function ReadinessPage() {
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CONNECT_WEBHOOK_SECRET);
  const subscriptionReady = Boolean(process.env.STRIPE_PRICE_PRO && process.env.STRIPE_WEBHOOK_SECRET);
  const emailReady = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const reminderReady = Boolean(process.env.CRON_SECRET && emailReady);
  const smsReady = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  const supabaseSqlUrl = getSupabaseSqlUrl();

  return <div className="dashboard-page readiness-setup-page">
    <header className="page-header"><div><p className="eyebrow">CUSTOMER READINESS</p><h1>Finish your live services.</h1><p>Open a section below to connect the service, verify its settings and return CutFlow to a ready state.</p></div></header>

    <section className="readiness-setup-grid">
      <article id="stripe" className="dashboard-card service-setup-card">
        <header><span className="service-setup-icon"><CreditCard/></span><div><p className="eyebrow">CUSTOMER PAYMENTS</p><h2>Stripe customer payments</h2></div><Status ready={stripeReady}/></header>
        <p>Stripe Connect receives booking deposits and sends the money to the barber’s connected Stripe account.</p>
        <div className="service-action-row"><Link className="button" href="/dashboard/connections">Open Stripe connection <ArrowRight/></Link></div>
      </article>

      <article id="subscription" className="dashboard-card service-setup-card">
        <header><span className="service-setup-icon"><ReceiptText/></span><div><p className="eyebrow">CUTFLOW BILLING</p><h2>Monthly subscription</h2></div><Status ready={subscriptionReady}/></header>
        <p>These settings control CutFlow’s monthly barber subscription and billing-status updates.</p>
        <Variables values={["STRIPE_PRICE_PRO", "STRIPE_WEBHOOK_SECRET"]}/>
        <div className="service-action-row"><Link className="button" href="/dashboard/subscription">Open subscription <ArrowRight/></Link><a className="button secondary" href={vercelEnvironmentUrl} target="_blank" rel="noreferrer">Open Vercel settings <ExternalLink/></a></div>
      </article>

      <article id="email" className="dashboard-card service-setup-card featured-setup">
        <header><span className="service-setup-icon"><Mail/></span><div><p className="eyebrow">BOOKING EMAILS</p><h2>Confirmations and barber alerts</h2></div><Status ready={emailReady}/></header>
        <p>Connect Resend so customers receive booking confirmations and barbers receive new-booking notifications.</p>
        <ol className="service-steps">
          <li><span>1</span><div><b>Verify your sending domain in Resend</b><p>Add the DNS records Resend gives you and wait until the domain shows verified.</p></div></li>
          <li><span>2</span><div><b>Add the email variables in Vercel</b><p>Use a verified address such as <code>CutFlow &lt;bookings@yourdomain.com&gt;</code>.</p></div></li>
          <li><span>3</span><div><b>Redeploy CutFlow</b><p>Environment-variable changes only become active after a new deployment.</p></div></li>
        </ol>
        <Variables values={["RESEND_API_KEY", "RESEND_FROM_EMAIL"]}/>
        <div className="service-action-row"><a className="button" href={resendDomainsUrl} target="_blank" rel="noreferrer">Open Resend <ExternalLink/></a><a className="button secondary" href={vercelEnvironmentUrl} target="_blank" rel="noreferrer">Open Vercel settings <ExternalLink/></a></div>
      </article>

      <article id="reminders" className="dashboard-card service-setup-card featured-setup">
        <header><span className="service-setup-icon"><RefreshCcw/></span><div><p className="eyebrow">REMINDER WORKER</p><h2>Automatic notification delivery</h2></div><Status ready={reminderReady}/></header>
        <p>The reminder worker processes queued confirmations and appointment reminders on a repeating schedule.</p>
        <ol className="service-steps">
          <li><span>1</span><div><b>Confirm the same CRON_SECRET in Vercel</b><p>Keep it private. It authorizes the worker request.</p></div></li>
          <li><span>2</span><div><b>Open the worker SQL file</b><p>Replace the placeholder CutFlow URL and placeholder secret with your live values.</p></div></li>
          <li><span>3</span><div><b>Run the completed SQL in Supabase</b><p>The schedule should run every five minutes. Do not also enable a duplicate Vercel cron.</p></div></li>
        </ol>
        <Variables values={["CRON_SECRET", "RESEND_API_KEY", "RESEND_FROM_EMAIL"]}/>
        <div className="service-action-row"><a className="button" href={workerFileUrl} target="_blank" rel="noreferrer">Open worker file <ExternalLink/></a><a className="button secondary" href={supabaseSqlUrl} target="_blank" rel="noreferrer">Open Supabase SQL Editor <ExternalLink/></a><a className="button secondary" href={vercelEnvironmentUrl} target="_blank" rel="noreferrer">Open Vercel settings <ExternalLink/></a></div>
      </article>

      <article id="sms" className="dashboard-card service-setup-card">
        <header><span className="service-setup-icon"><MessageSquareText/></span><div><p className="eyebrow">OPTIONAL SMS</p><h2>Text confirmations and reminders</h2></div><Status ready={smsReady} optional/></header>
        <p>SMS is optional. Leave it disabled until a Twilio number and approved messaging setup are ready.</p>
        <Variables values={["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", "NEXT_PUBLIC_SMS_ENABLED=true"]}/>
        <div className="service-action-row"><a className="button secondary" href={twilioConsoleUrl} target="_blank" rel="noreferrer">Open Twilio <ExternalLink/></a><a className="button secondary" href={vercelEnvironmentUrl} target="_blank" rel="noreferrer">Open Vercel settings <ExternalLink/></a></div>
      </article>

      <article id="app" className="dashboard-card service-setup-card">
        <header><span className="service-setup-icon"><Smartphone/></span><div><p className="eyebrow">HOME SCREEN APP</p><h2>Install CutFlow on your phone</h2></div><Status ready/></header>
        <p>Install the dashboard as a Home Screen app for faster access and a cleaner full-screen experience.</p>
        <div className="service-action-row"><InstallAppButton/></div>
      </article>
    </section>
  </div>;
}
