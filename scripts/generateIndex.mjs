// Builds public/indexedLibrary.json: CLIP image embeddings for every item in
// scripts/rawLibrary.json. Items whose id + previewUrl are already indexed are reused.
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from "@huggingface/transformers";

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const EMBEDDING_DIM = 512;
const DECIMALS = 5;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(rootDir, "public");
const rawLibraryPath = path.join(rootDir, "scripts", "rawLibrary.json");
const indexedLibraryPath = path.join(publicDir, "indexedLibrary.json");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

// Remote URLs are passed through; anything else is treated as a path inside public/.
function resolveImageSource(previewUrl) {
  if (/^https?:\/\//i.test(previewUrl)) return previewUrl;
  const localPath = path.resolve(publicDir, previewUrl.replace(/^\/+/, ""));
  if (!localPath.startsWith(publicDir + path.sep)) {
    throw new Error(`previewUrl escapes the public/ folder: ${previewUrl}`);
  }
  if (!existsSync(localPath)) throw new Error(`File not found: ${localPath}`);
  return localPath;
}

function normalizeAndRound(vector) {
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  const factor = 10 ** DECIMALS;
  return Array.from(vector, (v) => Math.round((v / norm) * factor) / factor);
}

async function main() {
  const rawLibrary = await readJson(rawLibraryPath);
  if (!Array.isArray(rawLibrary)) throw new Error("rawLibrary.json must contain an array");

  // Cache existing embeddings keyed by id + previewUrl so a changed image is re-indexed.
  const cache = new Map();
  if (existsSync(indexedLibraryPath)) {
    for (const item of await readJson(indexedLibraryPath)) {
      if (Array.isArray(item.embedding) && item.embedding.length === EMBEDDING_DIM) {
        cache.set(`${item.id}\n${item.previewUrl}`, item.embedding);
      }
    }
    console.log(`Found existing index with ${cache.size} embedded item(s).`);
  }

  const pending = rawLibrary.filter((item) => !cache.has(`${item.id}\n${item.previewUrl}`));
  let processor;
  let model;
  if (pending.length > 0) {
    console.log(`Loading ${MODEL_ID}...`);
    processor = await AutoProcessor.from_pretrained(MODEL_ID);
    model = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID);
  }

  const total = rawLibrary.length;
  const indexed = [];
  let skipped = 0;
  let failed = 0;

  for (const [i, item] of rawLibrary.entries()) {
    const label = `[${i + 1}/${total}]`;
    const { id, title, category, previewUrl, downloadUrl } = item;
    const cached = cache.get(`${id}\n${previewUrl}`);

    if (cached) {
      indexed.push({ id, title, category, previewUrl, downloadUrl, embedding: cached });
      skipped++;
      console.log(`${label} Skipped (cached): ${title}`);
      continue;
    }

    try {
      const image = await RawImage.read(resolveImageSource(previewUrl));
      const inputs = await processor(image);
      const { image_embeds } = await model(inputs);
      const embedding = normalizeAndRound(image_embeds.data);
      indexed.push({ id, title, category, previewUrl, downloadUrl, embedding });
      console.log(`${label} Indexed: ${title}`);
    } catch (err) {
      failed++;
      console.error(`${label} Failed: ${title} (${previewUrl}) - ${err.message}`);
    }
  }

  await writeFile(indexedLibraryPath, JSON.stringify(indexed));
  console.log(
    `\nDone. ${indexed.length - skipped} indexed, ${skipped} skipped, ${failed} failed.` +
      `\nWrote ${indexed.length} item(s) to ${path.relative(rootDir, indexedLibraryPath)}`
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
