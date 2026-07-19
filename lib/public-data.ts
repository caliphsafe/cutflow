import { demoBarber, products as demoProducts, services as demoServices } from "./demo-data";
import type { Barber, Product, Service } from "./types";
import { createServerSupabaseClient } from "./supabase/server";

export type PublicBarberData = { barber: Barber; services: Service[]; products: Product[]; demo: boolean };

export async function getPublicBarber(slug: string): Promise<PublicBarberData | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return slug === demoBarber.slug ? { barber: demoBarber, services: demoServices, products: demoProducts, demo: true } : null;
  }

  const { data: profile } = await supabase
    .from("barber_profiles")
    .select("id,slug,display_name,shop_name,headline,bio,address,city,phone,email,accent_color,booking_deposit_cents,stripe_account_id,accepting_bookings")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!profile) {
    return slug === demoBarber.slug ? { barber: demoBarber, services: demoServices, products: demoProducts, demo: true } : null;
  }

  const [{ data: serviceRows }, { data: productRows }] = await Promise.all([
    supabase.from("services").select("id,name,description,duration_minutes,price_cents,category,active").eq("barber_id", profile.id).eq("active", true).order("sort_order"),
    supabase.from("products").select("id,name,description,price_cents,inventory_quantity,texture_tags,service_tags,pickup_only,active").eq("barber_id", profile.id).eq("active", true).order("sort_order"),
  ]);

  const barber: Barber = {
    id: profile.id,
    slug: profile.slug,
    displayName: profile.display_name,
    shopName: profile.shop_name,
    headline: profile.headline,
    bio: profile.bio,
    address: profile.address,
    city: profile.city,
    phone: profile.phone,
    email: profile.email,
    accent: profile.accent_color,
    stripeConnected: Boolean(profile.stripe_account_id),
    acceptingBookings: profile.accepting_bookings,
  };

  const services: Service[] = (serviceRows || []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    priceCents: row.price_cents,
    category: row.category,
    active: row.active,
  }));
  const products: Product[] = (productRows || []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    inventory: row.inventory_quantity,
    textureTags: row.texture_tags || [],
    serviceTags: row.service_tags || [],
    pickupOnly: row.pickup_only,
    active: row.active,
  }));

  return { barber, services, products, demo: false };
}
