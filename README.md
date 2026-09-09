# VizAssets

Next.js catalog site for bulk SketchUp/3ds Max model bundles. Manual GCash checkout via Facebook Messenger deep links — no cart, no accounts.

## Setup

```
npm install
npm run dev
```

## Before deploying

- Messenger page id is set in `lib/messenger.ts` (`PAGE_ID`).
- Bundle content/pricing lives in `lib/bundles.ts`.
- Preview images (hero + thumbnails) are managed at `/admin`, not committed as files — see below.

## Preview image uploads (Supabase)

Bundle preview images live in Supabase Storage and get uploaded from `/admin`, no redeploy needed.

1. Create a free project at supabase.com.
2. Storage → New bucket → name it `previews`, mark it **Public**.
3. Storage → `previews` → Policies → add a policy allowing `insert`/`update` for the `anon` role (needed for uploads from `/admin`; fine since the bucket only holds preview images).
4. Project Settings → API → copy the Project URL and `anon` public key.
5. Copy `.env.local.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and pick an `NEXT_PUBLIC_ADMIN_PASSCODE`.
6. Add the same three variables in Vercel → Project → Settings → Environment Variables, then redeploy.
7. Visit `yoursite.com/admin`, enter the passcode, and upload each bundle's hero + thumbnail images.

Note: the passcode is a soft deterrent only (it ships in client JS, like any `NEXT_PUBLIC_*` variable) — it stops casual visitors from finding the page, not a determined one. Fine for a low-stakes internal tool; don't rely on it to gate anything sensitive.

## Build (static export)

```
npm run build
```

Outputs a static site in `out/` (via `output: "export"` in `next.config.ts`) — deployable to Vercel, Netlify, or any static host.
