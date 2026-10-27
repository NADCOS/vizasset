import Link from "next/link";
import ReverseImageSearch from "@/src/components/ReverseImageSearch";
import BackToTop from "@/components/BackToTop";

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-base-950 px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-accent no-underline hover:text-accent-dim">← Back to VizAssets</Link>
      </div>
      <ReverseImageSearch />
      <BackToTop />
    </main>
  );
}
