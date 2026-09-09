export interface BundleData {
  slug: string;
  name: string;
  priceLabel: string;
  originalPriceLabel?: string;
  badge?: string;
  format: string;
  heroImage: string;
  highlights: string[];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

// Preview images are stored in Supabase Storage (bucket "previews") and
// uploaded via /admin. Paths have no file extension — content-type is set
// at upload time — so this URL is stable no matter what file format is used.
export function previewUrl(path: string): string {
  if (!supabaseUrl) return "/images/bundles/placeholder.jpg";
  return `${supabaseUrl}/storage/v1/object/public/previews/${path}`;
}

const RAW_BUNDLES: Omit<BundleData, "heroImage">[] = [
  {
    slug: "all-in-3ds-max",
    name: "All-In 3ds Max Models",
    priceLabel: "₱299",
    originalPriceLabel: "₱1,999",
    badge: "On Sale",
    format: "3ds Max",
    highlights: [
      "2,000+ models — every 3ds Max collection combined",
      "Interiors, furniture & site props",
      "PBR materials for all assets",
      "Optimized for V-Ray & Corona",
    ],
  },
];

export const bundles: BundleData[] = RAW_BUNDLES.map((b) => ({
  ...b,
  heroImage: previewUrl(`bundles/${b.slug}/hero`),
}));

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
