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
