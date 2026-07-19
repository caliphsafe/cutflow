import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAuthenticatedBarber() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { supabase: null, user: null, barber: null, subscription: null, demo: true };

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { supabase, user: null, barber: null, subscription: null, demo: false };

  const { data: barber } = await supabase
    .from("barber_profiles")
    .select("*")
    .or(`owner_user_id.eq.${user.id},assigned_user_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("owner_user_id", barber?.owner_user_id || user.id)
    .maybeSingle();

  return { supabase, user, barber, subscription, demo: false };
}

export function hasActiveSubscription(subscription: Record<string, unknown> | null | undefined) {
  if (!subscription) return false;
  const status = String(subscription.status || "");
  if (["active", "trialing"].includes(status)) return true;
  if (status === "past_due") {
    const end = subscription.current_period_end ? new Date(String(subscription.current_period_end)).getTime() : 0;
    return end > Date.now();
  }
  return false;
}
