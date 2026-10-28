import { createClient } from "@supabase/supabase-js";

// Service-role client for /api/admin only. It bypasses row-level security, so the key
// must never reach the browser: keep the env var without a NEXT_PUBLIC_ prefix and never
// import this file from a client component.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdminConfigured = Boolean(url && serviceKey);
export const supabaseAdmin = createClient(url || "https://placeholder.supabase.co", serviceKey || "placeholder", {
  auth: { persistSession: false },
});
