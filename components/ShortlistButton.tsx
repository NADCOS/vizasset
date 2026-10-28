"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { ShortlistItem, SHORTLIST_MAX, useShortlist } from "@/lib/shortlist";

/**
 * Adds a model to (or removes it from) the visitor's shortlist.
 * "icon": a round button for photo corners. "full": a labelled button for quick view.
 */
export default function ShortlistButton({
  item,
  variant = "icon",
  className = "",
}: {
  item: ShortlistItem;
  variant?: "icon" | "full";
  className?: string;
}) {
  const shortlist = useShortlist();
  const [full, setFull] = useState(false);
  const saved = shortlist.has(item.id);
  const label = full ? `Shortlist full (${SHORTLIST_MAX})` : saved ? "Remove from shortlist" : "Save to shortlist";

  function onClick(e: React.MouseEvent) {
    // The button often sits on top of a link to the model.
    e.preventDefault();
    e.stopPropagation();
    if (!shortlist.toggle(item)) {
      setFull(true);
      setTimeout(() => setFull(false), 2500);
    }
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors ${
          saved ? "border-accent/60 bg-accent/10 text-accent" : "border-base-600 text-base-200 hover:border-accent hover:text-accent"
        } ${className}`}
      >
        <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        {full ? label : saved ? "Saved to shortlist" : "Save to shortlist"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-base-950/80 backdrop-blur transition-colors ${
        full ? "text-red-400" : saved ? "text-accent" : "text-base-200 hover:text-accent"
      } ${className}`}
    >
      <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
    </button>
  );
}
