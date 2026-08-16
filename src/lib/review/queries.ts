import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import {
  approvals,
  campaigns,
  channelVariants,
  contentVersions,
  qualityFindings,
  qualityRuns,
  reviewComments,
  reviews,
  users,
  type VariantStatus,
} from "@/db/schema";
import { approvalIsStale, queueOrder, WAITING_STATUSES } from "./rules";

export interface ReviewComment {
  body: string;
  author: string | null;
  at: Date;
}

export interface ReviewItem {
  variantId: string;
  variantCode: string;
  channel: string;
  status: VariantStatus;
  updatedAt: Date;
  campaignTitle: string;
  campaignSlug: string;
  ownedByMe: boolean;
  versionId: string;
  versionNo: number;
  title: string | null;
  body: string;
  ctaUrl: string | null;
  gatePassed: boolean;
  findings: { ruleId: string; severity: string; message: string }[];
  comments: ReviewComment[];
  /** The version before this one, so a reviewer can see what changed. */
  previous: { versionNo: number; body: string } | null;
  /** Set when this was approved before and then revised. */
  staleApproval: boolean;
}

/**
 * Everything waiting on a person.
 *
 * Written as a handful of set-based queries rather than one per row: a queue of
 * thirty items should not be thirty round trips to Frankfurt.
 */
export async function loadReviewQueue(userId: string): Promise<ReviewItem[]> {
  const db = getDb();

  const rows = await db
    .select({
      variant: channelVariants,
      campaign: campaigns,
      version: contentVersions,
    })
    .from(channelVariants)
    .innerJoin(campaigns, eq(campaigns.id, channelVariants.campaignId))
    .innerJoin(
      contentVersions,
      eq(contentVersions.id, channelVariants.currentVersionId),
    )
    .where(
      and(
        isNull(channelVariants.archivedAt),
        isNull(campaigns.archivedAt),
        inArray(channelVariants.status, WAITING_STATUSES),
      ),
    );

  if (rows.length === 0) return [];

  const variantIds = rows.map((r) => r.variant.id);
  const versionIds = rows.map((r) => r.version.id);

  const [runs, allVersions, reviewRows, approvalRows] = await Promise.all([
    db.select().from(qualityRuns).where(inArray(qualityRuns.versionId, versionIds)),
    db
      .select({
        id: contentVersions.id,
        variantId: contentVersions.variantId,
        versionNo: contentVersions.versionNo,
        body: contentVersions.body,
      })
      .from(contentVersions)
      .where(inArray(contentVersions.variantId, variantIds)),
    db.select().from(reviews).where(inArray(reviews.variantId, variantIds)),
    db.select().from(approvals).where(inArray(approvals.variantId, variantIds)),
  ]);

  const latestRun = new Map<string, (typeof runs)[number]>();
  for (const run of runs) {
    const held = latestRun.get(run.versionId);
    if (!held || held.createdAt < run.createdAt) latestRun.set(run.versionId, run);
  }

  const runIds = [...latestRun.values()].map((r) => r.id);
  const findings = runIds.length
    ? await db
        .select()
        .from(qualityFindings)
        .where(inArray(qualityFindings.runId, runIds))
    : [];

  const reviewIds = reviewRows.map((r) => r.id);
  const commentRows = reviewIds.length
    ? await db
        .select({
          reviewId: reviewComments.reviewId,
          body: reviewComments.body,
          createdAt: reviewComments.createdAt,
          author: users.name,
        })
        .from(reviewComments)
        .leftJoin(users, eq(users.id, reviewComments.authorId))
        .where(inArray(reviewComments.reviewId, reviewIds))
        .orderBy(desc(reviewComments.createdAt))
    : [];

  const reviewsByVariant = new Map<string, string[]>();
  for (const review of reviewRows) {
    const held = reviewsByVariant.get(review.variantId) ?? [];
    held.push(review.id);
    reviewsByVariant.set(review.variantId, held);
  }

  const approvedVersion = new Map<string, string>();
  for (const approval of approvalRows) {
    if (approval.revokedAt) continue;
    approvedVersion.set(approval.variantId, approval.versionId);
  }

  const items: ReviewItem[] = rows.map((row) => {
    const run = latestRun.get(row.version.id);
    const ownReviewIds = new Set(reviewsByVariant.get(row.variant.id) ?? []);

    const previous = allVersions
      .filter(
        (v) =>
          v.variantId === row.variant.id && v.versionNo < row.version.versionNo,
      )
      .sort((a, b) => b.versionNo - a.versionNo)[0];

    return {
      variantId: row.variant.id,
      variantCode: row.variant.variantCode,
      channel: row.variant.channel,
      status: row.variant.status,
      updatedAt: row.variant.updatedAt,
      campaignTitle: row.campaign.title,
      campaignSlug: row.campaign.slug,
      ownedByMe: row.campaign.ownerId === userId,
      versionId: row.version.id,
      versionNo: row.version.versionNo,
      title: row.version.title,
      body: row.version.body,
      ctaUrl: row.version.ctaUrl,
      gatePassed: run?.passed ?? true,
      findings: run
        ? findings
            .filter((f) => f.runId === run.id)
            .map((f) => ({
              ruleId: f.ruleId,
              severity: f.severity,
              message: f.message,
            }))
        : [],
      comments: commentRows
        .filter((c) => ownReviewIds.has(c.reviewId))
        .map((c) => ({ body: c.body, author: c.author, at: c.createdAt })),
      previous: previous
        ? { versionNo: previous.versionNo, body: previous.body }
        : null,
      staleApproval: approvalIsStale({
        approvedVersionId: approvedVersion.get(row.variant.id) ?? null,
        currentVersionId: row.version.id,
      }),
    };
  });

  return queueOrder(items);
}

/** How many things are waiting, for the badge in the navigation. */
export async function countWaitingForReview(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: channelVariants.id })
    .from(channelVariants)
    .where(
      and(
        isNull(channelVariants.archivedAt),
        eq(channelVariants.status, "IN_REVIEW"),
      ),
    );
  return rows.length;
}
