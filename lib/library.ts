import { supabaseAdmin } from "@/lib/supabaseAdmin";
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
  download_url: string;
  embedding: string;
  created_at: string;
  updated_at: string;
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

/** Every model for the gallery and home page; empty when Supabase isn't configured or reachable. */
export async function getLibraryCards(): Promise<LibraryCard[]> {
  const cards: LibraryCard[] = [];
  const pageSize = 1000;
  try {
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from(LIBRARY_TABLE)
        .select("id,title,category,preview_url")
        .order("title")
        .order("id")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      cards.push(...(data ?? []).map((r) => ({ id: r.id, title: r.title, category: r.category, previewUrl: r.preview_url })));
      if (!data || data.length < pageSize) break;
    }
  } catch (err) {
    console.error("[library] Could not load models:", err);
    return [];
  }
  return cards;
}

/** Every item in the shape the search page uses. */
export async function getLibraryItems() {
  const rows: Pick<LibraryRow, "id" | "title" | "category" | "subcategory" | "preview_url" | "download_url" | "embedding">[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from(LIBRARY_TABLE)
      .select("id,title,category,subcategory,preview_url,download_url,embedding")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
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
