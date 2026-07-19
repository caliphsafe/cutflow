import Link from "next/link";
import { PasswordRecoveryForm } from "@/components/PasswordRecoveryForm";
import { Logo } from "@/components/Logo";
export default function ForgotPasswordPage(){return <main className="auth-page"><section className="auth-brand-panel"><Logo/><div><p className="eyebrow">SECURE ACCOUNT RECOVERY</p><h1>Get back to the chair.</h1><p>CutFlow sends a one-time reset link to the email attached to your barber account.</p></div><small>CutFlow Production Core</small></section><section className="auth-card-panel"><Link className="auth-home" href="/login">← Back to sign in</Link><div className="auth-card glass-card"><p className="eyebrow">RESET PASSWORD</p><h2>Where should we send the link?</h2><PasswordRecoveryForm/></div></section></main>}
