import { supabase } from "@/lib/supabaseClient";
import { previewUrl } from "@/lib/bundles";

// Read-only queries with the public anon key. Writes go through /api/admin (lib/adminApi.ts).

export interface PreviewImage {
  id: string;
  slug: string;
  path: string;
  category: string;
  sort_order: number;
  url: string;
}

export async function listImages(slug: string): Promise<PreviewImage[]> {
  const all: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("preview_images")
      .select("*")
      .eq("slug", slug)
      .order("sort_order", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all.map((r: any) => ({ ...r, url: previewUrl(r.path) }));
}

export async function countImages(slug: string): Promise<number> {
  const { count, error } = await supabase
    .from("preview_images")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug);
  if (error || count == null) return 0;
  return count;
}
