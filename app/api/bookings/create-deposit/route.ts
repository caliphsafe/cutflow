import { NextResponse } from "next/server";
import { validateBookingWindow } from "@/lib/booking-time";
import { demoBarber, products as demoProducts, services as demoServices } from "@/lib/demo-data";
import { createProviderCheckout, getPaymentConnection } from "@/lib/payments";
import { randomToken, hashToken } from "@/lib/security/encryption";
import { appUrl } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function bookingCode() {
  return `BK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function POST(request: Request) {
  let createdBookingId: string | null = null;
  try {
    const body = await request.json();
    const { barberSlug, serviceId, selectedDate, selectedTime, customer, haircutRequest, productIds = [] } = body;

    if (!barberSlug || !serviceId || !selectedDate || !selectedTime || !customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json({ error: "Complete the customer, service, date and time before checkout." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || !/^\d{2}:\d{2}$/.test(selectedTime)) {
      return NextResponse.json({ error: "Choose a valid appointment date and time." }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const code = bookingCode();
    const portalToken = randomToken();
    const manageUrl = `${appUrl()}/manage/${portalToken}`;

    let barber: Record<string, any> = {
      id: demoBarber.id,
      display_name: demoBarber.displayName,
      stripe_account_id: null,
      timezone: "America/New_York",
      slug: demoBarber.slug,
      booking_deposit_cents: 1000,
      primary_payment_provider: "stripe",
      owner_user_id: "demo",
      storefront_published: true,
    };
    let service = demoServices.find((item) => item.id === serviceId);
    let selectedProducts = demoProducts.filter((item) => productIds.includes(item.id));
    let policy: Record<string, any> = { minimum_notice_minutes: 0, max_advance_days: 60 };

    if (admin) {
      const { data: liveBarber, error: barberError } = await admin
        .from("barber_profiles")
        .select("id,display_name,timezone,slug,booking_deposit_cents,primary_payment_provider,owner_user_id,storefront_published,accepting_bookings")
        .eq("slug", barberSlug)
        .eq("active", true)
        .single();
      if (barberError || !liveBarber || !liveBarber.accepting_bookings || !liveBarber.storefront_published) {
        return NextResponse.json({ error: "This barber is not currently accepting public bookings." }, { status: 404 });
      }
      barber = liveBarber;

      const { data: subscription } = await admin.from("subscriptions").select("status,trial_ends_at,current_period_end").eq("owner_user_id", barber.owner_user_id).maybeSingle();
      const status = subscription?.status || "";
      const trialValid = status === "trialing" && (!subscription?.trial_ends_at || new Date(subscription.trial_ends_at).getTime() > Date.now());
      const active = status === "active" || trialValid || (status === "past_due" && subscription?.current_period_end && new Date(subscription.current_period_end).getTime() > Date.now());
      if (!active) return NextResponse.json({ error: "Online booking is temporarily unavailable. Contact the barber directly." }, { status: 403 });

      const { data: policyRow } = await admin.from("booking_policies").select("*").eq("barber_id", barber.id).maybeSingle();
      policy = policyRow || policy;
      const windowCheck = validateBookingWindow({ date: selectedDate, time: selectedTime, timezone: barber.timezone, policy });
      if (!windowCheck.valid) return NextResponse.json({ error: windowCheck.reason }, { status: 400 });

      const { data: liveService, error: serviceError } = await admin.from("services").select("id,name,price_cents,duration_minutes,active").eq("id", serviceId).eq("barber_id", barber.id).eq("active", true).single();
      if (serviceError || !liveService) return NextResponse.json({ error: "That service is no longer available." }, { status: 400 });
      service = { id: liveService.id, name: liveService.name, description: "", durationMinutes: liveService.duration_minutes, priceCents: liveService.price_cents, category: "Service", active: true };

      if (productIds.length) {
        const { data: liveProducts } = await admin.from("products").select("id,name,description,price_cents,inventory_quantity,texture_tags,service_tags,active").eq("barber_id", barber.id).in("id", productIds).eq("active", true).gt("inventory_quantity", 0);
        selectedProducts = (liveProducts || []).map((item) => ({ id: item.id, name: item.name, description: item.description || "", priceCents: item.price_cents, inventory: item.inventory_quantity, textureTags: item.texture_tags || [], serviceTags: item.service_tags || [], pickupOnly: true, active: item.active }));
      }
    }

    if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });
    const depositCents = Math.max(0, Number(barber.booking_deposit_cents || 1000));
    const productTotalCents = selectedProducts.reduce((sum, item) => sum + item.priceCents, 0);
    const totalCents = service.priceCents + productTotalCents;
    const balanceCents = Math.max(0, totalCents - depositCents);
    let bookingId = code;

    const provider = "stripe" as const;

    if (admin) {
      const connection = await getPaymentConnection(barber.id, provider);
      if (!connection?.charges_enabled) return NextResponse.json({ error: "Stripe checkout is not currently ready for this barber. Please contact the barber directly." }, { status: 400 });

      const { data: client, error: clientError } = await admin.from("clients").upsert({
        barber_id: barber.id,
        full_name: customer.name,
        email: customer.email.toLowerCase(),
        phone: customer.phone,
        phone_normalized: normalizePhone(customer.phone),
        hair_texture: haircutRequest?.texture || null,
        preferred_style: haircutRequest?.desiredStyle || null,
        hair_density: haircutRequest?.density || null,
        scalp_sensitivity: haircutRequest?.sensitivity || null,
        last_haircut_request: haircutRequest || {},
        sms_consent: Boolean(customer.smsConsent),
        updated_at: new Date().toISOString(),
      }, { onConflict: "barber_id,email" }).select("id").single();
      if (clientError) throw clientError;

      const { data: booking, error: bookingError } = await admin.from("bookings").insert({
        barber_id: barber.id,
        client_id: client.id,
        service_id: service.id,
        booking_code: code,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        timezone: barber.timezone,
        duration_minutes: service.durationMinutes,
        status: "pending_deposit",
        payment_status: "deposit_due",
        payment_provider: provider,
        service_total_cents: service.priceCents,
        product_total_cents: productTotalCents,
        total_cents: totalCents,
        deposit_cents: depositCents,
        balance_cents: balanceCents,
        haircut_request: haircutRequest || {},
        product_ids: productIds,
        customer_name: customer.name,
        customer_email: customer.email.toLowerCase(),
        customer_phone: customer.phone,
        deposit_expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
      }).select("id").single();
      if (bookingError) {
        if (bookingError.code === "23P01") return NextResponse.json({ error: "That time was just reserved by another client. Choose another opening." }, { status: 409 });
        throw bookingError;
      }
      bookingId = booking.id;
      createdBookingId = booking.id;

      await admin.from("customer_portal_tokens").insert({ booking_id: booking.id, token_hash: hashToken(portalToken) });
      if (selectedProducts.length) {
        const { error: reservationError } = await admin.from("product_reservations").insert(selectedProducts.map((product) => ({ booking_id: booking.id, product_id: product.id, quantity: 1, unit_price_cents: product.priceCents, status: "reserved" })));
        if (reservationError) throw new Error("A pickup product just sold out. Remove it or choose another product.");
      }

      const idempotencyKey = `${booking.id}-${provider}-deposit`;
      const { data: paymentSession, error: sessionError } = await admin.from("payment_sessions").insert({
        barber_id: barber.id,
        client_id: client.id,
        booking_id: booking.id,
        provider,
        purpose: "deposit",
        amount_cents: depositCents,
        status: "created",
        idempotency_key: idempotencyKey,
        expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
        metadata: { manage_url: manageUrl, portal_token: portalToken, customer_email: customer.email, success_url: `${appUrl()}/booking/success?booking=${encodeURIComponent(code)}&provider=${provider}&portal_token=${encodeURIComponent(portalToken)}` },
      }).select("id").single();
      if (sessionError) throw sessionError;

      const result = await createProviderCheckout(provider, connection, {
        barberId: barber.id,
        bookingId: booking.id,
        paymentSessionId: paymentSession.id,
        bookingCode: code,
        barberName: barber.display_name,
        barberSlug: barber.slug,
        customerEmail: customer.email,
        customerName: customer.name,
        serviceName: service.name,
        amountCents: depositCents,
        purpose: "deposit",
        portalToken,
        successUrl: `${appUrl()}/booking/success?booking=${encodeURIComponent(code)}&provider=${provider}&portal_token=${encodeURIComponent(portalToken)}${provider === "stripe" ? "&session_id={CHECKOUT_SESSION_ID}" : ""}`,
        cancelUrl: `${appUrl()}/book/${encodeURIComponent(barber.slug)}?cancelled=1`,
      });
      await admin.from("payment_sessions").update({ external_session_id: result.externalSessionId, external_order_id: result.externalOrderId || null, status: "pending" }).eq("id", paymentSession.id);
      await admin.from("bookings").update({ external_payment_session_id: result.externalSessionId, stripe_checkout_session_id: provider === "stripe" ? result.externalSessionId : null }).eq("id", booking.id);
      return NextResponse.json({ url: result.url, provider });
    }

    return NextResponse.json({ url: `${appUrl()}/booking/success?booking=${encodeURIComponent(code)}&demo=1&portal_token=${portalToken}`, demo: true });
  } catch (error) {
    console.error("create-deposit", error);
    if (createdBookingId) {
      const admin = createAdminSupabaseClient();
      if (admin) await admin.from("bookings").delete().eq("id", createdBookingId);
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "The secure deposit checkout could not be created." }, { status: 500 });
  }
}
