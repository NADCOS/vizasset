"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Check, Heart, Link2, MessageCircle, Trash2, X } from "lucide-react";
import { shortlistShareUrl, useShortlist } from "@/lib/shortlist";
import { buildShortlistMessengerLink } from "@/lib/messenger";
import { modelSearchUrl } from "@/lib/models";
import MessengerLink from "./MessengerLink";
import Thumb from "./Thumb";

// Floating "Shortlist (n)" button on public pages; opens a panel to review, share or send the list.
export default function ShortlistDock() {
  const pathname = usePathname();
  const { items, remove, clear } = useShortlist();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (items.length === 0) setOpen(false);
  }, [items.length]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/shortlist") || items.length === 0) return null;

  const shareUrl = shortlistShareUrl(items);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        // Above the phone-only sticky buy bar on the home page.
        className="fixed bottom-24 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-accent/50 bg-base-900 px-4 py-2.5 text-sm font-semibold text-base-200 shadow-card hover:border-accent sm:bottom-6 sm:left-6"
      >
        <Heart className="h-4 w-4 fill-accent text-accent" /> Shortlist ({items.length})
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-base-950/70 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Your shortlist"
            className="flex h-full w-full max-w-md flex-col border-l border-base-700 bg-base-900 shadow-card"
          >
            <div className="flex items-center justify-between border-b border-base-700 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-base-200">Your shortlist</h2>
                <p className="text-xs text-base-400">
                  {items.length} {items.length === 1 ? "model" : "models"} · saved in this browser
                </p>
              </div>
              <button ref={closeRef} onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-2 text-base-400 hover:text-base-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto px-5 py-3">
              {items.map((m) => (
                <li key={m.id} className="flex items-center gap-3 border-b border-base-800 py-2.5">
                  <Link href={modelSearchUrl(m.id)} onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-center gap-3 no-underline">
                    <Thumb src={m.previewUrl} alt="" className="h-14 w-14 flex-shrink-0 rounded-md bg-base-800 object-cover" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-base-200">{m.title}</span>
                      <span className="truncate text-xs text-base-400">{m.category}</span>
                    </span>
                  </Link>
                  <button
                    onClick={() => remove(m.id)}
                    aria-label={`Remove ${m.title}`}
                    className="rounded-md p-1.5 text-base-400 hover:bg-base-800 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2.5 border-t border-base-700 p-5">
              <MessengerLink
                href={buildShortlistMessengerLink(items.map((i) => i.title), shareUrl)}
                location="shortlist"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-fg no-underline hover:bg-accent-dim hover:text-accent-fg"
              >
                <MessageCircle className="h-4 w-4" /> Send this list to us on Messenger
              </MessengerLink>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    } catch {}
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-base-600 px-4 py-2.5 text-sm text-base-200 hover:border-accent hover:text-accent"
                >
                  {copied ? <Check className="h-4 w-4 text-accent" /> : <Link2 className="h-4 w-4" />}
                  {copied ? "Link copied" : "Copy share link"}
                </button>
                <button
                  onClick={() => (confirmClear ? clear() : setConfirmClear(true))}
                  onBlur={() => setConfirmClear(false)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm ${
                    confirmClear ? "bg-red-500/15 text-red-400" : "text-base-400 hover:text-red-400"
                  }`}
                >
                  <Trash2 className="h-4 w-4" /> {confirmClear ? "Clear all?" : "Clear"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
