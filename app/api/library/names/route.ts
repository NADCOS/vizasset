import { getLibraryCards, versionedLibraryResponse } from "@/lib/library";

// Every model's id, title, category and photo: about a tenth of /api/library, for the header
// search suggestions and the gallery's full category lists.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request) {
  return versionedLibraryResponse(req, getLibraryCards);
}
