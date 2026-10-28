import Reveal from "@/components/Reveal";

export default function StatsRow({
  modelCount,
  categoryCount,
  priceLabel,
}: {
  modelCount: number;
  categoryCount: number;
  priceLabel: string;
}) {
  const stats = [
    { value: modelCount > 0 ? modelCount.toLocaleString() : "2,000+", label: "render-ready models" },
    { value: categoryCount > 0 ? String(categoryCount) : "30+", label: "categories" },
    { value: priceLabel, label: "one-time payment" },
    { value: "Free", label: "new models added regularly" },
  ];
  return (
    <Reveal className="mx-auto max-w-7xl px-6 sm:px-10">
      <dl className="-mt-8 relative z-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl2 border border-base-700 bg-base-700 shadow-card lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 bg-base-900 px-5 py-5 sm:px-6">
            <dt className="order-2 text-sm text-base-400">{s.label}</dt>
            <dd className="order-1 text-2xl font-semibold text-base-200 sm:text-3xl">{s.value}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}
