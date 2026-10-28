// Shared by server and browser code (lib/library.ts is server-only).

/** A model as shown on the home page and in the gallery (no link or embedding). */
export interface LibraryCard {
  id: string;
  title: string;
  category: string;
  previewUrl: string;
}

/** Search page link that opens one model, followed by visually similar ones. */
export function modelSearchUrl(id: string) {
  return `/search?id=${encodeURIComponent(id)}`;
}
