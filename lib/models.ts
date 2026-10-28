// Shared by server and browser code (lib/library.ts is server-only).

/** A model as shown on the home page and in the gallery (no link or embedding). */
export interface LibraryCard {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  previewUrl: string;
}

/**
 * A ~20 KB thumbnail of a model photo, for grids and lists (the full photo is for quick view).
 * Imported photos (/previews/x.jpg) have /thumbs/x.jpg.webp, made by `npm run thumbs`; photos
 * uploaded in /admin have "<path>-t" next to them in Storage. Use <Thumb>, which falls back to
 * the full photo if a thumbnail is missing.
 */
export function thumbUrl(previewUrl: string): string {
  if (previewUrl.startsWith("/previews/")) return `/thumbs/${previewUrl.slice("/previews/".length)}.webp`;
  if (/\/storage\/v1\/object\/public\/previews\/library\/[0-9a-f-]{36}$/.test(previewUrl)) return `${previewUrl}-t`;
  return previewUrl;
}

/** Gallery link that opens one category. */
export function categoryGalleryUrl(category: string) {
  return `/gallery?category=${encodeURIComponent(category)}`;
}

/** Light list of every model (no links or embeddings), for header suggestions and the gallery. */
export const LIBRARY_NAMES_URL = "/api/library/names";

/** Search page link that opens one model, followed by visually similar ones. */
export function modelSearchUrl(id: string) {
  return `/search?id=${encodeURIComponent(id)}`;
}
