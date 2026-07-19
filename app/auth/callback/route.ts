import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") || "/dashboard";
  const supabase = await createServerSupabaseClient();
  if (!supabase || !code) return NextResponse.redirect(`${appUrl()}/login?error=oauth`);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${appUrl()}/login?error=oauth`);
  return NextResponse.redirect(`${appUrl()}${next.startsWith("/") ? next : `/${next}`}`);
}
