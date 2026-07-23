import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabasePublicConfigStatus,
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";

export function isSupabaseConfigured() {
  return getSupabasePublicConfigStatus().configured;
}

export async function createServerSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot always write cookies. Auth forms and
            // route handlers perform writes where supported.
          }
        },
      },
    },
  );
}
