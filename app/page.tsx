import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import BundleCard from "@/components/BundleCard";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import Reveal from "@/components/Reveal";
import StickyBuyBar from "@/components/StickyBuyBar";
import StatsRow from "@/components/home/StatsRow";
import ModelMarquee from "@/components/home/ModelMarquee";
import CategoryTiles, { CategorySummary } from "@/components/home/CategoryTiles";
import RecentModels from "@/components/home/RecentModels";
import { bundles } from "@/lib/bundles";
import { getLibraryCards, getRecentUploads } from "@/lib/library";
import { LibraryCard } from "@/lib/models";
import { buildMessengerLink } from "@/lib/messenger";
import { SITE_URL } from "@/lib/site";

// The models are read on the server and cached; /api/admin refreshes this page after every
// change, and the hourly revalidate is only a fallback.
export const revalidate = 3600;

const THUMBS_PER_CARD = 4;
const MARQUEE_SIZE = 24;
const TOP_CATEGORIES = 6;

function sample<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  return [...items].sort(() => Math.random() - 0.5).slice(0, n);
}

function summarizeCategories(models: LibraryCard[]): { top: CategorySummary[]; count: number } {
  const byCategory = new Map<string, LibraryCard[]>();
  for (const m of models) byCategory.set(m.category, [...(byCategory.get(m.category) ?? []), m]);
  const top = Array.from(byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, TOP_CATEGORIES)
    .map(([name, list]) => ({ name, count: list.length, previewUrl: sample(list, 1)[0].previewUrl }));
  return { top, count: byCategory.size };
}

export default async function Home() {
  // Every library model belongs to the all-in bundle (the only one sold today).
  const [models, recent] = await Promise.all([getLibraryCards(), getRecentUploads()]);
  const categories = summarizeCategories(models);
  const featured = bundles[0];

  const productJsonLd = bundles.map((b) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: b.name,
    description: b.highlights.join(". "),
    image: b.heroImage.startsWith("http") ? b.heroImage : `${SITE_URL}${b.heroImage}`,
    brand: { "@type": "Brand", name: "VizAssets" },
    offers: {
      "@type": "Offer",
      price: b.price,
      priceCurrency: "PHP",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/#bundles`,
    },
  }));

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <Header />
      <Hero modelCount={models.length} />
      <StatsRow modelCount={models.length} categoryCount={categories.count} priceLabel={featured.priceLabel} />
      <ModelMarquee models={sample(models, MARQUEE_SIZE)} />
      <CategoryTiles categories={categories.top} total={models.length} />
      <RecentModels models={recent} now={Date.now()} />

      <section id="bundles" className="mx-auto max-w-7xl px-6 pb-16 sm:px-10 sm:pb-24">
        <Reveal className="mb-10 flex max-w-xl flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-accent">The bundle</span>
          <h2 className="text-3xl font-semibold text-base-200 md:text-4xl">Everything, for one small price</h2>
          <p className="text-base-400">
            Organized layers, real-world scale, PBR materials, optimized for V-Ray and Corona.
          </p>
        </Reveal>
        <div className="flex flex-col gap-7">
          {bundles.map((b) => (
            <Reveal key={b.slug}>
              <BundleCard bundle={b} modelCount={models.length} thumbs={sample(models, THUMBS_PER_CARD)} />
            </Reveal>
          ))}
        </div>
      </section>

      <HowItWorks />
      <Faq />
      <Footer />
      <BackToTop aboveBar />
      <StickyBuyBar
        href={buildMessengerLink(featured)}
        label={
          models.length > 0
            ? `Get all ${models.length.toLocaleString()} models — ${featured.priceLabel}`
            : `Get the bundle — ${featured.priceLabel}`
        }
        sublabel="Pay via GCash on Messenger"
      />
    </main>
  );
}
