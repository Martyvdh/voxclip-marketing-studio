/**
 * Reads for the operator surfaces.
 *
 * These fetch a few small tables and aggregate in TypeScript rather than in one
 * clever query. At this team's data volume that is fast enough and much easier
 * to keep correct. When a campaign board gets slow, fold it into SQL then, not
 * before.
 */

import { desc, isNotNull, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import {
  approvals,
  campaignBriefs,
  campaigns,
  channelVariants,
  publicationAttempts,
  qualityRuns,
  type Campaign,
  type CampaignBrief,
} from "@/db/schema";
import { nextAction, type CampaignReadiness, type NextAction } from "./state-machine";

/** Brief fields that must be filled before a campaign can leave BRIEF. */
const REQUIRED_BRIEF_FIELDS: (keyof CampaignBrief)[] = [
  "problem",
  "desiredOutcome",
  "promise",
  "proof",
  "offer",
  "primaryCta",
  "ctaUrl",
];

function missingBriefFields(brief: CampaignBrief | undefined): string[] {
  if (!brief) return ["the whole brief"];
  return REQUIRED_BRIEF_FIELDS.filter((field) => {
    const value = brief[field];
    return typeof value !== "string" || value.trim().length === 0;
  }) as string[];
}

export interface CampaignBoardRow {
  campaign: Campaign;
  readiness: CampaignReadiness;
  action: NextAction;
}

export async function loadCampaignBoard(
  includeArchived = false,
): Promise<CampaignBoardRow[]> {
  const db = getDb();

  const [
    campaignRows,
    briefRows,
    variantRows,
    approvalRows,
    runRows,
    attemptRows,
  ] = await Promise.all([
    includeArchived
      ? db.select().from(campaigns).orderBy(desc(campaigns.updatedAt))
      : db
          .select()
          .from(campaigns)
          .where(isNull(campaigns.archivedAt))
          .orderBy(desc(campaigns.updatedAt)),
    db.select().from(campaignBriefs),
    db.select().from(channelVariants).where(isNull(channelVariants.archivedAt)),
    db.select().from(approvals),
    db.select().from(qualityRuns).orderBy(desc(qualityRuns.createdAt)),
    db.select().from(publicationAttempts),
  ]);

  const briefByCampaign = new Map(briefRows.map((b) => [b.campaignId, b]));

  /** The newest quality run per version decides whether that version passes. */
  const latestRunByVersion = new Map<string, boolean>();
  for (const run of runRows) {
    if (!latestRunByVersion.has(run.versionId)) {
      latestRunByVersion.set(run.versionId, run.passed);
    }
  }

  const liveApprovals = approvalRows.filter((a) => a.revokedAt === null);
  const approvedVersions = new Set(liveApprovals.map((a) => a.versionId));

  return campaignRows.map((campaign) => {
    const variants = variantRows.filter((v) => v.campaignId === campaign.id);
    const attempts = attemptRows.filter((a) => a.campaignId === campaign.id);
    const brief = briefByCampaign.get(campaign.id);

    const readiness: CampaignReadiness = {
      hasObjective: campaign.objective.trim().length > 0,
      hasAudience: campaign.audienceId !== null,
      briefMissingFields: missingBriefFields(brief),
      variantCount: variants.length,
      variantsFailingGate: variants.filter(
        (v) =>
          v.currentVersionId !== null &&
          latestRunByVersion.get(v.currentVersionId) === false,
      ).length,
      variantsNeedingAsset: variants.filter((v) => v.status === "NEEDS_ASSET")
        .length,
      variantsAwaitingApproval: variants.filter((v) => v.status === "IN_REVIEW")
        .length,
      approvalsBindToCurrentVersion: variants
        .filter((v) => v.status === "APPROVED" || v.status === "SCHEDULED")
        .every(
          (v) =>
            v.currentVersionId !== null && approvedVersions.has(v.currentVersionId),
        ),
      // An author cannot approve their own work, so an approval by anyone other
      // than the campaign owner satisfies this.
      approverIsNotAuthor:
        liveApprovals.length === 0 ||
        liveApprovals.some((a) => a.approverId !== campaign.ownerId),
      scheduledCount: variants.filter((v) => v.status === "SCHEDULED").length,
      successfulPublications: attempts.filter((a) => a.status === "SUCCEEDED")
        .length,
      inFlightPublications: attempts.filter((a) => a.finishedAt === null).length,
    };

    return {
      campaign,
      readiness,
      action: nextAction(campaign.status, readiness),
    };
  });
}

export async function loadCampaignBySlug(
  slug: string,
): Promise<CampaignBoardRow | null> {
  const board = await loadCampaignBoard(true);
  return board.find((row) => row.campaign.slug === slug) ?? null;
}

/** The archive. Campaigns that left the board but kept their history. */
export async function loadArchivedCampaigns(): Promise<Campaign[]> {
  return getDb()
    .select()
    .from(campaigns)
    .where(isNotNull(campaigns.archivedAt))
    .orderBy(desc(campaigns.archivedAt));
}
