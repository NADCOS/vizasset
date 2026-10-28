"use client";

import { track } from "@vercel/analytics";

// Messenger is where every sale starts, so each click is counted in Vercel Analytics
// (event "messenger_click", split by where on the page it was clicked).
export default function MessengerLink({
  href,
  location,
  className,
  children,
}: {
  href: string;
  location: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track("messenger_click", { location })}
    >
      {children}
    </a>
  );
}
