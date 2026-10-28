import { getLibraryItems, versionedLibraryResponse } from "@/lib/library";

// The full search library (with Drive links and image embeddings), served from Vercel's CDN.
export const dynamic = "force-dynamic";
// Reading every model with its embedding takes ~15s when not cached.
export const maxDuration = 60;

export function GET(req: Request) {
  return versionedLibraryResponse(req, getLibraryItems);
}
