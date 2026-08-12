import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, StatusBadge } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { loadCampaignBySlug } from "@/lib/campaign/queries";
import { LEGAL_TRANSITIONS, evaluateTransition } from "@/lib/campaign/state-machine";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const row = await loadCampaignBySlug(slug);
  if (!row) notFound();

  const { campaign, readiness, action } = row;
  const targets = LEGAL_TRANSITIONS[campaign.status];

  return (
    <>
      <Link href="/campaigns" className="text-sm text-ink-muted hover:underline">
        Back to campaigns
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{campaign.title}</h1>
        <StatusBadge status={campaign.status} />
      </div>

      <p className="mt-2 text-ink-muted">{campaign.objective}</p>
      <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-ink-faint">
        utm_campaign={campaign.campaignCode}
      </p>

      <Card className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Next: {action.label}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{action.detail}</p>
      </Card>

      <section className="mt-8" aria-labelledby="transitions-heading">
        <h2 id="transitions-heading" className="mb-3 text-lg font-semibold">
          Where this can go
        </h2>
        <ul className="space-y-2">
          {targets.length === 0 ? (
            <li className="text-sm text-ink-muted">
              This status is final. The campaign is read only.
            </li>
          ) : (
            targets.map((target) => {
              const verdict = evaluateTransition(campaign.status, target, readiness);
              return (
                <li key={target}>
                  <Card className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{target}</p>
                      {!verdict.allowed ? (
                        <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                          {verdict.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-ink-muted">
                          Everything this needs is in place.
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-medium ${
                        verdict.allowed
                          ? "bg-teal-wash text-teal-deep"
                          : "bg-paper text-ink-muted"
                      }`}
                    >
                      {verdict.allowed ? "Ready" : "Blocked"}
                    </span>
                  </Card>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="readiness-heading">
        <h2 id="readiness-heading" className="mb-3 text-lg font-semibold">
          What the server sees
        </h2>
        <Card>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {(
              [
                ["Channel variants", readiness.variantCount],
                ["Failing the quality gate", readiness.variantsFailingGate],
                ["Waiting on a reviewer", readiness.variantsAwaitingApproval],
                ["Missing a proof asset", readiness.variantsNeedingAsset],
                ["Scheduled", readiness.scheduledCount],
                ["Published successfully", readiness.successfulPublications],
                ["Attempts in flight", readiness.inFlightPublications],
                [
                  "Brief still empty",
                  readiness.briefMissingFields.join(", ") || "nothing",
                ],
              ] as [string, string | number][]
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="font-[family-name:var(--font-mono)]">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>
    </>
  );
}
