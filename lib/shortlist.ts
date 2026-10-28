"use client";

import { useSyncExternalStore } from "react";
import type { LibraryCard } from "@/lib/models";

// A visitor's shortlist of models, kept in this browser only (localStorage). It's a
// convenience: if storage is blocked (private mode), the list just lasts for this page.
export type ShortlistItem = Pick<LibraryCard, "id" | "title" | "category" | "previewUrl">;

const KEY = "vz_shortlist";
const MAX_ITEMS = 50;
const EMPTY: ShortlistItem[] = [];

let items: ShortlistItem[] | null = null;
const listeners = new Set<() => void>();

function read(): ShortlistItem[] {
  if (items) return items;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    items = Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.id === "string").slice(0, MAX_ITEMS) : [];
  } catch {
    items = [];
  }
  return items;
}

function write(next: ShortlistItem[]) {
  items = next.slice(0, MAX_ITEMS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    items = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const SHORTLIST_MAX = MAX_ITEMS;

export function useShortlist() {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    items: list,
    has: (id: string) => list.some((i) => i.id === id),
    /** Adds or removes a model; returns false when the list is full. */
    toggle(item: ShortlistItem) {
      const current = read();
      if (current.some((i) => i.id === item.id)) {
        write(current.filter((i) => i.id !== item.id));
        return true;
      }
      if (current.length >= MAX_ITEMS) return false;
      const { id, title, category, previewUrl } = item;
      write([{ id, title, category, previewUrl }, ...current]);
      return true;
    },
    add(newItems: ShortlistItem[]) {
      const current = read();
      const ids = new Set(current.map((i) => i.id));
      write([...current, ...newItems.filter((i) => !ids.has(i.id))]);
    },
    remove: (id: string) => write(read().filter((i) => i.id !== id)),
    clear: () => write([]),
  };
}

/** A link anyone can open to see the same models (the list itself stays in this browser). */
export function shortlistShareUrl(list: ShortlistItem[]) {
  const url = new URL("/shortlist", window.location.origin);
  url.searchParams.set("ids", list.map((i) => i.id).join(","));
  return url.toString();
}
