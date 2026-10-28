"use client";

import { forwardRef, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { takePendingImage } from "../lib/pendingImage";
import { decodeEmbedding } from "@/lib/embedding";
import { indexItem, parseQuery, rankByText } from "../lib/textSearch";
import QuickView from "@/components/QuickView";

const SIMILAR_IN_QUICK_VIEW = 6;
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clipboard,
  Download,
  ImageUp,
  Loader2,
  Maximize2,
  ScanSearch,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

// The live library managed in /admin. Until it has been imported, fall back to the static index.
const LIBRARY_URL = "/api/library";
const FALLBACK_LIBRARY_URL = "/indexedLibrary.json";
const MIN_SCORE_RANGE = [40, 95];
const DEFAULT_MIN_SCORE = 60;
const ALL_CATEGORIES = "All";
const PAGE_SIZE = 60;
const SORTS = [
  { value: "best", label: "Best match" },
  { value: "az", label: "Name A–Z" },
  { value: "za", label: "Name Z–A" },
];

// Option list with item counts, most common first.
function countOptions(values) {
  const counts = new Map();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm sm:min-w-[180px]">
      <span className="text-base-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-base-600 bg-base-950 px-3 py-2.5 text-base-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      >
        {children}
      </select>
    </label>
  );
}

// The API sends embeddings encoded as base64 strings; the static index has plain number arrays.
// Each item also gets its name-search words, computed once here rather than on every keystroke.
function prepareLibrary(items) {
  return items
    .map((item) => ({
      ...item,
      embedding: typeof item.embedding === "string" ? decodeEmbedding(item.embedding) : item.embedding,
      searchIndex: indexItem(item),
    }))
    .filter((item) => item.embedding && item.embedding.length > 0);
}

async function fetchLibrary(signal) {
  const res = await fetch(LIBRARY_URL, { signal });
  const items = res.ok ? await res.json() : [];
  if (items.length > 0) return items;
  // no-cache: reuse the browser's copy of this large file, but check with the server first.
  const fallback = await fetch(FALLBACK_LIBRARY_URL, { signal, cache: "no-cache" });
  if (!fallback.ok) throw new Error(`Could not load library (${fallback.status})`);
  return fallback.json();
}

// Both vectors are L2-normalized, so the dot product is the cosine similarity.
function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function matchTone(percent) {
  if (percent >= 85) return "bg-accent text-accent-fg";
  if (percent >= 70) return "bg-amber-400 text-base-950";
  return "bg-base-700 text-base-200";
}

// Only this site and its Supabase storage may supply an ?imageUrl= to search with.
function isAllowedImageUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    return (
      url.origin === window.location.origin ||
      (url.protocol === "https:" && url.hostname.endsWith(".supabase.co"))
    );
  } catch {
    return false;
  }
}

function getImageFile(fileList) {
  return Array.from(fileList ?? []).find((f) => f.type.startsWith("image/")) ?? null;
}

function StatusBadge({ status, progress, matchCount, error }) {
  const config = {
    idle: { icon: ImageUp, text: "Waiting for an image", tone: "border-base-600 text-base-400" },
    initializing: {
      icon: Loader2,
      spin: true,
      text: `Initializing AI Engine...${progress > 0 ? ` ${Math.round(progress)}%` : ""}`,
      tone: "border-amber-400/40 text-amber-300",
    },
    analyzing: {
      icon: ScanSearch,
      pulse: true,
      text: "Analyzing Image Structure...",
      tone: "border-accent/40 text-accent",
    },
    done: {
      icon: CheckCircle2,
      text: `Found ${matchCount} ${matchCount === 1 ? "Match" : "Matches"}`,
      tone: "border-accent/40 text-accent",
    },
    error: { icon: AlertTriangle, text: error || "Something went wrong", tone: "border-red-500/40 text-red-400" },
  }[status];
  const Icon = config.icon;

  return (
    <motion.span
      key={status}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 rounded-full border bg-base-950/80 px-3 py-1.5 text-xs font-medium backdrop-blur ${config.tone}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`h-3.5 w-3.5 ${config.spin ? "animate-spin" : ""} ${config.pulse ? "animate-pulse2" : ""}`} />
      {config.text}
    </motion.span>
  );
}

// forwardRef: AnimatePresence's popLayout mode measures exiting cards through a ref.
const ResultCard = forwardRef(function ResultCard({ item, onOpen }, ref) {
  // Text-only results have no similarity score.
  const percent = item.score === undefined ? null : Math.round(item.score * 100);
  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col overflow-hidden rounded-xl2 border border-base-700 bg-base-900 shadow-card"
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={`Quick view: ${item.title}`}
        className="group relative block aspect-[4/3] overflow-hidden bg-base-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        {/* Plain <img>: previewUrl may be any remote host, not just the ones next/image allows. */}
        <img
          src={item.previewUrl}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-base-950/80 px-2.5 py-1 text-[11px] font-semibold text-base-200 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Maximize2 className="h-3 w-3" /> Quick view
        </span>
        {percent !== null && (
          <span
            className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow ${matchTone(percent)}`}
          >
            {percent}% Match
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-base-400">
            {item.subcategory ? `${item.category} · ${item.subcategory}` : item.category}
          </span>
          <h3 className="text-base font-semibold text-base-200">{item.title}</h3>
        </div>
        <a
          href={item.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-fg no-underline transition-colors hover:bg-accent-dim hover:text-accent-fg"
        >
          <Download className="h-4 w-4" />
          Open in Google Drive
        </a>
        <span className="-mt-2 text-center text-xs text-base-400">Buyers only: sign in with the email you gave us</span>
      </div>
    </motion.article>
  );
});

function ResultsGrid({ items, onOpen }) {
  if (items.length === 0) return null;
  return (
    <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <ResultCard key={item.id} item={item} onOpen={onOpen} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ReverseImageSearch() {
  const [library, setLibrary] = useState([]);
  const [libraryError, setLibraryError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [queryEmbedding, setQueryEmbedding] = useState(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [minScore, setMinScore] = useState(DEFAULT_MIN_SCORE);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [subcategory, setSubcategory] = useState(ALL_CATEGORIES);
  const [sort, setSort] = useState("best");
  const [textQuery, setTextQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [quickItem, setQuickItem] = useState(null);

  const workerRef = useRef(null);
  const engineReadyRef = useRef(false);
  const requestIdRef = useRef(0);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef(null);

  // Load the pre-computed library index.
  useEffect(() => {
    const controller = new AbortController();
    fetchLibrary(controller.signal)
      .then((items) => setLibrary(prepareLibrary(items)))
      .catch((err) => {
        if (err.name !== "AbortError") setLibraryError(err.message);
      });
    return () => controller.abort();
  }, []);

  // Pick up a query from the header search box (/search?q=...). Read on mount instead of
  // useSearchParams so the statically exported page needs no Suspense boundary.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setTextQuery(q);
  }, []);

  // Keep ?q= in sync so a search can be bookmarked or shared.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (textQuery.trim()) url.searchParams.set("q", textQuery.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, [textQuery]);

  // Start the embedding worker; the model itself loads on the first search.
  useEffect(() => {
    const worker = new Worker(new URL("../workers/imageSearchWorker.js", import.meta.url), { type: "module" });
    workerRef.current = worker;

    worker.onmessage = ({ data }) => {
      // Ignore replies to searches that a newer image has replaced.
      if (data.id !== undefined && data.id !== requestIdRef.current) return;

      switch (data.status) {
        case "downloading_model":
          if (!engineReadyRef.current) {
            setStatus("initializing");
            setProgress(data.progress);
          }
          break;
        case "ready":
          engineReadyRef.current = true;
          setStatus("analyzing");
          break;
        case "complete":
          setQueryEmbedding(data.embedding);
          setStatus("done");
          break;
        case "error":
          setError(data.error);
          setStatus("error");
          break;
      }
    };
    worker.onerror = (event) => {
      setError(event.message || "The AI engine failed to start");
      setStatus("error");
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Release the object URL of the previous preview.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const searchWithFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      setStatus("error");
      return;
    }
    const id = ++requestIdRef.current;
    setPreviewUrl(URL.createObjectURL(file));
    setQueryEmbedding(null);
    setError(null);
    setProgress(0);
    setStatus(engineReadyRef.current ? "analyzing" : "initializing");
    workerRef.current?.postMessage({ type: "embed", id, image: file });
  }, []);

  // Ctrl+V anywhere on the page.
  useEffect(() => {
    const onPaste = (event) => {
      const file = getImageFile(event.clipboardData?.files);
      if (!file) return;
      event.preventDefault();
      searchWithFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [searchWithFile]);

  // Run an image picked with the header's camera button (/search?image=1).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("image")) return;
    url.searchParams.delete("image");
    window.history.replaceState(null, "", url);
    takePendingImage().then((file) => file && searchWithFile(file));
  }, [searchWithFile]);

  // Open one model from the gallery or home page (/search?id=...): use its stored embedding as the
  // query, so the model itself comes first (100% match) followed by similar ones. Kept in the URL
  // so refresh and Back work.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id || library.length === 0) return;
    const item = library.find((i) => i.id === id);
    if (!item) {
      setError("That model is no longer in the library");
      setStatus("error");
      return;
    }
    requestIdRef.current++;
    setPreviewUrl(item.previewUrl);
    setQueryEmbedding(item.embedding);
    setError(null);
    setStatus("done");
  }, [library]);

  // Run an image linked from older gallery links (/search?imageUrl=...).
  useEffect(() => {
    const imageUrl = new URLSearchParams(window.location.search).get("imageUrl");
    if (!imageUrl || !isAllowedImageUrl(imageUrl)) return;
    let cancelled = false;
    fetch(imageUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load the gallery image (${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        if (!cancelled) searchWithFile(new File([blob], "gallery-image", { type: blob.type || "image/jpeg" }));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [searchWithFile]);

  const clearImage = () => {
    requestIdRef.current++;
    // Drop a model or gallery image from the URL so a refresh doesn't bring it back.
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    url.searchParams.delete("imageUrl");
    window.history.replaceState(null, "", url);
    setPreviewUrl(null);
    setQueryEmbedding(null);
    setError(null);
    setStatus("idle");
  };

  const dragHandlers = {
    onDragEnter: (e) => {
      e.preventDefault();
      dragDepthRef.current++;
      setIsDragging(true);
    },
    onDragOver: (e) => e.preventDefault(),
    onDragLeave: (e) => {
      e.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      searchWithFile(getImageFile(e.dataTransfer.files));
    },
  };

  const categoryOptions = useMemo(() => countOptions(library.map((item) => item.category)), [library]);
  const subcategoryOptions = useMemo(
    () =>
      category === ALL_CATEGORIES
        ? []
        : countOptions(library.filter((item) => item.category === category).map((item) => item.subcategory)),
    [library, category]
  );

  const chooseCategory = (value) => {
    setCategory(value);
    setSubcategory(ALL_CATEGORIES);
  };

  const scored = useMemo(() => {
    if (!queryEmbedding) return [];
    return library
      .filter((item) => item.embedding.length === queryEmbedding.length)
      .map((item) => ({ ...item, score: dot(queryEmbedding, item.embedding) }))
      .sort((a, b) => b.score - a.score);
  }, [library, queryEmbedding]);

  // Ranking thousands of names takes a few dozen ms; deferring it keeps typing smooth.
  const deferredQuery = useDeferredValue(textQuery);
  const parsedQuery = useMemo(() => parseQuery(deferredQuery), [deferredQuery]);
  const hasTextQuery = textQuery.trim().length > 0;

  // With an image: similarity results, narrowed by any typed words. Without one: a name search
  // with exact matches (every word) first, then similar names (some of the words, typos, related words).
  const matches = useMemo(() => {
    const inCategory = (item) =>
      (category === ALL_CATEGORIES || item.category === category) &&
      (subcategory === ALL_CATEGORIES || item.subcategory === subcategory);
    const rank = (items) =>
      parsedQuery ? rankByText(items.map((item) => ({ item, index: item.searchIndex })), parsedQuery) : [];
    let list;
    if (queryEmbedding) {
      // scored is already sorted by similarity.
      let candidates = scored.filter((item) => item.score * 100 >= minScore && inCategory(item));
      if (parsedQuery) {
        const named = new Set(rank(candidates).map((r) => r.item.id));
        candidates = candidates.filter((item) => named.has(item.id));
      }
      list = candidates;
    } else if (parsedQuery) {
      list = rank(library.filter(inCategory)).map((r) => ({ ...r.item, exact: r.exact }));
    } else {
      return [];
    }
    if (sort === "az") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "za") return [...list].sort((a, b) => b.title.localeCompare(a.title));
    return list;
  }, [scored, library, queryEmbedding, minScore, category, subcategory, sort, parsedQuery]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [matches]);

  // The models that look most like the one in the quick view (same embedding comparison as image search).
  const quickSimilar = useMemo(() => {
    if (!quickItem) return [];
    return library
      .filter((item) => item.id !== quickItem.id && item.embedding.length === quickItem.embedding.length)
      .map((item) => ({ item, score: dot(quickItem.embedding, item.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, SIMILAR_IN_QUICK_VIEW)
      .map((r) => r.item);
  }, [library, quickItem]);

  // Name search sorted by best match: split the visible results into exact and similar.
  const grouped = !queryEmbedding && sort === "best";
  const exactCount = grouped ? matches.filter((m) => m.exact).length : 0;
  const visible = matches.slice(0, visibleCount);

  const showResults = status === "done" || (!previewUrl && hasTextQuery);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 text-base-200">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">Search the Library</h2>
        <p className="text-sm text-base-400">
          Search by name, or drop a render, screenshot or reference photo to find visually similar assets. Images are
          analyzed in your browser and never uploaded. Drive links open for buyers whose Google email we&apos;ve added
          after payment.
        </p>
      </header>

      <label className="relative block">
        <span className="sr-only">Search by name or keyword</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-base-400" />
        <input
          type="search"
          value={textQuery}
          onChange={(e) => setTextQuery(e.target.value)}
          placeholder={`Search ${library.length > 0 ? `${library.length.toLocaleString()} models` : "models"} by name, e.g. sofa, Minotti, plant`}
          className="w-full rounded-xl2 border border-base-600 bg-base-900 py-3.5 pl-12 pr-14 text-base text-base-200 placeholder:text-base-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Search by image"
          title="Search by image"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-base-400 transition-colors hover:bg-base-800 hover:text-accent"
        >
          <Camera className="h-5 w-5" />
        </button>
      </label>

      {libraryError && (
        <p className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" /> {libraryError}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div
          {...dragHandlers}
          role="button"
          tabIndex={0}
          aria-label="Upload an image: drop a file, browse, or paste with Ctrl+V"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-4 rounded-xl2 border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            isDragging ? "border-accent bg-accent/10" : "border-base-600 bg-base-900 hover:border-base-400"
          }`}
        >
          <motion.div animate={{ scale: isDragging ? 1.12 : 1 }} className="rounded-full bg-base-800 p-4">
            <ImageUp className={`h-8 w-8 ${isDragging ? "text-accent" : "text-base-400"}`} />
          </motion.div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">{isDragging ? "Drop to search" : "Drag & drop an image here"}</p>
            <p className="text-sm text-base-400">
              or <span className="text-accent underline underline-offset-2">browse files</span>
            </p>
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-base-400">
            <Clipboard className="h-3.5 w-3.5" />
            Paste a screenshot anywhere with
            <kbd className="rounded border border-base-600 bg-base-800 px-1.5 py-0.5 font-sans">Ctrl+V</kbd>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              searchWithFile(getImageFile(e.target.files));
              e.target.value = "";
            }}
          />
        </div>

        <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-xl2 border border-base-700 bg-base-900">
          <AnimatePresence mode="wait">
            {previewUrl ? (
              <motion.img
                key={previewUrl}
                src={previewUrl}
                alt="Your uploaded image"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-base-400">
                Your image preview will appear here
              </motion.p>
            )}
          </AnimatePresence>
          {status === "analyzing" && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-accent/25 to-transparent"
              initial={{ top: "-4rem" }}
              animate={{ top: "100%" }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            />
          )}
          <div className="absolute left-3 top-3">
            <AnimatePresence mode="wait">
              <StatusBadge status={status} progress={progress} matchCount={matches.length} error={error} />
            </AnimatePresence>
          </div>
          {previewUrl && (
            <button
              type="button"
              onClick={clearImage}
              aria-label="Remove image"
              className="absolute right-3 top-3 rounded-full bg-base-950/80 p-1.5 text-base-200 backdrop-blur hover:text-accent"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-xl2 border border-base-700 bg-base-900 p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4 text-accent" /> Filters
        </div>
        <label className={`flex flex-col gap-2 text-sm ${queryEmbedding ? "" : "hidden"}`}>
          <span className="flex justify-between">
            <span className="text-base-400">Minimum Similarity Score</span>
            <span className="font-semibold text-accent">{minScore}%</span>
          </span>
          <input
            type="range"
            min={MIN_SCORE_RANGE[0]}
            max={MIN_SCORE_RANGE[1]}
            step={1}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full accent-[#9BB84A]"
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <FilterSelect label="Category" value={category} onChange={chooseCategory}>
            <option value={ALL_CATEGORIES}>All categories ({library.length.toLocaleString()})</option>
            {categoryOptions.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count.toLocaleString()})
              </option>
            ))}
          </FilterSelect>
          {subcategoryOptions.length > 0 && (
            <FilterSelect label="Type" value={subcategory} onChange={setSubcategory}>
              <option value={ALL_CATEGORIES}>All {category.toLowerCase()}</option>
              {subcategoryOptions.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count.toLocaleString()})
                </option>
              ))}
            </FilterSelect>
          )}
          <FilterSelect label="Sort by" value={sort} onChange={setSort}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </FilterSelect>
        </div>
        {(category !== ALL_CATEGORIES || sort !== "best") && (
          <button
            type="button"
            onClick={() => {
              chooseCategory(ALL_CATEGORIES);
              setSort("best");
            }}
            className="self-start text-sm text-accent underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {showResults && matches.length > 0 && !queryEmbedding && (
        <p className="text-sm text-base-400" role="status" aria-live="polite">
          {grouped ? (
            <>
              {exactCount > 0
                ? `${exactCount.toLocaleString()} ${exactCount === 1 ? "match" : "matches"}`
                : "No exact match"}{" "}
              for &ldquo;{textQuery.trim()}&rdquo;{category !== ALL_CATEGORIES ? ` in ${category}` : ""}
              {matches.length > exactCount &&
                ` · ${(matches.length - exactCount).toLocaleString()} similar ${matches.length - exactCount === 1 ? "model" : "models"}`}
            </>
          ) : (
            <>
              {matches.length.toLocaleString()} {matches.length === 1 ? "model matches" : "models match"} &ldquo;
              {textQuery.trim()}&rdquo;{category !== ALL_CATEGORIES ? ` in ${category}` : ""}
            </>
          )}
        </p>
      )}

      {showResults && matches.length === 0 && (
        <p className="rounded-lg border border-base-700 bg-base-900 px-4 py-6 text-center text-sm text-base-400">
          {library.length === 0
            ? "The library is empty."
            : queryEmbedding
              ? `No matches above ${minScore}%${hasTextQuery ? ` for "${textQuery.trim()}"` : ""}${category !== ALL_CATEGORIES ? ` in ${category}` : ""}. Try lowering the minimum score${hasTextQuery ? " or clearing the search box" : ""}.`
              : `No models named "${textQuery.trim()}"${category !== ALL_CATEGORIES ? ` in ${category}` : ""}. Try a shorter word or another category.`}
        </p>
      )}

      {showResults &&
        (grouped ? (
          <>
            <ResultsGrid items={visible.slice(0, exactCount)} onOpen={setQuickItem} />
            {visible.length > exactCount && (
              <>
                <h3 className="border-t border-base-700 pt-6 text-sm font-semibold uppercase tracking-wide text-base-400">
                  {exactCount > 0 ? "Similar models" : "Closest models"}
                </h3>
                <ResultsGrid items={visible.slice(exactCount)} onOpen={setQuickItem} />
              </>
            )}
          </>
        ) : (
          <ResultsGrid items={visible} onOpen={setQuickItem} />
        ))}

      {showResults && matches.length > visibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="mx-auto rounded-lg border border-base-600 px-6 py-2.5 text-sm font-semibold text-base-200 transition-colors hover:border-accent hover:text-accent"
        >
          Show more ({(matches.length - visibleCount).toLocaleString()} left)
        </button>
      )}

      <QuickView
        open={quickItem !== null}
        onClose={() => setQuickItem(null)}
        image={quickItem?.previewUrl ?? ""}
        title={quickItem?.title ?? ""}
        subtitle={quickItem ? [quickItem.category, quickItem.subcategory].filter(Boolean).join(" · ") : undefined}
        actions={
          quickItem && (
            <>
              <a
                href={quickItem.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-fg no-underline hover:bg-accent-dim hover:text-accent-fg"
              >
                <Download className="h-4 w-4" />
                Open in Google Drive
              </a>
              <span className="text-center text-xs text-base-400">Buyers only: sign in with the email you gave us</span>
            </>
          )
        }
      >
        {quickSimilar.length > 0 && (
          <>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-base-400">Looks similar</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {quickSimilar.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setQuickItem(item)}
                  title={item.title}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-base-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <img
                    src={item.previewUrl}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </QuickView>
    </section>
  );
}
