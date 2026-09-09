import { supabase, PREVIEWS_BUCKET } from "@/lib/supabaseClient";
import { previewUrl } from "@/lib/bundles";

export interface ThumbFile {
  index: number;
  path: string;
  url: string;
}

// Lists uploaded thumb-N files for a bundle, sorted numerically.
// Supabase Storage's list() caps at 100 per call, so page through it.
export async function listThumbs(slug: string): Promise<ThumbFile[]> {
  const all: { name: string }[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(PREVIEWS_BUCKET)
      .list(`bundles/${slug}`, { limit: pageSize, offset });
    if (error || !data) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  const indices = all
    .map((f) => f.name.match(/^thumb-(\d+)$/))
    .filter(Boolean)
    .map((m) => parseInt((m as RegExpMatchArray)[1], 10))
    .sort((a, b) => a - b);
  return indices.map((index) => {
    const path = `bundles/${slug}/thumb-${index}`;
    return { index, path, url: previewUrl(path) };
  });
}
