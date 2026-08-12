import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { VoxClipMark, Wordmark } from "@/components/brand";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/truth", label: "Product Truth" },
  { href: "/channels", label: "Channels" },
];

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <VoxClipMark size={24} />
            <Wordmark />
          </Link>

          <nav aria-label="Sections" className="flex flex-wrap gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-2.5 py-1.5 text-sm text-ink-muted hover:bg-paper hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/account"
              className="text-xs text-ink-muted hover:text-ink hover:underline"
            >
              {user.name}
              <span className="ml-1.5 rounded border border-line px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase">
                {user.role}
              </span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-muted hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
