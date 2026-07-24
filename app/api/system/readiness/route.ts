import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const [{ data: services }, { data: connection }] = admin ? await Promise.all([
    admin.from("services").select("id").eq("barber_id", ctx.barber.id).eq("active", true).limit(1),
    admin.from("payment_connections").select("charges_enabled").eq("barber_id", ctx.barber.id).eq("provider", "stripe").maybeSingle(),
  ]) : [{ data: [] }, { data: null }];
  const profileReady = Boolean(ctx.barber.display_name && ctx.barber.shop_name && ctx.barber.slug);
  const mediaReady = Boolean(ctx.barber.profile_image_url || ctx.barber.cover_image_url || ctx.barber.logo_image_url);
  const servicesReady = Boolean(services?.length);
  const hoursReady = Boolean(ctx.barber.availability || ctx.barber.weekly_availability);
  const paymentsReady = Boolean(connection?.charges_enabled);
  const subscriptionReady = ["active","trialing"].includes(String(ctx.subscription?.status || ""));
  const checks = [
    { id:"profile", label:"Business profile", ready:profileReady, note:"Your barber name, studio name and booking link", href:"/dashboard/storefront", action:"Review storefront" },
    { id:"photos", label:"Photos and branding", ready:mediaReady, note:"Portrait, cover, logo and work images", href:"/dashboard/media", action:"Manage photos" },
    { id:"services", label:"Services and prices", ready:servicesReady, note:"At least one service customers can choose", href:"/dashboard/services", action:"Manage services" },
    { id:"hours", label:"Booking availability", ready:hoursReady, note:"The days and times customers can book", href:"/dashboard/settings", action:"Set availability" },
    { id:"payments", label:"Customer payments", ready:paymentsReady, note:"Stripe deposits paid directly to your connected account", href:"/dashboard/connections", action:"Review payments" },
    { id:"subscription", label:"CutFlow membership", ready:subscriptionReady, note:"Your free trial or monthly plan", href:"/dashboard/subscription", action:"Review plan" },
    { id:"communication", label:"Confirmations and reminders", ready:true, note:"Managed by CutFlow; choose your customer preferences in Booking policies", href:"/dashboard/policies", action:"Choose preferences" },
    { id:"app", label:"Home Screen app", ready:true, note:"Install CutFlow on a supported phone for quick access" },
  ];
  return NextResponse.json({ checks, ready: checks.filter(i=>!i.optional).every(i=>i.ready) });
}
