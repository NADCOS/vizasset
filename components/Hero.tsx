"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { bundles } from "@/lib/bundles";
import { countImages } from "@/lib/previewImages";

const HEADLINE = "Pro-grade 3D assets for architectural visualizers.".split(" ");

export default function Hero() {
  const [modelCount, setModelCount] = useState<number | null>(null);

  useEffect(() => {
    Promise.all(bundles.map((b) => countImages(b.slug))).then((counts) =>
      setModelCount(counts.reduce((a, b) => a + b, 0))
    );
  }, []);

  return (
    <section className="relative flex min-h-[85vh] items-end overflow-hidden border-b border-base-700">
      <Image
        src="/images/hero-vray.jpg"
        alt="Photorealistic V-Ray architectural render"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-base-950 via-base-950/60 to-base-950/10" />

      {/* floating wireframe accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg viewBox="0 0 100 60" className="absolute right-[10%] top-[8%] h-[108px] w-[180px] animate-[spin_20s_linear_infinite] opacity-30" style={{ animationName: "none" }}>
          <polygon points="50,4 90,20 90,45 50,58 10,45 10,20" fill="none" stroke="#9BB84A" strokeWidth="0.6" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 sm:px-10 sm:pb-20">
        <a
          href="#bundles"
          className="mb-5 inline-flex items-center gap-3.5 rounded-full border border-accent bg-[#171b0f] px-5 py-3 no-underline hover:bg-[#1d230f]"
        >
          <span className="text-sm font-semibold text-base-200">
            {modelCount && modelCount > 0 ? `${modelCount.toLocaleString()}+ Models Bundle` : "2,000+ Models Bundle"}
          </span>
          <span className="flex items-baseline gap-2">
            <span className="text-lg text-base-400 line-through">₱1,999</span>
            <span className="animate-price-pop text-4xl font-bold leading-none text-accent">₱299</span>
          </span>
        </a>

        <span className="mb-4 inline-block rounded-full border border-base-600 bg-base-950/60 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          SketchUp &amp; 3ds Max Model Bundles
        </span>

        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-base-200 md:text-6xl">
          {HEADLINE.map((word, i) => (
            <span
              key={i}
              className="mr-[0.28em] inline-block animate-word-in opacity-0"
              style={{ animationDelay: `${0.9 + i * 0.09}s` }}
            >
              {word}
            </span>
          ))}
        </h1>

        <p className="mt-4 max-w-xl text-base-400 md:text-lg">
          Hundreds of curated, render-ready models per bundle. No subscriptions,
          no cart — just message us and pay via GCash.
        </p>
        <a
          href="#bundles"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-fg no-underline hover:bg-accent-dim"
        >
          Browse Bundles
        </a>
      </div>
    </section>
  );
}
