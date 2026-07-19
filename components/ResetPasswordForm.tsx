"use client";

import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function ResetPasswordForm() {
  const router=useRouter();const[password,setPassword]=useState("");const[confirm,setConfirm]=useState("");const[show,setShow]=useState(false);const[loading,setLoading]=useState(false);const[message,setMessage]=useState("");
  async function submit(event:React.FormEvent){event.preventDefault();if(password!==confirm){setMessage("Passwords do not match.");return}setLoading(true);const supabase=createBrowserSupabaseClient();if(!supabase){setMessage("Supabase is not configured.");setLoading(false);return}const{error}=await supabase.auth.updateUser({password});if(error){setMessage(error.message);setLoading(false);return}setMessage("Password updated. Redirecting to your dashboard…");setTimeout(()=>router.push("/dashboard"),900)}
  return <form className="auth-form" onSubmit={submit}><label><span>New password</span><div className="password-input"><input required minLength={8} type={show?"text":"password"} value={password} onChange={(e)=>setPassword(e.target.value)}/><button type="button" onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label><label><span>Confirm password</span><input required minLength={8} type={show?"text":"password"} value={confirm} onChange={(e)=>setConfirm(e.target.value)}/></label>{message&&<p className={message.startsWith("Password updated")?"auth-success":"form-error"}>{message.startsWith("Password updated")&&<CheckCircle2 size={17}/>} {message}</p>}<button className="button auth-submit" disabled={loading}>{loading?"Updating…":"Update password"}<ArrowRight size={17}/></button></form>;
}
