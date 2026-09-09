"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { bundles } from "@/lib/bundles";
import { listImages, PreviewImage } from "@/lib/previewImages";
import BackToTop from "@/components/BackToTop";

export default function GalleryPage() {
  const [imagesBySlug, setImagesBySlug] = useState<Record<string, PreviewImage[]>>({});
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    bundles.forEach((b) => {
      listImages(b.slug).then((imgs) =>
        setImagesBySlug((prev) => ({ ...prev, [b.slug]: imgs }))
      );
    });
  }, []);

  const allImages = useMemo(() => Object.values(imagesBySlug).flat(), [imagesBySlug]);
  const allCategories = useMemo(
    () => Array.from(new Set(allImages.map((i) => i.category))).sort(),
    [allImages]
  );
  const filteredCategories = useMemo(
    () => allCategories.filter((c) => c.toLowerCase().includes(search.toLowerCase())),
    [allCategories, search]
  );

  useEffect(() => {
    if (activeCategory !== "All" && !filteredCategories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [filteredCategories, activeCategory]);

  const categoriesToShow = activeCategory === "All" ? filteredCategories : [activeCategory];

  return (
    <main className="min-h-screen bg-base-950 px-6 py-12 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div>
          <Link href="/" className="text-sm text-accent no-underline hover:text-accent-dim">← Back to VizAssets</Link>
          <span className="mt-4 block text-sm font-semibold uppercase tracking-wide text-accent">Gallery</span>
          <h1 className="mt-1 text-2xl font-semibold text-base-200 md:text-3xl">Every model in the bundle</h1>
          <p className="mt-2 max-w-xl text-sm text-base-400">
            A full look at what&apos;s included, organized by category — the catalog page only shows a rotating sample.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full max-w-xs rounded-lg border border-base-700 bg-base-900 px-4 py-2 text-sm text-base-200 outline-none focus:border-accent"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("All")}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${activeCategory === "All" ? "border-accent bg-accent/15 text-accent" : "border-base-700 text-base-400 hover:border-base-600"}`}
            >
              All
            </button>
            {filteredCategories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${activeCategory === c ? "border-accent bg-accent/15 text-accent" : "border-base-700 text-base-400 hover:border-base-600"}`}
              >
                {c}
              </button>
            ))}
            {filteredCategories.length === 0 && (
              <span className="text-xs text-base-500">No categories match &quot;{search}&quot;</span>
            )}
          </div>
        </div>

        {categoriesToShow.map((cat) => {
          const imgs = allImages.filter((i) => i.category === cat).sort((a, b) => a.sort_order - b.sort_order);
          if (imgs.length === 0) return null;
          return (
            <section key={cat} className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-base-200">
                {cat} <span className="text-sm font-normal text-base-400">({imgs.length})</span>
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {imgs.map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-base-800">
                    <Image src={img.url} alt={cat} fill loading="lazy" className="object-cover" sizes="(max-width: 640px) 45vw, 180px" />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <BackToTop />
    </main>
  );
}
