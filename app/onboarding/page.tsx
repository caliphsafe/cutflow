"use client";

import { ArrowLeft, ArrowRight, BookOpenCheck, Check, CheckCircle2, CreditCard, ExternalLink, ImagePlus, Info, Scissors, Store, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { HelpTip } from "@/components/HelpTip";
import { Logo } from "@/components/Logo";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/browser";

const starterServices = [
  { name: "Signature Cut", price: "45", duration: "45" },
  { name: "Cut + Beard", price: "60", duration: "60" },
  { name: "Shape-Up", price: "28", duration: "25" },
];

function Tutorial({ title, children, bullets }: { title: string; children: React.ReactNode; bullets: string[] }) {
  return <aside className="onboarding-tutorial"><header><span><BookOpenCheck/></span><div><small>SETUP GUIDANCE</small><b>{title}</b></div></header><p>{children}</p><ul>{bullets.map((item) => <li key={item}><Check/>{item}</li>)}</ul></aside>;
}

function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ fullName: "", shopName: "", slug: "", phone: "", address: "", city: "", bio: "", accent: "#d8ff5f", deposit: "10", plan: params.get("plan") || "pro" });
  const [services, setServices] = useState(starterServices);

  function setField(name: string, value: string) {
    setData((current) => ({ ...current, [name]: value, ...(name === "shopName" ? { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") } : {}) }));
  }

  function stepReady() {
    if (step === 1) return Boolean(data.fullName.trim() && data.phone.trim());
    if (step === 2) return Boolean(data.shopName.trim() && data.slug.length >= 3 && data.address.trim() && data.city.trim());
    if (step === 3) return services.length > 0 && services.every((service) => service.name.trim() && Number(service.price) >= 0 && Number(service.duration) >= 5);
    return true;
  }

  async function finish() {
    setSaving(true);
    setError("");
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabaseClient();
        if (!supabase) throw new Error("Supabase is not available.");
        const { error: rpcError } = await supabase.rpc("complete_barber_onboarding", {
          p_display_name: data.fullName,
          p_shop_name: data.shopName,
          p_slug: data.slug,
          p_phone: data.phone,
          p_address: data.address,
          p_city: data.city,
          p_bio: data.bio,
          p_accent_color: data.accent,
          p_deposit_cents: Math.max(50, Math.round(Number(data.deposit || 10) * 100)),
          p_plan_code: data.plan,
          p_services: services.map((service) => ({ ...service, price_cents: Math.round(Number(service.price) * 100), duration_minutes: Number(service.duration) })),
        });
        if (rpcError) throw rpcError;
      }
      router.push("/dashboard?welcome=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete onboarding.");
      setSaving(false);
    }
  }

  return <main className="onboarding-page">
    <aside className="onboarding-rail">
      <Logo />
      <div className="onboarding-steps">{[
        { number: 1, Icon: UserRound, label: "Your profile" },
        { number: 2, Icon: Store, label: "Shop page" },
        { number: 3, Icon: Scissors, label: "Services" },
        { number: 4, Icon: CreditCard, label: "Launch plan" },
      ].map(({ number, Icon, label }) => <button key={label} className={step === number ? "active" : step > number ? "complete" : ""} onClick={() => setStep(number)}><span>{step > number ? <Check size={15}/> : <Icon size={17}/>}</span><div><small>STEP {number}</small><b>{label}</b></div></button>)}</div>
      <div className="onboarding-plan"><small>SELECTED PLAN</small><b>{data.plan === "pro" ? "Complete" : data.plan.charAt(0).toUpperCase() + data.plan.slice(1)}</b><span>14-day free trial</span></div>
    </aside>

    <section className="onboarding-content">
      <header><div><small>GUIDED SETUP</small><b>Step {step} of 4</b></div><div className="progress-line"><i style={{ width: `${step * 25}%` }} /></div></header>
      <div className="onboarding-card glass-card">
        {step === 1 && <><div className="step-heading"><span className="step-icon"><UserRound/></span><div><small>OWNER PROFILE</small><h1>Introduce the person behind the chair.</h1><p>This information identifies the barber and supports appointment communication.</p></div></div><div className="onboarding-two-column"><div className="form-grid two"><label><span>Your name <HelpTip text="Use the name customers know you by. You can change it later."/></span><input value={data.fullName} onChange={(e)=>setField("fullName",e.target.value)} placeholder="Marcus Reed"/></label><label><span>Business phone <HelpTip text="Used for customer questions and optional barber alerts. It is shown publicly only where you choose."/></span><input value={data.phone} onChange={(e)=>setField("phone",e.target.value)} placeholder="(508) 555-0123"/></label><label className="full"><span>Short barber bio</span><textarea value={data.bio} onChange={(e)=>setField("bio",e.target.value)} placeholder="Describe your specialties, experience and the atmosphere customers can expect."/></label></div><Tutorial title="What makes a strong profile" bullets={["Use the name clients already recognize.","Keep the bio focused on specialties and service.","Add professional photos from the dashboard after setup."]}>Customers feel more comfortable booking when they know who will provide the service and what to expect.</Tutorial></div></>}
        {step === 2 && <><div className="step-heading"><span className="step-icon"><Store/></span><div><small>BOOKING PAGE</small><h1>Create the public identity of your business.</h1><p>This information appears on the shareable customer booking page.</p></div></div><div className="onboarding-two-column"><div className="form-grid two"><label><span>Shop or barber name</span><input value={data.shopName} onChange={(e)=>setField("shopName",e.target.value)} placeholder="REED / Studio"/></label><label><span>Booking page URL <HelpTip text="This becomes the link you share. Use lowercase letters, numbers and hyphens only."/></span><div className="slug-field"><span>/b/</span><input value={data.slug} onChange={(e)=>setField("slug",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))}/></div></label><label><span>Street address</span><input value={data.address} onChange={(e)=>setField("address",e.target.value)} placeholder="214 Union Street"/></label><label><span>City / State</span><input value={data.city} onChange={(e)=>setField("city",e.target.value)} placeholder="New Bedford, MA"/></label><label><span>Accent color <HelpTip text="CutFlow uses this color for buttons and highlights while preserving accessible contrast."/></span><div className="color-field"><input type="color" value={data.accent} onChange={(e)=>setField("accent",e.target.value)}/><input value={data.accent} onChange={(e)=>setField("accent",e.target.value)}/></div></label><div className="url-preview"><small>YOUR BOOKING URL</small><b>cutflow.app/b/{data.slug || "your-name"}</b><ExternalLink size={16}/></div></div><Tutorial title="What customers will see" bullets={["A clear location before checkout.","Your shop name and brand color.","Professional images added in Photos & media."]}>The storefront remains private until the launch checklist confirms that services, hours, photos, payments and billing are ready.</Tutorial></div></>}
        {step === 3 && <><div className="step-heading"><span className="step-icon"><Scissors/></span><div><small>SERVICE MENU</small><h1>Add the appointments customers can book.</h1><p>Price and duration determine availability, deposits and remaining balances.</p></div></div><div className="onboarding-two-column"><div><div className="onboarding-service-list"><header><span>Service</span><span>Minutes</span><span>Price</span></header>{services.map((service,index)=><div key={index}><input value={service.name} onChange={(e)=>setServices(current=>current.map((item,i)=>i===index?{...item,name:e.target.value}:item))}/><input value={service.duration} inputMode="numeric" onChange={(e)=>setServices(current=>current.map((item,i)=>i===index?{...item,duration:e.target.value}:item))}/><div className="money-input"><span>$</span><input value={service.price} inputMode="decimal" onChange={(e)=>setServices(current=>current.map((item,i)=>i===index?{...item,price:e.target.value}:item))}/></div></div>)}</div><button className="text-add" onClick={()=>setServices([...services,{name:"New service",price:"40",duration:"45"}])}>+ Add another service</button></div><Tutorial title="Price and time accurately" bullets={["Include consultation and cleanup time.","Use the complete price before the deposit.","Upload a service example image later."]}>Accurate service durations prevent overlapping appointments and make the available time list trustworthy.</Tutorial></div></>}
        {step === 4 && <><div className="step-heading"><span className="step-icon"><CreditCard/></span><div><small>LAUNCH PLAN</small><h1>Review what happens after your workspace opens.</h1><p>The dashboard will guide you through each remaining production requirement.</p></div></div><div className="onboarding-two-column"><div><div className="deposit-config"><div><small>BOOKING DEPOSIT</small><div className="large-money-input"><span>$</span><input value={data.deposit} onChange={(event)=>setField("deposit",event.target.value)} inputMode="decimal"/></div><p>Automatically credited toward the appointment total.</p></div><div className="payment-flow-card"><span><CreditCard/></span><div><b>Connect by signing in</b><p>Connect Stripe from the dashboard. Stripe securely collects business, identity and payout details—barbers never enter API keys.</p></div><CheckCircle2/></div></div><div className="no-fee-banner"><CheckCircle2/><div><b>CutFlow appointment application fee: $0</b><p>Normal processing fees from the connected payment provider still apply.</p></div></div></div><Tutorial title="Your guided launch checklist" bullets={["Upload barber, shop and gallery photos.","Confirm weekly availability and policies.","Connect and verify Stripe.","Preview the mobile storefront before publishing."]}>Every dashboard page includes a Help button and contextual question-mark tooltips. Your public page cannot be published until the required setup is complete.</Tutorial></div><div className="onboarding-next-preview"><div><ImagePlus/><span><b>Photos & media</b><small>Replace every customer-facing placeholder.</small></span></div><div><CreditCard/><span><b>Payment connections</b><small>Complete secure Stripe-hosted setup—no API keys to copy.</small></span></div><div><Info/><span><b>Page tutorials</b><small>Open Help for instructions in every tool.</small></span></div></div>{error&&<p className="form-error">{error}</p>}</>}
        <footer className="onboarding-actions"><button className="button secondary" disabled={step===1||saving} onClick={()=>setStep(step-1)}><ArrowLeft/>Back</button>{step<4?<button className="button" disabled={!stepReady()} onClick={()=>setStep(step+1)}>Continue<ArrowRight/></button>:<button className="button" disabled={saving} onClick={finish}>{saving?"Creating workspace…":"Open guided dashboard"}<ArrowRight/></button>}</footer>
      </div>
    </section>
  </main>;
}

export default function OnboardingPage() { return <Suspense><OnboardingFlow/></Suspense>; }
