"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function LoadingScreen() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-base-950 transition-all duration-500 ${
        loaded ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <Logo className="h-16 w-16 animate-pulse2 fill-accent" />
    </div>
  );
}
