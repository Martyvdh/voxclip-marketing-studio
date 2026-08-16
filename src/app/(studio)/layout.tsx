import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { VoxClipMark, Wordmark } from "@/components/brand";
import { StudioNav, type NavItem } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { countWaitingForReview } from "@/lib/review/queries";

export const dynamic = "force-dynamic";

/**
 * The sections, in the order the work happens: make it, get it read, plan it,
 * post it, see what it did. Reference material sits after that.
 *
 * "Team" is not here. Managing people is an account concern, not a step in the
 * week, and it was the ninth item that made the row wrap.
 */
function navFor(waiting: number): NavItem[] {
  return [
    { href: "/", label: "Home" },
    { href: "/campaigns", label: "Campaigns" },
    // A count, not a coloured dot: teal is the one accent, and a number says
    // how much is waiting where a dot only says that something is.
    { href: "/review", label: "Review", badge: waiting || undefined },
    { href: "/calendar", label: "Calendar" },
    { href: "/assets", label: "Assets" },
    { href: "/channels", label: "Channels" },
    { href: "/results", label: "Results" },
    { href: "/truth", label: "Truth" },
  ];
}

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const nav = navFor(await countWaitingForReview());

  const account = (
    <>
      <Link
        href="/account"
        className="flex min-w-0 items-center gap-1.5 text-sm text-ink-muted hover:text-ink hover:underline"
      >
        <span className="truncate">{user.name}</span>
        <span className="shrink-0 rounded border border-line px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase">
          {user.role}
        </span>
      </Link>
      <Link
        href="/guide"
        className="shrink-0 text-sm text-ink-muted hover:text-ink hover:underline"
      >
        Uitleg
      </Link>
      <Link
        href="/users"
        className="shrink-0 text-sm text-ink-muted hover:text-ink hover:underline"
      >
        Team
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm text-ink-muted hover:text-ink"
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
        <div className="relative mx-auto flex max-w-6xl items-center gap-x-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="VoxClip Studio, home"
          >
            <VoxClipMark size={24} />
            <Wordmark />
          </Link>

          <StudioNav items={nav}>{account}</StudioNav>

          <div className="ml-auto hidden shrink-0 items-center gap-3 lg:flex">
            {account}
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}
