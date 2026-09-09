import { supabase, PREVIEWS_BUCKET } from "@/lib/supabaseClient";
import { previewUrl } from "@/lib/bundles";

export interface ThumbFile {
  index: number;
  path: string;
  url: string;
}

// Lists uploaded thumb-N files for a bundle, sorted numerically.
export async function listThumbs(slug: string): Promise<ThumbFile[]> {
  const { data, error } = await supabase.storage.from(PREVIEWS_BUCKET).list(`bundles/${slug}`);
  if (error || !data) return [];
  const indices = data
    .map((f) => f.name.match(/^thumb-(\d+)$/))
    .filter(Boolean)
    .map((m) => parseInt((m as RegExpMatchArray)[1], 10))
    .sort((a, b) => a - b);
  return indices.map((index) => {
    const path = `bundles/${slug}/thumb-${index}`;
    return { index, path, url: previewUrl(path) };
  });
}
