"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LibraryCard, modelSearchUrl } from "@/lib/models";

// Rendering thousands of tiles at once is slow, so "All" shows a preview row per category
// and a single category shows a page at a time.
const PREVIEW_PER_CATEGORY = 12;
const PAGE_SIZE = 60;

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-accent bg-accent/15 text-accent" : "border-base-700 text-base-400 hover:border-base-600"}`;

function Tile({ model }: { model: LibraryCard }) {
  return (
    <a
      href={modelSearchUrl(model.id)}
      title={model.title}
      className="group relative block aspect-square overflow-hidden rounded-lg bg-base-800 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* Plain <img>: thousands of model photos would use up Vercel's image optimization quota. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={model.previewUrl}
        alt={model.title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 bg-base-950/85 px-2 py-2 text-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="line-clamp-2 text-xs font-medium text-base-200">{model.title}</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-accent">
          <Search className="h-3 w-3" /> View model
        </span>
      </span>
    </a>
  );
}

export default function GalleryView({ models }: { models: LibraryCard[] }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const byCategory = useMemo(() => {
    const map = new Map<string, LibraryCard[]>();
    for (const m of models) {
      const list = map.get(m.category) ?? [];
      list.push(m);
      map.set(m.category, list);
    }
    return map;
  }, [models]);

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
          placeholder="Search categories…"
          aria-label="Search categories"
          className="w-full max-w-xs rounded-lg border border-base-700 bg-base-900 px-4 py-2 text-sm text-base-200 outline-none focus:border-accent"
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => choose("All")} className={chip(activeCategory === "All")}>
            All ({models.length.toLocaleString()})
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

      {models.length === 0 && (
        <p className="rounded-lg border border-base-700 bg-base-900 px-4 py-6 text-center text-sm text-base-400">
          No models yet.
        </p>
      )}

      {single ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-base-200">
            {activeCategory} <span className="text-sm font-normal text-base-400">({single.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {single.slice(0, visibleCount).map((m) => (
              <Tile key={m.id} model={m} />
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
          const list = byCategory.get(cat) ?? [];
          return (
            <section key={cat} className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold text-base-200">
                  {cat} <span className="text-sm font-normal text-base-400">({list.length})</span>
                </h2>
                {list.length > PREVIEW_PER_CATEGORY && (
                  <button onClick={() => choose(cat)} className="text-sm font-medium text-accent hover:text-accent-dim">
                    See all {list.length.toLocaleString()} →
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {list.slice(0, PREVIEW_PER_CATEGORY).map((m) => (
                  <Tile key={m.id} model={m} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
