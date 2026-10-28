import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Page not found — VizAssets",
};

const POPULAR = ["sofa", "lighting", "plants", "carpet", "kitchen", "bathroom"];

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base-950 px-6 py-16">
      <div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
        <Link href="/" aria-label="VizAssets home">
          <Logo className="h-12 w-12 fill-accent" />
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">404</p>
          <h1 className="mt-2 text-3xl font-semibold text-base-200">This page doesn&apos;t exist</h1>
          <p className="mt-2 text-base-400">The link may be old or mistyped. Try searching for the model instead.</p>
        </div>

        {/* Plain GET form to /search: works without scripts. */}
        <form action="/search" method="get" role="search" className="relative w-full">
          <label htmlFor="notfound-search" className="sr-only">
            Search models
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-base-400" />
          <input
            id="notfound-search"
            name="q"
            type="search"
            placeholder="Search models, e.g. sofa, Minotti, plant"
            className="w-full rounded-xl2 border border-base-600 bg-base-900 py-3.5 pl-12 pr-4 text-base-200 placeholder:text-base-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </form>

        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR.map((q) => (
            <Link
              key={q}
              href={`/search?q=${encodeURIComponent(q)}`}
              className="rounded-full border border-base-700 px-3 py-1.5 text-xs font-medium text-base-300 no-underline hover:border-accent hover:text-accent"
            >
              {q}
            </Link>
          ))}
        </div>

        <div className="flex gap-3">
          <Link
            href="/"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg no-underline hover:bg-accent-dim hover:text-accent-fg"
          >
            Go to the home page
          </Link>
          <Link
            href="/gallery"
            className="rounded-lg border border-base-600 px-5 py-2.5 text-sm font-medium text-base-200 no-underline hover:border-accent hover:text-accent"
          >
            Browse the gallery
          </Link>
        </div>
      </div>
    </main>
  );
}
