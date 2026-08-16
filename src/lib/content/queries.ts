import { desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  channelVariants,
  contentVersions,
  qualityFindings,
  qualityRuns,
  type Channel,
  type VariantStatus,
} from "@/db/schema";

export interface VariantView {
  id: string;
  channel: Channel;
  code: string;
  status: VariantStatus;
  versionNo: number;
  title: string | null;
  body: string;
  hashtags: string[];
  ctaLabel: string | null;
  ctaUrl: string | null;
  passed: boolean;
  findings: {
    ruleId: string;
    severity: string;
    message: string;
    excerpt: string | null;
  }[];
}

/** Everything the campaign page needs to show its variants, in three queries. */
export async function loadVariants(campaignId: string): Promise<VariantView[]> {
  const db = getDb();

  const variants = await db
    .select()
    .from(channelVariants)
    .where(eq(channelVariants.campaignId, campaignId))
    .orderBy(channelVariants.createdAt);

  if (variants.length === 0) return [];

  const versionIds = variants
    .map((v) => v.currentVersionId)
    .filter((id): id is string => Boolean(id));

  const versions = versionIds.length
    ? await db.select().from(contentVersions).where(inArray(contentVersions.id, versionIds))
    : [];

  const runs = versionIds.length
    ? await db
        .select()
        .from(qualityRuns)
        .where(inArray(qualityRuns.versionId, versionIds))
        .orderBy(desc(qualityRuns.createdAt))
    : [];

  const runIds = runs.map((r) => r.id);
  const findings = runIds.length
    ? await db.select().from(qualityFindings).where(inArray(qualityFindings.runId, runIds))
    : [];

  const latestRunByVersion = new Map<string, (typeof runs)[number]>();
  for (const run of runs) {
    if (!latestRunByVersion.has(run.versionId)) latestRunByVersion.set(run.versionId, run);
  }

  return variants.map((variant) => {
    const version = versions.find((v) => v.id === variant.currentVersionId);
    const run = variant.currentVersionId
      ? latestRunByVersion.get(variant.currentVersionId)
      : undefined;

    return {
      id: variant.id,
      channel: variant.channel,
      code: variant.variantCode,
      status: variant.status,
      versionNo: version?.versionNo ?? 0,
      title: version?.title ?? null,
      body: version?.body ?? "",
      hashtags: version?.hashtags ?? [],
      ctaLabel: version?.ctaLabel ?? null,
      ctaUrl: version?.ctaUrl ?? null,
      passed: run?.passed ?? false,
      findings: findings
        .filter((f) => f.runId === run?.id)
        .map((f) => ({
          ruleId: f.ruleId,
          severity: f.severity,
          message: f.message,
          excerpt: f.excerpt,
        })),
    };
  });
}
