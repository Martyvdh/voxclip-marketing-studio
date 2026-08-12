import Link from "next/link";

import { Card, EmptyState, StatusBadge } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { loadCampaignBoard } from "@/lib/campaign/queries";

export const dynamic = "force-dynamic";

const PILLAR_LABEL: Record<string, string> = {
  P1_ONE_PLACE: "One place",
  P2_INSTANT_RECALL: "Recall, instantly",
  P3_YOUR_STUFF_STAYS_YOURS: "Your stuff stays yours",
  P4_FREE_WHERE_LOCAL: "Free where it is local",
};

export default async function CampaignsPage() {
  await requireUser();
  const board = await loadCampaignBoard();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Everything public hangs off one campaign, so a post always traces back
            to an objective, an audience, and the facts it relies on.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white"
        >
          New campaign
        </Link>
      </div>

      <div className="mt-8">
        {board.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            detail="A campaign starts from a sourced signal or a blank brief. Both need an objective and an audience before they can move."
          />
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[520px] border-separate border-spacing-y-2 text-left text-sm">
            <caption className="sr-only">
              All active campaigns, newest first
            </caption>
            <thead className="text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th scope="col" className="px-4 pb-1 font-medium">Campaign</th>
                <th scope="col" className="px-4 pb-1 font-medium">Pillar</th>
                <th scope="col" className="px-4 pb-1 font-medium">Status</th>
                <th scope="col" className="px-4 pb-1 font-medium">Next</th>
              </tr>
            </thead>
            <tbody>
              {board.map(({ campaign, action }) => (
                <tr key={campaign.id} className="bg-surface">
                  <td className="rounded-l-lg border-y border-l border-line px-4 py-3">
                    <Link
                      href={`/campaigns/${campaign.slug}`}
                      className="font-medium hover:underline"
                    >
                      {campaign.title}
                    </Link>
                    <span className="ml-2 font-[family-name:var(--font-mono)] text-xs text-ink-faint">
                      {campaign.campaignCode}
                    </span>
                  </td>
                  <td className="border-y border-line px-4 py-3 text-ink-muted">
                    {PILLAR_LABEL[campaign.pillar] ?? campaign.pillar}
                  </td>
                  <td className="border-y border-line px-4 py-3">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="rounded-r-lg border-y border-r border-line px-4 py-3 text-ink-muted">
                    {action.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Card className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Starting from a signal
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          A campaign can start from a blank brief today. Starting from a sourced
          research signal comes with the research lane, so that a campaign can
          point at the evidence it was built on.
        </p>
      </Card>
    </>
  );
}
