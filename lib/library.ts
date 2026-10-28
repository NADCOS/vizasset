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

const PAGE_SIZE = 1000;

/**
 * Reads every row, PAGE_SIZE at a time (Supabase caps a response at 1000 rows). Pages continue
 * after the last id seen rather than at an offset: with offsets, a model added or deleted while
 * a read is in progress shifts the rows and one at a page boundary gets skipped.
 */
export async function readAllRows<T extends { id: string }>(columns: string): Promise<T[]> {
  const rows: T[] = [];
  let lastId: string | null = null;
  for (;;) {
    let query = supabaseAdmin.from(LIBRARY_TABLE).select(columns).order("id").limit(PAGE_SIZE);
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

/** Every model for the gallery and home page, by title; empty when Supabase isn't configured or reachable. */
export async function getLibraryCards(): Promise<LibraryCard[]> {
  try {
    const rows = await readAllRows<Pick<LibraryRow, "id" | "title" | "category" | "preview_url">>(
      "id,title,category,preview_url"
    );
    return rows
      .map((r) => ({ id: r.id, title: r.title, category: r.category, previewUrl: r.preview_url }))
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch (err) {
    console.error("[library] Could not load models:", err);
    return [];
  }
}

/** Every item in the shape the search page uses. */
export async function getLibraryItems() {
  const rows = await readAllRows<
    Pick<LibraryRow, "id" | "title" | "category" | "subcategory" | "preview_url" | "download_url" | "embedding">
  >("id,title,category,subcategory,preview_url,download_url,embedding");
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
