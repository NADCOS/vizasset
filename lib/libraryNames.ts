import { LIBRARY_NAMES_URL, LibraryCard } from "@/lib/models";

// Browser-side: the light list of every model, fetched once per page and shared by the
// header suggestions and the gallery. A failed fetch is forgotten so the next call retries.
let pending: Promise<LibraryCard[]> | null = null;

export function loadLibraryNames(): Promise<LibraryCard[]> {
  if (!pending) {
    pending = fetch(LIBRARY_NAMES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load models (${res.status})`);
        return res.json() as Promise<LibraryCard[]>;
      })
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}
