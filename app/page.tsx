import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import BundleCard from "@/components/BundleCard";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import { bundles } from "@/lib/bundles";
import { getLibraryCards } from "@/lib/library";
import { SITE_URL } from "@/lib/site";

// The models are read on the server and cached; /api/admin refreshes this page after every
// change, and the hourly revalidate is only a fallback.
export const revalidate = 3600;

const THUMBS_PER_CARD = 8;

function sample<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  return [...items].sort(() => Math.random() - 0.5).slice(0, n);
}

export default async function Home() {
  // Every library model belongs to the all-in bundle (the only one sold today).
  const models = await getLibraryCards();

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
      <HowItWorks />

      <section id="bundles" className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24">
        <div className="mb-10 flex max-w-xl flex-col gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-accent">Bundles</span>
          <h2 className="text-3xl font-semibold text-base-200 md:text-4xl">
            Curated model packs, ready to render
          </h2>
          <p className="text-base-400">
            Each bundle is a themed collection — organized layers, real-world scale, PBR
            materials, optimized for V-Ray and Corona.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b) => (
            <BundleCard key={b.slug} bundle={b} modelCount={models.length} thumbs={sample(models, THUMBS_PER_CARD)} />
          ))}
        </div>
      </section>

      <Faq />
      <Footer />
      <BackToTop />
    </main>
  );
}
