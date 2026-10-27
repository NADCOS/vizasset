// Adds every image in public/previews/ that isn't in scripts/rawLibrary.json yet.
// Existing entries are never modified. Pass --dry-run to preview without writing.
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const DEFAULT_CATEGORY = "3D Asset";
const PLACEHOLDER_URL = "PASTE_LINK_HERE";
const dryRun = process.argv.includes("--dry-run");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previewsDir = path.join(rootDir, "public", "previews");
const rawLibraryPath = path.join(rootDir, "scripts", "rawLibrary.json");

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "modern-velvet-sofa" -> "Modern Velvet Sofa". Drops source tags like "(3dline.net)"
// and keeps words that already have capitals (e.g. "IKEA") as they are.
function titleFromFilename(baseName) {
  return baseName
    .replace(/\(\s*[\w-]+\.[a-z]{2,}\s*\)/gi, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word === word.toLowerCase() ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function uniqueId(base, usedIds) {
  let id = base || "preview";
  for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
  usedIds.add(id);
  return id;
}

async function main() {
  if (!existsSync(previewsDir)) {
    console.log("public/previews/ does not exist. Nothing to sync.");
    return;
  }

  const library = existsSync(rawLibraryPath) ? JSON.parse(await readFile(rawLibraryPath, "utf8")) : [];
  if (!Array.isArray(library)) throw new Error("rawLibrary.json must contain an array");

  const knownPreviews = new Set(library.map((item) => item.previewUrl?.toLowerCase()));
  const usedIds = new Set(library.map((item) => item.id));

  const entries = await readdir(previewsDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  const added = [];
  for (const fileName of files) {
    const previewUrl = `/previews/${fileName}`;
    if (knownPreviews.has(previewUrl.toLowerCase())) continue;

    // These characters would turn part of the filename into a query string, fragment or escape.
    if (/[#?%]/.test(fileName)) {
      console.warn(`Skipped "${fileName}": rename it without #, ? or % to add it.`);
      continue;
    }

    const baseName = path.parse(fileName).name;
    added.push({
      id: uniqueId(slugify(baseName), usedIds),
      title: titleFromFilename(baseName) || baseName,
      category: DEFAULT_CATEGORY,
      previewUrl,
      downloadUrl: PLACEHOLDER_URL,
    });
  }

  for (const item of added) console.log(`+ ${item.id}  "${item.title}"`);
  console.log(
    `\nScanned ${files.length} image(s) in public/previews/: ${added.length} new, ` +
      `${library.length} existing entr${library.length === 1 ? "y" : "ies"} kept as is.`
  );

  if (added.length === 0) return;
  if (dryRun) {
    console.log("Dry run: rawLibrary.json was not changed.");
    return;
  }

  await writeFile(rawLibraryPath, JSON.stringify([...library, ...added], null, 2) + "\n");
  console.log(`Updated scripts/rawLibrary.json. Replace "${PLACEHOLDER_URL}" with real links,`);
  console.log("set categories where needed, then run: npm run index-images");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
