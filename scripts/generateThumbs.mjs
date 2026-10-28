// Small WebP thumbnails for the model photos, so grids load a ~20 KB image instead of the
// full photo (the full one is still used in quick view). See thumbUrl() in lib/models.ts.
//
//   npm run thumbs              public/previews/<name>  ->  public/thumbs/<name>.webp
//                               (skips thumbs that are already up to date)
//   npm run thumbs -- --uploads also creates "<path>-t" in Supabase Storage for photos uploaded
//                               in /admin that don't have one yet (needs .env.local)
import { existsSync } from "node:fs";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previewsDir = path.join(rootDir, "public", "previews");
const thumbsDir = path.join(rootDir, "public", "thumbs");
// Keep in sync with THUMB_SIZE in components/admin/usePhotoPreparer.ts.
const SIZE = 480;
const QUALITY = 72;

const toThumb = (input) =>
  sharp(input, { failOn: "none" })
    .rotate()
    .resize(SIZE, SIZE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

async function localThumbs() {
  await mkdir(thumbsDir, { recursive: true });
  const files = (await readdir(previewsDir)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
  let made = 0;
  let failed = 0;
  let before = 0;
  let after = 0;
  for (const [i, file] of files.entries()) {
    const src = path.join(previewsDir, file);
    const dest = path.join(thumbsDir, `${file}.webp`);
    const srcStat = await stat(src);
    if (existsSync(dest) && (await stat(dest)).mtimeMs >= srcStat.mtimeMs) continue;
    try {
      const buf = await toThumb(src);
      await sharp(buf).toFile(dest);
      made++;
      before += srcStat.size;
      after += buf.length;
    } catch (err) {
      failed++;
      console.error(`  failed: ${file} - ${err.message}`);
    }
    if ((i + 1) % 500 === 0) console.log(`  ${i + 1}/${files.length}`);
  }
  const mb = (n) => (n / 1024 / 1024).toFixed(1);
  console.log(
    `Local thumbnails: ${made} created${made ? ` (${mb(before)} MB of photos -> ${mb(after)} MB of thumbs)` : ""}, ` +
      `${files.length - made - failed} already up to date, ${failed} failed.`
  );
}

async function uploadThumbs() {
  const { createClient } = await import("@supabase/supabase-js");
  process.loadEnvFile(path.join(rootDir, ".env.local"));
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: rows, error } = await supabase.from("library_items").select("preview_path").not("preview_path", "is", null);
  if (error) throw error;
  const { data: existing, error: listErr } = await supabase.storage.from("previews").list("library", { limit: 10000 });
  if (listErr) throw listErr;
  const have = new Set(existing.map((f) => `library/${f.name}`));
  let made = 0;
  for (const { preview_path: p } of rows) {
    if (have.has(`${p}-t`)) continue;
    const { data: blob, error: dlErr } = await supabase.storage.from("previews").download(p);
    if (dlErr) {
      console.error(`  failed to download ${p}: ${dlErr.message}`);
      continue;
    }
    const buf = await toThumb(Buffer.from(await blob.arrayBuffer()));
    const { error: upErr } = await supabase.storage
      .from("previews")
      .upload(`${p}-t`, buf, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
    if (upErr) console.error(`  failed to upload ${p}-t: ${upErr.message}`);
    else made++;
  }
  console.log(`Uploaded thumbnails: ${made} created, ${rows.length - made} already had one (or failed).`);
}

await localThumbs();
if (process.argv.includes("--uploads")) await uploadThumbs();
