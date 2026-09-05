import { faqs } from "@/lib/bundles";

export default function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-7xl border-t border-base-700 px-6 py-16 sm:px-10 sm:py-20">
      <div className="mb-10 max-w-xl">
        <span className="text-sm font-semibold uppercase tracking-wide text-accent">FAQ</span>
        <h2 className="mt-2.5 text-2xl font-semibold text-base-200 sm:text-3xl">Common questions</h2>
      </div>
      <div className="flex flex-col border-t border-base-700">
        {faqs.map((item) => (
          <div key={item.q} className="border-b border-base-700 py-5">
            <h3 className="mb-2 text-base font-semibold text-base-200">{item.q}</h3>
            <p className="max-w-2xl text-sm leading-relaxed text-base-400">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
