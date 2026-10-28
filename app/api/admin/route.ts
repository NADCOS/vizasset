import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { bundles, previewUrl } from "@/lib/bundles";
import { adminAuthConfigured, getAdminEmail } from "@/lib/adminAuth";
import { decodeEmbedding } from "@/lib/embedding";
import { isDriveLink } from "@/lib/driveLink";
import { waitUntil } from "@vercel/functions";
import { LIBRARY_TABLE, LibraryRow, readAllRows, warmLibraryCache } from "@/lib/library";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { PREVIEWS_BUCKET } from "@/lib/supabaseClient";

// All /admin writes go through here. The browser only holds the public anon key, which can't
// change anything; this route checks that the caller is signed in with an ADMIN_EMAILS
// account, then writes with the service-role key.
const LIBRARY_PAGE_SIZE = 60;

// Room for the background library rebuild (warmLibraryCache) that runs after a save.
export const maxDuration = 60;

class BadRequest extends Error {}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function isBundleSlug(slug: unknown): slug is string {
  return typeof slug === "string" && bundles.some((b) => b.slug === slug);
}

function text(value: unknown, field: string, { max = 200, optional = false } = {}): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) {
    if (optional) return null;
    throw new BadRequest(`${field} is required`);
  }
  if (v.length > max) throw new BadRequest(`${field} is too long (max ${max} characters)`);
  return v;
}

// Empty means "no link yet": the model is saved but stays hidden from the site.
function driveLinkOrNull(value: unknown): string | null {
  const link = text(value, "Drive link", { max: 2000, optional: true });
  if (link && !isDriveLink(link)) {
    throw new BadRequest("The download link must be a Google Drive link (https://drive.google.com/...)");
  }
  return link;
}

function embedding(value: unknown): string {
  if (typeof value !== "string" || !decodeEmbedding(value)) throw new BadRequest("Invalid image embedding");
  return value;
}

const ORDERS_TABLE = "orders";
const ORDER_COLUMNS = "id,created_at,updated_at,customer_name,google_email,bundle_slug,amount,status,gcash_reference,notes";
const ORDER_STATUSES = ["pending", "paid", "access_granted", "cancelled"];
// Newest first; plenty for a manual GCash shop. Older orders stay in the table.
const ORDERS_LIMIT = 300;

function googleEmail(value: unknown): string {
  const email = text(value, "Google email", { max: 254 })!.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequest("That doesn't look like an email address");
  return email;
}

function amount(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new BadRequest("Invalid amount");
  return Math.round(n * 100) / 100;
}

function orderStatus(value: unknown): string {
  if (typeof value !== "string" || !ORDER_STATUSES.includes(value)) throw new BadRequest("Invalid status");
  return value;
}

// Each uploaded photo has a small copy next to it (see thumbUrl in lib/models.ts).
const thumbPath = (photoPath: string) => `${photoPath}-t`;
const withThumb = (photoPath: string) => [photoPath, thumbPath(photoPath)];

function libraryPhotoPath(value: unknown): string {
  if (typeof value !== "string" || !/^library\/[0-9a-f-]{36}$/.test(value)) throw new BadRequest("Invalid photo");
  return value;
}

// The home page and gallery show the library models and cache the result, so refresh them after changes.
function refreshModelPages() {
  revalidatePath("/");
  revalidatePath("/gallery");
}

async function handle(action: string, body: Record<string, any>): Promise<Record<string, unknown>> {
  switch (action) {
    case "verify":
      return {};

    // Files upload straight from the browser to Storage with a one-time signed URL,
    // which avoids the request size limit on this function.
    case "signUpload": {
      let path: string;
      if (body.kind === "library") path = `library/${randomUUID()}`;
      else if (body.kind === "libraryThumb") path = thumbPath(libraryPhotoPath(body.forPath));
      else if (body.kind === "hero" && isBundleSlug(body.slug)) path = `bundles/${body.slug}/hero`;
      else throw new BadRequest("Unknown upload");
      const { data, error } = await supabaseAdmin.storage
        .from(PREVIEWS_BUCKET)
        .createSignedUploadUrl(path, { upsert: body.kind !== "library" });
      if (error || !data) throw new Error(error?.message || "Could not create upload URL");
      return { path: data.path, token: data.token };
    }

    case "heroUploaded":
      refreshModelPages();
      return {};

    // ---- Search library: models with their Drive links ----

    case "libraryList": {
      const offset = Number.isInteger(body.offset) && body.offset >= 0 ? body.offset : 0;
      let query = supabaseAdmin
        .from(LIBRARY_TABLE)
        .select("id,title,category,subcategory,preview_url,download_url", { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + LIBRARY_PAGE_SIZE - 1);
      const q = text(body.q, "Search", { optional: true });
      if (q) query = query.ilike("title", `%${q}%`);
      const category = text(body.category, "Category", { max: 80, optional: true });
      if (category) query = query.eq("category", category);
      if (body.missingLink === true) query = query.is("download_url", null);
      const [{ data, count, error }, { count: missingCount, error: missingErr }] = await Promise.all([
        query,
        supabaseAdmin.from(LIBRARY_TABLE).select("id", { count: "exact", head: true }).is("download_url", null),
      ]);
      if (error) throw error;
      if (missingErr) throw missingErr;

      let categories: [string, number][] | undefined;
      if (offset === 0) {
        const rows = await readAllRows<Pick<LibraryRow, "id" | "category">>("id,category");
        const counts = new Map<string, number>();
        for (const { category: c } of rows) counts.set(c, (counts.get(c) ?? 0) + 1);
        categories = Array.from(counts).sort((a, b) => a[0].localeCompare(b[0]));
      }
      return {
        items: data ?? [],
        total: count ?? 0,
        missingCount: missingCount ?? 0,
        pageSize: LIBRARY_PAGE_SIZE,
        categories,
      };
    }

    case "libraryCreate": {
      const previewPath = libraryPhotoPath(body.previewPath);
      const row = {
        id: randomUUID(),
        title: text(body.title, "Title"),
        category: text(body.category, "Category", { max: 80 }),
        subcategory: text(body.subcategory, "Type", { max: 80, optional: true }),
        download_url: driveLinkOrNull(body.downloadUrl),
        preview_path: previewPath,
        preview_url: previewUrl(previewPath),
        embedding: embedding(body.embedding),
      };
      const { data, error } = await supabaseAdmin
        .from(LIBRARY_TABLE)
        .insert(row)
        .select("id,title,category,subcategory,preview_url,download_url")
        .single();
      if (error) {
        await supabaseAdmin.storage.from(PREVIEWS_BUCKET).remove(withThumb(previewPath));
        throw error;
      }
      refreshModelPages();
      return { item: data };
    }

    case "libraryUpdate": {
      if (typeof body.id !== "string") throw new BadRequest("Invalid item");
      const changes: Partial<LibraryRow> = { updated_at: new Date().toISOString() };
      if ("title" in body) changes.title = text(body.title, "Title")!;
      if ("category" in body) changes.category = text(body.category, "Category", { max: 80 })!;
      if ("subcategory" in body) changes.subcategory = text(body.subcategory, "Type", { max: 80, optional: true });
      if ("downloadUrl" in body) changes.download_url = driveLinkOrNull(body.downloadUrl);

      // A new photo replaces the old one and needs its own embedding so image search still matches.
      let oldPhoto: string | null = null;
      if ("previewPath" in body) {
        const previewPath = libraryPhotoPath(body.previewPath);
        changes.preview_path = previewPath;
        changes.preview_url = previewUrl(previewPath);
        changes.embedding = embedding(body.embedding);
        const { data: current } = await supabaseAdmin.from(LIBRARY_TABLE).select("preview_path").eq("id", body.id).single();
        oldPhoto = current?.preview_path ?? null;
      }

      const { data, error } = await supabaseAdmin
        .from(LIBRARY_TABLE)
        .update(changes)
        .eq("id", body.id)
        .select("id,title,category,subcategory,preview_url,download_url")
        .single();
      if (error) throw error;
      if (oldPhoto && oldPhoto !== changes.preview_path) {
        await supabaseAdmin.storage.from(PREVIEWS_BUCKET).remove(withThumb(oldPhoto));
      }
      refreshModelPages();
      return { item: data };
    }

    case "libraryDelete": {
      if (typeof body.id !== "string") throw new BadRequest("Invalid item");
      const { data: row } = await supabaseAdmin.from(LIBRARY_TABLE).select("preview_path").eq("id", body.id).single();
      const { error } = await supabaseAdmin.from(LIBRARY_TABLE).delete().eq("id", body.id);
      if (error) throw error;
      // Photos uploaded through /admin live in Storage; imported ones are files in public/previews.
      if (row?.preview_path) await supabaseAdmin.storage.from(PREVIEWS_BUCKET).remove(withThumb(row.preview_path));
      refreshModelPages();
      return {};
    }

    // ---- Orders: buyers, their Google email for Drive access, and payment status ----

    case "ordersList": {
      let query = supabaseAdmin
        .from(ORDERS_TABLE)
        .select(ORDER_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(ORDERS_LIMIT);
      if (typeof body.status === "string" && ORDER_STATUSES.includes(body.status)) query = query.eq("status", body.status);
      // Commas and parentheses would break the or() filter syntax, so they're dropped from the search text.
      const q = text(body.q, "Search", { optional: true })?.replace(/[,()*%\\]/g, " ").trim();
      if (q) query = query.or(`customer_name.ilike.%${q}%,google_email.ilike.%${q}%,gcash_reference.ilike.%${q}%`);
      const [{ data, error }, { data: all, error: countErr }] = await Promise.all([
        query,
        supabaseAdmin.from(ORDERS_TABLE).select("status"),
      ]);
      if (error) throw error;
      if (countErr) throw countErr;
      const counts: Record<string, number> = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
      for (const r of all ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
      return { orders: data ?? [], counts, limit: ORDERS_LIMIT };
    }

    case "orderCreate": {
      const bundle = bundles.find((b) => b.slug === body.bundleSlug) ?? bundles[0];
      const { data, error } = await supabaseAdmin
        .from(ORDERS_TABLE)
        .insert({
          customer_name: text(body.customerName, "Name", { max: 120 }),
          google_email: googleEmail(body.googleEmail),
          bundle_slug: bundle.slug,
          amount: amount(body.amount, bundle.price),
          status: orderStatus(body.status ?? "pending"),
          gcash_reference: text(body.gcashReference, "GCash reference", { max: 80, optional: true }),
          notes: text(body.notes, "Notes", { max: 1000, optional: true }),
        })
        .select(ORDER_COLUMNS)
        .single();
      if (error) throw error;
      return { order: data };
    }

    case "orderUpdate": {
      if (typeof body.id !== "string") throw new BadRequest("Invalid order");
      const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if ("customerName" in body) changes.customer_name = text(body.customerName, "Name", { max: 120 });
      if ("googleEmail" in body) changes.google_email = googleEmail(body.googleEmail);
      if ("amount" in body) changes.amount = amount(body.amount, 0);
      if ("status" in body) changes.status = orderStatus(body.status);
      if ("gcashReference" in body) changes.gcash_reference = text(body.gcashReference, "GCash reference", { max: 80, optional: true });
      if ("notes" in body) changes.notes = text(body.notes, "Notes", { max: 1000, optional: true });
      const { data, error } = await supabaseAdmin
        .from(ORDERS_TABLE)
        .update(changes)
        .eq("id", body.id)
        .select(ORDER_COLUMNS)
        .single();
      if (error) throw error;
      return { order: data };
    }

    case "orderDelete": {
      if (typeof body.id !== "string") throw new BadRequest("Invalid order");
      const { error } = await supabaseAdmin.from(ORDERS_TABLE).delete().eq("id", body.id);
      if (error) throw error;
      return {};
    }

    default:
      throw new BadRequest(`Unknown action: ${action}`);
  }
}

export async function POST(req: Request) {
  if (!adminAuthConfigured || !supabaseAdminConfigured) {
    return fail(503, "Admin isn't configured: set ADMIN_EMAILS and SUPABASE_SERVICE_ROLE_KEY (see README).");
  }
  const email = await getAdminEmail(req);
  if (!email) return fail(403, "This account isn't allowed to use the admin.");

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return fail(400, "Missing action");

  try {
    const result = await handle(body.action, body);
    // After a change, rebuild the search library's CDN copy in the background so customers
    // never wait for it. waitUntil keeps the function alive after the response is sent.
    if (["libraryCreate", "libraryUpdate", "libraryDelete"].includes(body.action)) {
      waitUntil(warmLibraryCache(new URL(req.url).origin));
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BadRequest) return fail(400, err.message);
    console.error(`[api/admin] ${body.action} failed for ${email}:`, err);
    const message = err && typeof err === "object" && "message" in err ? String(err.message) : "Server error";
    return fail(500, message);
  }
}
