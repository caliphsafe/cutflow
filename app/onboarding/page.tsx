"use client";

import { ArrowLeft, ArrowRight, Check, CheckCircle2, CreditCard, ExternalLink, Scissors, Store, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/Logo";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/browser";

const starterServices = [
  { name: "Signature Cut", price: "45", duration: "45" },
  { name: "Cut + Beard", price: "60", duration: "60" },
  { name: "Shape-Up", price: "28", duration: "25" },
];

function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    fullName: "",
    shopName: "",
    slug: "",
    phone: "",
    address: "",
    city: "",
    bio: "",
    accent: "#d8ff5f",
    deposit: "10",
    plan: params.get("plan") || "pro",
  });
  const [services, setServices] = useState(starterServices);

  function setField(name: string, value: string) {
    setData((current) => ({ ...current, [name]: value }));
    if (name === "shopName") {
      setData((current) => ({ ...current, shopName: value, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }));
    }
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
          p_deposit_cents: 1000,
          p_plan_code: data.plan,
          p_services: services.map((service) => ({ ...service, price_cents: Math.round(Number(service.price) * 100), duration_minutes: Number(service.duration) })),
        });
        if (rpcError) throw rpcError;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete onboarding.");
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-page">
      <aside className="onboarding-rail">
        <Logo />
        <div className="onboarding-steps">
          {[
            { number: 1, Icon: UserRound, label: "Your profile" },
            { number: 2, Icon: Store, label: "Shop page" },
            { number: 3, Icon: Scissors, label: "Services" },
            { number: 4, Icon: CreditCard, label: "Payments" },
          ].map(({ number, Icon, label }) => (
            <button key={label} className={step === number ? "active" : step > number ? "complete" : ""} onClick={() => setStep(number)}><span>{step > number ? <Check size={15}/> : <Icon size={17}/>}</span><div><small>STEP {number}</small><b>{label}</b></div></button>
          ))}
        </div>
        <div className="onboarding-plan"><small>SELECTED PLAN</small><b>{data.plan.charAt(0).toUpperCase() + data.plan.slice(1)}</b><span>14-day free trial</span></div>
      </aside>

      <section className="onboarding-content">
        <header><div><small>SETUP PROGRESS</small><b>{step} of 4 complete</b></div><div className="progress-line"><i style={{ width: `${step * 25}%` }} /></div></header>
        <div className="onboarding-card glass-card">
          {step === 1 && <><div className="step-heading"><span className="step-icon"><UserRound/></span><div><small>OWNER PROFILE</small><h1>Start with the person behind the chair.</h1><p>This information identifies the owner inside CutFlow.</p></div></div><div className="form-grid two"><label><span>Your name</span><input value={data.fullName} onChange={(e)=>setField("fullName",e.target.value)} placeholder="Marcus Reed"/></label><label><span>Business phone</span><input value={data.phone} onChange={(e)=>setField("phone",e.target.value)} placeholder="(508) 555-0123"/></label><label className="full"><span>Short barber bio</span><textarea value={data.bio} onChange={(e)=>setField("bio",e.target.value)} placeholder="Tell customers what makes the experience different."/></label></div></>}
          {step === 2 && <><div className="step-heading"><span className="step-icon"><Store/></span><div><small>BOOKING PAGE</small><h1>Create the public face of your chair.</h1><p>Every barber gets a shareable customer page at /b/your-name.</p></div></div><div className="form-grid two"><label><span>Shop or barber name</span><input value={data.shopName} onChange={(e)=>setField("shopName",e.target.value)} placeholder="REED / Studio"/></label><label><span>Booking page URL</span><div className="slug-field"><span>/b/</span><input value={data.slug} onChange={(e)=>setField("slug",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))}/></div></label><label><span>Street address</span><input value={data.address} onChange={(e)=>setField("address",e.target.value)} placeholder="214 Union Street"/></label><label><span>City / State</span><input value={data.city} onChange={(e)=>setField("city",e.target.value)} placeholder="New Bedford, MA"/></label><label><span>Accent color</span><div className="color-field"><input type="color" value={data.accent} onChange={(e)=>setField("accent",e.target.value)}/><input value={data.accent} onChange={(e)=>setField("accent",e.target.value)}/></div></label><div className="url-preview"><small>YOUR LIVE URL</small><b>cutflow.app/b/{data.slug || "your-name"}</b><ExternalLink size={16}/></div></div></>}
          {step === 3 && <><div className="step-heading"><span className="step-icon"><Scissors/></span><div><small>SERVICE MENU</small><h1>Add the work customers can book.</h1><p>Price and duration drive availability, deposits and remaining balances.</p></div></div><div className="onboarding-service-list"><header><span>Service</span><span>Minutes</span><span>Price</span></header>{services.map((service,index)=><div key={index}><input value={service.name} onChange={(e)=>setServices(current=>current.map((item,i)=>i===index?{...item,name:e.target.value}:item))}/><input value={service.duration} inputMode="numeric" onChange={(e)=>setServices(current=>current.map((item,i)=>i===index?{...item,duration:e.target.value}:item))}/><div className="money-input"><span>$</span><input value={service.price} inputMode="decimal" onChange={(e)=>setServices(current=>current.map((item,i)=>i===index?{...item,price:e.target.value}:item))}/></div></div>)}</div><button className="text-add" onClick={()=>setServices([...services,{name:"New service",price:"40",duration:"45"}])}>+ Add another service</button></>}
          {step === 4 && <><div className="step-heading"><span className="step-icon"><CreditCard/></span><div><small>DIRECT PAYMENTS</small><h1>Reserve the chair without giving CutFlow a cut.</h1><p>The deposit belongs to the barber’s connected payment account. CutFlow does not add a transaction percentage.</p></div></div><div className="deposit-config"><div><small>DEFAULT BOOKING DEPOSIT</small><div className="large-money-input"><span>$</span><input value={data.deposit} readOnly inputMode="decimal"/></div><p>Automatically deducted from the final appointment amount.</p></div><div className="payment-flow-card"><span><CreditCard/></span><div><b>Stripe Connect Standard</b><p>Customers pay the barber directly. Connect the account after entering the dashboard.</p></div><CheckCircle2/></div></div><div className="no-fee-banner"><CheckCircle2/><div><b>CutFlow application fee: $0</b><p>Normal Stripe processing fees still apply to the connected barber account.</p></div></div>{error&&<p className="form-error">{error}</p>}</>}
          <footer className="onboarding-actions"><button className="button secondary" disabled={step===1||saving} onClick={()=>setStep(step-1)}><ArrowLeft/>Back</button>{step<4?<button className="button" onClick={()=>setStep(step+1)}>Continue<ArrowRight/></button>:<button className="button" disabled={saving} onClick={finish}>{saving?"Creating workspace…":"Open my dashboard"}<ArrowRight/></button>}</footer>
        </div>
      </section>
    </main>
  );
}

export default function OnboardingPage() {
  return <Suspense><OnboardingFlow/></Suspense>;
}
