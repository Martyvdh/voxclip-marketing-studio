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
        {/*
          The rule below warns about fonts loaded outside pages/_document.js.
          That advice is for the Pages Router. This is the App Router root
          layout, so the stylesheet applies to every page. Disabled knowingly,
          not to silence a real finding. It goes away with D-009's follow-up:
          self-host the files and switch to next/font/local.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      {/*
        Browser extensions add attributes to body before React loads, which
        React reports as a hydration mismatch. ColorZilla adds
        cz-shortcut-listen, password managers add their own. Scoped to this one
        element on purpose: it silences a warning about markup we do not
        control, and nothing about the markup we do.
      */}
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
