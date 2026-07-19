import { Suspense } from "react";
import { CalendarCheck2, CreditCard, UsersRound } from "lucide-react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  return <main className="auth-page"><section className="auth-brand-panel"><Logo/><div><p className="eyebrow">WELCOME BACK TO THE CHAIR</p><h1>Run the day without chasing the details.</h1><p>Bookings, clients, balances and business reporting are waiting in one clean workspace.</p><ul><li><CalendarCheck2/><span>Today’s chair schedule</span></li><li><UsersRound/><span>Client history and saved requests</span></li><li><CreditCard/><span>Deposits, balances and reports</span></li></ul></div><small>CutFlow 43 Build</small></section><section className="auth-card-panel"><Link className="auth-home" href="/">← Back to CutFlow</Link><div className="auth-card glass-card"><p className="eyebrow">BARBER SIGN IN</p><h2>Open your workspace.</h2><p>Use your shop owner or team account.</p><Suspense><AuthForm mode="login"/></Suspense><div className="demo-access"><b>Demo build</b><p>Without environment variables, any credentials open the demo dashboard.</p></div></div></section></main>;
}
