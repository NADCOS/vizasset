import Link from "next/link";
import Reveal from "@/components/Reveal";
import Thumb from "@/components/Thumb";
import { LibraryCard, modelSearchUrl } from "@/lib/models";

const NEW_FOR_DAYS = 14;

// Models added through /admin, newest first, so returning visitors see the library growing.
export default function RecentModels({ models, now }: { models: (LibraryCard & { createdAt: string })[]; now: number }) {
  if (models.length < 4) return null;
  return (
    <Reveal as="section" className="mx-auto max-w-7xl px-6 pb-16 sm:px-10">
      <div className="mb-8">
        <span className="text-sm font-semibold uppercase tracking-wide text-accent">Just added</span>
        <h2 className="mt-2 text-2xl font-semibold text-base-200 sm:text-3xl">Recently added models</h2>
        <p className="mt-2 text-sm text-base-400">Included in the bundle at no extra cost, for new and existing buyers.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {models.map((m) => {
          const isNew = now - Date.parse(m.createdAt) < NEW_FOR_DAYS * 86_400_000;
          return (
            <Link
              key={m.id}
              href={modelSearchUrl(m.id)}
              className="group flex flex-col gap-2 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-base-800">
                <Thumb src={m.previewUrl} alt={m.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                {isNew && (
                  <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">
                    New
                  </span>
                )}
              </div>
              <span className="line-clamp-2 text-sm font-medium text-base-200 group-hover:text-accent">{m.title}</span>
              <span className="-mt-1.5 text-xs text-base-400">{m.category}</span>
            </Link>
          );
        })}
      </div>
    </Reveal>
  );
}
