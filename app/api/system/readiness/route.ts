import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const [{ data: services }, { data: connections }, { data: externalPaymentMethods }] = admin
    ? await Promise.all([
        admin
          .from("services")
          .select("id")
          .eq("barber_id", ctx.barber.id)
          .eq("active", true)
          .limit(1),
        admin
          .from("payment_connections")
          .select("id")
          .eq("barber_id", ctx.barber.id)
          .eq("status", "connected")
          .eq("charges_enabled", true),
        admin
          .from("external_payment_methods")
          .select("id")
          .eq("barber_id", ctx.barber.id)
          .eq("enabled", true),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const profileReady = Boolean(
    ctx.barber.display_name && ctx.barber.shop_name && ctx.barber.slug,
  );
  const mediaReady = Boolean(
    ctx.barber.profile_image_url ||
      ctx.barber.logo_image_url,
  );
  const servicesReady = Boolean(services?.length);
  const hoursReady = Boolean(
    ctx.barber.availability || ctx.barber.weekly_availability,
  );
  const paymentsReady = Boolean(connections?.length || externalPaymentMethods?.length);
  const subscriptionReady = ["active", "trialing"].includes(
    String(ctx.subscription?.status || ""),
  );

  const checks = [
    {
      id: "profile",
      label: "Business profile",
      ready: profileReady,
      note: "Your barber name, studio name and booking link",
      href: "/dashboard/storefront",
      action: "Review storefront",
    },
    {
      id: "photos",
      label: "Photos and branding",
      ready: mediaReady,
      note: "A barber portrait or brand logo. Other storefront photos are optional.",
      href: "/dashboard/media",
      action: "Manage photos",
    },
    {
      id: "services",
      label: "Services and prices",
      ready: servicesReady,
      note: "At least one service customers can choose",
      href: "/dashboard/services",
      action: "Manage services",
    },
    {
      id: "hours",
      label: "Booking availability",
      ready: hoursReady,
      note: "The days and times customers can book",
      href: "/dashboard/settings",
      action: "Set availability",
    },
    {
      id: "payments",
      label: "Customer payments",
      ready: paymentsReady,
      note: "Enable Cash App or Venmo, or connect a card processor.",
      href: "/dashboard/connections",
      action: "Review payments",
    },
    {
      id: "subscription",
      label: "CutFlow membership",
      ready: subscriptionReady,
      note: "Your free trial or monthly plan",
      href: "/dashboard/subscription",
      action: "Review plan",
    },
    {
      id: "communication",
      label: "Confirmations and reminders",
      ready: true,
      note: "Managed by CutFlow; choose your customer preferences in Booking policies",
      href: "/dashboard/policies",
      action: "Choose preferences",
    },
    {
      id: "app",
      label: "Home Screen app",
      ready: true,
      note: "Install CutFlow on a supported phone for quick access",
    },
  ];

  return NextResponse.json({
    checks,
    ready: checks.every((item) => item.ready),
  });
}
