"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setMessage("Demo mode: password recovery requires Supabase."); setLoading(false); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password` });
    setMessage(error ? error.message : "Check your email for a secure password reset link."); setLoading(false);
  }
  return <form className="auth-form" onSubmit={submit}><label><span>Email address</span><input required type="email" value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="you@barbershop.com"/></label>{message&&<p className={message.startsWith("Check")?"auth-success":"form-error"}>{message.startsWith("Check")&&<CheckCircle2 size={17}/>} {message}</p>}<button className="button auth-submit" disabled={loading}>{loading?"Sending…":"Send reset link"}<ArrowRight size={17}/></button></form>;
}
