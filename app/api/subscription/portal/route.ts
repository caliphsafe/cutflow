import { NextResponse } from "next/server";
import { appUrl, getStripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const stripe = getStripe();
    const supabase = await createServerSupabaseClient();
    if (!stripe || !supabase) return NextResponse.json({ error: "Stripe billing is not configured yet." }, { status: 503 });
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: subscription, error } = await supabase.from("subscriptions").select("stripe_customer_id").eq("owner_user_id", auth.user.id).maybeSingle();
    if (error) throw error;
    if (!subscription?.stripe_customer_id) return NextResponse.json({ error: "Choose a paid plan before opening the billing portal." }, { status: 400 });
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl()}/dashboard/subscription`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("subscription-portal", error);
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 500 });
  }
}
