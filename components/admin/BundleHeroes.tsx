"use client";

import { useState } from "react";
import { bundles, previewUrl } from "@/lib/bundles";
import { uploadHero } from "@/lib/adminApi";

// The big image on each bundle card. Thumbnails and the gallery come from the models in the library.
function HeroSlot({ slug }: { slug: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [dragOver, setDragOver] = useState(false);
  // Cache-buster fixed per visit so the image isn't refetched on every render.
  const [publicUrl] = useState(() => `${previewUrl(`bundles/${slug}/hero`)}?t=${Date.now()}`);

  async function upload(file: File) {
    setStatus("uploading");
    setPreview(URL.createObjectURL(file));
    try {
      await uploadHero(slug, file);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <label
      className={`group relative flex aspect-[4/3] w-72 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border text-center ${dragOver ? "border-accent bg-accent/10" : "border-base-700 bg-base-800"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) upload(file);
      }}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview ?? publicUrl}
        alt="Bundle hero"
        className="h-full w-full object-cover"
        onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0")}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center bg-base-950/70 p-2 text-sm font-medium text-base-200 transition-opacity ${status === "idle" ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
      >
        {status === "uploading"
          ? "Uploading…"
          : status === "error"
            ? "Upload failed — click to retry"
            : status === "done"
              ? "Saved ✓ — click to replace"
              : "Drop or click to replace"}
      </span>
    </label>
  );
}

export default function BundleHeroes() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-base-400">
        The large image on each bundle card. The small thumbnails on the home page and everything in the gallery come
        from your models in <strong className="text-base-200">Models &amp; Drive links</strong>, so new models show up
        there automatically.
      </p>
      {bundles.map((b) => (
        <section key={b.slug} className="flex flex-col gap-4 rounded-xl2 border border-base-700 bg-base-900 p-6 sm:flex-row sm:items-center">
          <HeroSlot slug={b.slug} />
          <div>
            <h2 className="text-lg font-semibold text-base-200">{b.name}</h2>
            <p className="mt-1 text-sm text-base-400">
              {b.format} · {b.priceLabel}
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
