"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BundleData } from "@/lib/bundles";
import { buildMessengerLink } from "@/lib/messenger";
import { listImages, PreviewImage } from "@/lib/previewImages";

export default function BundleCard({ bundle }: { bundle: BundleData }) {
  const link = buildMessengerLink(bundle);
  const [thumbs, setThumbs] = useState<PreviewImage[]>([]);

  useEffect(() => {
    listImages(bundle.slug).then((all) => {
      if (all.length <= 8) {
        setThumbs(all);
        return;
      }
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      setThumbs(shuffled.slice(0, 8));
    });
  }, [bundle.slug]);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl2 border border-base-700 bg-base-900 shadow-card">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={bundle.heroImage}
          alt={bundle.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
        />
        <span className="absolute left-4 top-4 rounded-full bg-base-950/80 px-3 py-1 text-xs font-medium text-base-200 backdrop-blur">
          {bundle.format}
        </span>
        {bundle.badge && (
          <span className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-fg">
            {bundle.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-base-200">{bundle.name}</h3>
          <span className="flex items-baseline gap-2 whitespace-nowrap rounded-md bg-accent/10 px-2.5 py-1">
            {bundle.originalPriceLabel && (
              <span className="text-xs text-base-400 line-through">{bundle.originalPriceLabel}</span>
            )}
            <span className="text-sm font-semibold text-accent">{bundle.priceLabel}</span>
          </span>
        </div>

        <ul className="flex flex-col gap-1.5 text-sm text-base-400">
          {bundle.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
              {h}
            </li>
          ))}
        </ul>

        {thumbs.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {thumbs.map((t) => (
              <div key={t.id} className="relative aspect-square overflow-hidden rounded-md bg-base-800">
                <Image
                  src={t.url}
                  alt="Asset preview"
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 640px) 25vw, 110px"
                />
              </div>
            ))}
          </div>
        )}

        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center justify-center rounded-lg border border-base-600 py-2.5 text-sm font-medium text-base-200 no-underline hover:border-accent hover:text-accent"
        >
          Purchase via GCash (Messenger)
        </a>
        <a
          href="/gallery"
          className="inline-flex items-center justify-center text-sm font-medium text-accent no-underline hover:text-accent-dim"
        >
          View all included models →
        </a>
      </div>
    </article>
  );
}
