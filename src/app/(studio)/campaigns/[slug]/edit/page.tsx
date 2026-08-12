import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/db";
import { audiences as audiencesTable } from "@/db/schema";
import { Card } from "@/components/brand";
import { can, requireUser } from "@/lib/auth";
import { loadCampaignBySlug } from "@/lib/campaign/queries";
import { ArchiveCampaign, EditCampaignForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const row = await loadCampaignBySlug(slug);
  if (!row) notFound();

  if (!can(user.role, "campaign:edit")) {
    return (
      <>
        <h1 className="text-3xl font-bold">Edit</h1>
        <p className="mt-4 text-ink-muted">
          Your role is {user.role}, which can read campaigns but not change them.
        </p>
      </>
    );
  }

  const rows = await getDb()
    .select({ id: audiencesTable.id, name: audiencesTable.name })
    .from(audiencesTable)
    .where(eq(audiencesTable.isActive, true));

  return (
    <>
      <Link
        href={`/campaigns/${slug}`}
        className="text-sm text-ink-muted hover:underline"
      >
        Back to {row.campaign.title}
      </Link>

      <h1 className="mt-3 text-3xl font-bold">Edit campaign</h1>

      <EditCampaignForm
        slug={slug}
        audiences={rows.map((a) => ({ value: a.id, label: a.name }))}
        values={{
          title: row.campaign.title,
          pillar: row.campaign.pillar,
          objective: row.campaign.objective,
          audienceId: row.campaign.audienceId,
        }}
      />

      <Card className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          What cannot change
        </h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-ink-muted">Campaign code</dt>
            <dd className="font-[family-name:var(--font-mono)]">
              {row.campaign.campaignCode}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-ink-muted">Address</dt>
            <dd className="font-[family-name:var(--font-mono)]">/{row.campaign.slug}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-ink-muted">
          The code is in every link already posted. Changing it would orphan the
          results of anything published so far. A campaign that needs a different
          code is a different campaign.
        </p>
      </Card>

      <ArchiveCampaign
        slug={slug}
        title={row.campaign.title}
        archived={row.campaign.archivedAt !== null}
      />
    </>
  );
}
