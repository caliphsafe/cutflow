export function getSupabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
}

export function isValidSupabaseUrl(value = getSupabaseUrl()) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function isValidPublishableKey(value = getSupabasePublishableKey()) {
  return value.startsWith("sb_publishable_") || value.startsWith("eyJ");
}

export function getSupabasePublicConfigStatus() {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  return {
    configured: Boolean(url && key && isValidSupabaseUrl(url) && isValidPublishableKey(key)),
    hasUrl: Boolean(url),
    validUrl: isValidSupabaseUrl(url),
    hasPublishableKey: Boolean(key),
    validPublishableKey: isValidPublishableKey(key),
    keyType: key.startsWith("sb_publishable_")
      ? "publishable"
      : key.startsWith("eyJ")
        ? "legacy_anon"
        : key.startsWith("sb_secret_")
          ? "secret_key_not_allowed_in_browser"
          : key
            ? "unknown"
            : "missing",
  };
}
