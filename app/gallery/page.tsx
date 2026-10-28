import type { Metadata } from "next";
import Link from "next/link";
import GalleryView from "@/components/GalleryView";
import BackToTop from "@/components/BackToTop";
import { getLibraryCards } from "@/lib/library";

// Same caching as the home page: /api/admin refreshes it after every change.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Gallery — Every Model in the VizAssets Bundle",
  description: "Browse every 3ds Max model included in the VizAssets bundle, organized by category.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const models = await getLibraryCards();

  return (
    <main className="min-h-screen bg-base-950 px-6 py-12 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div>
          <Link href="/" className="text-sm text-accent no-underline hover:text-accent-dim">← Back to VizAssets</Link>
          <span className="mt-4 block text-sm font-semibold uppercase tracking-wide text-accent">Gallery</span>
          <h1 className="mt-1 text-2xl font-semibold text-base-200 md:text-3xl">Every model in the bundle</h1>
          <p className="mt-2 max-w-xl text-sm text-base-400">
            All {models.length > 0 ? models.length.toLocaleString() : ""} models included, organized by category. Click any
            model to see it with similar ones; buyers can open it straight from Google Drive.
          </p>
        </div>
        <GalleryView models={models} />
      </div>
      <BackToTop />
    </main>
  );
}
