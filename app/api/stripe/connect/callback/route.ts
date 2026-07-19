import { NextRequest, NextResponse } from "next/server";
import { appUrl, getStripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const stripe = getStripe();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("cutflow_stripe_state")?.value;
  if (!stripe || !code || !state || state !== expectedState) return NextResponse.redirect(`${appUrl()}/dashboard/settings?stripe=error`);

  try {
    const token = await stripe.oauth.token({ grant_type: "authorization_code", code });
    const supabase = await createServerSupabaseClient();
    const { data: auth } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (supabase && auth.user && token.stripe_user_id) {
      await supabase.from("barber_profiles").update({ stripe_account_id: token.stripe_user_id, stripe_connected_at: new Date().toISOString() }).eq("owner_user_id", auth.user.id);
    }
    return NextResponse.redirect(`${appUrl()}/dashboard/settings?stripe=connected`);
  } catch (error) {
    console.error("stripe-connect-callback", error);
    return NextResponse.redirect(`${appUrl()}/dashboard/settings?stripe=error`);
  }
}
