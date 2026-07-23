"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabasePublicConfigStatus,
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";

export function isSupabaseConfigured() {
  return getSupabasePublicConfigStatus().configured;
}

export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  return createBrowserClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
  );
}
