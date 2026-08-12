import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/db";
import { campaignTransitions } from "@/db/schema";
import { Card, StatusBadge } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { loadCampaignBySlug } from "@/lib/campaign/queries";
import {
  LEGAL_TRANSITIONS,
  evaluateTransition,
} from "@/lib/campaign/state-machine";
import { Transitions, type TransitionOption } from "./transitions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  IDEA: "Idea",
  BRIEF: "Brief",
  DRAFT: "Draft",
  NEEDS_ASSET: "Needs asset",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHING: "Publishing",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

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

  const options: TransitionOption[] = LEGAL_TRANSITIONS[campaign.status].map(
    (target) => {
      const verdict = evaluateTransition(campaign.status, target, readiness);
      return {
        target,
        label: STATUS_LABEL[target] ?? target,
        allowed: verdict.allowed,
        reasons: verdict.allowed ? [] : verdict.reasons,
      };
    },
  );

  const history = await getDb()
    .select()
    .from(campaignTransitions)
    .where(eq(campaignTransitions.campaignId, campaign.id))
    .orderBy(desc(campaignTransitions.createdAt))
    .limit(20);

  return (
    <>
      <Link href="/campaigns" className="text-sm text-ink-muted hover:underline">
        Back to campaigns
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{campaign.title}</h1>
        <StatusBadge status={campaign.status} />
      </div>

      <p className="mt-2 max-w-2xl text-ink-muted">{campaign.objective}</p>
      <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-ink-faint">
        utm_campaign={campaign.campaignCode}
      </p>

      <Card className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Next: {action.label}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{action.detail}</p>
        <Link
          href={`/campaigns/${slug}/brief`}
          className="mt-3 inline-block text-sm font-medium text-teal-deep hover:underline"
        >
          Open the brief
        </Link>
      </Card>

      <section className="mt-8" aria-labelledby="transitions-heading">
        <h2 id="transitions-heading" className="mb-3 text-lg font-semibold">
          Where this can go
        </h2>
        <Transitions slug={slug} options={options} />
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

      <section className="mt-8" aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-3 text-lg font-semibold">
          History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing has moved yet. Every change from here is recorded with who
            made it and why.
          </p>
        ) : (
          <ol className="space-y-2">
            {history.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-baseline gap-x-3 text-sm"
              >
                <span className="font-[family-name:var(--font-mono)] text-xs text-ink-faint">
                  {t.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </span>
                <span>
                  {STATUS_LABEL[t.fromStatus]} to {STATUS_LABEL[t.toStatus]}
                </span>
                {t.reason ? (
                  <span className="text-ink-muted">{t.reason}</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
