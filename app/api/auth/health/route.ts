import { NextResponse } from "next/server";
import {
  getSupabasePublicConfigStatus,
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getSupabasePublicConfigStatus();
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!status.configured) {
    return NextResponse.json({ ok: false, ...status, reachable: false }, { status: 503 });
  }

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
    });

    return NextResponse.json({
      ok: response.ok,
      ...status,
      reachable: true,
      supabaseStatus: response.status,
    }, { status: response.ok ? 200 : 503 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      ...status,
      reachable: false,
      error: error instanceof Error ? error.message : "Unable to reach Supabase",
    }, { status: 503 });
  }
}
