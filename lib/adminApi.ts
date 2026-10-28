import { supabase, PREVIEWS_BUCKET } from "@/lib/supabaseClient";

// Browser-side wrappers for /api/admin. Every call carries the signed-in admin's Supabase session.

export interface LibraryItem {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  preview_url: string;
  /** null until a Drive link is added; the model is hidden from the site until then. */
  download_url: string | null;
}

export interface LibraryPage {
  items: LibraryItem[];
  total: number;
  /** Models without a Drive link, across the whole library. */
  missingCount: number;
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

// ---- Orders ----

export const ORDER_STATUSES = [
  { id: "pending", label: "Waiting for payment" },
  { id: "paid", label: "Paid — share Drive" },
  { id: "access_granted", label: "Access granted" },
  { id: "cancelled", label: "Cancelled" },
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number]["id"];

export interface Order {
  id: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  google_email: string;
  bundle_slug: string;
  amount: number;
  status: OrderStatus;
  gcash_reference: string | null;
  notes: string | null;
}

export interface OrderFields {
  customerName: string;
  googleEmail: string;
  bundleSlug: string;
  amount: string;
  status: OrderStatus;
  gcashReference: string;
  notes: string;
}

export function listOrders(params: { status?: OrderStatus; q?: string }) {
  return call<{ orders: Order[]; counts: Record<OrderStatus, number>; limit: number }>("ordersList", params);
}

export async function createOrder(fields: OrderFields) {
  const { order } = await call<{ order: Order }>("orderCreate", { ...fields });
  return order;
}

export async function updateOrder(id: string, fields: Partial<OrderFields>) {
  const { order } = await call<{ order: Order }>("orderUpdate", { id, ...fields });
  return order;
}

export async function deleteOrder(id: string) {
  await call("orderDelete", { id });
}

// ---- Search library ----

export function listLibrary(params: { q?: string; category?: string; missingLink?: boolean; offset?: number }) {
  return call<LibraryPage>("libraryList", params);
}

export interface LibraryFields {
  title: string;
  category: string;
  subcategory: string;
  downloadUrl: string;
}

/** A photo ready to save: the shrunk image, its small thumbnail and its encoded embedding. */
export interface PreparedPhoto {
  image: Blob;
  thumb: Blob;
  embedding: string;
}

/** Uploads the photo and its thumbnail ("<path>-t"); returns the photo's path. */
async function uploadPhoto(photo: PreparedPhoto) {
  const path = await uploadFile(photo.image, "library");
  try {
    const { path: thumbPath, token } = await call<{ path: string; token: string }>("signUpload", {
      kind: "libraryThumb",
      forPath: path,
    });
    await supabase.storage
      .from(PREVIEWS_BUCKET)
      .uploadToSignedUrl(thumbPath, token, photo.thumb, { contentType: photo.thumb.type, cacheControl: "31536000" });
  } catch {
    // Not fatal: the site falls back to the full photo when a thumbnail is missing.
  }
  return path;
}

export async function createLibraryItem(fields: LibraryFields, photo: PreparedPhoto) {
  const previewPath = await uploadPhoto(photo);
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
    payload.previewPath = await uploadPhoto(photo);
    payload.embedding = photo.embedding;
  }
  const { item } = await call<{ item: LibraryItem }>("libraryUpdate", payload);
  return item;
}

export async function deleteLibraryItem(id: string) {
  await call("libraryDelete", { id });
}
