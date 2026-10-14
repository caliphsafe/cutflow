import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Mail,
  PackageCheck,
  ReceiptText,
  Repeat2,
  Scissors,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";
import { MarketingHeader } from "@/components/MarketingHeader";
import { PricingComparison } from "@/components/PricingComparison";

const platformFeatures = [
  [CalendarCheck2, "Online booking", "Customers see real openings, exact appointment lengths, the deposit due now and the remaining balance."],
  [Store, "Branded storefront", "Share a polished barber page with your name, photos, services, prices, location and booking button."],
  [UsersRound, "Private client list", "Every booking builds a customer profile with visit history, contact details, notes and lifetime value."],
  [Repeat2, "Haircut memory", "Returning customers can reuse the last request and update only what changed."],
  [Settings, "Hours and policies", "Set weekly availability, notice windows, cancellation rules, rescheduling and blocked time."],
  [CreditCard, "Booking deposits", "Collect a clear deposit that is automatically credited toward the appointment total."],
  [WalletCards, "Flexible customer payments", "Make Cash App and Venmo your primary booking-deposit options, with Stripe available for cards and wallets. CutFlow takes no booking commission."],
  [ReceiptText, "Customer appointment page", "Customers can review details, add the appointment to their calendar, reschedule, cancel and pay a balance."],
  [Mail, "Confirmations and reminders", "Send booking confirmations, appointment reminders and new-booking alerts without extra setup for the barber."],
  [PackageCheck, "Product pickup", "Recommend products by service and hair needs, reserve inventory and prepare pickup for the appointment."],
  [BarChart3, "Business reports", "Track sales, deposits, refunds, processing fees and net income by month, quarter or year."],
  [Smartphone, "Home Screen app", "Add CutFlow to iPhone or Android for quick, full-screen access to the dashboard."],
];

const workflow = [
  ["01", "Build your booking page", "Add your services, prices, hours, policies, photos and brand details."],
  ["02", "Customers book clearly", "They choose a service and time, explain the haircut and pay the deposit."],
  ["03", "You start prepared", "The request, customer history, product choices and remaining balance are ready before they arrive."],
  ["04", "The next visit gets easier", "CutFlow remembers the customer, updates your reports and makes rebooking faster."],
];

const plans = [{
  name: "Complete",
  code: "pro",
  price: 69,
  note: "One monthly plan for the full CutFlow booking and business experience.",
  features: [
    "Branded storefront and mobile booking",
    "Services, hours, deposits and booking policies",
    "Client profiles and haircut memory",
    "Stripe plus barber-owned payment app options",
    "Confirmations, reminders and appointment management",
    "Products, inventory and pickup recommendations",
    "Payments, reports and CSV exports",
    "Installable iPhone and Android Home Screen app",
  ],
  featured: true,
}];

const faqs = [
  ["Does CutFlow take a percentage of appointments?", "No. CutFlow charges the monthly software subscription and does not add a CutFlow commission to booking deposits, balances or product payments."],
  ["Does Stripe still charge a payment fee?", "Yes. Stripe’s normal payment-processing fees still apply to card and wallet payments. Those are processor fees, not a CutFlow commission."],
  ["Where does customer money go?", "Stripe payments go to the barber’s connected Stripe account. When a barber offers a direct payment app, the customer pays that barber’s own account. CutFlow does not route a percentage to itself."],
  ["Can customers manage their appointment?", "Yes. Each confirmed booking includes a private appointment page for details, calendar access, rescheduling, cancellation, balance payment and receipts."],
  ["Do barbers need separate email or text accounts?", "No. CutFlow manages customer communication. Barbers simply choose which confirmations, reminders and alerts they want to use."],
  ["Is CutFlow available as a phone app?", "CutFlow can be added to the Home Screen on supported iPhone and Android devices for a full-screen app-style experience."],
];

export default function HomePage() {
  return <main className="marketing-site">
    <MarketingHeader/>

    <section className="hero-section">
      <div className="hero-copy">
        <p className="eyebrow">BOOKING AND BUSINESS TOOLS FOR INDEPENDENT BARBERS</p>
        <h1>Your chair.<br/>Your clients.<br/><em>Your money.</em></h1>
        <p className="hero-lede">CutFlow brings your booking page, customer details, haircut requests, deposits, products and business reports into one mobile-first workspace—without taking a percentage of your appointments.</p>
        <div className="hero-actions"><Link className="button large" href="/signup">Try CutFlow free <ArrowRight size={18}/></Link><Link className="button large secondary" href="/b/marcus-studio">See the customer experience</Link></div>
        <div className="proof-row"><span><Check size={14}/> $0 CutFlow booking commission</span><span><Check size={14}/> Stripe + direct payment apps</span><span><Check size={14}/> Built for mobile</span></div>
      </div>

      <div className="hero-product">
        <div className="hero-window glass-card"><header><span className="window-dots"><i/><i/><i/></span><small>REED / STUDIO — TODAY</small><span className="live-dot">●</span></header><div className="hero-dashboard-preview"><aside><div className="mini-logo"><Scissors size={17}/></div>{[1,2,3,4,5,6].map((i)=><span key={i} className={i===1?"active":""}/>)}</aside><section><div className="preview-heading"><div><small>MONDAY, JUL 20</small><h3>Good morning, Marcus.</h3></div><button>+ Add booking</button></div><div className="preview-metrics"><article><span>Today</span><b>8</b><small>appointments</small></article><article><span>Collected</span><b>$480</b><small>today</small></article><article><span>Open balance</span><b>$310</b><small>after deposits</small></article></div><div className="preview-content"><div className="preview-schedule"><small>NEXT IN THE CHAIR</small>{[["9:00","Andre Collins","Cut + Beard","$50 due"],["10:30","Jordan Miles","Signature Cut","$54 due"],["12:00","Malik Thomas","Loc Edge + Taper","$32 due"]].map((item,index)=><article key={item[0]}><time>{item[0]}</time><span className="mini-avatar">{item[1].split(" ").map(x=>x[0]).join("")}</span><div><b>{item[1]}</b><small>{item[2]}</small></div><em>{item[3]}</em>{index===0&&<i>Next</i>}</article>)}</div><div className="preview-insight"><Sparkles size={18}/><small>CLIENT INSIGHT</small><b>Jordan usually adds Scalp Tonic.</b><p>One unit is reserved for pickup today.</p><span>View profile →</span></div></div></section></div></div>
        <div className="floating-booking-card glass-card"><span><CalendarCheck2/></span><div><small>NEW BOOKING</small><b>Saturday · 2:30 PM</b><p>$10 deposit received</p></div><strong>+$10</strong></div>
        <div className="floating-client-card glass-card"><span className="mini-avatar dark">AC</span><div><small>RETURNING CLIENT</small><b>Last request loaded</b><p>Only changes need updating</p></div><Repeat2 size={18}/></div>
      </div>
    </section>

    <section className="brand-strip"><span>BOOKING PAGE</span><b>YOUR BRAND</b><span>CLIENT MEMORY</span><b>BETTER SERVICE</b><span>PAYMENTS</span><b>NO CUTFLOW COMMISSION</b><span>REPORTS</span><b>KNOW YOUR BUSINESS</b></section>

    <section id="platform" className="section-block">
      <div className="section-heading"><p className="eyebrow">THE COMPLETE CUTFLOW EXPERIENCE</p><div><h2>Everything you need before, during and after the appointment.</h2><p>CutFlow is designed around the full barber workflow—not just a calendar. Each tool shares the same customer, booking and payment information so you do not have to repeat work.</p></div></div>
      <div className="feature-grid robust-feature-grid">{platformFeatures.map(([Icon,title,copy],index)=><article className="feature-card glass-card" key={String(title)}><span>{String(index+1).padStart(2,"0")}</span><Icon size={22}/><h3>{String(title)}</h3><p>{String(copy)}</p></article>)}</div>
    </section>

    <section className="workflow-section section-block"><div className="workflow-heading"><p className="eyebrow">ONE FLOW FROM BOOKING TO REBOOKING</p><h2>Every appointment makes the next one easier.</h2></div><div className="workflow-grid">{workflow.map(([number,title,copy])=><article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section id="booking" className="booking-story section-block">
      <div className="booking-story-copy"><p className="eyebrow">A BETTER CUSTOMER EXPERIENCE</p><h2>Customers arrive understood—not under-explained.</h2><p>The booking flow keeps the service, exact time, duration, deposit and remaining balance clear while gathering the haircut details the barber actually needs.</p><ul><li><UserRoundCheck size={18}/><span><b>Recognize returning customers</b><small>Reuse the previous request and update only what changed.</small></span></li><li><Clock3 size={18}/><span><b>Show real availability</b><small>Available times respect service length, hours, notice rules and existing bookings.</small></span></li><li><Sparkles size={18}/><span><b>Recommend useful products</b><small>Match pickup products to the chosen service and customer’s hair needs.</small></span></li><li><ShieldCheck size={18}/><span><b>Keep payment clear</b><small>The deposit is paid now and credited toward the total automatically.</small></span></li></ul><Link className="button" href="/b/marcus-studio">Try the booking flow <ArrowRight size={17}/></Link></div>
      <div className="phone-stage"><div className="phone-shell"><div className="phone-island"/><header><span>9:41</span><b>REED / Studio</b><span>•••</span></header><div className="phone-body"><small>STEP 3 OF 5</small><h3>Choose your appointment time.</h3><div className="phone-days"><button><small>MON</small><b>20</b><em>JUL</em></button><button className="selected"><small>TUE</small><b>21</b><em>JUL</em></button><button><small>WED</small><b>22</b><em>JUL</em></button><button><small>THU</small><b>23</b><em>JUL</em></button></div><div className="phone-date"><b>Tuesday, July 21, 2026</b><small>45-minute appointment</small></div><div className="phone-times">{["9:00 AM","10:30 AM","12:00 PM","2:30 PM","4:00 PM","5:30 PM"].map((time,index)=><button className={index===3?"selected":""} key={time}>{time}</button>)}</div><div className="phone-summary"><span><CalendarCheck2 size={16}/> Tue, Jul 21 · 2:30 PM</span><b>$10 due now</b></div><button className="phone-continue">Continue →</button></div></div></div>
    </section>

    <section className="money-section section-block no-commission-section"><div><p className="eyebrow">FIXED SOFTWARE PRICE. ZERO CUTFLOW BOOKING COMMISSION.</p><h2>As your business grows, the CutFlow price stays predictable.</h2><p className="money-section-lede">Some booking and marketplace models charge a percentage of appointments or a commission for first-time customers they send. CutFlow’s Complete plan remains $69 per month. Any normal fees charged by the payment service the barber chooses still apply.</p></div><div className="money-comparison"><article><small>CUSTOMER PAYS</small><strong>$60</strong><p>Appointment total</p></article><span>→</span><article className="highlight"><small>CUTFLOW COMMISSION</small><strong>$0</strong><p>No CutFlow percentage is removed</p></article><span>+</span><article><small>CUTFLOW COMPLETE</small><strong>$69/mo</strong><p>One predictable software subscription</p></article></div></section>

    <section className="section-block comparison-section"><div className="section-heading"><p className="eyebrow">SEE THE DIFFERENCE</p><div><h2>A percentage grows with every dollar you earn. CutFlow does not.</h2><p>Use the example below to compare the fixed CutFlow subscription with an illustrative booking commission. This does not include normal card-processing fees.</p></div></div><PricingComparison/><div className="new-client-example"><CircleDollarSign/><div><small>FIRST-VISIT COMMISSION EXAMPLE</small><h3>Ten new $50 appointments at a 30% commission would cost $150.</h3><p>CutFlow Complete remains $69 for the month and does not charge a new-client commission. Marketplace programs and terms vary, and some commission features are optional.</p></div></div></section>

    <section className="feature-story-section section-block"><div className="section-heading"><p className="eyebrow">BUILT AROUND THE CHAIR</p><div><h2>Spend less time managing details and more time serving clients.</h2></div></div><div className="feature-story-grid"><article><CalendarCheck2/><h3>Run the day</h3><p>See upcoming appointments, deposits, requests and remaining balances in one clear schedule.</p><Link href="/signup">Start booking <ArrowRight/></Link></article><article><UsersRound/><h3>Know the client</h3><p>Keep haircut history, preferences, texture, notes, visits and value connected to the customer profile.</p><Link href="/signup">Build client memory <ArrowRight/></Link></article><article><PackageCheck/><h3>Grow the ticket</h3><p>Suggest relevant products during booking, reserve inventory and prepare items for pickup at the appointment.</p><Link href="/signup">Add products <ArrowRight/></Link></article><article><BarChart3/><h3>Know the numbers</h3><p>Review gross sales, refunds, processing fees and net income with downloadable monthly, quarterly and yearly reports.</p><Link href="/signup">See the business <ArrowRight/></Link></article></div></section>

    <section id="pricing" className="section-block pricing-section"><div className="section-heading"><p className="eyebrow">SIMPLE PRICING</p><div><h2>One complete plan. No CutFlow percentage.</h2><p>No feature maze and no CutFlow commission that grows with your appointment revenue.</p></div></div><div className="pricing-grid single-plan">{plans.map((plan)=><article key={plan.name} className={plan.featured?"price-card featured":"price-card"}>{plan.featured&&<span className="popular">COMPLETE PLAN</span>}<p>{plan.name}</p><h3>${plan.price}<small>/month</small></h3><p>{plan.note}</p><ul>{plan.features.map((feature)=><li key={feature}><Check size={15}/>{feature}</li>)}</ul><Link className="button" href={`/signup?plan=${plan.code}`}>Try CutFlow free</Link></article>)}</div><p className="pricing-note">14-day free trial · Cancel anytime · Payment-service processing fees are separate · $0 CutFlow booking commission</p></section>

    <section className="faq-section section-block"><div className="section-heading"><p className="eyebrow">COMMON QUESTIONS</p><div><h2>Clear answers before you start.</h2></div></div><div className="faq-grid">{faqs.map(([question,answer])=><article key={question}><h3>{question}</h3><p>{answer}</p></article>)}</div></section>

    <section className="final-cta"><p className="eyebrow">READY TO RUN A SMARTER CHAIR?</p><h2>Give customers a better booking experience and keep your business information in one place.</h2><div className="final-cta-actions"><Link className="button large" href="/signup">Try CutFlow free <ArrowRight size={18}/></Link><InstallAppButton/></div></section>

    <footer className="marketing-footer"><div><b>CutFlow</b><p>Booking, client memory, flexible customer payments, products and business reporting for independent barbers.</p></div><div><Link href="/login">Sign in</Link><Link href="/signup">Try free</Link><Link href="/b/marcus-studio">View booking demo</Link></div><small>© 2026 CutFlow</small></footer>
  </main>;
}
