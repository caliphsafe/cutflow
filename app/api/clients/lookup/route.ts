import { NextResponse } from "next/server";
import { customers } from "@/lib/demo-data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const { barberSlug, email, phone } = await request.json();
    if (!barberSlug || !email || !phone) return NextResponse.json({ found: false });
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = normalizePhone(String(phone));

    const admin = createAdminSupabaseClient();
    if (!admin) {
      const match = customers.find((client) => client.email.toLowerCase() === normalizedEmail && normalizePhone(client.phone) === normalizedPhone);
      return NextResponse.json(match ? { found: true, client: { id: match.id, name: match.name, email: match.email, phone: match.phone, lastRequest: match.lastRequest } } : { found: false });
    }

    const { data: barber } = await admin.from("barber_profiles").select("id").eq("slug", barberSlug).eq("active", true).maybeSingle();
    if (!barber) return NextResponse.json({ found: false });
    const { data: client } = await admin
      .from("clients")
      .select("id,full_name,email,phone,last_haircut_request")
      .eq("barber_id", barber.id)
      .eq("email", normalizedEmail)
      .eq("phone_normalized", normalizedPhone)
      .maybeSingle();
    if (!client) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, client: { id: client.id, name: client.full_name, email: client.email, phone: client.phone, lastRequest: client.last_haircut_request || {} } });
  } catch {
    return NextResponse.json({ found: false });
  }
}
