import { NextResponse } from "next/server";
import { supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { getLibraryItems, getLibraryVersion } from "@/lib/library";

// The search library, served from Vercel's CDN. /api/library redirects to
// /api/library?v=<version>; each versioned URL never changes, so it's cached for a year, and
// any edit in /admin produces a new version (picked up within ~30s, the redirect's cache time).
export const dynamic = "force-dynamic";

const empty = () => NextResponse.json([], { headers: { "cache-control": "no-store" } });

export async function GET(req: Request) {
  if (!supabaseAdminConfigured) return empty();
  const version = await getLibraryVersion();
  // Table missing or empty: the search page falls back to the static index.
  if (!version || version.startsWith("0.")) return empty();

  const url = new URL(req.url);
  if (url.searchParams.get("v") !== version) {
    const target = new URL(url.pathname, url.origin);
    target.searchParams.set("v", version);
    return NextResponse.redirect(target, {
      status: 307,
      headers: { "cache-control": "public, max-age=0, s-maxage=30" },
    });
  }

  const items = await getLibraryItems();
  return NextResponse.json(items, {
    headers: { "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable" },
  });
}
