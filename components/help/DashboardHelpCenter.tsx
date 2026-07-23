"use client";

import Link from "next/link";
import { BookOpenCheck, CheckCircle2, ChevronRight, HelpCircle, Lightbulb, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type Guide = { title: string; intro: string; steps: string[]; tip: string; next?: { label: string; href: string } };

const guides: Record<string, Guide> = {
  "/dashboard": { title: "Your daily command center", intro: "Use Overview to see today’s appointments, customer activity, setup progress and money collected.", steps: ["Review today’s schedule before the first appointment.", "Open any booking that needs payment or service details.", "Use the launch checklist until every required setup item is complete."], tip: "Complete or cancel appointments promptly so reports and customer history remain accurate.", next: { label: "Review bookings", href: "/dashboard/bookings" } },
  "/dashboard/bookings": { title: "Manage the chair calendar", intro: "Bookings contains customer requests, deposits, appointment status and the remaining amount due.", steps: ["Open an appointment to review the requested cut before arrival.", "Move the status through confirmed, checked in and completed.", "Record the final payment method so revenue reports match what happened."], tip: "Use blocked time and booking policies instead of manually declining appointments.", next: { label: "Set booking policies", href: "/dashboard/policies" } },
  "/dashboard/clients": { title: "Build useful client memory", intro: "Client profiles remember texture, preferences, prior requests, visit history and private barber notes.", steps: ["Confirm contact details after the first visit.", "Save the final haircut actually performed.", "Add only useful private notes that improve future service."], tip: "Never add unnecessary sensitive information to a customer profile." },
  "/dashboard/payments": { title: "Keep the ledger accurate", intro: "Payments combines processor-confirmed transactions and manually recorded cash or external payments.", steps: ["Use connected processors for automatic confirmation.", "Record cash or other external payments manually when needed.", "Issue refunds through the original processor whenever possible."], tip: "A booking should only be marked paid when the payment is visible in the provider or recorded in CutFlow.", next: { label: "Manage connections", href: "/dashboard/connections" } },
  "/dashboard/connections": { title: "Connect payments without API keys", intro: "Choose a provider, sign in on its secure website and authorize CutFlow. Platform credentials stay hidden from barbers.", steps: ["Connect the provider your business already uses.", "Finish any identity or bank verification requested by the provider.", "Set the provider you want customers to see first as Primary."], tip: "A Connected badge is not enough—Accepting payments and Payout ready should both say Yes.", next: { label: "Open payment ledger", href: "/dashboard/payments" } },
  "/dashboard/reports": { title: "Prepare clean business records", intro: "Reports summarize revenue, fees, refunds and payment methods by month, quarter or year.", steps: ["Choose the reporting period.", "Confirm manual payments are included.", "Export CSV files for your accountant or bookkeeping system."], tip: "CutFlow reports support recordkeeping but do not replace tax advice or full accounting software." },
  "/dashboard/services": { title: "Create an accurate service menu", intro: "Price and duration control what customers see and which time slots remain available.", steps: ["Use a clear customer-facing service name.", "Set enough time to complete the service without rushing.", "Upload a representative photo when it helps customers understand the result."], tip: "Avoid creating several services with nearly identical names; use descriptions to explain differences." },
  "/dashboard/products": { title: "Sell useful pickup products", intro: "Products can appear during booking when their service and hair-texture tags match the customer’s request.", steps: ["Upload a clear product photo.", "Keep inventory accurate.", "Choose texture and service tags that genuinely match the product."], tip: "Recommendations should feel helpful, not automatic or aggressive." },
  "/dashboard/media": { title: "Make the customer page feel real", intro: "Upload the barber, shop, service and gallery photography used throughout the public booking experience.", steps: ["Start with a clear portrait and wide cover image.", "Add shop and work-detail photos to build trust.", "Use product and service pages for their specific images."], tip: "Bright, sharp images with uncluttered backgrounds work best on mobile." },
  "/dashboard/storefront": { title: "Publish a complete customer page", intro: "Storefront controls your name, public copy, color, contact details, images and shareable booking URL.", steps: ["Complete the identity and location information.", "Preview the page on mobile.", "Publish only after services, hours, subscription and payments are ready."], tip: "Keep the headline specific to the experience customers receive in your chair." },
  "/dashboard/policies": { title: "Set expectations before checkout", intro: "Booking policies determine notice, cancellation, rescheduling, no-show and schedule behavior.", steps: ["Set how soon a customer may book.", "Choose a fair cancellation window.", "Explain when a deposit is retained or refunded."], tip: "Policies should be visible before payment and applied consistently." },
  "/dashboard/subscription": { title: "Manage CutFlow access", intro: "Subscription status controls whether the barber workspace and public storefront remain active.", steps: ["Choose the plan that matches the number of barbers and tools needed.", "Use the billing portal to update payment information.", "Resolve failed payments before the grace period ends."], tip: "Customer appointment payments are separate from the CutFlow software subscription." },
  "/dashboard/settings": { title: "Configure operations", intro: "Settings contains availability, business details and system preferences used across booking and reminders.", steps: ["Confirm the business time zone.", "Set normal weekly hours.", "Add days off, vacations and temporary schedule changes."], tip: "Incorrect time zones are the most common cause of appointments appearing at the wrong time." },
};

function currentGuide(pathname: string) {
  const exact = Object.keys(guides).find((path) => path !== "/dashboard" && pathname.startsWith(path));
  return guides[exact || "/dashboard"];
}

export function DashboardHelpCenter() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const guide = useMemo(() => currentGuide(pathname), [pathname]);
  return <>
    <button className="dashboard-help-launch" type="button" onClick={() => setOpen(true)}><HelpCircle/><span>Help for this page</span></button>
    {open && <><button className="help-drawer-scrim" aria-label="Close help" onClick={() => setOpen(false)}/><aside className="help-drawer" aria-label="Page tutorial">
      <header><span><BookOpenCheck/></span><div><small>GUIDED HELP</small><h2>{guide.title}</h2></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close help"><X/></button></header>
      <p className="help-drawer-intro">{guide.intro}</p>
      <ol>{guide.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
      <div className="help-drawer-tip"><Lightbulb/><div><b>Helpful tip</b><p>{guide.tip}</p></div></div>
      <div className="help-drawer-basics"><b>Symbols used throughout CutFlow</b><span><CheckCircle2/> Green means connected, complete or ready.</span><span><HelpCircle/> Select a question-mark icon for an explanation.</span></div>
      {guide.next && <Link className="button" href={guide.next.href} onClick={() => setOpen(false)}>{guide.next.label}<ChevronRight/></Link>}
    </aside></>}
  </>;
}
