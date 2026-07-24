import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Images,
  MailCheck,
  PackageCheck,
  Repeat2,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { InstallAppButton } from "@/components/InstallAppButton";

const platformFeatures = [
  [CalendarCheck2, "24/7 online booking", "Customers see real availability, service length, price, deposit and remaining balance before confirming."],
  [Repeat2, "Haircut memory", "Returning customers can reuse their last request and update only what changed."],
  [UsersRound, "Client profiles", "Keep visit history, texture, preferred style, sensitivities, notes and contact information together."],
  [CreditCard, "Direct Stripe payments", "Deposits and balances are charged on the barber’s connected Stripe account. CutFlow adds no platform percentage."],
  [PackageCheck, "Products and pickup", "Recommend products based on service and texture, manage inventory and reserve pickup during booking."],
  [BarChart3, "Business reports", "Review revenue, payments, open balances and export monthly, quarterly or yearly records."],
  [Images, "Branded storefront", "Upload your portrait, logo, cover, shop, service, product and gallery photography."],
  [MailCheck, "Customer communication", "Send clear booking confirmations and appointment reminders through CutFlow-managed communication."],
  [Smartphone, "Home Screen app", "Install CutFlow on supported iPhone and Android devices for fast, full-screen access."],
];

const workflow = [
  ["01", "Build your storefront", "Add your name, services, prices, hours, policies and photography."],
  ["02", "Connect Stripe", "Complete Stripe’s secure identity and payout setup. Customer payments go to your connected account."],
  ["03", "Share one link", "Customers book, explain the cut, choose products and pay the deposit from one mobile-first page."],
  ["04", "Run the chair", "Manage appointments, clients, balances, inventory and reports from the dashboard."],
];

const plans = [{
  name: "Complete",
  code: "pro",
  price: 69,
  note: "One predictable monthly price for the complete independent-barber workspace.",
  features: [
    "Unlimited online bookings",
    "Branded storefront and booking link",
    "Stripe deposits and balance payments",
    "Client profiles and haircut memory",
    "Services, products and image management",
    "Customer confirmations and reminders",
    "Business reporting and CSV exports",
    "Installable mobile web app",
  ],
}];

export default function HomePage() {
  return (
    <main className="marketing-site">
      <MarketingHeader />

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">THE BUSINESS APP BUILT FOR INDEPENDENT BARBERS</p>
          <h1>Your chair.<br />Your clients.<br /><em>Your money.</em></h1>
          <p className="hero-lede">CutFlow brings booking, client history, deposits, products, communication and reporting into one polished mobile workspace—without taking a CutFlow percentage from appointments.</p>
          <div className="hero-actions">
            <Link className="button large" href="/signup">Try CutFlow free <ArrowRight size={18} /></Link>
            <Link className="button large secondary" href="/b/marcus-studio">See the customer experience</Link>
          </div>
          <div className="proof-row">
            <span><Check size={14} /> 0% CutFlow transaction fee</span>
            <span><Check size={14} /> Direct-to-barber Stripe payments</span>
            <span><Check size={14} /> Built mobile first</span>
          </div>
        </div>

        <div className="hero-product">
          <div className="hero-window glass-card">
            <header><span className="window-dots"><i /><i /><i /></span><small>YOUR STUDIO — LIVE</small><span className="live-dot">●</span></header>
            <div className="hero-dashboard-preview">
              <aside><div className="mini-logo"><Scissors size={17} /></div>{[1,2,3,4,5,6].map((i)=><span key={i} className={i===1?"active":""}/>)}</aside>
              <section>
                <div className="preview-heading"><div><small>TODAY</small><h3>Good morning, Marcus.</h3></div><button>+ Add booking</button></div>
                <div className="preview-metrics"><article><span>Appointments</span><b>8</b><small>today</small></article><article><span>Collected</span><b>$480</b><small>today</small></article><article><span>Open balance</span><b>$310</b><small>after deposits</small></article></div>
                <div className="preview-content"><div className="preview-schedule"><small>NEXT IN THE CHAIR</small>{[['9:00','Andre Collins','Cut + Beard','$50 due'],['10:30','Jordan Miles','Signature Cut','$54 due'],['12:00','Malik Thomas','Loc Edge + Taper','$32 due']].map((item,index)=><article key={item[0]}><time>{item[0]}</time><span className="mini-avatar">{item[1].split(' ').map(x=>x[0]).join('')}</span><div><b>{item[1]}</b><small>{item[2]}</small></div><em>{item[3]}</em>{index===0&&<i>Next</i>}</article>)}</div><div className="preview-insight"><Sparkles size={18}/><small>CLIENT NOTE</small><b>Jordan usually adds Scalp Tonic.</b><p>One unit is reserved for pickup.</p><span>View profile →</span></div></div>
              </section>
            </div>
          </div>
          <div className="floating-booking-card glass-card"><span><CalendarCheck2/></span><div><small>NEW BOOKING</small><b>Saturday · 2:30 PM</b><p>$10 deposit received</p></div><strong>+$10</strong></div>
          <div className="floating-client-card glass-card"><span className="mini-avatar dark">AC</span><div><small>RETURNING CLIENT</small><b>Last request loaded</b><p>Only changes need updating</p></div><Repeat2 size={18}/></div>
        </div>
      </section>

      <section className="brand-strip"><span>BOOKING</span><b>CLIENT MEMORY</b><span>PAYMENTS</span><b>PRODUCTS</b><span>REMINDERS</span><b>REPORTS</b><span>STOREFRONT</span><b>MOBILE APP</b></section>

      <section id="platform" className="section-block">
        <div className="section-heading"><p className="eyebrow">EVERYTHING AROUND THE CHAIR</p><div><h2>One system from discovery to repeat visit.</h2><p>CutFlow connects the customer experience with the daily tools a barber needs to stay organized, get paid and build stronger client relationships.</p></div></div>
        <div className="feature-grid feature-grid-robust">{platformFeatures.map(([Icon,title,copy],index)=><article className="feature-card glass-card" key={String(title)}><span>{String(index+1).padStart(2,"0")}</span><Icon size={22}/><h3>{String(title)}</h3><p>{String(copy)}</p></article>)}</div>
      </section>

      <section className="workflow-section section-block">
        <div className="section-heading"><p className="eyebrow">FROM SIGNUP TO FIRST BOOKING</p><div><h2>Launch your booking business without the usual setup maze.</h2><p>Barbers handle business choices. CutFlow manages the technical systems behind payments, confirmations and reminders.</p></div></div>
        <div className="workflow-grid">{workflow.map(([number,title,copy])=><article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section id="booking" className="booking-story section-block">
        <div className="booking-story-copy"><p className="eyebrow">A BETTER CUSTOMER EXPERIENCE</p><h2>Customers arrive understood—not under-explained.</h2><p>The booking flow captures what the customer wants, remembers returning clients and keeps the date, time, duration, deposit and remaining price clear.</p><ul><li><UserRoundCheck size={18}/><span><b>Recognize returning customers</b><small>Reuse the previous haircut request unless something changed.</small></span></li><li><Clock3 size={18}/><span><b>Show exact appointment details</b><small>Clear start time, duration and availability.</small></span></li><li><Sparkles size={18}/><span><b>Recommend relevant products</b><small>Match products to service, style and hair texture.</small></span></li><li><ShieldCheck size={18}/><span><b>Make deposits transparent</b><small>The deposit is applied to the final appointment total.</small></span></li></ul><Link className="button" href="/b/marcus-studio">Try the booking flow <ArrowRight size={17}/></Link></div>
        <div className="phone-stage"><div className="phone-shell"><div className="phone-island"/><header><span>9:41</span><b>YOUR STUDIO</b><span>•••</span></header><div className="phone-body"><small>STEP 3 OF 5</small><h3>Select your appointment time.</h3><div className="phone-days"><button><small>MON</small><b>20</b><em>JUL</em></button><button className="selected"><small>TUE</small><b>21</b><em>JUL</em></button><button><small>WED</small><b>22</b><em>JUL</em></button><button><small>THU</small><b>23</b><em>JUL</em></button></div><div className="phone-date"><b>Tuesday, July 21</b><small>45-minute appointment</small></div><div className="phone-times">{['9:00 AM','10:30 AM','12:00 PM','2:30 PM','4:00 PM','5:30 PM'].map((time,index)=><button className={index===3?'selected':''} key={time}>{time}</button>)}</div><div className="phone-summary"><span><CalendarCheck2 size={16}/> Tue, Jul 21 · 2:30 PM</span><b>$10 due now</b></div><button className="phone-continue">Continue →</button></div></div></div>
      </section>

      <section className="ownership-section section-block">
        <div className="ownership-copy"><p className="eyebrow">KEEP THE VALUE OF YOUR WORK</p><h2>A monthly tool—not a silent partner in every haircut.</h2><p>CutFlow charges for the software. It does not add a platform commission to appointment deposits or balances. The barber’s connected payment processor still charges its normal processing fee.</p></div>
        <div className="ownership-grid">
          <article className="ownership-card featured"><small>CUTFLOW</small><strong>$69<span>/month</span></strong><h3>0% CutFlow transaction fee</h3><p>Your CutFlow cost stays predictable as your appointment revenue grows.</p><ul><li><Check/>No CutFlow booking commission</li><li><Check/>No CutFlow application fee</li><li><Check/>Payments created on the barber’s connected account</li></ul></article>
          <article className="ownership-card"><small>COMMISSION MODEL EXAMPLE</small><strong>20–30%<span> of selected bookings</span></strong><h3>The cost grows with each qualifying appointment.</h3><p>At 30%, five first-time $60 visits would equal $90 in commission before ordinary processing costs.</p><div className="commission-math"><span>5 visits × $60</span><b>$300</b><span>30% commission</span><b>−$90</b></div></article>
        </div>
        <p className="ownership-note">Illustrative comparison only. Competing services and optional marketplace programs use different pricing. Card-processing fees are separate from CutFlow’s subscription.</p>
      </section>

      <section className="money-section section-block">
        <div><p className="eyebrow">HOW A CUTFLOW PAYMENT MOVES</p><h2>Customer payment goes to the barber’s Stripe account.</h2></div>
        <div className="money-comparison"><article><small>CUSTOMER PAYS</small><strong>$60</strong><p>Appointment total</p></article><span>→</span><article className="highlight"><small>BARBER’S STRIPE ACCOUNT</small><strong>$60</strong><p>Stripe deducts its normal processing fee</p></article><span>+</span><article><small>CUTFLOW</small><strong>$0</strong><p>Taken from this appointment</p></article></div>
      </section>

      <section id="pricing" className="section-block pricing-section">
        <div className="section-heading"><p className="eyebrow">SIMPLE PRICING</p><div><h2>One complete monthly plan. No CutFlow appointment percentage.</h2><p>Every current feature is included without feature tiers or a CutFlow commission on customer payments.</p></div></div>
        <div className="pricing-grid single-plan">{plans.map(plan=><article key={plan.name} className="price-card featured"><span className="popular">COMPLETE PLAN</span><p>{plan.name}</p><h3>${plan.price}<small>/month</small></h3><p>{plan.note}</p><ul>{plan.features.map(feature=><li key={feature}><Check size={15}/>{feature}</li>)}</ul><Link className="button" href={`/signup?plan=${plan.code}`}>Try CutFlow free</Link></article>)}</div>
        <p className="pricing-note">14-day free trial · Cancel anytime · Stripe processing fees are separate · CutFlow takes 0% from appointment transactions</p>
      </section>

      <section className="final-cta"><p className="eyebrow">READY TO RUN A SMARTER CHAIR?</p><h2>Give customers a better booking experience and keep your business in one place.</h2><div className="final-cta-actions"><Link className="button large" href="/signup">Try CutFlow free <ArrowRight size={18}/></Link><InstallAppButton/></div></section>
      <footer className="marketing-footer"><div><b>CutFlow</b><p>Booking, client profiles, direct payments and business tools for independent barbers.</p></div><div><Link href="/login">Sign in</Link><Link href="/signup">Try free</Link><Link href="/b/marcus-studio">View booking demo</Link></div><small>© 2026 CutFlow</small></footer>
    </main>
  );
}
