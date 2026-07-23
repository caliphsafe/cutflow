"use client";

import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/browser";
import { getSupabasePublicConfigStatus } from "@/lib/supabase/config";

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "CutFlow could not reach Supabase. Confirm the Project URL and browser Publishable key in Vercel, then redeploy.";
  }
  return message || "Authentication could not be completed. Please try again.";
}

function configurationMessage() {
  const status = getSupabasePublicConfigStatus();
  if (!status.hasUrl || !status.hasPublishableKey) {
    return "Supabase authentication is not configured in this deployment.";
  }
  if (!status.validUrl) {
    return "The Supabase Project URL in Vercel is not valid.";
  }
  if (status.keyType === "secret_key_not_allowed_in_browser") {
    return "The Supabase Secret key was placed in the browser key field. Use the sb_publishable_ key instead.";
  }
  if (!status.validPublishableKey) {
    return "The Supabase browser key is invalid. Use the Publishable key beginning with sb_publishable_.";
  }
  return "Supabase authentication is not configured correctly.";
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const plan = search.get("plan") || "pro";
  const next = search.get("next") || (mode === "signup" ? `/onboarding?plan=${plan}` : "/dashboard");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!isSupabaseConfigured()) {
      setMessage(configurationMessage());
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setMessage(configurationMessage());
      setLoading(false);
      return;
    }

    try {
      const result = mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setMessage(result.error.message);
        setLoading(false);
        return;
      }

      if (mode === "signup" && !result.data.session) {
        setMessage("Check your email to confirm your account. The confirmation link will return you to CutFlow onboarding.");
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (error) {
      setMessage(friendlyAuthError(error));
      setLoading(false);
    }
  }

  async function googleSignIn() {
    setMessage("");
    if (!isSupabaseConfigured()) {
      setMessage(configurationMessage());
      return;
    }
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setMessage(configurationMessage());
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setMessage(error.message);
        setLoading(false);
      }
    } catch (error) {
      setMessage(friendlyAuthError(error));
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <button className="button secondary auth-google" type="button" onClick={googleSignIn} disabled={loading}>Continue with Google</button>
      <div className="auth-divider"><span>or use email</span></div>
      <label><span>Email address</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@barbershop.com" /></label>
      <label><span>Password</span><div className="password-input"><input required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
      {mode === "login" && <div className="auth-meta"><label className="remember"><input type="checkbox" /> <span>Keep me signed in</span></label><Link href="/forgot-password">Forgot password?</Link></div>}
      {message && <p className={message.startsWith("Check") ? "auth-success" : "form-error"}>{message.startsWith("Check") && <CheckCircle2 size={17}/>} {message}</p>}
      <button className="button auth-submit" disabled={loading}>{loading ? "Please wait…" : mode === "signup" ? "Create CutFlow account" : "Sign in"}<ArrowRight size={17}/></button>
      <p className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to CutFlow?"} <Link href={mode === "signup" ? "/login" : "/signup"}>{mode === "signup" ? "Sign in" : "Try free"}</Link></p>
    </form>
  );
}
