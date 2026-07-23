import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/config";

export function createAdminSupabaseClient() {
  const url = getSupabaseUrl();
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
