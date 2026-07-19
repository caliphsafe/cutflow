"use client";

import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/browser";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const plan = search.get("plan") || "pro";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!isSupabaseConfigured()) {
      router.push(mode === "signup" ? `/onboarding?plan=${plan}` : "/dashboard");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const result = mode === "signup"
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding?plan=${plan}`,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm your account, then return to continue onboarding.");
      setLoading(false);
      return;
    }

    router.push(mode === "signup" ? `/onboarding?plan=${plan}` : "/dashboard");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label><span>Email address</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@barbershop.com" /></label>
      <label><span>Password</span><div className="password-input"><input required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
      {mode === "login" && <div className="auth-meta"><label className="remember"><input type="checkbox" /> <span>Keep me signed in</span></label><a href="mailto:support@example.com">Forgot password?</a></div>}
      {message && <p className={message.startsWith("Check") ? "auth-success" : "form-error"}>{message.startsWith("Check") && <CheckCircle2 size={17}/>} {message}</p>}
      <button className="button auth-submit" disabled={loading}>{loading ? "Please wait…" : mode === "signup" ? "Create CutFlow account" : "Sign in"}<ArrowRight size={17}/></button>
      <p className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to CutFlow?"} <Link href={mode === "signup" ? "/login" : "/signup"}>{mode === "signup" ? "Sign in" : "Start free"}</Link></p>
    </form>
  );
}
