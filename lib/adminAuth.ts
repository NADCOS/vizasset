import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Admins sign in with Supabase Auth (email + password). A valid session alone isn't enough:
// the account's email must also be listed in ADMIN_EMAILS (comma-separated).
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const adminAuthConfigured = ADMIN_EMAILS.length > 0;

/** The signed-in admin's email, or null when the request has no valid admin session. */
export async function getAdminEmail(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !ADMIN_EMAILS.includes(email)) return null;
  return email;
}
