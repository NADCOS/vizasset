# VizAssets

Next.js catalog site for bulk 3ds Max model bundles. Manual GCash checkout via Facebook Messenger deep links — no cart, no accounts. Buyers send their Google email in the chat and get access to the private Google Drive folder after paying.

## Setup

```
npm install
npm run dev
```

## Before deploying

- Messenger page id is set in `lib/messenger.ts` (`PAGE_ID`).
- Bundle content/pricing lives in `lib/bundles.ts` (`price` / `originalPrice` in PHP; the labels, hero badge and product data are derived from them).
- The site URL used for SEO (sitemap, link previews) is in `lib/site.ts`.
- Models, Drive links and preview images are managed at `/admin`, not committed as files — see below.

## Admin (`/admin`)

Two tabs:

- **Models & Drive links** — every model in the bundle. Drop photos, give each a title, category and Google Drive link, save. A model shows up everywhere at once: `/search` (within about a minute), `/gallery` and the home page thumbnails. Edit or delete existing ones, or hover a photo to replace it. The photo is analyzed in your browser for image search (the AI model downloads once, then the browser caches it).
- **Bundle hero image** — the large image on each bundle card.

Clicking a model in the gallery or on the home page opens `/search?id=<model id>`: that exact model first, then visually similar ones.

### Security model

- Admins sign in with **Supabase Auth** (email + password). Only accounts whose email is in `ADMIN_EMAILS` get in; anyone else is signed out.
- The browser only gets the public anon key. All writes go through `/api/admin`, which checks the session and the email allowlist on the server, then writes with the service-role key (`SUPABASE_SERVICE_ROLE_KEY`, server-only).
- `library_items` has no public policies at all; pages read it on the server and the search page through `/api/library`.
- The old `preview_images` table (earlier gallery images) is no longer used by the site; it's public read-only and can be dropped.
- Download links must be Google Drive links (enforced on the server). Drive only opens them for buyers whose email you've added, so they're safe to show. Never use open links (public Drive links, Mega, direct file URLs).

## Supabase setup

1. Create a project at supabase.com.
2. Storage → New bucket → `previews`, mark it **Public**. Add no `anon` insert/update/delete policies.
3. SQL Editor → New query, run:

```sql
create table if not exists preview_images (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  path text not null unique,
  category text not null default 'Uncategorized',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table preview_images enable row level security;
drop policy if exists "public read" on preview_images;
create policy "public read" on preview_images for select using (true);
-- Older setups let the anon key write; remove that.
drop policy if exists "anon insert" on preview_images;
drop policy if exists "anon update" on preview_images;
drop policy if exists "anon delete" on preview_images;

create table if not exists library_items (
  id text primary key,
  title text not null,
  category text not null default 'Uncategorized',
  subcategory text,
  preview_url text not null,
  preview_path text,          -- set for photos uploaded in /admin (Supabase Storage)
  download_url text not null,
  embedding text not null,    -- base64 CLIP embedding, see lib/embedding.ts
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists library_items_updated_at on library_items (updated_at desc);
alter table library_items enable row level security;
-- No policies on purpose: only the server (service role) can read or write it.
```

4. Storage → `previews` → Policies: delete any `insert`/`update`/`delete` policies for `anon` from older setups.
5. Authentication → Users → **Add user** → create your admin account (email + password, tick "Auto confirm"). Then Authentication → Sign In / Providers → turn off **Allow new users to sign up**.
6. Project Settings → API: copy the Project URL, the `anon` key and the `service_role` key.
7. Copy `.env.local.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS`.
8. Add the same four variables in Vercel → Project → Settings → Environment Variables. Delete `ADMIN_PASSCODE` / `NEXT_PUBLIC_ADMIN_PASSCODE` if they're still there.

### Moving the existing library in (one time)

```
npm run import-library -- --dry   # shows what would be imported and what's skipped
npm run import-library
```

This copies `public/indexedLibrary.json` into `library_items` (items without a real Drive link are skipped and listed) and sets upload limits on the `previews` bucket (images only, 10 MB). Imported photos keep being served from `public/previews`. Until the table has rows, `/search` falls back to `public/indexedLibrary.json`; once imported and checked, that file can be deleted. `scripts/libraryAdmin.mjs`, `syncFolder.mjs` and `generateIndex.mjs` only edit the old file — use `/admin` instead.

## Analytics

`@vercel/analytics` is included. Enable Web Analytics in Vercel → Project → Analytics. Messenger button clicks are tracked as the custom event `messenger_click`, with a `location` property (`header`, `bundle_card`).

## Build

```
npm run build
```

Deploys to Vercel as a regular Next.js app (it needs the server for `/api/admin`, `/api/library` and page caching, so it is not a static export).
