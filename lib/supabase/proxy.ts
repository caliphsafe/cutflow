import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirect(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId = String(data?.claims?.sub || "");
  const signedIn = Boolean(userId);
  const path = request.nextUrl.pathname;

  if (!signedIn && (path.startsWith("/dashboard") || path.startsWith("/onboarding"))) return redirect(request, "/login", { next: path });
  if (signedIn && (path === "/login" || path === "/signup")) return redirect(request, "/dashboard");

  if (signedIn && path.startsWith("/dashboard")) {
    const { data: barber } = await supabase.from("barber_profiles").select("id,owner_user_id").or(`owner_user_id.eq.${userId},assigned_user_id.eq.${userId}`).limit(1).maybeSingle();
    if (!barber) return redirect(request, "/onboarding");
    if (!path.startsWith("/dashboard/subscription")) {
      const { data: subscription } = await supabase.from("subscriptions").select("status,trial_ends_at,current_period_end").eq("owner_user_id", barber.owner_user_id).maybeSingle();
      const status = subscription?.status || "";
      const trialValid = status === "trialing" && (!subscription?.trial_ends_at || new Date(subscription.trial_ends_at).getTime() > Date.now());
      const active = status === "active" || trialValid || (status === "past_due" && subscription?.current_period_end && new Date(subscription.current_period_end).getTime() > Date.now());
      if (!active) return redirect(request, "/dashboard/subscription", { access: "required" });
    }
  }

  return response;
}
