"use client";

/**
 * De startpuntenkiezer.
 *
 * Dit was een dropdown. Bij drieëntwintig ging dat nog; bij honderdvijftig is een
 * dropdown geen menu meer maar een hooiberg — je kunt er alleen in vinden wat je
 * al wist dat er stond, en dus vind je er niets nieuws.
 *
 * Dus: families in een kolom links, kaarten rechts, en een zoekveld dat door alle
 * families heen kijkt. Je kiest een kaart en er gebeurt nog niets; toepassen is
 * een aparte knop, want een startpunt gooit je tijdlijn weg en dat hoort twee
 * bewuste klikken te kosten in plaats van één verdwaalde.
 */

import { useMemo, useState } from "react";

import {
  LATEST_BATCH_DATE,
  STARTER_GROUPS,
  isNew,
  matchesQuery,
  starterMeta,
  type Starter,
  type StarterSource,
} from "@/lib/video/starters";

function Meta({ starter, source }: { starter: Starter; source: StarterSource }) {
  const meta = starterMeta(starter, source);
  const seconds = Number.isInteger(meta.seconds)
    ? String(meta.seconds)
    : meta.seconds.toFixed(1);

  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
      <span>{seconds}s</span>
      <span aria-hidden>·</span>
      <span>{meta.ratio}</span>
      <span aria-hidden>·</span>
      <span>
        {meta.clipCount} {meta.clipCount === 1 ? "clip" : "clips"}
      </span>
      {meta.shotsToRecord > 0 ? (
        <span className="rounded bg-amber-wash px-1.5 py-0.5 font-medium text-amber">
          {meta.shotsToRecord} to record
        </span>
      ) : (
        <span className="rounded bg-teal-wash px-1.5 py-0.5 font-medium text-teal-deep">
          ready to export
        </span>
      )}
    </span>
  );
}

export function StarterBrowser({
  source,
  selectedSlug,
  onSelect,
  onApply,
  onClose,
}: {
  source: StarterSource;
  selectedSlug: string;
  onSelect: (slug: string) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string>(STARTER_GROUPS[0].label);

  const searching = query.trim().length > 0;

  // Zoeken kijkt door alle families heen; zonder zoekterm zie je er één.
  const visible = useMemo(() => {
    if (!searching) {
      const group = STARTER_GROUPS.find((g) => g.label === family);
      return group ? [{ group, starters: group.starters }] : [];
    }
    return STARTER_GROUPS.map((group) => ({
      group,
      starters: group.starters.filter((s) => matchesQuery(s, group.label, query)),
    })).filter((entry) => entry.starters.length > 0);
  }, [family, query, searching]);

  const total = STARTER_GROUPS.reduce((sum, g) => sum + g.starters.length, 0);
  const found = visible.reduce((sum, entry) => sum + entry.starters.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex h-full max-h-[46rem] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Start from</h2>
            <p className="text-xs text-ink-muted">
              {total} starting points. Picking one replaces the timeline.
            </p>
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all families…"
            aria-label="Search starting points"
            className="ml-auto w-56 rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3 py-2 text-sm hover:border-ink"
          >
            Close
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* families */}
          <nav
            aria-label="Families"
            className="hidden w-60 shrink-0 overflow-y-auto border-r border-line p-3 sm:block"
          >
            {STARTER_GROUPS.map((group) => {
              const active = !searching && group.label === family;
              return (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFamily(group.label);
                  }}
                  aria-current={active ? "true" : undefined}
                  className={`mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm ${
                    active ? "bg-teal-wash text-teal-deep" : "hover:bg-paper"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{group.label}</span>
                    <span className="text-xs text-ink-faint">
                      {group.starters.length}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {group.blurb}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* kaarten */}
          <div className="min-w-0 flex-1 overflow-y-auto p-4">
            {searching ? (
              <p className="mb-3 text-xs text-ink-muted">
                {found} {found === 1 ? "match" : "matches"} for “{query.trim()}”
              </p>
            ) : null}

            {found === 0 ? (
              <p className="py-12 text-center text-sm text-ink-muted">
                Nothing matches that. Try one word instead of three.
              </p>
            ) : null}

            {visible.map((entry) => (
              <section key={entry.group.label} className="mb-6 last:mb-0">
                {searching ? (
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {entry.group.label}
                  </h3>
                ) : (
                  <p className="mb-3 text-sm text-ink-muted sm:hidden">
                    {entry.group.blurb}
                  </p>
                )}

                <ul className="grid gap-2 sm:grid-cols-2">
                  {entry.starters.map((starter) => {
                    const active = starter.slug === selectedSlug;
                    return (
                      <li key={starter.slug}>
                        <button
                          type="button"
                          onClick={() => onSelect(starter.slug)}
                          onDoubleClick={onApply}
                          aria-pressed={active}
                          className={`flex h-full w-full flex-col rounded-xl border p-3 text-left ${
                            active
                              ? "border-teal-deep bg-teal-wash"
                              : "border-line hover:border-ink"
                          }`}
                        >
                          <span className="text-sm font-medium">
                            {isNew(starter) ? (
                              <span
                                title={`Added ${LATEST_BATCH_DATE}`}
                                className="mr-1.5 rounded bg-teal-wash px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-teal-deep"
                              >
                                New
                              </span>
                            ) : null}
                            {starter.name}
                          </span>
                          <span className="mt-1 text-xs text-ink-muted">
                            {starter.intent}
                          </span>
                          <Meta starter={starter} source={source} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <footer className="flex items-center gap-3 border-t border-line px-5 py-3">
          <p className="min-w-0 flex-1 truncate text-xs text-ink-faint">
            Replaces the timeline. Undo with ⌘Z.
          </p>
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
          >
            Use this starting point
          </button>
        </footer>
      </div>
    </div>
  );
}
