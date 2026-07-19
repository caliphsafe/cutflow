import { NextResponse } from "next/server";
import { getAuthenticatedBarber } from "@/lib/auth/context";
import { isPaymentProvider } from "@/lib/payments/config";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { provider } = await request.json();
  if (!isPaymentProvider(provider)) return NextResponse.json({ error: "Choose a supported provider." }, { status: 400 });
  const ctx = await getAuthenticatedBarber();
  if (!ctx.user || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ primaryProvider: provider, demo: true });
  const { data: connection } = await admin.from("payment_connections").select("id,status,charges_enabled").eq("barber_id", ctx.barber.id).eq("provider", provider).maybeSingle();
  if (!connection || connection.status !== "connected" || !connection.charges_enabled) return NextResponse.json({ error: "That provider must be connected and ready before it can be primary." }, { status: 400 });
  await admin.from("barber_profiles").update({ primary_payment_provider: provider }).eq("id", ctx.barber.id);
  return NextResponse.json({ primaryProvider: provider });
}
