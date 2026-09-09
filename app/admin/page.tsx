"use client";

import { useState } from "react";
import { bundles as staticBundles } from "@/lib/bundles";
import { supabase, supabaseConfigured, PREVIEWS_BUCKET } from "@/lib/supabaseClient";

const PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "";

function UploadSlot({ path, label, size }: { path: string; label: string; size: number }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PREVIEWS_BUCKET}/${path}?t=${Date.now()}`;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    setPreview(URL.createObjectURL(file));
    const { error } = await supabase.storage.from(PREVIEWS_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "0",
    });
    setStatus(error ? "error" : "done");
  }

  return (
    <label
      className="group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-base-700 bg-base-800 text-center"
      style={{ width: size, height: size }}
    >
      <input type="file" accept="image/*" className="hidden" onChange={onFile} />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="h-full w-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={publicUrl}
          alt={label}
          className="h-full w-full object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0")}
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-base-950/70 p-1 text-[11px] font-medium text-base-200 opacity-0 transition-opacity group-hover:opacity-100">
        {status === "uploading" ? "Uploading…" : status === "error" ? "Failed — retry" : label}
      </span>
    </label>
  );
}

function BundleRow({ bundle }: { bundle: (typeof staticBundles)[number] }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl2 border border-base-700 bg-base-900 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-base-200">{bundle.name}</h2>
        <span className="text-xs text-base-400">{bundle.format} — {bundle.slug}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <UploadSlot path={`bundles/${bundle.slug}/hero`} label="Hero / card" size={140} />
        {Array.from({ length: bundle.thumbCount }, (_, i) => (
          <UploadSlot
            key={i}
            path={`bundles/${bundle.slug}/thumb-${i + 1}`}
            label={`Thumb ${i + 1}`}
            size={80}
          />
        ))}
      </div>
    </section>
  );
}

export default function AdminPage() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(!PASSCODE);

  if (!unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-950 px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code === PASSCODE) setUnlocked(true);
          }}
          className="flex w-full max-w-sm flex-col gap-4 rounded-xl2 border border-base-700 bg-base-900 p-8"
        >
          <h1 className="text-lg font-semibold text-base-200">Admin access</h1>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Passcode"
            className="rounded-lg border border-base-700 bg-base-950 px-3 py-2 text-base-200 outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
          >
            Enter
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base-950 px-6 py-12 sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <div>
          <span className="text-sm font-semibold uppercase tracking-wide text-accent">Admin</span>
          <h1 className="mt-1 text-2xl font-semibold text-base-200">Manage Preview Images</h1>
          <p className="mt-2 max-w-xl text-sm text-base-400">
            Click any tile to upload a replacement image. Uploads go straight to Supabase
            Storage and appear on the live site immediately — no redeploy needed.
          </p>
        </div>
        {!supabaseConfigured && (
          <p className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
            Supabase environment variables aren&apos;t set yet — add them in Vercel (see README), then redeploy before uploading.
          </p>
        )}
        {staticBundles.map((b) => (
          <BundleRow key={b.slug} bundle={b} />
        ))}
      </div>
    </main>
  );
}
