"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, Search } from "lucide-react";
import { savePendingImage } from "@/src/lib/pendingImage";
import { indexItem, parseQuery, rankByText } from "@/src/lib/textSearch";
import { loadLibraryNames } from "@/lib/libraryNames";
import { LibraryCard, modelSearchUrl } from "@/lib/models";

const MAX_SUGGESTIONS = 5;

export default function HeaderSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [models, setModels] = useState<LibraryCard[] | null>(null);
  const [active, setActive] = useState(-1);

  // The model list (~100 KB) loads the first time the box is focused, not with the page.
  function warmUp() {
    if (!models) loadLibraryNames().then(setModels).catch(() => {});
  }

  const entries = useMemo(() => models?.map((item) => ({ item, index: indexItem(item) })) ?? [], [models]);
  const deferredQuery = useDeferredValue(query);
  const suggestions = useMemo(() => {
    const parsed = parseQuery(deferredQuery);
    if (!parsed || entries.length === 0) return [];
    return rankByText(entries, parsed)
      .slice(0, MAX_SUGGESTIONS)
      .map((r) => r.item as LibraryCard);
  }, [entries, deferredQuery]);

  useEffect(() => setActive(-1), [suggestions]);

  const typed = query.trim().length > 0;
  const open = focused && typed;
  // Options: each suggestion, then "see all results" (index === suggestions.length).
  const optionCount = suggestions.length + 1;

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

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % optionCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? optionCount - 1 : i - 1));
    } else if (e.key === "Escape") {
      setFocused(false);
    } else if (e.key === "Enter" && active >= 0 && active < suggestions.length) {
      e.preventDefault();
      window.location.assign(modelSearchUrl(suggestions[active].id));
    }
    // Enter with nothing (or "see all") highlighted submits the form to /search?q=.
  }

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
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setFocused(true);
          warmUp();
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="header-search-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `header-suggestion-${active}` : undefined}
        placeholder={models ? `Search ${models.length.toLocaleString()} models…` : "Search 3,700+ models…"}
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

      {open && (
        <ul
          id="header-search-suggestions"
          role="listbox"
          // onMouseDown preventDefault keeps focus in the input so the list doesn't close before the click lands.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl2 border border-base-700 bg-base-900 shadow-card"
        >
          {!models && (
            <li className="flex items-center gap-2 px-4 py-3 text-sm text-base-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading models…
            </li>
          )}
          {models && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-base-400">No models found — try another word.</li>
          )}
          {suggestions.map((m, i) => (
            <li key={m.id} id={`header-suggestion-${i}`} role="option" aria-selected={active === i}>
              <a
                href={modelSearchUrl(m.id)}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center gap-3 px-3 py-2 no-underline ${active === i ? "bg-base-800" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.previewUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded-md bg-base-800 object-cover" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-base-200">{m.title}</span>
                  <span className="truncate text-xs text-base-400">{m.category}</span>
                </span>
              </a>
            </li>
          ))}
          <li id={`header-suggestion-${suggestions.length}`} role="option" aria-selected={active === suggestions.length}>
            <button
              type="submit"
              onMouseEnter={() => setActive(suggestions.length)}
              className={`flex w-full items-center gap-2 border-t border-base-700 px-4 py-2.5 text-left text-sm font-medium text-accent ${active === suggestions.length ? "bg-base-800" : ""}`}
            >
              <Search className="h-4 w-4" /> See all results for &ldquo;{query.trim()}&rdquo;
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
