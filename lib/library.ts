import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import type { LibraryCard } from "@/lib/models";

// Server-side reads of the search library (table library_items). The table has no public
// policies, so only the service-role client can read it.
export const LIBRARY_TABLE = "library_items";

export interface LibraryRow {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  preview_url: string;
  preview_path: string | null;
  /** null until a Drive link is added; such models are hidden from the site. */
  download_url: string | null;
  embedding: string;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 1000;

/**
 * Reads every row, PAGE_SIZE at a time (Supabase caps a response at 1000 rows). Pages continue
 * after the last id seen rather than at an offset: with offsets, a model added or deleted while
 * a read is in progress shifts the rows and one at a page boundary gets skipped.
 */
export async function readAllRows<T extends { id: string }>(
  columns: string,
  { withLinkOnly = false } = {}
): Promise<T[]> {
  const rows: T[] = [];
  let lastId: string | null = null;
  for (;;) {
    let query = supabaseAdmin.from(LIBRARY_TABLE).select(columns).order("id").limit(PAGE_SIZE);
    if (withLinkOnly) query = query.not("download_url", "is", null);
    if (lastId !== null) query = query.gt("id", lastId);
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as unknown as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    lastId = page[page.length - 1].id;
  }
}

/** Changes whenever an item is added, edited or deleted; null if the table can't be read. */
export async function getLibraryVersion(): Promise<string | null> {
  const [{ count, error: countErr }, { data, error: latestErr }] = await Promise.all([
    supabaseAdmin.from(LIBRARY_TABLE).select("id", { count: "exact", head: true }),
    supabaseAdmin.from(LIBRARY_TABLE).select("updated_at").order("updated_at", { ascending: false }).limit(1),
  ]);
  if (countErr || latestErr || count == null) return null;
  const latest = data?.[0]?.updated_at ? Date.parse(data[0].updated_at) : 0;
  return `${count}.${latest}`;
}

/**
 * Every model customers can get (has a Drive link) for the gallery and home page, by title;
 * empty when Supabase isn't configured or reachable.
 */
export async function getLibraryCards(): Promise<LibraryCard[]> {
  try {
    const rows = await readAllRows<Pick<LibraryRow, "id" | "title" | "category" | "subcategory" | "preview_url">>(
      "id,title,category,subcategory,preview_url",
      { withLinkOnly: true }
    );
    return rows
      .map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        ...(r.subcategory ? { subcategory: r.subcategory } : {}),
        previewUrl: r.preview_url,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch (err) {
    console.error("[library] Could not load models:", err);
    return [];
  }
}

/**
 * The newest models added through /admin (imported ones all share the import date, so they
 * don't count as "new"). Empty when there are none yet.
 */
export async function getRecentUploads(limit = 8): Promise<(LibraryCard & { createdAt: string })[]> {
  const { data, error } = await supabaseAdmin
    .from(LIBRARY_TABLE)
    .select("id,title,category,preview_url,created_at")
    .not("download_url", "is", null)
    .not("preview_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[library] Could not load recent models:", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    previewUrl: r.preview_url,
    createdAt: r.created_at,
  }));
}

/**
 * Serves a library snapshot from Vercel's CDN. The bare URL redirects to ?v=<version>; each
 * versioned URL never changes, so it's cached for a year, and any edit in /admin produces a
 * new version (picked up within ~30s, the redirect's cache time).
 */
export async function versionedLibraryResponse(req: Request, load: () => Promise<unknown[]>): Promise<Response> {
  const json = (body: unknown, cacheControl: string) =>
    new Response(JSON.stringify(body), { headers: { "content-type": "application/json", "cache-control": cacheControl } });
  if (!supabaseAdminConfigured) return json([], "no-store");
  const version = await getLibraryVersion();
  // Table missing or empty: the search page falls back to the static index.
  if (!version || version.startsWith("0.")) return json([], "no-store");

  const url = new URL(req.url);
  if (url.searchParams.get("v") !== version) {
    const target = new URL(url.pathname, url.origin);
    target.searchParams.set("v", version);
    return new Response(null, {
      status: 307,
      headers: { location: target.toString(), "cache-control": "public, max-age=0, s-maxage=30" },
    });
  }

  const body = await load();
  // Only cache a snapshot if nothing changed while it was being read; otherwise this copy
  // could be stored for a year under a version it doesn't match.
  const stable = (await getLibraryVersion()) === version;
  return json(body, stable ? "public, max-age=31536000, s-maxage=31536000, immutable" : "no-store");
}

/**
 * Builds the CDN copies of the current library right away, so the first customer after an
 * edit doesn't wait for the rebuild. Fetches the versioned URLs directly: the bare URLs'
 * redirect may still point at the old version for up to 30s.
 */
export async function warmLibraryCache(origin: string) {
  const version = await getLibraryVersion();
  if (!version) return;
  await Promise.all(
    ["/api/library", "/api/library/names"].map((path) =>
      fetch(`${origin}${path}?v=${encodeURIComponent(version)}`).then((res) => res.arrayBuffer())
    )
  ).catch((err) => console.error("[library] Cache warm-up failed:", err));
}

/** Every model with a Drive link, in the shape the search page uses. */
export async function getLibraryItems() {
  const rows = await readAllRows<
    Pick<LibraryRow, "id" | "title" | "category" | "subcategory" | "preview_url" | "download_url" | "embedding">
  >("id,title,category,subcategory,preview_url,download_url,embedding", { withLinkOnly: true });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    subcategory: r.subcategory ?? undefined,
    previewUrl: r.preview_url,
    downloadUrl: r.download_url,
    embedding: r.embedding,
  }));
}
