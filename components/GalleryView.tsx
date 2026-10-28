"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Maximize2 } from "lucide-react";
import { LibraryCard, modelSearchUrl } from "@/lib/models";
import { loadLibraryNames } from "@/lib/libraryNames";
import MessengerLink from "./MessengerLink";
import QuickView from "./QuickView";

const PAGE_SIZE = 60;

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-accent bg-accent/15 text-accent" : "border-base-700 text-base-400 hover:border-base-600"}`;

function Tile({ model, onOpen }: { model: LibraryCard; onOpen: (m: LibraryCard) => void }) {
  return (
    // A real link (works in a new tab and without scripts); a plain click opens the quick view.
    <a
      href={modelSearchUrl(model.id)}
      title={model.title}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onOpen(model);
      }}
      className="group relative block aspect-square overflow-hidden rounded-lg bg-base-800 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* Plain <img>: thousands of model photos would use up Vercel's image optimization quota. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={model.previewUrl}
        alt={model.title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 bg-base-950/85 px-2 py-2 text-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="line-clamp-2 text-xs font-medium text-base-200">{model.title}</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-accent">
          <Maximize2 className="h-3 w-3" /> Quick view
        </span>
      </span>
    </a>
  );
}

export default function GalleryView({
  preview,
  counts,
  total,
  buy,
  previewPerCategory,
}: {
  preview: LibraryCard[];
  counts: [string, number][];
  total: number;
  buy: { href: string; priceLabel: string };
  previewPerCategory: number;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [all, setAll] = useState<LibraryCard[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState<LibraryCard | null>(null);

  const countOf = useMemo(() => new Map(counts), [counts]);
  const previewByCategory = useMemo(() => {
    const map = new Map<string, LibraryCard[]>();
    for (const m of preview) map.set(m.category, [...(map.get(m.category) ?? []), m]);
    return map;
  }, [preview]);
  const fullByCategory = useMemo(() => {
    if (!all) return null;
    const map = new Map<string, LibraryCard[]>();
    for (const m of all) map.set(m.category, [...(map.get(m.category) ?? []), m]);
    return map;
  }, [all]);

  const filteredCategories = useMemo(
    () => counts.map(([c]) => c).filter((c) => c.toLowerCase().includes(search.toLowerCase())),
    [counts, search]
  );

  const loadAll = useCallback(() => {
    if (all) return;
    setLoadError(null);
    loadLibraryNames()
      .then(setAll)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load models"));
  }, [all]);

  const choose = useCallback(
    (category: string, scroll = true) => {
      setActiveCategory(category);
      setVisibleCount(PAGE_SIZE);
      if (category !== "All") loadAll();
      const url = new URL(window.location.href);
      if (category === "All") url.searchParams.delete("category");
      else url.searchParams.set("category", category);
      window.history.replaceState(null, "", url);
      if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [loadAll]
  );

  // Open a category linked from the home page (/gallery?category=...).
  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    if (category && countOf.has(category)) choose(category, false);
  }, [countOf, choose]);

  useEffect(() => {
    if (activeCategory !== "All" && !filteredCategories.includes(activeCategory)) choose("All", false);
  }, [filteredCategories, activeCategory, choose]);

  const single =
    activeCategory === "All"
      ? null
      : fullByCategory?.get(activeCategory) ?? previewByCategory.get(activeCategory) ?? [];
  const singleTotal = countOf.get(activeCategory) ?? 0;
  const singleLoading = single !== null && !fullByCategory && !loadError;

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
            All ({total.toLocaleString()})
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

      {total === 0 && (
        <p className="rounded-lg border border-base-700 bg-base-900 px-4 py-6 text-center text-sm text-base-400">
          No models yet.
        </p>
      )}

      {single ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-base-200">
            {activeCategory} <span className="text-sm font-normal text-base-400">({singleTotal})</span>
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {single.slice(0, visibleCount).map((m) => (
              <Tile key={m.id} model={m} onOpen={setOpen} />
            ))}
          </div>
          {singleLoading && singleTotal > single.length && (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-base-400" aria-label="Loading more models" />
          )}
          {loadError && (
            <p className="text-center text-sm text-red-400">
              {loadError}.{" "}
              <button onClick={loadAll} className="underline">
                Try again
              </button>
            </p>
          )}
          {!singleLoading && single.length > visibleCount && (
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
          const list = previewByCategory.get(cat) ?? [];
          const count = countOf.get(cat) ?? 0;
          return (
            <section key={cat} className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold text-base-200">
                  {cat} <span className="text-sm font-normal text-base-400">({count})</span>
                </h2>
                {count > previewPerCategory && (
                  <button onClick={() => choose(cat)} className="text-sm font-medium text-accent hover:text-accent-dim">
                    See all {count.toLocaleString()} →
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {list.map((m) => (
                  <Tile key={m.id} model={m} onOpen={setOpen} />
                ))}
              </div>
            </section>
          );
        })
      )}

      <QuickView
        open={open !== null}
        onClose={() => setOpen(null)}
        image={open?.previewUrl ?? ""}
        title={open?.title ?? ""}
        subtitle={open ? [open.category, open.subcategory].filter(Boolean).join(" · ") : undefined}
        actions={
          open && (
            <>
              <p className="text-sm text-base-400">
                One of the {total.toLocaleString()} models in the bundle. Buyers download it from Google Drive.
              </p>
              <MessengerLink
                href={buy.href}
                location="quick_view"
                className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-fg no-underline hover:bg-accent-dim hover:text-accent-fg"
              >
                Get the bundle — {buy.priceLabel}
              </MessengerLink>
              <a
                href={modelSearchUrl(open.id)}
                className="inline-flex items-center justify-center rounded-lg border border-base-600 px-5 py-2.5 text-sm font-medium text-base-200 no-underline hover:border-accent hover:text-accent"
              >
                Find similar models
              </a>
            </>
          )
        }
      />
    </>
  );
}
