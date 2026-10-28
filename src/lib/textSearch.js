// Forgiving name search for the library. Instead of requiring every typed word, each model is
// scored by how well each word matches its title (and, more weakly, its category/type):
// exact word > word start > a typo away > inside a word > a related word. Rare words (brands,
// model names like "Norte") count more than common ones ("rug", "living"). Models that match
// every word are "best matches"; models sharing enough of the words follow as "similar".
// Case, accents, punctuation and simple plurals are ignored.

// Words too common to mean anything in a model name.
const STOP_WORDS = new Set(["a", "an", "and", "the", "by", "with", "for", "of", "in", "on", "x", "3d", "model", "models"]);

// Words customers use interchangeably. Matched at a slightly lower score than the word typed.
const RELATED = [
  ["carpet", "rug"],
  ["sofa", "couch", "settee"],
  ["lamp", "light", "lighting", "luminaire"],
  ["plant", "tree", "flower"],
  ["tv", "television"],
  ["wardrobe", "closet"],
  ["curtain", "blind", "drape"],
  ["painting", "picture", "art", "poster", "frame"],
  ["armchair", "chair"],
  ["pouf", "ottoman", "footstool"],
  ["desk", "table"],
  ["cabinet", "cupboard", "sideboard"],
];

const TITLE_WEIGHT = 1;
const META_WEIGHT = 0.6; // category / type
const RELATED_WEIGHT = 0.8;

export function normalize(text) {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Rough singular form, applied the same way to typed words and model names.
function stem(word) {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function words(text) {
  return normalize(text)
    .split(" ")
    .filter((w) => w && !STOP_WORDS.has(w))
    .map(stem);
}

const relatedWords = new Map();
for (const group of RELATED) {
  const stems = group.map(stem);
  for (const w of stems) relatedWords.set(w, stems.filter((x) => x !== w));
}

// Edit distance, giving up as soon as it exceeds max.
function withinEdits(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

function wordScore(token, word) {
  if (word === token) return 1;
  if (token.length >= 3 && word.startsWith(token)) return 0.85;
  const typos = token.length >= 8 ? 2 : token.length >= 4 ? 1 : 0;
  if (typos && withinEdits(token, word, typos)) return 0.75;
  if (word.length >= 3 && token.startsWith(word)) return 0.7;
  if (token.length >= 4 && word.includes(token)) return 0.6;
  return 0;
}

function bestScore(token, list) {
  let best = 0;
  for (const w of list) {
    const s = wordScore(token, w);
    if (s > best) best = s;
    if (best === 1) break;
  }
  return best;
}

/** Precomputed words for one model; build once per library load. */
export function indexItem(item) {
  return {
    title: words(item.title),
    meta: words(`${item.category ?? ""} ${item.subcategory ?? ""}`),
    phrase: normalize(item.title),
  };
}

/** Parses what the customer typed. Returns null when there's nothing to search for. */
export function parseQuery(text) {
  const tokens = words(text);
  if (tokens.length === 0) return null;
  // Matching about a third of the words is enough to count as "similar".
  const minMatched = tokens.length <= 2 ? 1 : Math.ceil(tokens.length / 3);
  return { tokens, phrase: normalize(text), minMatched };
}

// How well one typed word matches a model (0 = not at all, 1 = exact word in the title).
function tokenScore(token, index) {
  let best = Math.max(bestScore(token, index.title) * TITLE_WEIGHT, bestScore(token, index.meta) * META_WEIGHT);
  if (best < 1) {
    for (const alt of relatedWords.get(token) ?? []) {
      const s = Math.max(bestScore(alt, index.title) * TITLE_WEIGHT, bestScore(alt, index.meta) * META_WEIGHT) * RELATED_WEIGHT;
      if (s > best) best = s;
    }
  }
  return best;
}

/**
 * Ranks models against a parsed query. entries are { item, index } with index from indexItem.
 * Returns the matching ones as { item, score, exact }, best first: exact = every typed word
 * matched (those come first), then by score.
 */
export function rankByText(entries, query) {
  const rows = entries.map((entry) => ({ entry, scores: query.tokens.map((t) => tokenScore(t, entry.index)) }));

  // A word that only a few models contain says more about what the customer wants.
  const n = Math.max(rows.length, 1);
  const weights = query.tokens.map((_, k) => {
    let df = 0;
    for (const r of rows) if (r.scores[k] >= 0.85) df++;
    return Math.log(1 + n / (1 + df));
  });
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;

  const results = [];
  for (const { entry, scores } of rows) {
    let matched = 0;
    let total = 0;
    scores.forEach((s, k) => {
      if (s > 0) matched++;
      total += s * weights[k];
    });
    if (matched < query.minMatched) continue;
    let score = total / weightSum;
    const { phrase } = entry.index;
    if (phrase === query.phrase) score += 1;
    else if (phrase.startsWith(query.phrase)) score += 0.5;
    else if (phrase.includes(query.phrase)) score += 0.3;
    results.push({ item: entry.item, score, exact: matched === query.tokens.length });
  }
  return results.sort(
    (a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score || a.item.title.localeCompare(b.item.title)
  );
}
