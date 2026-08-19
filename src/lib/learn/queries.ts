/**
 * De posts met hun cijfers, klaar om te analyseren.
 *
 * Alleen ophalen en omvormen. Elke beslissing zit in `analyse.ts` en is daar
 * getest zonder database.
 */

import { and, desc, eq, isNotNull, or } from "drizzle-orm";

import { getDb } from "@/db";
import {
  campaigns,
  channelVariants,
  contentVersions,
  metricObservations,
  publicationAttempts,
} from "@/db/schema";
import type { Post } from "./analyse";

export interface PostWithCampaign extends Post {
  campaignTitle: string;
  variantCode: string;
  providerUrl: string | null;
}

/**
 * Alles wat de deur uit is, met de nieuwste cijfers erbij.
 *
 * De nieuwste per variant: elke ophaalronde schrijft nieuwe waarnemingen, dus
 * zonder die keuze tel je dezelfde video vijf keer mee.
 */
export async function loadPosts(): Promise<PostWithCampaign[]> {
  const db = getDb();

  const rows = await db
    .select({
      variantId: publicationAttempts.variantId,
      variantCode: channelVariants.variantCode,
      channel: channelVariants.channel,
      campaignTitle: campaigns.title,
      providerUrl: publicationAttempts.providerUrl,
      postedAt: publicationAttempts.finishedAt,
      startedAt: publicationAttempts.startedAt,
      body: contentVersions.body,
      versionId: channelVariants.currentVersionId,
    })
    .from(publicationAttempts)
    .innerJoin(channelVariants, eq(channelVariants.id, publicationAttempts.variantId))
    .innerJoin(campaigns, eq(campaigns.id, publicationAttempts.campaignId))
    .leftJoin(contentVersions, eq(contentVersions.id, channelVariants.currentVersionId))
    // MANUAL_HANDOFF is de normale afloop hier: jij post zelf en vinkt af.
    // SUCCEEDED bestaat voor als er ooit via een API gepost wordt.
    .where(
      or(
        eq(publicationAttempts.status, "MANUAL_HANDOFF"),
        eq(publicationAttempts.status, "SUCCEEDED"),
      ),
    )
    .orderBy(desc(publicationAttempts.startedAt));

  if (rows.length === 0) return [];

  const metrics = await db
    .select({
      variantId: metricObservations.variantId,
      metricKey: metricObservations.metricKey,
      value: metricObservations.value,
      observedAt: metricObservations.observedAt,
    })
    .from(metricObservations)
    .where(and(isNotNull(metricObservations.variantId), isNotNull(metricObservations.value)))
    .orderBy(desc(metricObservations.observedAt));

  /** De nieuwste waarde per variant en per soort cijfer. */
  const newest = new Map<string, number>();
  for (const row of metrics) {
    const key = `${row.variantId}:${row.metricKey}`;
    if (!newest.has(key) && row.value !== null) newest.set(key, row.value);
  }

  const seen = new Set<string>();
  const posts: PostWithCampaign[] = [];

  for (const row of rows) {
    // Eén post per variant: bij meerdere pogingen telt de laatste.
    if (seen.has(row.variantId)) continue;
    seen.add(row.variantId);

    posts.push({
      variantId: row.variantId,
      variantCode: row.variantCode,
      campaignTitle: row.campaignTitle,
      channel: row.channel,
      providerUrl: row.providerUrl,
      postedAt: row.postedAt ?? row.startedAt,
      body: row.body ?? "",
      hasVideo: Boolean(row.versionId),
      views: newest.get(`${row.variantId}:views`) ?? null,
      likes: newest.get(`${row.variantId}:likes`) ?? null,
    });
  }

  return posts;
}
