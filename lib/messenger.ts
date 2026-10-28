export interface Bundle {
  slug: string;
  name: string;
  priceLabel: string;
}

const PAGE_ID = "61594038661194";

/**
 * Builds an m.me deep link that opens Messenger with a pre-filled
 * purchase inquiry for the given bundle. Drive access is granted per Google
 * email, so the message asks the buyer for theirs up front.
 */
export function buildMessengerLink(bundle: Bundle): string {
  const message = `Hi! I'd like to purchase the ${bundle.name} for ${bundle.priceLabel} via GCash. My Google email for Drive access is: `;
  const params = new URLSearchParams({ text: message });
  return `https://m.me/${PAGE_ID}?${params.toString()}`;
}

/** Messenger link for general questions, with no order pre-filled. */
export function buildContactLink(): string {
  return `https://m.me/${PAGE_ID}`;
}
