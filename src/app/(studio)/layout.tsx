import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { VoxClipMark, Wordmark } from "@/components/brand";
import { StudioNav, type NavItem } from "@/components/nav";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/truth", label: "Product Truth" },
  { href: "/results", label: "Results" },
  { href: "/channels", label: "Channels" },
  { href: "/users", label: "Team" },
];

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const account = (
    <>
      <Link
        href="/account"
        className="text-sm text-ink-muted hover:text-ink hover:underline"
      >
        {user.name}
        <span className="ml-1.5 rounded border border-line px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase">
          {user.role}
        </span>
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink-muted hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </>
  );

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-x-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <VoxClipMark size={24} />
            <Wordmark />
          </Link>

          <StudioNav items={NAV}>{account}</StudioNav>

          <div className="ml-auto hidden items-center gap-3 md:flex">{account}</div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
