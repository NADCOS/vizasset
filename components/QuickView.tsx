"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// A model popup: closes with Esc, the X or a click outside, and locks page scroll while open.
export default function QuickView({
  open,
  onClose,
  image,
  title,
  subtitle,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  image: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Kept in a ref so a parent re-render (new onClose function) doesn't re-run the open effect.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      // Keep Tab inside the popup.
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);

  // Scroll back to the top when switching to another model inside the popup.
  useEffect(() => {
    dialogRef.current?.scrollTo({ top: 0 });
  }, [image]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-base-950/80 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-xl2 border border-base-700 bg-base-900 shadow-card sm:rounded-xl2"
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-base-950/80 p-2 text-base-200 backdrop-blur hover:text-accent"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="grid gap-0 md:grid-cols-[1.3fr_1fr]">
          <div className="flex items-center justify-center bg-base-800 md:min-h-[420px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={title} className="max-h-[60vh] w-full object-contain" />
          </div>
          <div className="flex flex-col gap-4 p-6">
            {subtitle && <span className="text-xs font-medium uppercase tracking-wide text-base-400">{subtitle}</span>}
            <h2 className="pr-8 text-xl font-semibold text-base-200">{title}</h2>
            {actions && <div className="mt-auto flex flex-col gap-2.5">{actions}</div>}
          </div>
        </div>
        {children && <div className="border-t border-base-700 p-6">{children}</div>}
      </div>
    </div>
  );
}
