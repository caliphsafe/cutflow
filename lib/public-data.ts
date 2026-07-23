import { demoBarber, products as demoProducts, services as demoServices } from "./demo-data";
import type { Barber, PaymentOption, Product, Service } from "./types";
import { createAdminSupabaseClient } from "./supabase/admin";
import { createServerSupabaseClient } from "./supabase/server";
import { paymentProviderDetails } from "./payments/config";

export type PublicBarberData = { barber: Barber; services: Service[]; products: Product[]; demo: boolean };

export async function getPublicBarber(slug: string): Promise<PublicBarberData | null> {
  const admin = createAdminSupabaseClient();
  const supabase = admin || await createServerSupabaseClient();
  if (!supabase) {
    const demoPaymentOptions: PaymentOption[] = [{ provider: "stripe", label: "Card, Apple Pay or Cash App Pay", methods: ["Cards", "Apple Pay", "Google Pay", "Cash App Pay"] }];
    return slug === demoBarber.slug ? { barber: { ...demoBarber, depositCents: 1000, primaryPaymentProvider: "stripe", paymentOptions: demoPaymentOptions }, services: demoServices, products: demoProducts, demo: true } : null;
  }

  const { data: profile } = await supabase
    .from("barber_profiles")
    .select("id,slug,display_name,shop_name,headline,bio,address,city,phone,email,accent_color,booking_deposit_cents,stripe_account_id,accepting_bookings,storefront_published,primary_payment_provider,owner_user_id,profile_image_url,cover_image_url,shop_image_url,logo_image_url,gallery_image_urls")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (profile && admin) {
    const { data: subscription } = await admin.from("subscriptions").select("status,trial_ends_at,current_period_end").eq("owner_user_id", profile.owner_user_id).maybeSingle();
    const status = subscription?.status || "";
    const trialValid = status === "trialing" && (!subscription?.trial_ends_at || new Date(subscription.trial_ends_at).getTime() > Date.now());
    const activeSubscription = status === "active" || trialValid || (status === "past_due" && subscription?.current_period_end && new Date(subscription.current_period_end).getTime() > Date.now());
    if (!activeSubscription) return null;
  }

  if (!profile || profile.storefront_published === false) {
    if (slug === demoBarber.slug) {
      return { barber: { ...demoBarber, depositCents: 1000, primaryPaymentProvider: "stripe", paymentOptions: [{ provider: "stripe", label: "Card, Apple Pay or Cash App Pay", methods: ["Cards", "Apple Pay", "Google Pay", "Cash App Pay"] }] }, services: demoServices, products: demoProducts, demo: true };
    }
    return null;
  }

  const [{ data: serviceRows }, { data: productRows }, { data: connectionRows }] = await Promise.all([
    supabase.from("services").select("id,name,description,duration_minutes,price_cents,category,active,image_url").eq("barber_id", profile.id).eq("active", true).order("sort_order"),
    supabase.from("products").select("id,name,description,price_cents,inventory_quantity,texture_tags,service_tags,pickup_only,active,image_url").eq("barber_id", profile.id).eq("active", true).order("sort_order"),
    admin
      ? admin.from("payment_connections").select("provider,status,charges_enabled").eq("barber_id", profile.id).eq("status", "connected").eq("charges_enabled", true)
      : Promise.resolve({ data: [] as Array<{ provider: string; status: string; charges_enabled: boolean }> }),
  ]);

  const paymentOptions: PaymentOption[] = (connectionRows || []).filter((row) => row.provider === "stripe").map((row) => {
    const provider = row.provider as PaymentOption["provider"];
    const details = paymentProviderDetails[provider];
    return { provider, label: details.label, methods: details.customerMethods };
  });

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
    depositCents: profile.booking_deposit_cents,
    primaryPaymentProvider: profile.primary_payment_provider,
    paymentOptions,
    profileImageUrl: profile.profile_image_url || "",
    coverImageUrl: profile.cover_image_url || "",
    shopImageUrl: profile.shop_image_url || "",
    logoImageUrl: profile.logo_image_url || "",
    galleryImageUrls: profile.gallery_image_urls || [],
  };

  const services: Service[] = (serviceRows || []).map((row) => ({ id: row.id, name: row.name, description: row.description, durationMinutes: row.duration_minutes, priceCents: row.price_cents, category: row.category, active: row.active, imageUrl: row.image_url || "" }));
  const products: Product[] = (productRows || []).map((row) => ({ id: row.id, name: row.name, description: row.description, priceCents: row.price_cents, inventory: row.inventory_quantity, textureTags: row.texture_tags || [], serviceTags: row.service_tags || [], pickupOnly: row.pickup_only, active: row.active, imageUrl: row.image_url || "" }));

  return { barber, services, products, demo: false };
}
