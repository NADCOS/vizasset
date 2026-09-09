import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import BundleCard from "@/components/BundleCard";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import BackToTop from "@/components/BackToTop";
import { bundles } from "@/lib/bundles";

export default function Home() {
  return (
    <main>
      <LoadingScreen />
      <Header />
      <Hero />
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
            <BundleCard key={b.slug} bundle={b} />
          ))}
        </div>
      </section>

      <Faq />
      <Footer />
      <BackToTop />
    </main>
  );
}
