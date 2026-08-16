import { and, eq, gte, inArray, isNull, lt, ne } from "drizzle-orm";

import { getDb } from "@/db";
import {
  approvals,
  campaigns,
  channelVariants,
  contentVersions,
  publicationAttempts,
  schedules,
} from "@/db/schema";
import { dayKey, groupByDay, weekDays, zonedToUtc } from "./plan";

export interface PlannedPost {
  id: string;
  runAt: Date;
  status: string;
  variantId: string;
  variantCode: string;
  channel: string;
  campaignTitle: string;
  campaignSlug: string;
  title: string | null;
  excerpt: string;
  /** True once a manual publication has been logged against this variant. */
  posted: boolean;
}

export interface WeekView {
  mondayKey: string;
  days: string[];
  byDay: Record<string, PlannedPost[]>;
  todayKey: string;
}

/** One week of the plan, in seven columns. */
export async function loadWeek(mondayKey: string, now = new Date()): Promise<WeekView> {
  const db = getDb();
  const days = weekDays(mondayKey);

  const from = zonedToUtc(days[0], "00:00") ?? new Date(0);
  const until = zonedToUtc(days[6], "23:59") ?? new Date(0);

  const rows = await db
    .select({
      schedule: schedules,
      variant: channelVariants,
      campaign: campaigns,
      version: contentVersions,
    })
    .from(schedules)
    .innerJoin(channelVariants, eq(channelVariants.id, schedules.variantId))
    .innerJoin(campaigns, eq(campaigns.id, schedules.campaignId))
    .innerJoin(contentVersions, eq(contentVersions.id, schedules.versionId))
    .where(
      and(
        gte(schedules.runAt, from),
        lt(schedules.runAt, until),
        ne(schedules.status, "CANCELLED"),
      ),
    );

  const variantIds = rows.map((r) => r.variant.id);
  const logged = variantIds.length
    ? await db
        .select({ variantId: publicationAttempts.variantId })
        .from(publicationAttempts)
        .where(inArray(publicationAttempts.variantId, variantIds))
    : [];

  const postedIds = new Set(logged.map((l) => l.variantId));

  const items: PlannedPost[] = rows.map((row) => ({
    id: row.schedule.id,
    runAt: row.schedule.runAt,
    status: row.schedule.status,
    variantId: row.variant.id,
    variantCode: row.variant.variantCode,
    channel: row.variant.channel,
    campaignTitle: row.campaign.title,
    campaignSlug: row.campaign.slug,
    title: row.version.title,
    excerpt:
      row.version.body.length > 120
        ? `${row.version.body.slice(0, 120).trimEnd()}…`
        : row.version.body,
    posted: postedIds.has(row.variant.id),
  }));

  return {
    mondayKey,
    days,
    byDay: groupByDay(items, days),
    todayKey: dayKey(now),
  };
}

export interface SchedulableVariant {
  variantId: string;
  variantCode: string;
  channel: string;
  campaignId: string;
  campaignTitle: string;
  campaignSlug: string;
  versionId: string;
  title: string | null;
  excerpt: string;
  alreadyPlanned: boolean;
}

/**
 * Approved variants whose approval still matches what is there.
 *
 * Anything rewritten after approval is deliberately absent: the calendar
 * should not offer a slot for words that lost their yes.
 */
export async function loadSchedulable(): Promise<SchedulableVariant[]> {
  const db = getDb();

  const rows = await db
    .select({
      variant: channelVariants,
      campaign: campaigns,
      version: contentVersions,
      approval: approvals,
    })
    .from(channelVariants)
    .innerJoin(campaigns, eq(campaigns.id, channelVariants.campaignId))
    .innerJoin(
      contentVersions,
      eq(contentVersions.id, channelVariants.currentVersionId),
    )
    .innerJoin(
      approvals,
      and(
        eq(approvals.variantId, channelVariants.id),
        eq(approvals.versionId, channelVariants.currentVersionId),
        isNull(approvals.revokedAt),
      ),
    )
    .where(
      and(
        isNull(channelVariants.archivedAt),
        isNull(campaigns.archivedAt),
        inArray(channelVariants.status, ["APPROVED", "SCHEDULED"]),
      ),
    );

  const variantIds = rows.map((r) => r.variant.id);
  const planned = variantIds.length
    ? await db
        .select({ variantId: schedules.variantId })
        .from(schedules)
        .where(
          and(
            inArray(schedules.variantId, variantIds),
            ne(schedules.status, "CANCELLED"),
          ),
        )
    : [];

  const plannedIds = new Set(planned.map((p) => p.variantId));

  return rows.map((row) => ({
    variantId: row.variant.id,
    variantCode: row.variant.variantCode,
    channel: row.variant.channel,
    campaignId: row.campaign.id,
    campaignTitle: row.campaign.title,
    campaignSlug: row.campaign.slug,
    versionId: row.version.id,
    title: row.version.title,
    excerpt:
      row.version.body.length > 100
        ? `${row.version.body.slice(0, 100).trimEnd()}…`
        : row.version.body,
    alreadyPlanned: plannedIds.has(row.variant.id),
  }));
}
