# VizAssets

Next.js catalog site for bulk SketchUp/3ds Max model bundles. Manual GCash checkout via Facebook Messenger deep links — no cart, no accounts.

## Setup

```
npm install
npm run dev
```

## Before deploying

- Drop real images into `public/images/hero-vray.jpg` and `public/images/bundles/all-in-3ds-max/` (hero.jpg + thumb-1..8.jpg).
- Messenger page id is set in `lib/messenger.ts` (`PAGE_ID`).
- Bundle content/pricing lives in `lib/bundles.ts`.

## Build (static export)

```
npm run build
```

Outputs a static site in `out/` (via `output: "export"` in `next.config.ts`) — deployable to Vercel, Netlify, or any static host.
