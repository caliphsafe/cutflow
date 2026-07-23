import { Suspense } from "react";
import { Check, CircleDollarSign, Scissors, Sparkles } from "lucide-react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";

export default function SignupPage() {
  return <main className="auth-page"><section className="auth-brand-panel signup-panel"><Logo/><div><p className="eyebrow">14 DAYS TO TRY THE FULL WORKFLOW</p><h1>Build the booking system around your chair.</h1><p>Launch a branded booking page, collect deposits directly and start organizing every customer automatically.</p><ul><li><Check/><span>No CutFlow percentage on appointments</span></li><li><Check/><span>$10 deposits credited to the final total</span></li><li><Check/><span>Customer memory and smart product pickup</span></li></ul><div className="signup-badges"><span><CircleDollarSign/> Direct payments</span><span><Sparkles/> Smart profiles</span><span><Scissors/> Barber built</span></div></div><small>No card required to create your account.</small></section><section className="auth-card-panel"><Link className="auth-home" href="/">← Back to CutFlow</Link><div className="auth-card glass-card"><p className="eyebrow">CREATE YOUR ACCOUNT</p><h2>Start with your business email.</h2><p>You will create your barber page and services next.</p><Suspense><AuthForm mode="signup"/></Suspense><small className="terms-copy">Your account details are used to create and secure your CutFlow workspace.</small></div></section></main>;
}
