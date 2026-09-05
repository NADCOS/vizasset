export interface BundleData {
  slug: string;
  name: string;
  priceLabel: string;
  originalPriceLabel?: string;
  badge?: string;
  format: string;
  heroImage: string;
  highlights: string[];
  thumbs: { src: string; alt: string }[];
}

export const bundles: BundleData[] = [
  {
    slug: "all-in-3ds-max",
    name: "All-In 3ds Max Models",
    priceLabel: "₱299",
    originalPriceLabel: "₱1,999",
    badge: "On Sale",
    format: "3ds Max",
    heroImage: "/images/bundles/all-in-3ds-max/hero.jpg",
    highlights: [
      "2,000+ models — every 3ds Max collection combined",
      "Interiors, furniture & site props",
      "PBR materials for all assets",
      "Optimized for V-Ray & Corona",
    ],
    thumbs: Array.from({ length: 8 }, (_, i) => ({
      src: `/images/bundles/all-in-3ds-max/thumb-${i + 1}.jpg`,
      alt: `Asset preview ${i + 1}`,
    })),
  },
];

export const faqs = [
  {
    q: "What file formats do I get?",
    a: "Each bundle ships as native .max (3ds Max) files, organized by category with clean layer/group structure.",
  },
  {
    q: "Which renderers are supported?",
    a: "All models are tested and optimized for V-Ray and Corona. Materials are PBR-ready and use real-world scale.",
  },
  {
    q: "How do I pay?",
    a: "Message us via the Messenger button — your order details come pre-filled. We'll confirm the total and send a GCash number to pay to.",
  },
  {
    q: "How do I get the files after paying?",
    a: "Once payment is confirmed, we send a secure cloud download link directly in the same Messenger chat.",
  },
  {
    q: "Can I use these in commercial projects?",
    a: "Yes. Bundles are licensed for both personal and commercial architectural visualization work.",
  },
];
