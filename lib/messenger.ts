export interface Bundle {
  slug: string;
  name: string;
  priceLabel: string;
}

const PAGE_ID = "61594038661194";

/**
 * Builds an m.me deep link that opens Messenger with a pre-filled
 * purchase inquiry for the given bundle.
 */
export function buildMessengerLink(bundle: Bundle): string {
  const message = `Hi! I'd like to purchase the ${bundle.name} for ${bundle.priceLabel} via GCash. How do I proceed?`;
  const params = new URLSearchParams({ text: message });
  return `https://m.me/${PAGE_ID}?${params.toString()}`;
}
