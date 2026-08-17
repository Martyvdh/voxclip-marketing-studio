"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { syncCampaignStatus } from "@/lib/campaign/sync-status";
import {
  auditEvents,
  campaignBriefs,
  channelVariants,
  contentVersions,
  hooks as hooksTable,
  houseFormats,
  pillarDefaults,
  qualityFindings,
  qualityRuns,
  type Channel,
} from "@/db/schema";
import { NotAuthorisedError, requireCapability } from "@/lib/auth";
import { variantCodeFor } from "@/lib/campaign/codes";
import { loadCampaignBySlug } from "@/lib/campaign/queries";
import type { FormState } from "@/lib/campaign/actions";
import { getEnv } from "@/lib/env";
import { RULE_SET_VERSION, runQualityGate } from "@/lib/quality";
import { loadGateContext } from "@/lib/quality/context";
import { draftVariant } from "./draft";

/** Which hook family reads best on which channel. */
const FAMILY_FOR: Partial<Record<Channel, string>> = {
  LINKEDIN: "linkedin",
  BLOG: "blog",
  EMAIL: "linkedin",
};

/**
 * Turns one campaign into a draft per selected channel.
 *
 * Every draft runs through the quality gate before it is stored, and the run is
 * saved with it. Nothing on the board depends on a check nobody performed.
 */
export async function generateVariants(
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

  const slug = String(formData.get("slug") ?? "");
  const channels = formData.getAll("channels").map(String) as Channel[];

  if (channels.length === 0) {
    return { message: "Pick at least one channel to draft for." };
  }

  const row = await loadCampaignBySlug(slug);
  if (!row) return { message: "That campaign no longer exists." };

  const db = getDb();
  const campaign = row.campaign;

  const [brief] = await db
    .select()
    .from(campaignBriefs)
    .where(eq(campaignBriefs.campaignId, campaign.id))
    .limit(1);

  if (!brief) {
    return {
      message:
        "Write the brief first. A draft without a promise, proof, and a call to action is not something anyone can review.",
    };
  }

  const [defaults] = await db
    .select()
    .from(pillarDefaults)
    .where(eq(pillarDefaults.pillar, campaign.pillar))
    .limit(1);

  if (!defaults) {
    return {
      message:
        "No starting material for this pillar. Run the seed so the pillar defaults are loaded.",
    };
  }

  const [format] = await db
    .select()
    .from(houseFormats)
    .where(eq(houseFormats.isActive, true))
    .limit(1);

  const availableHooks = await db
    .select()
    .from(hooksTable)
    .where(and(eq(hooksTable.pillar, campaign.pillar), eq(hooksTable.isActive, true)));

  const existing = await db
    .select({ code: channelVariants.variantCode, channel: channelVariants.channel })
    .from(channelVariants)
    .where(eq(channelVariants.campaignId, campaign.id));

  const gateContext = await loadGateContext();
  const ctaPath = pathFromUrl(brief.ctaUrl);

  let created = 0;
  const skipped: string[] = [];

  for (const channel of channels) {
    const alreadyOnChannel = existing.filter((v) => v.channel === channel).length;
    const code = variantCodeFor(channel, alreadyOnChannel);
    if (existing.some((v) => v.code === code)) {
      skipped.push(channel);
      continue;
    }

    const family = FAMILY_FOR[channel] ?? "short";
    const pool = availableHooks.filter((h) => h.family === family);
    const hook =
      (pool.length > 0 ? pool : availableHooks)[
        (alreadyOnChannel + created) % Math.max(1, pool.length || availableHooks.length)
      ]?.text ?? defaults.headline;

    const draft = draftVariant({
      channel,
      campaignCode: campaign.campaignCode,
      variantCode: code,
      siteUrl: getEnv().PUBLIC_SITE_URL,
      pillar: campaign.pillar,
      hook,
      brief: {
        problem: brief.problem,
        desiredOutcome: brief.desiredOutcome,
        promise: brief.promise,
        proof: brief.proof,
        offer: brief.offer,
        primaryCta: brief.primaryCta,
        ctaPath,
      },
      pillarDefault: {
        headline: defaults.headline,
        subhead: defaults.subhead,
        payoff: defaults.payoff,
      },
      format: {
        slug: format?.slug ?? "capture-to-recall",
        name: format?.name ?? "Capture to recall",
        ctaRule: format?.ctaRule ?? "One call to action, at the end, tagged.",
      },
    });

    const result = runQualityGate(
      {
        channel,
        title: draft.title,
        body: draft.body,
        hashtags: draft.hashtags,
        ctaLabel: draft.ctaLabel,
        ctaUrl: draft.ctaUrl,
        campaignCode: campaign.campaignCode,
        variantCode: code,
        hasMedia: false,
        altText: null,
      },
      gateContext,
    );

    const [variant] = await db
      .insert(channelVariants)
      .values({
        campaignId: campaign.id,
        channel,
        variantCode: code,
        status: draft.needsAsset ? "NEEDS_ASSET" : "DRAFT",
      })
      .returning();

    const [version] = await db
      .insert(contentVersions)
      .values({
        variantId: variant.id,
        versionNo: 1,
        body: draft.body,
        title: draft.title ?? null,
        hashtags: draft.hashtags,
        ctaLabel: draft.ctaLabel,
        ctaUrl: draft.ctaUrl,
        authorId: user.id,
        metadata: {
          houseFormat: format?.slug ?? null,
          hook,
          drafterNotes: draft.notes,
        },
      })
      .returning();

    await db
      .update(channelVariants)
      .set({ currentVersionId: version.id })
      .where(eq(channelVariants.id, variant.id));

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
        result.findings.map((f) => ({
          runId: run.id,
          ruleId: f.ruleId,
          severity: f.severity,
          message: f.message,
          excerpt: f.excerpt ?? null,
          claimKey: f.claimKey ?? null,
        })),
      );
    }

    await db.insert(auditEvents).values({
      action: "VARIANT_CREATED",
      actorId: user.id,
      subjectType: "ChannelVariant",
      subjectId: variant.id,
      campaignId: campaign.id,
      summary: `${user.name} drafted a ${channel} variant (${code}) for "${campaign.title}".`,
      detail: { passed: result.passed, findings: result.findings.length },
    });

    created += 1;
  }
  await syncCampaignStatus(campaign.id);

  revalidatePath(`/campaigns/${slug}`);
  revalidatePath("/");

  if (created === 0) {
    return { message: `Nothing new to draft for ${skipped.join(", ")}.` };
  }
  return { ok: true };
}

/** Strips our own tracking back off a stored URL to get the operator's path. */
function pathFromUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      u.searchParams.delete(key);
    }
    return u.pathname + (u.search || "");
  } catch {
    return "/download";
  }
}
