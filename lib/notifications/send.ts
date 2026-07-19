import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function emailHtml(template: string, data: Record<string, unknown>) {
  const shop = String(data.shop_name || "Your barber");
  const date = String(data.appointment_date || "");
  const time = String(data.appointment_time || "");
  const manageUrl = String(data.manage_url || "");
  const title = template === "new_booking_alert" ? "New CutFlow booking" : template === "customer_reminder_24h" ? "Your appointment is tomorrow" : "Your appointment is confirmed";
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f4f1;padding:32px;color:#111"><div style="max-width:600px;margin:auto;background:white;border-radius:18px;padding:30px"><h1 style="margin-top:0">${title}</h1><p><strong>${shop}</strong></p><p>${date}${time ? ` at ${time}` : ""}</p>${manageUrl ? `<p><a href="${manageUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:13px 18px;border-radius:999px">Manage appointment</a></p>` : ""}<p style="color:#666;font-size:13px">Sent securely through CutFlow.</p></div></body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) throw new Error("Resend is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || "Email delivery failed.");
  return String(payload.id || "");
}

export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) throw new Error("Twilio is not configured.");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || "SMS delivery failed.");
  return String(payload.sid || "");
}

export async function processQueuedNotifications(limit = 25, bookingId?: string) {
  const admin = createAdminSupabaseClient();
  if (!admin) return { processed: 0, sent: 0, failed: 0 };
  let query = admin
    .from("notification_log")
    .select("*,bookings(*,barber_profiles(shop_name,display_name))")
    .eq("status", "queued")
    .order("created_at")
    .limit(limit);
  if (bookingId) query = query.eq("booking_id", bookingId);
  const { data: rows } = await query;

  let sent = 0;
  let failed = 0;
  for (const row of rows || []) {
    try {
      const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
      const barber = Array.isArray(booking?.barber_profiles) ? booking.barber_profiles[0] : booking?.barber_profiles;
      let manageUrl = row.manage_url || "";
      if (!manageUrl && booking?.id) {
        const { data: session } = await admin.from("payment_sessions").select("metadata").eq("booking_id", booking.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        manageUrl = String(session?.metadata?.manage_url || "");
      }
      const data = {
        shop_name: barber?.shop_name || barber?.display_name || "Your barber",
        appointment_date: booking?.appointment_date || "",
        appointment_time: booking?.appointment_time || "",
        manage_url: manageUrl,
      };
      let providerId = "";
      if (row.channel === "email") {
        const subject = row.template_code === "new_booking_alert" ? `New booking: ${booking?.customer_name || "Customer"}` : row.template_code === "customer_reminder_24h" ? "Your haircut appointment is tomorrow" : "Your haircut appointment is confirmed";
        providerId = await sendEmail(row.destination, subject, emailHtml(row.template_code, data));
      } else if (row.channel === "sms") {
        providerId = await sendSms(row.destination, `${data.shop_name}: ${row.template_code === "customer_reminder_24h" ? "Reminder" : "Booking confirmed"} for ${data.appointment_date} at ${data.appointment_time}. ${data.manage_url}`.trim());
      } else {
        throw new Error("Unsupported notification channel.");
      }
      await admin.from("notification_log").update({ status: "sent", provider_id: providerId, sent_at: new Date().toISOString(), error_message: null }).eq("id", row.id);
      sent += 1;
    } catch (error) {
      const attempts = Number(row.attempt_count || 0) + 1;
      await admin.from("notification_log").update({ status: attempts >= 3 ? "failed" : "queued", attempt_count: attempts, error_message: error instanceof Error ? error.message : "Delivery failed" }).eq("id", row.id);
      failed += 1;
    }
  }
  return { processed: (rows || []).length, sent, failed };
}
