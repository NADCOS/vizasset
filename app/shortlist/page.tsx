import type { Metadata } from "next";
import Link from "next/link";
import ShortlistView from "@/components/ShortlistView";
import { bundles } from "@/lib/bundles";
import { buildMessengerLink } from "@/lib/messenger";

export const metadata: Metadata = {
  title: "Shortlist — VizAssets",
  description: "A shortlist of 3D models from the VizAssets bundle.",
  // Each list is just a set of ids in the URL; nothing worth indexing.
  robots: { index: false, follow: true },
};

export default function ShortlistPage() {
  const featured = bundles[0];
  return (
    <main className="min-h-screen bg-base-950 px-6 py-12 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div>
          <Link href="/" className="text-sm text-accent no-underline hover:text-accent-dim">← Back to VizAssets</Link>
          <span className="mt-4 block text-sm font-semibold uppercase tracking-wide text-accent">Shortlist</span>
          <h1 className="mt-1 text-2xl font-semibold text-base-200 md:text-3xl">Shortlisted models</h1>
          <p className="mt-2 max-w-xl text-sm text-base-400">
            Every model here is included in the {featured.name} bundle for {featured.priceLabel}.
          </p>
        </div>
        <ShortlistView buy={{ href: buildMessengerLink(featured), priceLabel: featured.priceLabel }} />
      </div>
    </main>
  );
}
