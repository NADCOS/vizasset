"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, MessageCircle } from "lucide-react";
import { LibraryCard, modelSearchUrl } from "@/lib/models";
import { loadLibraryNames } from "@/lib/libraryNames";
import { shortlistShareUrl, useShortlist } from "@/lib/shortlist";
import { buildShortlistMessengerLink } from "@/lib/messenger";
import MessengerLink from "./MessengerLink";
import ShortlistButton from "./ShortlistButton";
import Thumb from "./Thumb";

// /shortlist?ids=a,b,c — someone's shared list, or (without ids) the visitor's own.
export default function ShortlistView({ buy }: { buy: { href: string; priceLabel: string } }) {
  const shortlist = useShortlist();
  const [sharedIds, setSharedIds] = useState<string[] | null>(null);
  const [models, setModels] = useState<LibraryCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = new URLSearchParams(window.location.search).get("ids");
    setSharedIds(ids ? ids.split(",").filter(Boolean).slice(0, 100) : []);
    loadLibraryNames()
      .then(setModels)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load models"));
  }, []);

  const shared = sharedIds !== null && sharedIds.length > 0;
  const list = useMemo(() => {
    if (!shared) return shortlist.items;
    if (!models) return [];
    const byId = new Map(models.map((m) => [m.id, m]));
    return sharedIds!.map((id) => byId.get(id)).filter((m): m is LibraryCard => Boolean(m));
  }, [shared, sharedIds, models, shortlist.items]);

  if (sharedIds === null || (shared && !models && !error)) {
    return <Loader2 className="mx-auto h-6 w-6 animate-spin text-base-400" aria-label="Loading" />;
  }
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  if (list.length === 0) {
    return (
      <p className="rounded-xl2 border border-base-700 bg-base-900 px-6 py-10 text-center text-sm text-base-400">
        {shared ? "These models aren't available anymore." : "Your shortlist is empty. Tap the ♡ on any model to save it here."}{" "}
        <Link href="/gallery">Browse the gallery</Link>
      </p>
    );
  }

  const missing = shared ? sharedIds!.length - list.length : 0;
  const allSaved = list.every((m) => shortlist.has(m.id));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <MessengerLink
          href={buildShortlistMessengerLink(list.map((m) => m.title), shared ? window.location.href : shortlistShareUrl(list))}
          location="shortlist_page"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg no-underline hover:bg-accent-dim hover:text-accent-fg"
        >
          <MessageCircle className="h-4 w-4" /> Ask about these on Messenger
        </MessengerLink>
        <MessengerLink
          href={buy.href}
          location="shortlist_page_buy"
          className="inline-flex items-center rounded-lg border border-base-600 px-5 py-2.5 text-sm font-medium text-base-200 no-underline hover:border-accent hover:text-accent"
        >
          Get the whole bundle — {buy.priceLabel}
        </MessengerLink>
        {shared && !allSaved && (
          <button
            onClick={() => shortlist.add(list)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-base-300 hover:text-accent"
          >
            <Heart className="h-4 w-4" /> Save all to my shortlist
          </button>
        )}
      </div>
      {missing > 0 && (
        <p className="text-xs text-base-500">
          {missing} {missing === 1 ? "model is" : "models are"} no longer in the library.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((m) => (
          <div key={m.id} className="group relative flex flex-col gap-2">
            <Link href={modelSearchUrl(m.id)} className="flex flex-col gap-2 no-underline">
              <div className="aspect-square overflow-hidden rounded-lg bg-base-800">
                <Thumb src={m.previewUrl} alt={m.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              <span className="line-clamp-2 text-sm font-medium text-base-200 group-hover:text-accent">{m.title}</span>
              <span className="-mt-1.5 text-xs text-base-400">{m.category}</span>
            </Link>
            <ShortlistButton item={m} className="absolute right-2 top-2" />
          </div>
        ))}
      </div>
    </>
  );
}
