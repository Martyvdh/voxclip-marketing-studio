"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The navigation, twice: a row on a wide screen and a panel behind a button on
 * a narrow one. Same links, same order, one source.
 *
 * The panel closes on Escape and when a link is followed, and focus returns to
 * the button that opened it. Nothing behind the panel scrolls while it is open.
 */
export function StudioNav({
  items,
  children,
}: {
  items: NavItem[];
  /** The account and sign-out controls, shown inside the panel on mobile. */
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the panel so the next Tab stays inside it.
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <nav aria-label="Sections" className="hidden flex-wrap gap-1 md:flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
            className={`rounded-lg px-2.5 py-1.5 text-sm ${
              isCurrent(pathname, item.href)
                ? "bg-paper font-medium text-ink"
                : "text-ink-muted hover:bg-paper hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="studio-menu"
        className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg border border-line md:hidden"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <span aria-hidden="true" className="relative block h-4 w-5">
          <span
            className={`absolute left-0 block h-0.5 w-5 bg-ink transition-transform ${
              open ? "top-1.5 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-1.5 block h-0.5 w-5 bg-ink transition-opacity ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 block h-0.5 w-5 bg-ink transition-transform ${
              open ? "top-1.5 -rotate-45" : "top-3"
            }`}
          />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-ink/20 md:hidden"
          />
          <div
            id="studio-menu"
            ref={panelRef}
            className="fixed inset-x-0 top-[57px] z-50 border-b border-line bg-surface p-4 shadow-lg md:hidden"
          >
            <nav aria-label="Sections">
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                      className={`block rounded-lg px-3 py-3 text-base ${
                        isCurrent(pathname, item.href)
                          ? "bg-paper font-medium text-ink"
                          : "text-ink-muted"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              {children}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
