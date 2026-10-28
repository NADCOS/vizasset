"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, Search, Trash2, Upload } from "lucide-react";
import {
  LibraryFields,
  LibraryItem,
  PreparedPhoto,
  createLibraryItem,
  deleteLibraryItem,
  listLibrary,
  updateLibraryItem,
} from "@/lib/adminApi";
import { isDriveLink } from "@/lib/driveLink";
import { usePhotoPreparer } from "./usePhotoPreparer";
import Thumb from "@/components/Thumb";

const CATEGORY_LIST_ID = "library-categories";
const field =
  "w-full rounded-lg border border-base-700 bg-base-950 px-3 py-2 text-sm text-base-200 outline-none placeholder:text-base-500 focus:border-accent";

type Prepare = (file: Blob) => Promise<PreparedPhoto>;

function titleFromFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function linkProblem(link: string) {
  return link.trim() && !isDriveLink(link) ? "Must be a Google Drive link (https://drive.google.com/…)" : null;
}

function errorText(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function FieldInputs({
  value,
  onChange,
}: {
  value: LibraryFields;
  onChange: (next: LibraryFields) => void;
}) {
  const set = (key: keyof LibraryFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: e.target.value });
  const problem = linkProblem(value.downloadUrl);
  return (
    <div className="grid flex-1 gap-2 sm:grid-cols-2">
      <input value={value.title} onChange={set("title")} placeholder="Title, e.g. Minotti sofa" className={`${field} sm:col-span-2`} />
      <input value={value.category} onChange={set("category")} placeholder="Category" list={CATEGORY_LIST_ID} className={field} />
      <input value={value.subcategory} onChange={set("subcategory")} placeholder="Type (optional), e.g. Sofas" className={field} />
      <div className="sm:col-span-2">
        <input
          value={value.downloadUrl}
          onChange={set("downloadUrl")}
          placeholder="Google Drive link (can be added later)"
          inputMode="url"
          className={`${field} ${problem ? "border-red-500/60" : !value.downloadUrl.trim() ? "border-amber-400/50" : ""}`}
        />
        {problem && <p className="mt-1 text-xs text-red-400">{problem}</p>}
        {!problem && !value.downloadUrl.trim() && (
          <p className="mt-1 text-xs text-amber-300">No link yet: saved under &quot;Missing link&quot; and hidden from the site until you add one.</p>
        )}
      </div>
    </div>
  );
}

// The link is optional (empty = "missing link"), but if one is typed it must be a Drive link.
function canSave(f: LibraryFields) {
  return Boolean(f.title.trim() && f.category.trim() && !linkProblem(f.downloadUrl));
}

const hasLink = (f: LibraryFields) => Boolean(f.downloadUrl.trim());

// ---- Adding new models ----

interface Draft {
  key: number;
  file: File;
  thumb: string;
  fields: LibraryFields;
  saving: boolean;
  error: string | null;
}

function AddModels({ prepare, onSaved }: { prepare: Prepare; onSaved: (item: LibraryItem) => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [defaultCategory, setDefaultCategory] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const keyRef = useRef(0);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(() => () => draftsRef.current.forEach((d) => URL.revokeObjectURL(d.thumb)), []);

  function addFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    setDrafts((prev) => [
      ...prev,
      ...images.map((file) => ({
        key: ++keyRef.current,
        file,
        thumb: URL.createObjectURL(file),
        fields: { title: titleFromFileName(file.name), category: defaultCategory, subcategory: "", downloadUrl: "" },
        saving: false,
        error: null,
      })),
    ]);
  }

  const patch = (key: number, changes: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...changes } : d)));

  function remove(key: number) {
    setDrafts((prev) => {
      const d = prev.find((x) => x.key === key);
      if (d) URL.revokeObjectURL(d.thumb);
      return prev.filter((x) => x.key !== key);
    });
  }

  async function save(draft: Draft) {
    patch(draft.key, { saving: true, error: null });
    try {
      const item = await createLibraryItem(draft.fields, await prepare(draft.file));
      remove(draft.key);
      onSaved(item);
    } catch (err) {
      patch(draft.key, { saving: false, error: errorText(err) });
    }
  }

  async function saveAll() {
    // One at a time: the AI model analyzes photos sequentially anyway.
    for (const d of draftsRef.current.filter((x) => canSave(x.fields) && !x.saving)) await save(d);
  }

  const readyCount = drafts.filter((d) => canSave(d.fields)).length;

  return (
    <section className="flex flex-col gap-4 rounded-xl2 border border-base-700 bg-base-900 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-base-200">Add new models</h2>
          <p className="mt-1 max-w-xl text-sm text-base-400">
            Drop photos, fill in a title, category and Drive link for each, then save. New models show up on the site within a
            minute. No link yet? Save anyway; the model waits under &quot;Missing link&quot;, hidden from customers.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs text-base-400">
          Category for new photos
          <input
            value={defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value)}
            list={CATEGORY_LIST_ID}
            placeholder="e.g. Furniture"
            className={`${field} w-48`}
          />
        </label>
      </div>

      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center text-sm ${dragOver ? "border-accent bg-accent/10 text-accent" : "border-base-600 text-base-400 hover:border-accent hover:text-accent"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(Array.from(e.dataTransfer.files || []));
        }}
      >
        <ImagePlus className="h-7 w-7" />
        <span className="font-medium">Drop model photos here, or click to choose</span>
        <span className="text-xs text-base-500">Several at once is fine. Big renders are shrunk automatically.</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
      </label>

      {drafts.map((d) => (
        <div key={d.key} className="flex flex-col gap-3 rounded-lg border border-base-700 bg-base-800/50 p-3 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.thumb} alt="" className="h-28 w-28 flex-shrink-0 rounded-md object-cover" />
          <div className="flex flex-1 flex-col gap-2">
            <FieldInputs value={d.fields} onChange={(fields) => patch(d.key, { fields })} />
            {d.error && <p className="text-xs text-red-400">{d.error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => save(d)}
                disabled={!canSave(d.fields) || d.saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-accent-fg disabled:opacity-40"
              >
                {d.saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {d.saving ? "Saving…" : hasLink(d.fields) ? "Save" : "Save without link"}
              </button>
              <button
                onClick={() => remove(d.key)}
                disabled={d.saving}
                className="rounded-lg border border-base-700 px-3 py-1.5 text-sm text-base-400 hover:border-base-600 hover:text-base-200"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      ))}

      {drafts.length > 1 && (
        <button
          onClick={saveAll}
          disabled={readyCount === 0}
          className="self-start rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-fg disabled:opacity-40"
        >
          Save all ready ({readyCount})
        </button>
      )}
    </section>
  );
}

// ---- Editing existing models ----

function toFields(item: LibraryItem): LibraryFields {
  return {
    title: item.title,
    category: item.category,
    subcategory: item.subcategory ?? "",
    downloadUrl: item.download_url ?? "",
  };
}

function ItemRow({
  item,
  prepare,
  onChange,
  onDeleted,
}: {
  item: LibraryItem;
  prepare: Prepare;
  onChange: (item: LibraryItem) => void;
  onDeleted: () => void;
}) {
  const [fields, setFields] = useState(() => toFields(item));
  const [busy, setBusy] = useState<null | "save" | "photo" | "delete">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => setFields(toFields(item)), [item]);

  const original = toFields(item);
  const dirty = (Object.keys(fields) as (keyof LibraryFields)[]).some((k) => fields[k].trim() !== original[k].trim());

  async function run(kind: "save" | "photo" | "delete", task: () => Promise<void>, done: string) {
    setBusy(kind);
    setMessage(null);
    try {
      await task();
      setMessage({ text: done, error: false });
    } catch (err) {
      setMessage({ text: errorText(err), error: true });
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run(
      "save",
      async () => {
        const changed = (Object.keys(fields) as (keyof LibraryFields)[]).filter((k) => fields[k].trim() !== original[k].trim());
        onChange(await updateLibraryItem(item.id, Object.fromEntries(changed.map((k) => [k, fields[k]]))));
      },
      "Saved"
    );

  const replacePhoto = (file: File) =>
    run("photo", async () => onChange(await updateLibraryItem(item.id, {}, await prepare(file))), "Photo replaced");

  return (
    <div className="flex flex-col gap-3 border-b border-base-700 py-4 sm:flex-row">
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-base-800">
        <Thumb src={item.preview_url} alt={item.title} className="h-full w-full object-cover" />
        {!item.download_url && (
          <span className="absolute inset-x-0 bottom-0 bg-amber-400 py-0.5 text-center text-[10px] font-semibold text-base-950">
            Missing link
          </span>
        )}
        <label
          className="absolute inset-0 flex cursor-pointer items-center justify-center bg-base-950/70 text-[11px] font-medium text-base-200 opacity-0 transition-opacity hover:opacity-100"
          title="Replace photo"
        >
          {busy === "photo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-1"><Upload className="h-3.5 w-3.5" /> Replace</span>}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) replacePhoto(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <FieldInputs value={fields} onChange={setFields} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            onClick={save}
            disabled={!dirty || !canSave(fields) || busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 font-semibold text-accent-fg disabled:opacity-40"
          >
            {busy === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save changes
          </button>
          {dirty && (
            <button onClick={() => setFields(original)} className="rounded-lg px-3 py-1.5 text-base-400 hover:text-base-200">
              Undo
            </button>
          )}
          {item.download_url && (
            <a
              href={item.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-base-400 no-underline hover:text-accent"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Test link
            </a>
          )}
          <button
            onClick={() =>
              confirmDelete
                ? run("delete", async () => {
                    await deleteLibraryItem(item.id);
                    onDeleted();
                  }, "Deleted")
                : setConfirmDelete(true)
            }
            onBlur={() => setConfirmDelete(false)}
            disabled={busy !== null}
            className={`ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 ${confirmDelete ? "bg-red-500/15 text-red-400" : "text-base-400 hover:text-red-400"}`}
          >
            <Trash2 className="h-3.5 w-3.5" /> {confirmDelete ? "Click again to delete" : "Delete"}
          </button>
          {message && <span className={`w-full text-xs ${message.error ? "text-red-400" : "text-accent"}`}>{message.text}</span>}
        </div>
      </div>
    </div>
  );
}

export default function LibraryManager() {
  const { prepare, modelProgress } = usePhotoPreparer();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [total, setTotal] = useState(0);
  // "missing" lists only models without a Drive link (hidden from the site until one is added).
  const [view, setView] = useState<"all" | "missing">("all");
  const [missingCount, setMissingCount] = useState(0);
  const [categories, setCategories] = useState<[string, number][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (offset: number) => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const page = await listLibrary({ q, category, offset, missingLink: view === "missing" });
      if (request !== requestRef.current) return;
      setItems((prev) => (offset === 0 ? page.items : [...prev, ...page.items]));
      setTotal(page.total);
      setMissingCount(page.missingCount);
      if (page.categories) setCategories(page.categories);
    } catch (err) {
      if (request === requestRef.current) setError(errorText(err));
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [q, category, view]);

  // Debounced so typing in the search box doesn't send a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(0), 300);
    return () => clearTimeout(t);
  }, [load]);

  function bumpCategory(name: string, delta: number) {
    setCategories((prev) => {
      const map = new Map(prev);
      const next = (map.get(name) ?? 0) + delta;
      if (next > 0) map.set(name, next);
      else map.delete(name);
      return Array.from(map).sort((a, b) => a[0].localeCompare(b[0]));
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <datalist id={CATEGORY_LIST_ID}>
        {categories.map(([name]) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {modelProgress !== null && (
        <p className="flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Downloading the image-search AI model (one time only)… {Math.round(modelProgress)}%
        </p>
      )}

      <AddModels
        prepare={prepare}
        onSaved={(item) => {
          bumpCategory(item.category, 1);
          if (!item.download_url) setMissingCount((n) => n + 1);
          if (view === "missing" && item.download_url) return;
          setItems((prev) => [item, ...prev]);
          setTotal((t) => t + 1);
        }}
      />

      <section className="flex flex-col gap-4 rounded-xl2 border border-base-700 bg-base-900 p-6">
        <div className="flex gap-2" role="tablist" aria-label="Which models to show">
          {(
            [
              ["all", "All models", null],
              ["missing", "Missing link", missingCount],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${
                view === id ? "border-accent bg-accent/15 text-accent" : "border-base-700 text-base-400 hover:border-base-600 hover:text-base-200"
              }`}
            >
              {label}
              {count !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${count > 0 ? "bg-amber-400 text-base-950" : "bg-base-700 text-base-400"}`}
                >
                  {count.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-base-200">{view === "missing" ? "Missing a Drive link" : "Library"}</h2>
            <p className="mt-1 text-sm text-base-400">
              {view === "missing"
                ? `${total.toLocaleString()} ${total === 1 ? "model is" : "models are"} hidden from the site until you paste a Drive link and press Save.`
                : `${total.toLocaleString()} ${total === 1 ? "model" : "models"}${q || category ? " match" : ""}. Edit a title, category or link and press Save; hover a photo to replace it.`}
            </p>
          </div>
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search titles…"
              aria-label="Search titles"
              className={`${field} w-56 pl-9`}
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className={`${field} w-48`}
          >
            <option value="">All categories</option>
            {categories.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
        </div>

        {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <div className="flex flex-col">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              prepare={prepare}
              onChange={(updated) => {
                if (updated.category !== item.category) {
                  bumpCategory(item.category, -1);
                  bumpCategory(updated.category, 1);
                }
                const hadLink = Boolean(item.download_url);
                const nowHasLink = Boolean(updated.download_url);
                if (hadLink !== nowHasLink) setMissingCount((n) => n + (nowHasLink ? -1 : 1));
                // Once a missing model gets its link it's done: drop it from the "Missing link" list.
                if (view === "missing" && nowHasLink) {
                  setItems((prev) => prev.filter((i) => i.id !== updated.id));
                  setTotal((t) => t - 1);
                  return;
                }
                setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
              }}
              onDeleted={() => {
                setItems((prev) => prev.filter((i) => i.id !== item.id));
                setTotal((t) => t - 1);
                if (!item.download_url) setMissingCount((n) => n - 1);
                bumpCategory(item.category, -1);
              }}
            />
          ))}
        </div>

        {!loading && items.length === 0 && !error && (
          <p className="py-6 text-center text-sm text-base-400">
            {view === "missing" && !q && !category
              ? "Every model has a Drive link."
              : q || category
                ? "No models match."
                : "The library is empty. Add models above, or run npm run import-library (see README)."}
          </p>
        )}
        {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-base-400" />}
        {!loading && items.length < total && (
          <button
            onClick={() => load(items.length)}
            className="mx-auto rounded-lg border border-base-600 px-6 py-2 text-sm font-semibold text-base-200 hover:border-accent hover:text-accent"
          >
            Load more ({(total - items.length).toLocaleString()} left)
          </button>
        )}
      </section>
    </div>
  );
}
