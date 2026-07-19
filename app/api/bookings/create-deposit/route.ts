import { NextResponse } from "next/server";
import { demoBarber, products as demoProducts, services as demoServices } from "@/lib/demo-data";
import { appUrl, getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function bookingCode() {
  return `BK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { barberSlug, serviceId, selectedDate, selectedTime, customer, haircutRequest, productIds = [] } = body;

    if (!barberSlug || !serviceId || !selectedDate || !selectedTime || !customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json({ error: "Complete the customer, service, date and time before checkout." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || !/^\d{2}:\d{2}$/.test(selectedTime)) {
      return NextResponse.json({ error: "Choose a valid appointment date and time." }, { status: 400 });
    }
    const appointmentStart = new Date(`${selectedDate}T${selectedTime}:00`);
    if (Number.isNaN(appointmentStart.getTime()) || appointmentStart.getTime() < Date.now()) {
      return NextResponse.json({ error: "That appointment time has already passed." }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const stripe = getStripe();
    const code = bookingCode();

    let barber: { id: string; display_name: string; stripe_account_id: string | null; timezone: string; slug: string } = {
      id: demoBarber.id,
      display_name: demoBarber.displayName,
      stripe_account_id: null,
      timezone: "America/New_York",
      slug: demoBarber.slug,
    };
    let service = demoServices.find((item) => item.id === serviceId);
    let selectedProducts = demoProducts.filter((item) => productIds.includes(item.id));

    if (admin) {
      const { data: liveBarber, error: barberError } = await admin
        .from("barber_profiles")
        .select("id, display_name, stripe_account_id, timezone, slug")
        .eq("slug", barberSlug)
        .eq("accepting_bookings", true)
        .single();
      if (barberError || !liveBarber) return NextResponse.json({ error: "This barber is not currently accepting bookings." }, { status: 404 });
      barber = liveBarber;

      const { data: liveService, error: serviceError } = await admin
        .from("services")
        .select("id, name, price_cents, duration_minutes, active")
        .eq("id", serviceId)
        .eq("barber_id", barber.id)
        .eq("active", true)
        .single();
      if (serviceError || !liveService) return NextResponse.json({ error: "That service is no longer available." }, { status: 400 });
      service = {
        id: liveService.id,
        name: liveService.name,
        description: "",
        durationMinutes: liveService.duration_minutes,
        priceCents: liveService.price_cents,
        category: "Service",
        active: true,
      };

      if (productIds.length) {
        const { data: liveProducts } = await admin
          .from("products")
          .select("id, name, description, price_cents, inventory_quantity, texture_tags, service_tags, active")
          .eq("barber_id", barber.id)
          .in("id", productIds)
          .eq("active", true)
          .gt("inventory_quantity", 0);
        selectedProducts = (liveProducts || []).map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          priceCents: item.price_cents,
          inventory: item.inventory_quantity,
          textureTags: item.texture_tags || [],
          serviceTags: item.service_tags || [],
          pickupOnly: true,
          active: item.active,
        }));
      }
    }

    if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

    const depositCents = 1000;
    const productTotalCents = selectedProducts.reduce((sum, item) => sum + item.priceCents, 0);
    const totalCents = service.priceCents + productTotalCents;
    const balanceCents = Math.max(0, totalCents - depositCents);
    let bookingId = code;

    if (admin) {
      const { data: client, error: clientError } = await admin
        .from("clients")
        .upsert({
          barber_id: barber.id,
          full_name: customer.name,
          email: customer.email.toLowerCase(),
          phone: customer.phone,
          phone_normalized: normalizePhone(customer.phone),
          hair_texture: haircutRequest?.texture || null,
          preferred_style: haircutRequest?.desiredStyle || null,
          last_haircut_request: haircutRequest || {},
          updated_at: new Date().toISOString(),
        }, { onConflict: "barber_id,email" })
        .select("id")
        .single();
      if (clientError) throw clientError;

      const { data: booking, error: bookingError } = await admin
        .from("bookings")
        .insert({
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
          deposit_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();
      if (bookingError) {
        if (bookingError.code === "23P01") {
          return NextResponse.json({ error: "That time was just reserved by another client. Choose another opening." }, { status: 409 });
        }
        throw bookingError;
      }
      bookingId = booking.id;

      if (selectedProducts.length) {
        const { error: reservationError } = await admin.from("product_reservations").insert(selectedProducts.map((product) => ({
          booking_id: booking.id,
          product_id: product.id,
          quantity: 1,
          unit_price_cents: product.priceCents,
          status: "reserved",
        })));
        if (reservationError) {
          await admin.from("bookings").delete().eq("id", booking.id);
          return NextResponse.json({ error: "A pickup product just sold out. Remove it or choose another product." }, { status: 409 });
        }
      }
    }

    if (!stripe || !barber.stripe_account_id) {
      return NextResponse.json({
        url: `${appUrl()}/booking/success?booking=${encodeURIComponent(code)}&demo=1`,
        demo: true,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customer.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: depositCents,
          product_data: {
            name: `${service.name} booking deposit`,
            description: `${selectedDate} at ${selectedTime} · Applied to the final appointment total`,
          },
        },
      }],
      payment_intent_data: {
        description: `${barber.display_name} booking deposit`,
        metadata: { booking_id: bookingId, booking_code: code, payment_kind: "deposit" },
      },
      metadata: { booking_id: bookingId, booking_code: code, payment_kind: "deposit" },
      success_url: `${appUrl()}/booking/success?booking=${encodeURIComponent(code)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/book/${encodeURIComponent(barber.slug)}?cancelled=1`,
    }, { stripeAccount: barber.stripe_account_id });

    if (admin) {
      await admin.from("bookings").update({ stripe_checkout_session_id: session.id }).eq("id", bookingId);
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("create-deposit", error);
    return NextResponse.json({ error: "The secure deposit checkout could not be created." }, { status: 500 });
  }
}
