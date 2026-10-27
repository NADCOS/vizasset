"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Search } from "lucide-react";
import { savePendingImage } from "@/src/lib/pendingImage";

export default function HeaderSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // Picking a photo jumps to /search, which runs the image search on load.
  const searchByImage = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    const url = new URL("/search", window.location.origin);
    const q = inputRef.current?.value.trim();
    if (q) url.searchParams.set("q", q);
    try {
      await savePendingImage(file);
      url.searchParams.set("image", "1");
    } catch {
      // Storage unavailable (e.g. private mode): open the search page so the image can be dropped there.
    }
    window.location.assign(url);
  };

  return (
    // Plain GET form: /search reads ?q= and runs the name search, even before scripts load.
    <form action="/search" method="get" role="search" className="relative min-w-0 max-w-md flex-1">
      <label htmlFor="header-search" className="sr-only">
        Search models
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-400" />
      <input
        ref={inputRef}
        id="header-search"
        type="search"
        name="q"
        placeholder="Search 3,700+ models…"
        className="w-full rounded-lg border border-base-600 bg-base-900 py-2 pl-9 pr-10 text-sm text-base-200 placeholder:text-base-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        aria-label="Search by image"
        title="Search by image"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-base-400 transition-colors hover:bg-base-800 hover:text-accent disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          searchByImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </form>
  );
}
