import { supabase, PREVIEWS_BUCKET } from "@/lib/supabaseClient";
import { previewUrl } from "@/lib/bundles";

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

export async function uploadImage(slug: string, file: File, category: string, sortOrder: number) {
  const path = `bundles/${slug}/img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error: upErr } = await supabase.storage.from(PREVIEWS_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (upErr) return { error: upErr };
  const { error: dbErr } = await supabase
    .from("preview_images")
    .insert({ slug, path, category, sort_order: sortOrder });
  return { error: dbErr };
}

export async function updateCategory(id: string, category: string) {
  return supabase.from("preview_images").update({ category }).eq("id", id);
}

export async function reorderCategory(images: PreviewImage[]) {
  await Promise.all(
    images.map((img, i) => supabase.from("preview_images").update({ sort_order: i }).eq("id", img.id))
  );
}

export async function deleteImage(id: string, path: string) {
  await supabase.storage.from(PREVIEWS_BUCKET).remove([path]);
  return supabase.from("preview_images").delete().eq("id", id);
}
