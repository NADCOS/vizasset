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

/**
 * Messenger link pre-filled with a customer's shortlist: the first titles plus a link to the
 * whole list, so we see exactly which models they're after.
 */
export function buildShortlistMessengerLink(titles: string[], shareUrl: string): string {
  const shown = titles.slice(0, 10).map((t, i) => `${i + 1}. ${t}`);
  const more = titles.length > shown.length ? `\n…and ${titles.length - shown.length} more` : "";
  const message = `Hi! I'm interested in these VizAssets models:\n${shown.join("\n")}${more}\n\nFull list: ${shareUrl}`;
  return `https://m.me/${PAGE_ID}?${new URLSearchParams({ text: message }).toString()}`;
}

/** Messenger link for general questions, with no order pre-filled. */
export function buildContactLink(): string {
  return `https://m.me/${PAGE_ID}`;
}
