import Logo from "./Logo";
import { buildMessengerLink } from "@/lib/messenger";

export default function Header() {
  const link = buildMessengerLink({ slug: "catalog", name: "catalog", priceLabel: "the listed price" });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-base-700 bg-base-950/85 px-6 py-4 backdrop-blur sm:px-10">
      <div className="flex items-center gap-2.5">
        <Logo className="h-7 w-7 fill-accent" />
        <span className="text-base font-semibold text-base-200">VizAssets</span>
      </div>
      <nav className="flex items-center gap-7 text-sm text-base-400">
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
