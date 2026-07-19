import { NextResponse } from "next/server";
import { bookings as demoBookings, customers as demoClients, demoBarber, products as demoProducts, services as demoServices, transactions as demoTransactions, availability as demoAvailability } from "@/lib/demo-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const phoneDigits = (value: string) => String(value || "").replace(/\D/g, "");

function demoPayload(resource: string) {
  const values: Record<string, unknown> = {
    profile: demoBarber,
    services: demoServices,
    products: demoProducts,
    clients: demoClients,
    bookings: demoBookings,
    transactions: demoTransactions,
    availability: demoAvailability,
  };
  return { data: values[resource] ?? null, demo: true };
}

async function context() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { supabase: null, barber: null, demo: true };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { supabase, barber: null, demo: false };
  const { data: barber } = await supabase
    .from("barber_profiles")
    .select("*")
    .or(`owner_user_id.eq.${auth.user.id},assigned_user_id.eq.${auth.user.id}`)
    .limit(1)
    .maybeSingle();
  return { supabase, barber, demo: false };
}

async function readResource(resource: string) {
  const ctx = await context();
  if (ctx.demo) return demoPayload(resource);
  if (!ctx.supabase || !ctx.barber) throw new Error("UNAUTHORIZED");
  const { supabase, barber } = ctx;

  if (resource === "subscription") {
    const { data, error } = await supabase.from("subscriptions").select("plan_code,status,trial_ends_at,current_period_end,stripe_customer_id,stripe_subscription_id").eq("owner_user_id", barber.owner_user_id).maybeSingle();
    if (error) throw error;
    return { data: data ? {
      planCode: data.plan_code,
      status: data.status,
      trialEndsAt: data.trial_ends_at,
      currentPeriodEnd: data.current_period_end,
      hasBillingCustomer: Boolean(data.stripe_customer_id),
      hasSubscription: Boolean(data.stripe_subscription_id),
    } : null, demo: false };
  }

  if (resource === "setup") {
    const [{ count: servicesCount }, { count: availabilityCount }, { count: connectionsCount }, { data: subscription }] = await Promise.all([
      supabase.from("services").select("id", { count: "exact", head: true }).eq("barber_id", barber.id).eq("active", true),
      supabase.from("availability_rules").select("id", { count: "exact", head: true }).eq("barber_id", barber.id).eq("active", true),
      supabase.from("payment_connections").select("id", { count: "exact", head: true }).eq("barber_id", barber.id).eq("status", "connected").eq("charges_enabled", true),
      supabase.from("subscriptions").select("status,trial_ends_at,current_period_end").eq("owner_user_id", barber.owner_user_id).maybeSingle(),
    ]);
    const status = subscription?.status || "";
    const subscriptionReady = status === "active" || (status === "trialing" && (!subscription?.trial_ends_at || new Date(subscription.trial_ends_at).getTime() > Date.now())) || (status === "past_due" && Boolean(subscription?.current_period_end) && new Date(subscription!.current_period_end!).getTime() > Date.now());
    const steps = {
      profile: Boolean(barber.display_name && barber.slug && barber.email),
      media: Boolean(barber.profile_image_url && (barber.cover_image_url || barber.shop_image_url)),
      services: Number(servicesCount || 0) > 0,
      availability: Number(availabilityCount || 0) > 0,
      payments: Number(connectionsCount || 0) > 0,
      subscription: subscriptionReady,
    };
    return { data: { steps, ready: Object.values(steps).every(Boolean), published: Boolean(barber.storefront_published) }, demo: false };
  }

  if (resource === "profile") {
    return { data: {
      id: barber.id,
      slug: barber.slug,
      displayName: barber.display_name,
      shopName: barber.shop_name,
      headline: barber.headline,
      bio: barber.bio,
      address: barber.address,
      city: barber.city,
      phone: barber.phone,
      email: barber.email,
      accent: barber.accent_color,
      stripeConnected: Boolean(barber.stripe_account_id),
      acceptingBookings: barber.accepting_bookings,
      timezone: barber.timezone,
      depositCents: barber.booking_deposit_cents,
      storefrontPublished: Boolean(barber.storefront_published),
      setupCompletedAt: barber.setup_completed_at,
      primaryPaymentProvider: barber.primary_payment_provider,
      allowOnlineBalancePayment: barber.allow_online_balance_payment !== false,
      allowCashPayment: barber.allow_cash_payment !== false,
      profileImageUrl: barber.profile_image_url || "",
      coverImageUrl: barber.cover_image_url || "",
      shopImageUrl: barber.shop_image_url || "",
      logoImageUrl: barber.logo_image_url || "",
      galleryImageUrls: barber.gallery_image_urls || [],
    }, demo: false };
  }

  if (resource === "services") {
    const { data, error } = await supabase.from("services").select("*").eq("barber_id", barber.id).order("sort_order");
    if (error) throw error;
    return { data: (data || []).map((row) => ({ id: row.id, name: row.name, description: row.description, durationMinutes: row.duration_minutes, priceCents: row.price_cents, category: row.category, active: row.active, imageUrl: row.image_url || "" })), demo: false };
  }

  if (resource === "products") {
    const { data, error } = await supabase.from("products").select("*").eq("barber_id", barber.id).order("sort_order");
    if (error) throw error;
    return { data: (data || []).map((row) => ({ id: row.id, name: row.name, description: row.description, priceCents: row.price_cents, inventory: row.inventory_quantity, textureTags: row.texture_tags || [], serviceTags: row.service_tags || [], pickupOnly: row.pickup_only, active: row.active, imageUrl: row.image_url || "" })), demo: false };
  }

  if (resource === "clients") {
    const { data, error } = await supabase.from("clients").select("*").eq("barber_id", barber.id).order("updated_at", { ascending: false });
    if (error) throw error;
    return { data: (data || []).map((row) => ({
      id: row.id,
      name: row.full_name,
      email: row.email,
      phone: row.phone,
      joinedAt: row.created_at,
      visits: row.visit_count,
      lifetimeValueCents: row.lifetime_value_cents,
      lastVisit: row.last_visit_at || row.created_at,
      texture: row.hair_texture || "Not set",
      preferredStyle: row.preferred_style || "Not set",
      allergies: row.allergies || "None noted",
      notes: row.private_notes || "",
      lastRequest: row.last_haircut_request || {},
    })), demo: false };
  }

  if (resource === "bookings") {
    const { data, error } = await supabase.from("bookings").select("*,services(name)").eq("barber_id", barber.id).order("starts_at", { ascending: true });
    if (error) throw error;
    return { data: (data || []).map((row) => ({
      id: row.id,
      customerId: row.client_id || "",
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      serviceId: row.service_id,
      serviceName: Array.isArray(row.services) ? row.services[0]?.name : row.services?.name || "Service",
      startsAt: row.starts_at || `${row.appointment_date}T${row.appointment_time}`,
      endsAt: row.ends_at || `${row.appointment_date}T${row.appointment_time}`,
      status: row.status,
      totalCents: row.total_cents,
      depositCents: row.deposit_cents,
      balanceCents: row.balance_cents,
      paymentStatus: row.payment_status,
      haircutRequest: row.haircut_request || {},
      productIds: row.product_ids || [],
      notes: row.barber_notes || "",
    })), demo: false };
  }

  if (resource === "transactions") {
    const { data, error } = await supabase.from("transactions").select("*,clients(full_name)").eq("barber_id", barber.id).order("occurred_at", { ascending: false });
    if (error) throw error;
    return { data: (data || []).map((row) => ({
      id: row.id,
      bookingId: row.booking_id || undefined,
      customerName: Array.isArray(row.clients) ? row.clients[0]?.full_name : row.clients?.full_name || row.description || "Walk-in",
      date: row.occurred_at,
      type: row.type,
      grossCents: row.gross_cents,
      taxCents: row.tax_cents,
      processorFeeCents: row.processor_fee_cents,
      netCents: row.net_cents,
      method: row.payment_method_label || "Recorded payment",
      status: row.status,
    })), demo: false };
  }

  if (resource === "availability") {
    const { data, error } = await supabase.from("availability_rules").select("weekday,start_time,end_time,active").eq("barber_id", barber.id).order("weekday");
    if (error) throw error;
    return { data: data || [], demo: false };
  }

  return { data: null, demo: false };
}

export async function GET(request: Request) {
  try {
    const resource = new URL(request.url).searchParams.get("resource") || "profile";
    return NextResponse.json(await readResource(resource));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    console.error("dashboard-read", error);
    return NextResponse.json({ error: "Could not load dashboard data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resource = String(body.resource || "");
    const ctx = await context();
    if (ctx.demo) return NextResponse.json({ ...demoPayload(resource), saved: true });
    if (!ctx.supabase || !ctx.barber) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { supabase, barber } = ctx;

    if (resource === "client") {
      const item = body.item || {};
      const { error } = await supabase.from("clients").insert({
        barber_id: barber.id,
        full_name: item.name,
        email: String(item.email || "").trim().toLowerCase(),
        phone: item.phone || "",
        phone_normalized: phoneDigits(item.phone),
        hair_texture: item.texture || null,
        preferred_style: item.preferredStyle || null,
        private_notes: item.notes || "",
        last_haircut_request: item.lastRequest || {},
      });
      if (error) throw error;
      return NextResponse.json(await readResource("clients"));
    }

    if (resource === "services") {
      const items = Array.isArray(body.items) ? body.items : [];
      const { data: existing } = await supabase.from("services").select("id").eq("barber_id", barber.id);
      const keptIds = items.map((item: { id?: string }) => item.id).filter((id: string) => uuidPattern.test(id));
      const omitted = (existing || []).map((item) => item.id).filter((id) => !keptIds.includes(id));
      if (omitted.length) await supabase.from("services").update({ active: false }).eq("barber_id", barber.id).in("id", omitted);
      for (const [index, item] of items.entries()) {
        const values = { barber_id: barber.id, name: item.name, description: item.description || "", duration_minutes: Number(item.durationMinutes) || 45, price_cents: Number(item.priceCents) || 0, category: item.category || "Haircut", image_url: item.imageUrl || "", active: item.active !== false, sort_order: index };
        if (uuidPattern.test(item.id || "")) await supabase.from("services").update(values).eq("id", item.id).eq("barber_id", barber.id);
        else await supabase.from("services").insert(values);
      }
      return NextResponse.json(await readResource("services"));
    }

    if (resource === "products") {
      const items = Array.isArray(body.items) ? body.items : [];
      const { data: existing } = await supabase.from("products").select("id").eq("barber_id", barber.id);
      const keptIds = items.map((item: { id?: string }) => item.id).filter((id: string) => uuidPattern.test(id));
      const omitted = (existing || []).map((item) => item.id).filter((id) => !keptIds.includes(id));
      if (omitted.length) await supabase.from("products").update({ active: false }).eq("barber_id", barber.id).in("id", omitted);
      for (const [index, item] of items.entries()) {
        const validServiceTags = (item.serviceTags || []).filter((id: string) => uuidPattern.test(id));
        const values = { barber_id: barber.id, name: item.name, description: item.description || "", price_cents: Number(item.priceCents) || 0, inventory_quantity: Number(item.inventory) || 0, texture_tags: item.textureTags || ["all"], service_tags: validServiceTags, image_url: item.imageUrl || "", pickup_only: true, active: item.active !== false, sort_order: index };
        if (uuidPattern.test(item.id || "")) await supabase.from("products").update(values).eq("id", item.id).eq("barber_id", barber.id);
        else await supabase.from("products").insert(values);
      }
      return NextResponse.json(await readResource("products"));
    }

    if (resource === "profile") {
      const item = body.item || {};
      const requestedSlug = String(item.slug ?? barber.slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (!requestedSlug || requestedSlug.length < 3) return NextResponse.json({ error: "Booking URL must contain at least 3 letters or numbers." }, { status: 400 });
      let publish = item.storefrontPublished ?? barber.storefront_published;
      let setupCompletedAt = barber.setup_completed_at;
      if (publish) {
        const [{ count: servicesCount }, { count: availabilityCount }, { count: connectionsCount }, { data: subscription }] = await Promise.all([
          supabase.from("services").select("id", { count: "exact", head: true }).eq("barber_id", barber.id).eq("active", true),
          supabase.from("availability_rules").select("id", { count: "exact", head: true }).eq("barber_id", barber.id).eq("active", true),
          supabase.from("payment_connections").select("id", { count: "exact", head: true }).eq("barber_id", barber.id).eq("status", "connected").eq("charges_enabled", true),
          supabase.from("subscriptions").select("status,trial_ends_at,current_period_end").eq("owner_user_id", barber.owner_user_id).maybeSingle(),
        ]);
        const subscriptionStatus = subscription?.status || "";
        const subscriptionReady = subscriptionStatus === "active" || (subscriptionStatus === "trialing" && (!subscription?.trial_ends_at || new Date(subscription.trial_ends_at).getTime() > Date.now())) || (subscriptionStatus === "past_due" && Boolean(subscription?.current_period_end) && new Date(subscription!.current_period_end!).getTime() > Date.now());
        if (!barber.profile_image_url || !(barber.cover_image_url || barber.shop_image_url) || !servicesCount || !availabilityCount || !connectionsCount || !subscriptionReady) {
          return NextResponse.json({ error: "Complete photos, services, availability, subscription and a payment connection before publishing." }, { status: 400 });
        }
        setupCompletedAt = setupCompletedAt || new Date().toISOString();
      }
      const { error } = await supabase.from("barber_profiles").update({
        slug: requestedSlug,
        display_name: item.displayName ?? barber.display_name,
        shop_name: item.shopName ?? barber.shop_name,
        headline: item.headline ?? barber.headline,
        bio: item.bio ?? barber.bio,
        phone: item.phone ?? barber.phone,
        address: item.address ?? barber.address,
        city: item.city ?? barber.city,
        timezone: item.timezone ?? barber.timezone,
        accent_color: item.accent ?? barber.accent_color,
        accepting_bookings: item.acceptingBookings ?? barber.accepting_bookings,
        booking_deposit_cents: Math.max(50, Number(item.depositCents ?? barber.booking_deposit_cents ?? 1000)),
        storefront_published: Boolean(publish),
        setup_completed_at: setupCompletedAt,
        allow_online_balance_payment: item.allowOnlineBalancePayment ?? barber.allow_online_balance_payment,
        allow_cash_payment: item.allowCashPayment ?? barber.allow_cash_payment,
        profile_image_url: item.profileImageUrl ?? barber.profile_image_url ?? "",
        cover_image_url: item.coverImageUrl ?? barber.cover_image_url ?? "",
        shop_image_url: item.shopImageUrl ?? barber.shop_image_url ?? "",
        logo_image_url: item.logoImageUrl ?? barber.logo_image_url ?? "",
        gallery_image_urls: Array.isArray(item.galleryImageUrls) ? item.galleryImageUrls.filter(Boolean).slice(0, 8) : (barber.gallery_image_urls || []),
      }).eq("id", barber.id);
      if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "That booking URL is already in use." }, { status: 409 });
        throw error;
      }
      return NextResponse.json(await readResource("profile"));
    }

    if (resource === "availability") {
      const items = Array.isArray(body.items) ? body.items : [];
      const normalized = items
        .filter((item: { active?: boolean }) => item.active !== false)
        .map((item: { weekday: number; start_time?: string; startTime?: string; end_time?: string; endTime?: string }) => ({
          barber_id: barber.id,
          weekday: Number(item.weekday),
          start_time: item.start_time || item.startTime,
          end_time: item.end_time || item.endTime,
          active: true,
        }))
        .filter((item: { weekday: number; start_time?: string; end_time?: string }) => Number.isInteger(item.weekday) && item.weekday >= 0 && item.weekday <= 6 && Boolean(item.start_time) && Boolean(item.end_time));
      const { error: deleteError } = await supabase.from("availability_rules").delete().eq("barber_id", barber.id);
      if (deleteError) throw deleteError;
      if (normalized.length) {
        const { error: insertError } = await supabase.from("availability_rules").insert(normalized);
        if (insertError) throw insertError;
      }
      return NextResponse.json(await readResource("availability"));
    }

    if (resource === "booking") {
      const item = body.item || {};
      const { data: service, error: serviceError } = await supabase.from("services").select("id,name,duration_minutes,price_cents").eq("id", item.serviceId).eq("barber_id", barber.id).maybeSingle();
      if (serviceError || !service) return NextResponse.json({ error: "Choose a valid service." }, { status: 400 });
      const email = String(item.email || "").trim().toLowerCase();
      const { data: client, error: clientError } = await supabase.from("clients").upsert({
        barber_id: barber.id,
        full_name: item.name,
        email,
        phone: item.phone || "",
        phone_normalized: phoneDigits(item.phone),
        updated_at: new Date().toISOString(),
      }, { onConflict: "barber_id,email" }).select("id").single();
      if (clientError) throw clientError;
      const code = `BK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
      const { error } = await supabase.from("bookings").insert({
        barber_id: barber.id,
        client_id: client.id,
        service_id: service.id,
        booking_code: code,
        appointment_date: item.date,
        appointment_time: item.time,
        timezone: barber.timezone,
        duration_minutes: service.duration_minutes,
        status: "confirmed",
        payment_status: "deposit_due",
        service_total_cents: service.price_cents,
        product_total_cents: 0,
        total_cents: service.price_cents,
        deposit_cents: 1000,
        balance_cents: service.price_cents,
        haircut_request: item.haircutRequest || {},
        customer_name: item.name,
        customer_email: email,
        customer_phone: item.phone || "",
        customer_notes: "Manual booking created in dashboard",
        deposit_expires_at: new Date("2999-01-01T00:00:00.000Z").toISOString(),
      });
      if (error) {
        if (error.code === "23P01") return NextResponse.json({ error: "That time overlaps another active booking." }, { status: 409 });
        throw error;
      }
      return NextResponse.json(await readResource("bookings"));
    }

    if (resource === "booking_status") {
      const allowed = ["pending_deposit", "confirmed", "checked_in", "completed", "cancelled", "no_show"];
      if (!allowed.includes(body.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      const { error } = await supabase.from("bookings").update({ status: body.status }).eq("id", body.id).eq("barber_id", barber.id);
      if (error) throw error;
      return NextResponse.json({ saved: true });
    }

    if (resource === "transaction") {
      const item = body.item || {};
      const gross = Math.round(Number(item.amount || 0) * 100);
      const { error } = await supabase.from("transactions").insert({
        barber_id: barber.id,
        client_id: item.clientId || null,
        type: item.type || "cash",
        status: item.type === "refund" ? "refunded" : "paid",
        gross_cents: gross,
        refund_cents: item.type === "refund" ? gross : 0,
        net_cents: item.type === "refund" ? -gross : gross,
        processor_fee_cents: 0,
        platform_fee_cents: 0,
        provider: "manual",
        payment_method_type: String(item.method || "cash").toLowerCase().replaceAll(" ", "_"),
        payment_method_label: item.method || "Cash",
        description: item.note || item.customerName || "Manual transaction",
      });
      if (error) throw error;
      return NextResponse.json(await readResource("transactions"));
    }

    return NextResponse.json({ error: "Unsupported dashboard action." }, { status: 400 });
  } catch (error) {
    console.error("dashboard-write", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save dashboard data." }, { status: 500 });
  }
}
