// One-time move of public/indexedLibrary.json into the Supabase table library_items, which
// /admin manages from then on. Safe to re-run: rows are upserted by id. Also applies upload
// limits to the "previews" bucket.
//
//   npm run import-library            import (needs .env.local, see README)
//   npm run import-library -- --dry   only report what would be imported
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { encodeEmbedding, EMBEDDING_DIM } from "../lib/embedding.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(rootDir, "public", "indexedLibrary.json");
const dryRun = process.argv.includes("--dry");
const BATCH = 500;

function isDriveLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "drive.google.com" || url.hostname === "docs.google.com");
  } catch {
    return false;
  }
}

async function main() {
  const items = JSON.parse(await readFile(indexPath, "utf8"));
  const rows = [];
  const skipped = [];
  for (const item of items) {
    const reason =
      !item.id || !item.title || !item.previewUrl
        ? "missing id, title or preview"
        : !Array.isArray(item.embedding) || item.embedding.length !== EMBEDDING_DIM
          ? "no embedding"
          : !isDriveLink(item.downloadUrl ?? "") || item.downloadUrl.includes("REPLACE_WITH")
            ? `not a real Drive link (${item.downloadUrl})`
            : null;
    if (reason) {
      skipped.push(`${item.id ?? "?"} "${item.title ?? ""}": ${reason}`);
      continue;
    }
    rows.push({
      id: item.id,
      title: item.title,
      category: item.category || "Uncategorized",
      subcategory: item.subcategory || null,
      // Imported photos stay in public/previews on Vercel; only photos uploaded in /admin go to Storage.
      preview_url: item.previewUrl,
      preview_path: null,
      download_url: item.downloadUrl,
      embedding: encodeEmbedding(item.embedding),
    });
  }

  console.log(`${rows.length} item(s) to import, ${skipped.length} skipped.`);
  for (const line of skipped) console.log(`  skipped ${line}`);
  if (dryRun) return;

  process.loadEnvFile(path.join(rootDir, ".env.local"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from("library_items").upsert(rows.slice(i, i + BATCH), { onConflict: "id" });
    if (error) throw new Error(`Import failed at item ${i + 1}: ${error.message}`);
    console.log(`  imported ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  // Uploads from /admin: images only, at most 10 MB each.
  const { error: bucketErr } = await supabase.storage.updateBucket("previews", {
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
  });
  console.log(bucketErr ? `Could not set bucket limits: ${bucketErr.message}` : "Set upload limits on the previews bucket.");
  console.log("Done.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
