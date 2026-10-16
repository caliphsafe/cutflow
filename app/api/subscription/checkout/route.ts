import { NextResponse } from "next/server";
import { appUrl, getStripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CUTFLOW_MONTHLY_PRICE_USD } from "@/lib/pricing";

const planNames: Record<string, string> = {
  pro: "CutFlow Complete",
};

export async function POST(request: Request) {
  try {
    const { plan } = await request.json();
    const stripe = getStripe();
    const planName = typeof plan === "string" ? planNames[plan] : undefined;
    if (!planName) return NextResponse.json({ error: "Choose a valid CutFlow plan." }, { status: 400 });
    if (!stripe) return NextResponse.json({ url: `${appUrl()}/dashboard/subscription?checkout=demo&plan=${encodeURIComponent(plan)}`, demo: true });

    const supabase = await createServerSupabaseClient();
    const { data: auth } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (supabase && !auth.user) return NextResponse.json({ error: "Sign in before choosing a CutFlow plan." }, { status: 401 });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: auth.user?.email,
      line_items: [{ price_data: { currency: "usd", product_data: { name: planName }, recurring: { interval: "month" }, unit_amount: CUTFLOW_MONTHLY_PRICE_USD * 100 }, quantity: 1 }],
      subscription_data: { trial_period_days: 14, metadata: { user_id: auth.user?.id || "unknown", plan_code: plan } },
      metadata: { user_id: auth.user?.id || "unknown", plan_code: plan },
      success_url: `${appUrl()}/dashboard/subscription?checkout=success`,
      cancel_url: `${appUrl()}/dashboard/subscription?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("subscription-checkout", error);
    return NextResponse.json({ error: "Could not open subscription checkout." }, { status: 500 });
  }
}
