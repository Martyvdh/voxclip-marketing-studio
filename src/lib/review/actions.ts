"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import {
  approvals,
  auditEvents,
  campaigns,
  channelVariants,
  contentVersions,
  qualityFindings,
  qualityRuns,
  reviewComments,
  reviews,
} from "@/db/schema";
import { can, NotAuthorisedError, requireCapability } from "@/lib/auth";
import type { FormState } from "@/lib/campaign/actions";
import { RULE_SET_VERSION, runQualityGate } from "@/lib/quality";
import { loadGateContext } from "@/lib/quality/context";
import { canApprove, canSendForReview } from "./rules";

/** The variant, its current version, its campaign, and the latest gate result. */
async function loadContext(variantId: string) {
  const db = getDb();

  const [row] = await db
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
    .where(eq(channelVariants.id, variantId))
    .limit(1);

  if (!row) return null;

  const [run] = await db
    .select()
    .from(qualityRuns)
    .where(eq(qualityRuns.versionId, row.version.id))
    .orderBy(desc(qualityRuns.createdAt))
    .limit(1);

  return { ...row, gatePassed: run?.passed ?? true };
}

function paths(slug: string) {
  revalidatePath("/review");
  revalidatePath(`/campaigns/${slug}`);
}

/** Asks somebody to read it. */
export async function sendForReview(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:edit");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const variantId = String(formData.get("variantId") ?? "");
  const context = await loadContext(variantId);
  if (!context) return { message: "That variant has no version to review." };

  const verdict = canSendForReview({
    status: context.variant.status,
    gatePassed: context.gatePassed,
  });
  if (!verdict.allowed) return { message: verdict.reason };

  const db = getDb();

  await db.insert(reviews).values({
    variantId,
    versionId: context.version.id,
    decision: "PENDING",
  });

  await db
    .update(channelVariants)
    .set({ status: "IN_REVIEW", updatedAt: new Date() })
    .where(eq(channelVariants.id, variantId));

  await db.insert(auditEvents).values({
    action: "REVIEW_REQUESTED",
    actorId: user.id,
    subjectType: "ChannelVariant",
    subjectId: variantId,
    campaignId: context.variant.campaignId,
    summary: `${user.name} sent ${context.variant.variantCode} v${context.version.versionNo} for review.`,
  });

  paths(context.campaign.slug);
  return { ok: true };
}

/** Sends it back with a reason. The reason is the whole point. */
export async function requestChanges(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:review");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const variantId = String(formData.get("variantId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  if (comment.length < 5) {
    return {
      errors: {
        comment:
          "Say what needs to change. Sending work back without a reason only moves it.",
      },
    };
  }

  const context = await loadContext(variantId);
  if (!context) return { message: "That variant no longer exists." };

  if (context.variant.status !== "IN_REVIEW") {
    return { message: "Nothing is waiting on a decision here." };
  }

  const db = getDb();

  const [open] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.variantId, variantId), eq(reviews.decision, "PENDING")))
    .orderBy(desc(reviews.createdAt))
    .limit(1);

  const review =
    open ??
    (
      await db
        .insert(reviews)
        .values({ variantId, versionId: context.version.id })
        .returning()
    )[0];

  await db
    .update(reviews)
    .set({
      decision: "CHANGES_REQUESTED",
      reviewerId: user.id,
      decidedAt: new Date(),
    })
    .where(eq(reviews.id, review.id));

  await db.insert(reviewComments).values({
    reviewId: review.id,
    authorId: user.id,
    body: comment,
  });

  await db
    .update(channelVariants)
    .set({ status: "CHANGES_REQUESTED", updatedAt: new Date() })
    .where(eq(channelVariants.id, variantId));

  await db.insert(auditEvents).values({
    action: "CHANGES_REQUESTED",
    actorId: user.id,
    subjectType: "ChannelVariant",
    subjectId: variantId,
    campaignId: context.variant.campaignId,
    summary: `${user.name} asked for changes on ${context.variant.variantCode}.`,
    detail: { comment },
  });

  paths(context.campaign.slug);
  return { ok: true };
}

/**
 * Approves the exact version on screen.
 *
 * The approval records which version it covers. Revise afterwards and the
 * approval no longer matches, which the queue says out loud rather than
 * quietly carrying an old yes onto new words.
 */
export async function approveVersion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    // campaign:review is the floor for touching a review at all; the real check
    // is the verdict below, which reads the approve capability by role.
    user = await requireCapability("campaign:review");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const variantId = String(formData.get("variantId") ?? "");
  const context = await loadContext(variantId);
  if (!context) return { message: "That variant no longer exists." };

  const verdict = canApprove({
    status: context.variant.status,
    gatePassed: context.gatePassed,
    isOwner: context.campaign.ownerId === user.id,
    hasCapability: can(user.role, "campaign:approve"),
    isAdmin: user.role === "ADMIN",
  });
  if (!verdict.allowed) return { message: verdict.reason };

  const db = getDb();
  const typed = String(formData.get("note") ?? "").trim();

  // Een goedkeuring die niemand anders gelezen heeft wordt als zodanig
  // opgeslagen. Toegestaan, maar niet stil.
  const note = verdict.selfApproval
    ? ["Eigen campagne, zelf goedgekeurd.", typed].filter(Boolean).join(" ")
    : typed || null;

  await db
    .insert(approvals)
    .values({
      variantId,
      versionId: context.version.id,
      approverId: user.id,
      note: note || null,
    })
    .onConflictDoNothing();

  await db
    .update(reviews)
    .set({ decision: "APPROVED", reviewerId: user.id, decidedAt: new Date() })
    .where(and(eq(reviews.variantId, variantId), eq(reviews.decision, "PENDING")));

  await db
    .update(channelVariants)
    .set({ status: "APPROVED", updatedAt: new Date() })
    .where(eq(channelVariants.id, variantId));

  await db.insert(auditEvents).values({
    action: "APPROVED",
    actorId: user.id,
    subjectType: "ChannelVariant",
    subjectId: variantId,
    campaignId: context.variant.campaignId,
    summary: verdict.selfApproval
      ? `${user.name} approved their own ${context.variant.variantCode} v${context.version.versionNo}. Nobody else read it.`
      : `${user.name} approved ${context.variant.variantCode} v${context.version.versionNo}.`,
    detail: {
      versionId: context.version.id,
      versionNo: context.version.versionNo,
      selfApproval: verdict.selfApproval ?? false,
    },
  });

  paths(context.campaign.slug);
  return { ok: true };
}

/**
 * Writes a new version and rechecks it.
 *
 * The old version stays. That is what makes a revision reviewable: you can see
 * what changed, and an earlier approval visibly no longer covers it.
 */
export async function reviseVariant(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:edit");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const variantId = String(formData.get("variantId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (body.length < 10) {
    return { errors: { body: "There is nothing here to review." } };
  }

  const context = await loadContext(variantId);
  if (!context) return { message: "That variant no longer exists." };

  if (body === context.version.body) {
    return {
      errors: { body: "This is the same text. Nothing to save." },
    };
  }

  const db = getDb();

  const [version] = await db
    .insert(contentVersions)
    .values({
      variantId,
      versionNo: context.version.versionNo + 1,
      body,
      title: title || context.version.title,
      hashtags: context.version.hashtags,
      ctaLabel: context.version.ctaLabel,
      ctaUrl: context.version.ctaUrl,
      altText: context.version.altText,
      assetIds: context.version.assetIds,
      metadata: context.version.metadata,
      authorId: user.id,
    })
    .returning();

  const result = runQualityGate(
    {
      channel: context.variant.channel,
      title: version.title,
      body: version.body,
      hashtags: version.hashtags,
      ctaLabel: version.ctaLabel,
      ctaUrl: version.ctaUrl,
      campaignCode: context.campaign.campaignCode,
      variantCode: context.variant.variantCode,
      hasMedia: version.assetIds.length > 0,
      altText: version.altText,
    },
    await loadGateContext(),
  );

  const [run] = await db
    .insert(qualityRuns)
    .values({
      versionId: version.id,
      passed: result.passed,
      ruleSetVersion: RULE_SET_VERSION,
    })
    .returning();

  if (result.findings.length > 0) {
    await db.insert(qualityFindings).values(
      result.findings.map((finding) => ({
        runId: run.id,
        ruleId: finding.ruleId,
        severity: finding.severity,
        message: finding.message,
        excerpt: finding.excerpt ?? null,
        claimKey: finding.claimKey ?? null,
      })),
    );
  }

  await db
    .update(channelVariants)
    .set({
      currentVersionId: version.id,
      status: "DRAFT",
      updatedAt: new Date(),
    })
    .where(eq(channelVariants.id, variantId));

  await db.insert(auditEvents).values({
    action: "VARIANT_REVISED",
    actorId: user.id,
    subjectType: "ChannelVariant",
    subjectId: variantId,
    campaignId: context.variant.campaignId,
    summary: `${user.name} wrote v${version.versionNo} of ${context.variant.variantCode}.`,
    detail: { passed: result.passed, versionId: version.id },
  });

  paths(context.campaign.slug);
  return { ok: true };
}
