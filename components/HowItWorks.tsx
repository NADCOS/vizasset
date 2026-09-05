const STEPS = [
  { n: "01", title: "Browse bundles", body: "Check the included model counts, formats and preview thumbnails." },
  { n: "02", title: "Message us", body: 'Tap "Purchase via GCash" — it opens Messenger with your order pre-filled.' },
  { n: "03", title: "Pay via GCash", body: "Send payment to the GCash number we share in chat." },
  { n: "04", title: "Get your download link", body: "We send a secure cloud download link straight to your Messenger chat — updated regularly with new models at no extra cost." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl border-b border-base-700 px-6 py-16 sm:px-10 sm:py-20">
      <div className="mb-11 max-w-xl">
        <span className="text-sm font-semibold uppercase tracking-wide text-accent">How It Works</span>
        <h2 className="mt-2.5 text-2xl font-semibold text-base-200 sm:text-3xl">
          No cart, no account — just message us
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-accent">{s.n}</span>
            <h3 className="text-base font-semibold text-base-200">{s.title}</h3>
            <p className="text-sm leading-relaxed text-base-400">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
