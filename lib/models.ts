// Shared by server and browser code (lib/library.ts is server-only).

/** A model as shown on the home page and in the gallery (no link or embedding). */
export interface LibraryCard {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  previewUrl: string;
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
