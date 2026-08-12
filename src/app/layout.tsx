import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "VoxClip Marketing Studio",
  description:
    "Internal marketing operating system for VoxClip. One campaign, from signal to learning.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/*
          Space Grotesk for display, Inter for UI, IBM Plex Mono for captured
          content. See docs/decisions.md D-009: these are loaded from Google
          Fonts for now and move to self-hosted files once they are in the repo.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
