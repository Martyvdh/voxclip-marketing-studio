import Link from "next/link";

import { hideCoach, showCoach } from "@/lib/coach/actions";
import type { Step } from "@/lib/coach/steps";

/**
 * Het bandje dat zegt welke stap je nu bent.
 *
 * Onder de header en in de gewone paginastroom, niet als zwevend blokje over de
 * inhoud. Een popup die over je werk hangt drukt iedereen binnen een dag weg,
 * ook als de inhoud klopt. Dit schuift de pagina een stukje op en gaat mee
 * scrollen, en dat is genoeg om gelezen te worden zonder in de weg te zitten.
 */
export function Coach({ step }: { step: Step | null }) {
  if (!step) return null;

  return (
    <aside
      aria-labelledby="coach-title"
      className="mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6"
    >
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-mono)] text-xs text-ink-faint">
              {step.number === 0
                ? "voorbereiding"
                : `stap ${step.number} van ${step.total}`}
            </p>
            <h2
              id="coach-title"
              className="mt-1 font-[family-name:var(--font-display)] font-semibold"
            >
              {step.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">{step.body}</p>
          </div>

          <form action={hideCoach} className="shrink-0">
            <button
              type="submit"
              className="rounded-lg px-2 py-1 text-xs text-ink-muted underline hover:text-ink"
            >
              Hulp uitzetten
            </button>
          </form>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link
            href={step.href}
            className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white"
          >
            {step.linkLabel}
          </Link>
          <Link
            href="/guide"
            className="text-sm text-ink-muted underline hover:text-ink"
          >
            Alle negen stappen
          </Link>
        </div>
      </div>
    </aside>
  );
}

/** Staat op de uitlegpagina, zodat uitzetten geen eenrichtingsdeur is. */
export function CoachSwitchedOff() {
  return (
    <div className="mt-6 rounded-xl border border-line bg-surface p-5">
      <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
        De hulp staat uit
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Bovenaan elke pagina stond een bandje met de stap waar je bent. Je hebt
        het uitgezet. Dat mag, en hier kan het weer aan.
      </p>
      <form action={showCoach} className="mt-3">
        <button
          type="submit"
          className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium"
        >
          Hulp weer aanzetten
        </button>
      </form>
    </div>
  );
}
