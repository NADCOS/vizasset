"use client";

import { useEffect, useState } from "react";
import MessengerLink from "./MessengerLink";

// Phones only: once the visitor scrolls past the hero, keep the buy button one tap away.
export default function StickyBuyBar({ href, label, sublabel }: { href: string; label: string; sublabel: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-base-700 bg-base-950/95 px-4 py-3 backdrop-blur transition-transform duration-300 sm:hidden ${
        visible ? "translate-y-0" : "invisible translate-y-full"
      }`}
    >
      <MessengerLink
        href={href}
        location="sticky_bar"
        className="flex w-full flex-col items-center rounded-lg bg-accent py-2.5 text-accent-fg no-underline hover:bg-accent-dim hover:text-accent-fg"
      >
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-[11px] opacity-80">{sublabel}</span>
      </MessengerLink>
    </div>
  );
}
