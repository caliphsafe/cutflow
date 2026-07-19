import { NextResponse } from "next/server";
import { processQueuedNotifications } from "@/lib/notifications/send";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cutflow-cron-secret");
  return authorization === `Bearer ${secret}` || headerSecret === secret;
}

async function run(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const result = await processQueuedNotifications(50);
  return NextResponse.json({ ok: true, ...result });
}

export const GET = run;
export const POST = run;
