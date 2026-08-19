"use client";

/**
 * Wat je ziet als er iets omvalt.
 *
 * Hier stond niets, dus kreeg je het kale scherm van Next: "This page couldn't
 * load", op zwart, zonder enige aanwijzing. Dat gebeurde bij een upload die over
 * de grens van een server action ging, en er was geen manier om dat te weten.
 *
 * Een foutpagina hoeft niet te troosten. Hij moet zeggen wat je nu kunt doen en
 * genoeg meegeven om het na te zoeken.
 */

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Naar de serverlogs, want daar kun je hem terugvinden met de digest.
    console.error("Onverwachte fout:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">Daar ging iets mis</h1>

      <p className="mt-3 text-sm text-ink-muted">
        Niet jouw schuld, en er is niets kwijt. Wat je net probeerde is niet
        opgeslagen; alles wat er al stond staat er nog.
      </p>

      <p className="mt-4 text-sm text-ink-muted">
        Kwam dit na het uploaden van een bestand, dan was het waarschijnlijk te
        groot. De limiet is 25 MB, en een langere video hoort op een filehost met
        een link vanuit de campagne.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
        >
          Opnieuw proberen
        </button>
        {/*
          Een harde navigatie en geen <Link>. Op een foutpagina kan de router
          zelf in de knoop liggen; opnieuw laden zet alles terug op nul.
        */}
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-ink"
        >
          Naar het begin
        </button>
      </div>

      {error.digest ? (
        <p className="mt-8 text-xs text-ink-faint">
          Kenmerk voor de logs:{" "}
          <code className="rounded bg-paper px-1.5 py-0.5">{error.digest}</code>
        </p>
      ) : null}
    </main>
  );
}
