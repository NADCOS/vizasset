import Link from "next/link";
import Thumb from "@/components/Thumb";
import { LibraryCard, modelSearchUrl } from "@/lib/models";

// An endless, slowly scrolling row of model photos (pauses on hover; still for reduced motion).
export default function ModelMarquee({ models }: { models: LibraryCard[] }) {
  if (models.length < 6) return null;
  const tile = (m: LibraryCard, hidden: boolean) => (
    <Link
      key={`${hidden ? "b" : "a"}-${m.id}`}
      href={modelSearchUrl(m.id)}
      title={m.title}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className="group relative block h-36 w-36 flex-shrink-0 overflow-hidden rounded-lg bg-base-800 sm:h-44 sm:w-44"
    >
      <Thumb src={m.previewUrl} alt={hidden ? "" : m.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
    </Link>
  );
  return (
    <section aria-label="A sample of the models" className="overflow-hidden py-14">
      {/* The list is rendered twice so the -50% animation loops seamlessly. */}
      <div className="marquee flex w-max gap-3">
        {models.map((m) => tile(m, false))}
        {models.map((m) => tile(m, true))}
      </div>
    </section>
  );
}
