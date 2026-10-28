"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PreviewImage } from "@/lib/previewImages";

// Rendering thousands of tiles at once is slow, so "All" shows a preview row per category
// and a single category shows a page at a time.
const PREVIEW_PER_CATEGORY = 12;
const PAGE_SIZE = 60;

// Only the fields the tiles use, to keep the page payload small.
export type GalleryImage = Pick<PreviewImage, "id" | "category" | "sort_order" | "url">;

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-accent bg-accent/15 text-accent" : "border-base-700 text-base-400 hover:border-base-600"}`;

function Tile({ img }: { img: GalleryImage }) {
  return (
    // Opens the image search with this picture, where the matching model's Drive link is.
    <a
      href={`/search?imageUrl=${encodeURIComponent(img.url)}`}
      title="Find this model"
      className="group relative block aspect-square overflow-hidden rounded-lg bg-base-800 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Image
        src={img.url}
        alt={`${img.category} 3D model preview`}
        fill
        loading="lazy"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 45vw, 180px"
      />
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-base-950/85 py-2 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <Search className="h-3.5 w-3.5" />
        Find this model
      </span>
    </a>
  );
}

export default function GalleryView({ images }: { images: GalleryImage[] }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const byCategory = useMemo(() => {
    const map = new Map<string, GalleryImage[]>();
    for (const img of images) {
      const list = map.get(img.category) ?? [];
      list.push(img);
      map.set(img.category, list);
    }
    map.forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order));
    return map;
  }, [images]);

  const allCategories = useMemo(() => Array.from(byCategory.keys()).sort(), [byCategory]);
  const filteredCategories = useMemo(
    () => allCategories.filter((c) => c.toLowerCase().includes(search.toLowerCase())),
    [allCategories, search]
  );

  useEffect(() => {
    if (activeCategory !== "All" && !filteredCategories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [filteredCategories, activeCategory]);

  function choose(category: string) {
    setActiveCategory(category);
    setVisibleCount(PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const single = activeCategory === "All" ? null : byCategory.get(activeCategory) ?? [];

  return (
    <>
      <div className="flex flex-col gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categoriesâ€¦"
          aria-label="Search categories"
          className="w-full max-w-xs rounded-lg border border-base-700 bg-base-900 px-4 py-2 text-sm text-base-200 outline-none focus:border-accent"
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => choose("All")} className={chip(activeCategory === "All")}>
            All ({images.length.toLocaleString()})
          </button>
          {filteredCategories.map((c) => (
            <button key={c} onClick={() => choose(c)} className={chip(activeCategory === c)}>
              {c}
            </button>
          ))}
          {filteredCategories.length === 0 && (
            <span className="text-xs text-base-500">No categories match &quot;{search}&quot;</span>
          )}
        </div>
      </div>

      {images.length === 0 && (
        <p className="rounded-lg border border-base-700 bg-base-900 px-4 py-6 text-center text-sm text-base-400">
          No preview images yet.
        </p>
      )}

      {single ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-base-200">
            {activeCategory} <span className="text-sm font-normal text-base-400">({single.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {single.slice(0, visibleCount).map((img) => (
              <Tile key={img.id} img={img} />
            ))}
          </div>
          {single.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="mx-auto rounded-lg border border-base-600 px-6 py-2.5 text-sm font-semibold text-base-200 hover:border-accent hover:text-accent"
            >
              Show more ({(single.length - visibleCount).toLocaleString()} left)
            </button>
          )}
        </section>
      ) : (
        filteredCategories.map((cat) => {
          const imgs = byCategory.get(cat) ?? [];
          return (
            <section key={cat} className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold text-base-200">
                  {cat} <span className="text-sm font-normal text-base-400">({imgs.length})</span>
                </h2>
                {imgs.length > PREVIEW_PER_CATEGORY && (
                  <button onClick={() => choose(cat)} className="text-sm font-medium text-accent hover:text-accent-dim">
                    See all {imgs.length.toLocaleString()} â†’
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {imgs.slice(0, PREVIEW_PER_CATEGORY).map((img) => (
                  <Tile key={img.id} img={img} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
