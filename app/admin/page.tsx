"use client";

import { useEffect, useState } from "react";
import { bundles as staticBundles } from "@/lib/bundles";
import { supabase, supabaseConfigured, PREVIEWS_BUCKET } from "@/lib/supabaseClient";
import { listImages, uploadImage, updateCategory, reorderCategory, deleteImage, PreviewImage } from "@/lib/previewImages";

const PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "";
const UNLOCK_KEY = "vz_admin_unlocked";
const DEFAULT_CATEGORY = "Uncategorized";

function HeroSlot({ slug }: { slug: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [dragOver, setDragOver] = useState(false);
  const path = `bundles/${slug}/hero`;
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PREVIEWS_BUCKET}/${path}?t=${Date.now()}`;

  async function upload(file: File) {
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
      className={`group relative flex h-[140px] w-[140px] flex-shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border text-center ${dragOver ? "border-accent bg-accent/10" : "border-base-700 bg-base-800"}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
        }}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Hero" className="h-full w-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={publicUrl}
          alt="Hero"
          className="h-full w-full object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0")}
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-base-950/70 p-1 text-[11px] font-medium text-base-200 opacity-0 transition-opacity group-hover:opacity-100">
        {status === "uploading" ? "Uploading…" : status === "error" ? "Failed — retry" : "Hero / card"}
      </span>
    </label>
  );
}

function ImageTile({
  image,
  categories,
  onCategoryChange,
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  dragging,
}: {
  image: PreviewImage;
  categories: string[];
  onCategoryChange: (cat: string) => void;
  onDelete: () => void;
  draggable: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  dragging: boolean;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex w-[100px] flex-col gap-1 ${dragging ? "opacity-40" : ""}`}
    >
      <div className="relative h-[100px] w-[100px] cursor-move overflow-hidden rounded-lg border border-base-700 bg-base-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt="" className="h-full w-full object-cover" />
        <button
          onClick={onDelete}
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-base-950/80 text-xs text-base-200 hover:text-accent"
          title="Remove"
        >
          ×
        </button>
      </div>
      <select
        value={image.category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="w-full rounded-md border border-base-700 bg-base-800 px-1 py-1 text-[11px] text-base-300"
      >
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}

function AddSlot({ size, onFiles }: { size: number; onFiles: (files: File[]) => void }) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-base-500 hover:border-accent hover:text-accent ${dragOver ? "border-accent bg-accent/10 text-accent" : "border-base-600"}`}
      style={{ width: size, height: size }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
        if (files.length) onFiles(files);
      }}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
      <span className="text-2xl leading-none">+</span>
      <span className="mt-1 text-[10px] text-base-500">bulk ok</span>
    </label>
  );
}

function BundleRow({ bundle }: { bundle: (typeof staticBundles)[number] }) {
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  async function refresh() {
    const all = await listImages(bundle.slug);
    setImages(all);
  }

  useEffect(() => {
    refresh();
  }, [bundle.slug]);

  const categories = Array.from(new Set([DEFAULT_CATEGORY, ...images.map((i) => i.category), ...extraCategories]));
  const visible = images.filter((i) => i.category === activeCategory);

  async function uploadMany(files: File[]) {
    let next = images.length ? Math.max(...images.map((i) => i.sort_order)) + 1 : 0;
    for (const file of files) {
      const { error } = await uploadImage(bundle.slug, file, activeCategory, next);
      if (error) {
        alert(\`Upload failed: \${error.message || "unknown error"}. Did you run the preview_images SQL setup in Supabase?\`);
        return;
      }
      next += 1;
    }
    refresh();
  }

  function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setExtraCategories((prev) => Array.from(new Set([...prev, name])));
    setActiveCategory(name);
    setNewCategoryName("");
  }

  async function reorder(dropTargetId: string) {
    if (!dragId || dragId === dropTargetId) return;
    const list = [...visible];
    const fromIdx = list.findIndex((i) => i.id === dragId);
    const toIdx = list.findIndex((i) => i.id === dropTargetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setImages((prev) => {
      const others = prev.filter((i) => i.category !== activeCategory);
      return [...others, ...list];
    });
    await reorderCategory(list);
    setDragId(null);
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl2 border border-base-700 bg-base-900 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-base-200">{bundle.name}</h2>
        <span className="text-xs text-base-400">{bundle.format} — {bundle.slug}</span>
      </div>

      <div className="flex items-start gap-4">
        <HeroSlot slug={bundle.slug} />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-base-400">Categories — click to switch, uploads go into the active one</span>
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${activeCategory === c ? "border-accent bg-accent/15 text-accent" : "border-base-700 text-base-400 hover:border-base-600"}`}
              >
                {c} <span className="text-base-500">({images.filter((i) => i.category === c).length})</span>
              </button>
            ))}
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="New category…"
              className="w-28 rounded-full border border-base-700 bg-base-800 px-3 py-1 text-xs text-base-200 outline-none focus:border-accent"
            />
            <button onClick={addCategory} className="rounded-full border border-base-700 px-3 py-1 text-xs text-base-300 hover:border-accent hover:text-accent">Add</button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {visible.map((img) => (
          <ImageTile
            key={img.id}
            image={img}
            categories={categories}
            draggable
            dragging={dragId === img.id}
            onDragStart={() => setDragId(img.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => reorder(img.id)}
            onCategoryChange={async (cat) => {
              await updateCategory(img.id, cat);
              refresh();
            }}
            onDelete={async () => {
              await deleteImage(img.id, img.path);
              refresh();
            }}
          />
        ))}
        <AddSlot size={100} onFiles={uploadMany} />
      </div>
    </section>
  );
}

export default function AdminPage() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(!PASSCODE);

  useEffect(() => {
    if (!PASSCODE) return;
    if (typeof window !== "undefined" && window.localStorage.getItem(UNLOCK_KEY) === PASSCODE) {
      setUnlocked(true);
    }
  }, []);

  function unlock() {
    setUnlocked(true);
    if (typeof window !== "undefined") window.localStorage.setItem(UNLOCK_KEY, PASSCODE);
  }

  if (!unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base-950 px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code === PASSCODE) unlock();
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
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg">
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
            Sort images into categories, drag to reorder, upload in bulk with the + tile.
            Changes go live immediately — no redeploy needed.
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
