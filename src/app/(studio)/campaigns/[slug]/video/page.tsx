import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/db";
import { campaignBriefs, pillarDefaults } from "@/db/schema";
import { Card } from "@/components/brand";
import { VideoEditor } from "@/components/video/editor";
import { requireUser } from "@/lib/auth";
import { loadCampaignBySlug } from "@/lib/campaign/queries";
import { normaliseDashes } from "@/lib/content/draft";
import type { SceneSource } from "@/lib/video/scenes";

export const dynamic = "force-dynamic";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const row = await loadCampaignBySlug(slug);
  if (!row) notFound();

  const db = getDb();
  const [brief] = await db
    .select()
    .from(campaignBriefs)
    .where(eq(campaignBriefs.campaignId, row.campaign.id))
    .limit(1);

  const [defaults] = await db
    .select()
    .from(pillarDefaults)
    .where(eq(pillarDefaults.pillar, row.campaign.pillar))
    .limit(1);

  if (!brief || !defaults) {
    return (
      <>
        <Link
          href={`/campaigns/${slug}`}
          className="text-sm text-ink-muted hover:underline"
        >
          Back to {row.campaign.title}
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Video</h1>
        <Card className="mt-8">
          <p className="text-sm text-ink-muted">
            {brief
              ? "No starting material for this pillar. Run the seed so the pillar defaults are loaded."
              : "Write the brief first. The video says what the campaign promises, so there has to be a promise."}
          </p>
          {!brief ? (
            <Link
              href={`/campaigns/${slug}/brief`}
              className="mt-3 inline-block text-sm font-medium text-teal-deep hover:underline"
            >
              Open the brief
            </Link>
          ) : null}
        </Card>
      </>
    );
  }

  // Everything drawn comes from the campaign, not from a template. Dashes are
  // normalised because they are as forbidden on screen as they are in a caption.
  const source: SceneSource = {
    hook: normaliseDashes(brief.promise),
    problem: normaliseDashes(brief.problem),
    promise: normaliseDashes(brief.promise),
    desiredOutcome: normaliseDashes(brief.desiredOutcome),
    payoff: normaliseDashes(defaults.payoff),
    ctaLabel: normaliseDashes(brief.primaryCta),
    headline: normaliseDashes(defaults.headline),
    subhead: normaliseDashes(defaults.subhead),
  };

  return (
    <>
      <Link
        href={`/campaigns/${slug}`}
        className="text-sm text-ink-muted hover:underline"
      >
        Back to {row.campaign.title}
      </Link>

      <h1 className="mt-3 text-3xl font-bold">Video</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Six formats, not a hundred and fifty looks. Every word on screen comes
        from this campaign&apos;s brief, so a video cannot promise something the
        campaign never said.
      </p>

      <div className="mt-8">
        <VideoEditor source={source} />
      </div>

      <Card className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          What this does not do yet
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-muted">
          <li>
            It does not composite your screen recording into the frame. The
            formats that need one say so and leave the slot.
          </li>
          <li>
            It does not add music or a voice-over. Both are coming with the asset
            library.
          </li>
          <li>
            The download is not attached to the campaign yet, so keep the file
            until the asset library lands.
          </li>
        </ul>
      </Card>
    </>
  );
}
