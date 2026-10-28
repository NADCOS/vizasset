import { supabase, PREVIEWS_BUCKET } from "@/lib/supabaseClient";

// Browser-side wrappers for /api/admin. Every call carries the signed-in admin's Supabase session.

export interface LibraryItem {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  preview_url: string;
  download_url: string;
}

export interface LibraryPage {
  items: LibraryItem[];
  total: number;
  pageSize: number;
  categories?: [string, number][];
}

async function call<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Signed out — please sign in again");
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

/** Throws with the server's reason when the signed-in account can't use the admin. */
export async function verifyAdmin() {
  await call("verify");
}

async function uploadFile(body: Blob, kind: "hero" | "library", slug?: string) {
  const { path, token } = await call<{ path: string; token: string }>("signUpload", { slug, kind });
  const { error } = await supabase.storage.from(PREVIEWS_BUCKET).uploadToSignedUrl(path, token, body, {
    contentType: body.type,
    // The hero keeps one path and gets overwritten, so it must not be cached.
    cacheControl: kind === "hero" ? "0" : "31536000",
  });
  if (error) throw error;
  return path;
}

// ---- Bundle hero images ----

export async function uploadHero(slug: string, file: File) {
  await uploadFile(file, "hero", slug);
  // The home page caches its HTML; refresh it so the new hero shows up.
  await call("heroUploaded");
}

// ---- Search library ----

export function listLibrary(params: { q?: string; category?: string; offset?: number }) {
  return call<LibraryPage>("libraryList", params);
}

export interface LibraryFields {
  title: string;
  category: string;
  subcategory: string;
  downloadUrl: string;
}

/** A photo ready to save: the shrunk image and its encoded embedding. */
export interface PreparedPhoto {
  image: Blob;
  embedding: string;
}

export async function createLibraryItem(fields: LibraryFields, photo: PreparedPhoto) {
  const previewPath = await uploadFile(photo.image, "library");
  const { item } = await call<{ item: LibraryItem }>("libraryCreate", {
    ...fields,
    previewPath,
    embedding: photo.embedding,
  });
  return item;
}

export async function updateLibraryItem(id: string, fields: Partial<LibraryFields>, photo?: PreparedPhoto) {
  const payload: Record<string, unknown> = { id, ...fields };
  if (photo) {
    payload.previewPath = await uploadFile(photo.image, "library");
    payload.embedding = photo.embedding;
  }
  const { item } = await call<{ item: LibraryItem }>("libraryUpdate", payload);
  return item;
}

export async function deleteLibraryItem(id: string) {
  await call("libraryDelete", { id });
}
