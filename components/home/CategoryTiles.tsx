import Link from "next/link";
import Reveal from "@/components/Reveal";
import { categoryGalleryUrl } from "@/lib/models";

export interface CategorySummary {
  name: string;
  count: number;
  previewUrl: string;
}

export default function CategoryTiles({ categories, total }: { categories: CategorySummary[]; total: number }) {
  if (categories.length === 0) return null;
  return (
    <Reveal as="section" className="mx-auto max-w-7xl px-6 pb-16 sm:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-sm font-semibold uppercase tracking-wide text-accent">What&apos;s inside</span>
          <h2 className="mt-2 text-2xl font-semibold text-base-200 sm:text-3xl">Browse by category</h2>
        </div>
        <Link href="/gallery" className="text-sm font-medium text-accent no-underline hover:text-accent-dim">
          All {total.toLocaleString()} models →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.name}
            href={categoryGalleryUrl(c.name)}
            className="group relative block aspect-[4/5] overflow-hidden rounded-xl2 bg-base-800 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.previewUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base-950 via-base-950/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-base font-semibold text-base-200">{c.name}</p>
              <p className="text-xs text-base-400">{c.count.toLocaleString()} models</p>
            </div>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}
