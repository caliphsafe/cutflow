import { notFound, redirect } from "next/navigation";
import { PayPalCheckoutClient } from "@/components/payments/PayPalCheckoutClient";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function PayPalCheckoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const admin = createAdminSupabaseClient();
  if (!admin) notFound();
  const { data: session } = await admin.from("payment_sessions").select("*,bookings(booking_code,customer_name),barber_profiles(shop_name)").eq("id", sessionId).eq("provider", "paypal").maybeSingle();
  if (!session) notFound();
  if (session.status === "paid") redirect(String(session.metadata?.success_url || "/booking/success"));
  const booking = Array.isArray(session.bookings) ? session.bookings[0] : session.bookings;
  const barber = Array.isArray(session.barber_profiles) ? session.barber_profiles[0] : session.barber_profiles;
  const { data: connection } = await admin.from("payment_connections").select("external_merchant_id,status").eq("barber_id", session.barber_id).eq("provider", "paypal").maybeSingle();
  if (!connection?.external_merchant_id || connection.status !== "connected") notFound();
  const successUrl = String(session.metadata?.success_url || `/booking/success?booking=${booking?.booking_code || ""}`);
  return <PayPalCheckoutClient sessionId={session.id} clientId={process.env.PAYPAL_CLIENT_ID || ""} merchantId={connection.external_merchant_id} partnerAttributionId={process.env.PAYPAL_PARTNER_ATTRIBUTION_ID || ""} amountCents={session.amount_cents} shopName={barber?.shop_name || "CutFlow barber"} bookingCode={booking?.booking_code || ""} successUrl={successUrl} environment={process.env.PAYPAL_ENVIRONMENT === "live" ? "live" : "sandbox"}/>;
}
