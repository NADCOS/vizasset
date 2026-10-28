"use client";

import { useState } from "react";
import { thumbUrl } from "@/lib/models";

/**
 * A model photo in a grid or list: loads the small thumbnail and, if that's missing (say, a
 * photo added before thumbnails existed), quietly falls back to the full photo.
 * Plain <img>: thousands of model photos would use up Vercel's image optimization quota.
 */
export default function Thumb({
  src,
  alt,
  className,
}: {
  /** The full photo URL (previewUrl). */
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const thumb = thumbUrl(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed ? src : thumb}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => thumb !== src && setFailed(true)}
      className={className}
    />
  );
}
