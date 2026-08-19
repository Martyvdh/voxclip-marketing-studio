/**
 * Een adres dat niet bestaat.
 *
 * Kort houden. Wie hier komt heeft een oude link of een typefout, en heeft niets
 * aan een verontschuldiging — alleen aan een weg terug.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">Deze pagina bestaat niet</h1>

      <p className="mt-3 text-sm text-ink-muted">
        Een oude link, of een campagne die is opgeruimd. Er is niets stuk.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
        >
          Naar het begin
        </Link>
        <Link
          href="/campaigns"
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-ink"
        >
          Naar de campagnes
        </Link>
      </div>
    </main>
  );
}
