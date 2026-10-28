"use client";

import { useEffect, useState } from "react";

// aboveBar: on phones, sit above the sticky buy bar instead of covering it.
export default function BackToTop({ aboveBar = false }: { aboveBar?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={`fixed right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-base-700 bg-base-900 text-base-200 shadow-card hover:border-accent hover:text-accent ${aboveBar ? "bottom-24 sm:bottom-6" : "bottom-6"}`}
    >
      ↑
    </button>
  );
}
