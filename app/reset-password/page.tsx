import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Logo } from "@/components/Logo";
export default function ResetPasswordPage(){return <main className="auth-page"><section className="auth-brand-panel"><Logo/><div><p className="eyebrow">CHOOSE A NEW PASSWORD</p><h1>Protect the business behind the chair.</h1><p>Use at least eight characters and avoid reusing a password from another service.</p></div><small>CutFlow Production Core</small></section><section className="auth-card-panel"><Link className="auth-home" href="/login">← Back to sign in</Link><div className="auth-card glass-card"><p className="eyebrow">NEW PASSWORD</p><h2>Finish account recovery.</h2><ResetPasswordForm/></div></section></main>}
