import Link from "next/link";

import { Card, EmptyState, StatusBadge } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { loadCampaignBoard } from "@/lib/campaign/queries";

export const dynamic = "force-dynamic";

/**
 * The operational Home. One question: what is waiting on me.
 * Not a dashboard of numbers, and not a menu of generators.
 */
export default async function HomePage() {
  const user = await requireUser();
  const board = await loadCampaignBoard();

  const waiting = board.filter(
    (row) => row.action.target !== undefined || row.readiness.variantsFailingGate > 0,
  );

  return (
    <>
      <h1 className="text-3xl font-bold">Good to see you, {user.name.split(" ")[0]}.</h1>
      <p className="mt-2 text-ink-muted">
        {board.length === 0
          ? "Nothing is running yet."
          : `${waiting.length} of ${board.length} campaigns need something from you.`}
      </p>

      <section className="mt-8" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="mb-3 text-lg font-semibold">
          Waiting on you
        </h2>

        {waiting.length === 0 ? (
          <EmptyState
            title="Nothing is waiting"
            detail="Every campaign is either queued, published, or parked. Start a new one from a sourced signal, or read the results of the last one."
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {waiting.map(({ campaign, action }) => (
              <li key={campaign.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/campaigns/${campaign.slug}`}
                        className="font-[family-name:var(--font-display)] font-semibold hover:underline"
                      >
                        {campaign.title}
                      </Link>
                      <p className="mt-1 text-sm text-ink-muted">
                        {action.detail}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={campaign.status} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-teal-deep">
                    Next: {action.label}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="how-heading">
        <h2 id="how-heading" className="mb-3 text-lg font-semibold">
          How work moves here
        </h2>
        <Card>
          <ol className="grid gap-2 text-sm text-ink-muted sm:grid-cols-3">
            {[
              "A sourced signal becomes a brief.",
              "The brief becomes one master concept.",
              "The master concept becomes channel variants.",
              "A reviewer approves an exact version.",
              "The approved version is scheduled and published.",
              "Tagged links tell you what it did, and you write the learning.",
            ].map((step, i) => (
              <li key={step} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="font-[family-name:var(--font-mono)] text-ink-faint"
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line pt-3 text-sm">
            <Link href="/guide" className="text-teal-deep hover:underline">
              The same thing, step by step, with where to click
            </Link>
          </p>
        </Card>
      </section>
    </>
  );
}
