import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  CircleDollarSign,
  Clock3,
  CreditCard,
  PackageCheck,
  Repeat2,
  Scissors,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";

const platformFeatures = [
  [CalendarCheck2, "Booking that remembers", "Returning customers can repeat their exact last request, preferences and product notes instead of starting over."],
  [CreditCard, "$10 chair deposit", "Every appointment starts with a clear $10 reservation charge that is automatically deducted from the final price."],
  [UsersRound, "Built-in client list", "Every booking grows the barber’s private client directory with visit history, texture, style and notes."],
  [PackageCheck, "Smart product pickup", "Recommend retail products using the selected service, haircut style and texture already saved to the client profile."],
  [BarChart3, "Tax-ready reporting", "Monthly, quarterly and annual gross, refund, tax, processor fee and net summaries with CSV exports."],
  [CircleDollarSign, "No CutFlow payment percentage", "Client payments route to the barber’s connected account. CutFlow is paid by subscription, not a cut of appointments."],
];

const plans = [
  {
    name: "Complete",
    code: "pro",
    price: 69,
    note: "Everything an independent barber needs to run a polished booking business.",
    features: [
      "Smart booking with $10 deposits",
      "Client profiles and haircut memory",
      "Multiple connected payment services",
      "Product recommendations and pickup orders",
      "Automated reminders and tax-ready reports",
    ],
    featured: true,
  },
];

export default function HomePage() {
  return (
    <main className="marketing-site">
      <MarketingHeader />

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">THE OPERATING SYSTEM FOR INDEPENDENT BARBERS</p>
          <h1>Your chair.<br />Your clients.<br /><em>Your money.</em></h1>
          <p className="hero-lede">CutFlow combines smarter booking, haircut memory, direct deposits, retail pickup and tax-ready business reporting—without taking a percentage of the barber’s appointments.</p>
          <div className="hero-actions">
            <Link className="button large" href="/signup">Start 14-day free trial <ArrowRight size={18} /></Link>
            <Link className="button large secondary" href="/b/marcus-studio">View customer experience</Link>
          </div>
          <div className="proof-row">
            <span><Check size={14} /> $10 booking deposits</span>
            <span><Check size={14} /> No platform transaction cut</span>
            <span><Check size={14} /> Mobile-first</span>
          </div>
        </div>

        <div className="hero-product">
          <div className="hero-window glass-card">
            <header><span className="window-dots"><i /><i /><i /></span><small>REED / STUDIO — LIVE</small><span className="live-dot">●</span></header>
            <div className="hero-dashboard-preview">
              <aside>
                <div className="mini-logo"><Scissors size={17} /></div>
                {[1,2,3,4,5,6].map((i) => <span key={i} className={i === 1 ? "active" : ""} />)}
              </aside>
              <section>
                <div className="preview-heading"><div><small>MONDAY, JUL 20</small><h3>Good morning, Marcus.</h3></div><button>+ Add booking</button></div>
                <div className="preview-metrics">
                  <article><span>Today</span><b>8</b><small>appointments</small></article>
                  <article><span>Collected</span><b>$480</b><small>today</small></article>
                  <article><span>Open balance</span><b>$310</b><small>after deposits</small></article>
                </div>
                <div className="preview-content">
                  <div className="preview-schedule">
                    <small>NEXT IN THE CHAIR</small>
                    {[['9:00','Andre Collins','Cut + Beard','$50 due'],['10:30','Jordan Miles','Signature Cut','$54 due'],['12:00','Malik Thomas','Loc Edge + Taper','$32 due']].map((item, index) => <article key={item[0]}><time>{item[0]}</time><span className="mini-avatar">{item[1].split(' ').map(x=>x[0]).join('')}</span><div><b>{item[1]}</b><small>{item[2]}</small></div><em>{item[3]}</em>{index === 0 && <i>Next</i>}</article>)}
                  </div>
                  <div className="preview-insight"><Sparkles size={18} /><small>CLIENT INSIGHT</small><b>Jordan usually adds Scalp Tonic.</b><p>1 unit is already reserved for pickup today.</p><span>View profile →</span></div>
                </div>
              </section>
            </div>
          </div>
          <div className="floating-booking-card glass-card"><span><CalendarCheck2 /></span><div><small>NEW BOOKING</small><b>Saturday · 2:30 PM</b><p>$10 deposit received</p></div><strong>+$10</strong></div>
          <div className="floating-client-card glass-card"><span className="mini-avatar dark">AC</span><div><small>RETURNING CLIENT</small><b>Last request loaded</b><p>Only changes need updating</p></div><Repeat2 size={18} /></div>
        </div>
      </section>

      <section className="brand-strip"><span>BOOKINGS</span><b>SMART CLIENT MEMORY</b><span>PAYMENTS</span><b>DIRECT TO BARBER</b><span>REPORTS</span><b>MONTH · QUARTER · YEAR</b></section>

      <section id="platform" className="section-block">
        <div className="section-heading"><p className="eyebrow">ONE CONNECTED BARBER WORKSPACE</p><div><h2>Everything around the haircut finally works together.</h2><p>Every customer choice becomes useful business information before, during and after the appointment.</p></div></div>
        <div className="feature-grid">
          {platformFeatures.map(([Icon, title, copy], index) => (
            <article className="feature-card glass-card" key={String(title)}><span>0{index + 1}</span><Icon size={22} /><h3>{String(title)}</h3><p>{String(copy)}</p></article>
          ))}
        </div>
      </section>

      <section id="booking" className="booking-story section-block">
        <div className="booking-story-copy"><p className="eyebrow">A BETTER CUSTOMER EXPERIENCE</p><h2>Customers arrive understood—not under-explained.</h2><p>The guided booking engine asks only what matters, remembers returning clients and keeps the exact date, time, duration, deposit and remaining price visible throughout.</p><ul><li><UserRoundCheck size={18} /><span><b>Recognize returning customers</b><small>Reuse the previous haircut request unless something changed.</small></span></li><li><Clock3 size={18} /><span><b>Exact booking information</b><small>No confusing time windows or hidden duration.</small></span></li><li><Sparkles size={18} /><span><b>Relevant retail recommendations</b><small>Products match service, style and hair texture.</small></span></li><li><ShieldCheck size={18} /><span><b>Deposit clarity</b><small>$10 paid now, automatically removed from the amount due later.</small></span></li></ul><Link className="button" href="/b/marcus-studio">Try the live booking flow <ArrowRight size={17} /></Link></div>
        <div className="phone-stage">
          <div className="phone-shell"><div className="phone-island" /><header><span>9:41</span><b>REED / Studio</b><span>•••</span></header><div className="phone-body"><small>STEP 3 OF 5</small><h3>Select your appointment time.</h3><div className="phone-days"><button><small>MON</small><b>20</b><em>JUL</em></button><button className="selected"><small>TUE</small><b>21</b><em>JUL</em></button><button><small>WED</small><b>22</b><em>JUL</em></button><button><small>THU</small><b>23</b><em>JUL</em></button></div><div className="phone-date"><b>Tuesday, July 21, 2026</b><small>45-minute appointment</small></div><div className="phone-times">{['9:00 AM','10:30 AM','12:00 PM','2:30 PM','4:00 PM','5:30 PM'].map((time, index)=><button className={index===3?'selected':''} key={time}>{time}</button>)}</div><div className="phone-summary"><span><CalendarCheck2 size={16} /> Tue, Jul 21 · 2:30 PM</span><b>$10 due now</b></div><button className="phone-continue">Continue →</button></div></div>
        </div>
      </section>

      <section className="money-section section-block">
        <div><p className="eyebrow">SUBSCRIPTION SOFTWARE, NOT A COMMISSION</p><h2>CutFlow earns from the software—not from every haircut.</h2></div><div className="money-comparison"><article><small>CUSTOMER PAYS</small><strong>$60</strong><p>Cut + Beard appointment</p></article><span>→</span><article className="highlight"><small>BARBER PAYMENT</small><strong>$60</strong><p>Less only the connected payment processor’s normal fee</p></article><span>+</span><article><small>CUTFLOW</small><strong>$69/mo</strong><p>Predictable Complete software subscription</p></article></div>
      </section>

      <section id="pricing" className="section-block pricing-section">
        <div className="section-heading"><p className="eyebrow">PRICING THAT RESPECTS THE CHAIR</p><div><h2>One complete monthly plan. No CutFlow percentage.</h2><p>All current production features are included without confusing tiers or hidden transaction commissions.</p></div></div>
        <div className="pricing-grid single-plan">{plans.map((plan)=><article key={plan.name} className={plan.featured?"price-card featured":"price-card"}>{plan.featured&&<span className="popular">MOST POPULAR</span>}<p>{plan.name}</p><h3>${plan.price}<small>/month</small></h3><p>{plan.note}</p><ul>{plan.features.map(feature=><li key={feature}><Check size={15}/>{feature}</li>)}</ul><Link className={plan.featured?"button":"button secondary"} href={`/signup?plan=${plan.code}`}>Choose {plan.name}</Link></article>)}</div>
        <p className="pricing-note">14-day free trial · Cancel anytime · Processor fees are separate · No CutFlow percentage added to client payments</p>
      </section>

      <section className="final-cta"><p className="eyebrow">READY TO RUN A SMARTER CHAIR?</p><h2>Make every appointment easier to book, easier to repeat and easier to report.</h2><Link className="button large" href="/signup">Build your CutFlow <ArrowRight size={18}/></Link></section>

      <footer className="marketing-footer"><div><b>CutFlow</b><p>Booking, client intelligence and business operations for independent barbers.</p></div><div><Link href="/login">Sign in</Link><Link href="/signup">Create account</Link><Link href="/b/marcus-studio">Demo storefront</Link></div><small>43 Build · SaaS foundation</small></footer>
    </main>
  );
}
