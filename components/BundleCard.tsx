import Image from "next/image";
import Link from "next/link";
import { BundleData } from "@/lib/bundles";
import { LibraryCard, modelSearchUrl } from "@/lib/models";
import { buildMessengerLink } from "@/lib/messenger";
import MessengerLink from "./MessengerLink";

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
    <article className="flex flex-col overflow-hidden rounded-xl2 border border-base-700 bg-base-900 shadow-card">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={bundle.heroImage}
          alt={bundle.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
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

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-base-200">{bundle.name}</h3>
          <span className="flex items-baseline gap-2 whitespace-nowrap rounded-md bg-accent/10 px-2.5 py-1">
            {bundle.originalPriceLabel && (
              <span className="text-xs text-base-400 line-through">{bundle.originalPriceLabel}</span>
            )}
            <span className="text-sm font-semibold text-accent">{bundle.priceLabel}</span>
          </span>
        </div>

        <ul className="flex flex-col gap-1.5 text-sm text-base-400">
          {bundle.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
              {h}
            </li>
          ))}
        </ul>

        {thumbs.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {thumbs.map((t) => (
              <Link
                key={t.id}
                href={modelSearchUrl(t.id)}
                title={t.title}
                className="relative block aspect-square overflow-hidden rounded-md bg-base-800"
              >
                {/* Plain <img>: thousands of model photos would use up Vercel's image optimization quota. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.previewUrl} alt={t.title} loading="lazy" className="h-full w-full object-cover" />
              </Link>
            ))}
          </div>
        )}

        <MessengerLink
          href={link}
          location="bundle_card"
          className="mt-auto inline-flex items-center justify-center rounded-lg border border-base-600 py-2.5 text-sm font-medium text-base-200 no-underline hover:border-accent hover:text-accent"
        >
          Purchase via GCash (Messenger)
        </MessengerLink>
        <Link
          href="/gallery"
          className="inline-flex items-center justify-center text-sm font-medium text-accent no-underline hover:text-accent-dim"
        >
          {modelCount > 0 ? `View all ${modelCount.toLocaleString()} included models →` : "View all included models →"}
        </Link>
      </div>
    </article>
  );
}
