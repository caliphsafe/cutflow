import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = request.nextUrl.searchParams.get("next") || "/onboarding";
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.redirect(`${appUrl()}${next}`);

  let error = null;
  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  else error = new Error("Confirmation information is missing.");

  if (error) return NextResponse.redirect(`${appUrl()}/login?error=confirmation`);
  return NextResponse.redirect(`${appUrl()}${next.startsWith("/") ? next : `/${next}`}`);
}
