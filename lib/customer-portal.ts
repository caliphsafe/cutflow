import { hashToken } from "@/lib/security/encryption";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getCustomerPortalBooking(token: string) {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;
  const { data: tokenRow } = await admin.from("customer_portal_tokens").select("id,booking_id,expires_at,revoked_at").eq("token_hash", hashToken(token)).maybeSingle();
  if (!tokenRow || tokenRow.revoked_at || new Date(tokenRow.expires_at).getTime() < Date.now()) return null;
  await admin.from("customer_portal_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);
  const { data: booking } = await admin.from("bookings").select("*,services(id,name,description,duration_minutes),barber_profiles(id,slug,display_name,shop_name,address,city,phone,email,timezone,primary_payment_provider),clients(last_haircut_request),product_reservations(quantity,unit_price_cents,status,products(name))").eq("id", tokenRow.booking_id).maybeSingle();
  if (!booking) return null;
  const { data: policy } = await admin.from("booking_policies").select("*").eq("barber_id", booking.barber_id).maybeSingle();
  const { data: payments } = await admin.from("transactions").select("id,type,status,gross_cents,refund_cents,payment_method_label,occurred_at").eq("booking_id", booking.id).order("occurred_at");
  const { data: connections } = await admin.from("payment_connections").select("provider,status,charges_enabled").eq("barber_id", booking.barber_id).eq("status", "connected").eq("charges_enabled", true);
  return { booking, policy, payments: payments || [], connections: connections || [] };
}
