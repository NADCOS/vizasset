export interface BundleData {
  slug: string;
  name: string;
  // Prices in PHP. priceLabel / originalPriceLabel are derived from these.
  price: number;
  originalPrice?: number;
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

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

const RAW_BUNDLES: Omit<BundleData, "heroImage" | "priceLabel" | "originalPriceLabel">[] = [
  {
    slug: "all-in-3ds-max",
    name: "All-In 3ds Max Models",
    price: 299,
    originalPrice: 1999,
    badge: "On Sale",
    format: "3ds Max",
    highlights: [
      "Every 3ds Max collection combined in one download",
      "Interiors, furniture & site props",
      "PBR materials for all assets",
      "Optimized for V-Ray & Corona",
    ],
  },
];

export const bundles: BundleData[] = RAW_BUNDLES.map((b) => ({
  ...b,
  priceLabel: formatPeso(b.price),
  originalPriceLabel: b.originalPrice ? formatPeso(b.originalPrice) : undefined,
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
    a: "Send us the Google account email you want to use. Once payment is confirmed, we give that email access to the private Google Drive folder, so you can download every model straight from Drive.",
  },
  {
    q: "Why does a download link ask me to request access?",
    a: "The files are private and only open for buyers whose Google email has been added. If you've paid and still see a request-access page, make sure you're signed in to Google with the email you gave us, or message us to update it.",
  },
  {
    q: "Can I use these in commercial projects?",
    a: "Yes. Bundles are licensed for both personal and commercial architectural visualization work.",
  },
];
