import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const TITLE = "VizAssets — Pro-Grade 3D Model Bundles for Architectural Visualizers";
const DESCRIPTION =
  "Curated 3ds Max model bundles for architectural visualizers. No accounts, no cart — message us on Facebook and pay via GCash.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  // Shown when the link is shared on Facebook/Messenger.
  openGraph: {
    type: "website",
    url: "/",
    siteName: "VizAssets",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/images/hero-vray.jpg", alt: "Photorealistic V-Ray architectural render" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/images/hero-vray.jpg"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script adds the "js" class before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0A0A0B" />
        {/* Lets CSS hide not-yet-revealed sections only when scripts run (see .reveal in globals.css). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
      </head>
      <body className="bg-base-950 text-base-200 font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
