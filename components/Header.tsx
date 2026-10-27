import Link from "next/link";
import { Search } from "lucide-react";
import Logo from "./Logo";
import { buildMessengerLink } from "@/lib/messenger";

export default function Header() {
  const link = buildMessengerLink({ slug: "catalog", name: "catalog", priceLabel: "the listed price" });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-base-700 bg-base-950/85 px-4 py-4 backdrop-blur sm:gap-7 sm:px-10">
      <Link href="/" className="flex shrink-0 items-center gap-2.5 no-underline">
        <Logo className="h-7 w-7 fill-accent" />
        <span className="hidden text-base font-semibold text-base-200 sm:inline">VizAssets</span>
      </Link>
      {/* Plain GET form: /search reads ?q= and runs the name search. */}
      <form action="/search" method="get" role="search" className="relative min-w-0 max-w-md flex-1">
        <label htmlFor="header-search" className="sr-only">
          Search models
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-400" />
        <input
          id="header-search"
          type="search"
          name="q"
          placeholder="Search 3,700+ models…"
          className="w-full rounded-lg border border-base-600 bg-base-900 py-2 pl-9 pr-3 text-sm text-base-200 placeholder:text-base-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </form>
      <nav className="flex shrink-0 items-center gap-7 text-sm text-base-400">
        <a href="#bundles" className="hidden text-base-400 no-underline hover:text-base-200 sm:inline">
          Bundles
        </a>
        <a href="#how-it-works" className="hidden text-base-400 no-underline hover:text-base-200 sm:inline">
          How It Works
        </a>
        <a href="#faq" className="hidden text-base-400 no-underline hover:text-base-200 sm:inline">
          FAQ
        </a>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap rounded-lg bg-accent px-4.5 py-2 font-semibold text-accent-fg no-underline hover:bg-accent-dim"
        >
          Message Us
        </a>
      </nav>
    </header>
  );
}
