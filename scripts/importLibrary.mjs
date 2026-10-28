// One-time move of public/indexedLibrary.json into the Supabase table library_items, which
// /admin manages from then on. Safe to re-run: models already in the table are left alone
// (so edits made in /admin are never overwritten); only new ids are added. Models whose link
// is still "PASTE_LINK_HERE" are imported without a link and show under "Missing link" in
// /admin. Also applies upload limits to the "previews" bucket.
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
const NO_LINK_YET = "PASTE_LINK_HERE";

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
  let withoutLink = 0;
  for (const item of items) {
    const noLinkYet = item.downloadUrl === NO_LINK_YET;
    const reason =
      !item.id || !item.title || !item.previewUrl
        ? "missing id, title or preview"
        : !Array.isArray(item.embedding) || item.embedding.length !== EMBEDDING_DIM
          ? "no embedding"
          : !noLinkYet && (!isDriveLink(item.downloadUrl ?? "") || item.downloadUrl.includes("REPLACE_WITH"))
            ? `sample item with a placeholder link (${item.downloadUrl})`
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
      download_url: noLinkYet ? null : item.downloadUrl,
      embedding: encodeEmbedding(item.embedding),
    });
    if (noLinkYet) withoutLink++;
  }

  console.log(`${rows.length} item(s) in the file (${withoutLink} without a link yet), ${skipped.length} skipped.`);
  for (const line of skipped) console.log(`  skipped ${line}`);
  if (dryRun) return;

  process.loadEnvFile(path.join(rootDir, ".env.local"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let added = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    // ignoreDuplicates: ids already in the table keep their current (possibly edited) data.
    const { data, error } = await supabase
      .from("library_items")
      .upsert(rows.slice(i, i + BATCH), { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(`Import failed at item ${i + 1}: ${error.message}`);
    added += data.length;
    console.log(`  checked ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log(`Added ${added} new model(s); ${rows.length - added} were already in the library and left unchanged.`);

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
