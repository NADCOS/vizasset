import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { BundleData } from "@/lib/bundles";
import { LibraryCard, modelSearchUrl } from "@/lib/models";
import { buildMessengerLink } from "@/lib/messenger";
import MessengerLink from "./MessengerLink";
import Thumb from "./Thumb";

// One wide panel per bundle: photos on the left, price and the buy button on the right.
export default function BundleCard({
  bundle,
  thumbs,
  modelCount,
}: {
  bundle: BundleData;
  thumbs: LibraryCard[];
  modelCount: number;
}) {
  const link = buildMessengerLink(bundle);

  return (
    <article className="grid overflow-hidden rounded-xl2 border border-base-700 bg-base-900 shadow-card lg:grid-cols-[1.15fr_1fr]">
      <div className="flex flex-col gap-1.5 p-1.5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem]">
          <Image
            src={bundle.heroImage}
            alt={bundle.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 640px"
          />
          <span className="absolute left-4 top-4 rounded-full bg-base-950/80 px-3 py-1 text-xs font-medium text-base-200 backdrop-blur">
            {bundle.format}
          </span>
          {bundle.badge && (
            <span className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-fg">
              {bundle.badge}
            </span>
          )}
        </div>
        {thumbs.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {thumbs.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={modelSearchUrl(t.id)}
                title={t.title}
                className="group relative block aspect-square overflow-hidden rounded-[0.75rem] bg-base-800"
              >
                <Thumb src={t.previewUrl} alt={t.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 p-6 sm:p-8 lg:p-10">
        <div>
          <h3 className="text-2xl font-semibold text-base-200 sm:text-3xl">{bundle.name}</h3>
          <p className="mt-2 text-sm text-base-400">
            {modelCount > 0 ? `${modelCount.toLocaleString()} models` : "Thousands of models"} · one-time payment ·
            free updates
          </p>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold leading-none text-accent">{bundle.priceLabel}</span>
          {bundle.originalPriceLabel && (
            <span className="text-xl text-base-400 line-through">{bundle.originalPriceLabel}</span>
          )}
        </div>

        <ul className="flex flex-col gap-2.5 text-sm text-base-200">
          {bundle.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
              {h}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3">
          <MessengerLink
            href={link}
            location="bundle_card"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3.5 text-base font-semibold text-accent-fg no-underline transition-colors hover:bg-accent-dim hover:text-accent-fg"
          >
            Buy via GCash on Messenger
          </MessengerLink>
          <Link
            href="/gallery"
            className="inline-flex items-center justify-center rounded-lg border border-base-600 px-6 py-3 text-sm font-medium text-base-200 no-underline transition-colors hover:border-accent hover:text-accent"
          >
            {modelCount > 0 ? `Browse all ${modelCount.toLocaleString()} models` : "Browse all models"}
          </Link>
        </div>
      </div>
    </article>
  );
}
