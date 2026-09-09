"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { bundles } from "@/lib/bundles";
import { listThumbs, ThumbFile } from "@/lib/thumbs";

function BundleGallery({ slug, name }: { slug: string; name: string }) {
  const [thumbs, setThumbs] = useState<ThumbFile[]>([]);

  useEffect(() => {
    listThumbs(slug).then(setThumbs);
  }, [slug]);

  if (thumbs.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-base-200">{name} <span className="text-sm font-normal text-base-400">({thumbs.length} models shown)</span></h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {thumbs.map((t) => (
          <div key={t.path} className="relative aspect-square overflow-hidden rounded-lg bg-base-800">
            <Image src={t.url} alt={`${name} preview ${t.index}`} fill className="object-cover" sizes="200px" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-base-950 px-6 py-12 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div>
          <Link href="/" className="text-sm text-accent no-underline hover:text-accent-dim">← Back to VizAssets</Link>
          <span className="mt-4 block text-sm font-semibold uppercase tracking-wide text-accent">Gallery</span>
          <h1 className="mt-1 text-2xl font-semibold text-base-200 md:text-3xl">Every model in the bundle</h1>
          <p className="mt-2 max-w-xl text-sm text-base-400">
            A full look at what&apos;s included — the catalog page only shows a rotating sample.
          </p>
        </div>
        {bundles.map((b) => (
          <BundleGallery key={b.slug} slug={b.slug} name={b.name} />
        ))}
      </div>
    </main>
  );
}
