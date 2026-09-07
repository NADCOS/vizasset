import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VizAssets — Pro-Grade 3D Model Bundles for Architectural Visualizers",
  description:
    "Curated SketchUp and 3ds Max model bundles for architectural visualizers. No accounts, no cart — message us on Facebook and pay via GCash.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0A0A0B" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
      </head>
      <body className="bg-base-950 text-base-200 font-sans">{children}</body>
    </html>
  );
}
