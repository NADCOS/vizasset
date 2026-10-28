import Link from "next/link";
import Logo from "./Logo";
import HeaderSearch from "./HeaderSearch";
import MessengerLink from "./MessengerLink";
import { buildContactLink } from "@/lib/messenger";

export default function Header() {
  const link = buildContactLink();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-base-700 bg-base-950/85 px-4 py-4 backdrop-blur sm:gap-7 sm:px-10">
      <Link href="/" className="flex shrink-0 items-center gap-2.5 no-underline">
        <Logo className="h-7 w-7 fill-accent" />
        <span className="hidden text-base font-semibold text-base-200 sm:inline">VizAssets</span>
      </Link>
      <HeaderSearch />
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
        <MessengerLink
          href={link}
          location="header"
          className="whitespace-nowrap rounded-lg bg-accent px-4.5 py-2 font-semibold text-accent-fg no-underline hover:bg-accent-dim"
        >
          Message Us
        </MessengerLink>
      </nav>
    </header>
  );
}
