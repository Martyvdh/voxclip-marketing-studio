"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import {
  approvals,
  auditEvents,
  campaigns,
  channelVariants,
  schedules,
} from "@/db/schema";
import { NotAuthorisedError, requireCapability } from "@/lib/auth";
import type { FormState } from "@/lib/campaign/actions";
import {
  canSchedule,
  formatInZone,
  idempotencyKeyFor,
  zonedToUtc,
} from "./plan";

/**
 * Puts an approved variant on a day.
 *
 * It does not post anything. No account is connected, and the rule in AGENTS.md
 * about never automating around a platform's API limits means none will be
 * faked. A planned post shows up in the week and in the handoff; a person still
 * presses the button on the platform.
 */
export async function schedulePost(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:schedule");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const variantId = String(formData.get("variantId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");

  const db = getDb();

  const [row] = await db
    .select({ variant: channelVariants, campaign: campaigns })
    .from(channelVariants)
    .innerJoin(campaigns, eq(campaigns.id, channelVariants.campaignId))
    .where(eq(channelVariants.id, variantId))
    .limit(1);

  if (!row) return { message: "That variant no longer exists." };

  const [approval] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.variantId, variantId), isNull(approvals.revokedAt)))
    .limit(1);

  const runAt = zonedToUtc(date, time);

  const verdict = canSchedule({
    status: row.variant.status,
    approvedVersionId: approval?.versionId ?? null,
    currentVersionId: row.variant.currentVersionId,
    runAt,
  });

  if (!verdict.allowed || !runAt) {
    return { message: verdict.reason ?? "Pick a date and a time." };
  }

  const versionId = row.variant.currentVersionId!;
  const idempotencyKey = idempotencyKeyFor({ variantId, versionId, runAt });

  // Replace rather than stack. Moving a post to a new time should leave one
  // plan, not two, and the old row keeps its record as cancelled.
  await db
    .update(schedules)
    .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schedules.variantId, variantId),
        eq(schedules.status, "PENDING"),
        ne(schedules.idempotencyKey, idempotencyKey),
      ),
    );

  await db
    .insert(schedules)
    .values({
      campaignId: row.campaign.id,
      variantId,
      versionId,
      runAt,
      status: "PENDING",
      idempotencyKey,
      createdById: user.id,
    })
    .onConflictDoNothing({ target: schedules.idempotencyKey });

  await db
    .update(channelVariants)
    .set({ status: "SCHEDULED", updatedAt: new Date() })
    .where(eq(channelVariants.id, variantId));

  await db.insert(auditEvents).values({
    action: "SCHEDULED",
    actorId: user.id,
    subjectType: "ChannelVariant",
    subjectId: variantId,
    campaignId: row.campaign.id,
    summary: `${user.name} planned ${row.variant.variantCode} for ${formatInZone(runAt)}.`,
    detail: { runAt: runAt.toISOString(), versionId },
  });

  revalidatePath("/calendar");
  revalidatePath(`/campaigns/${row.campaign.slug}`);
  return { ok: true };
}

/** Takes it off the calendar. The variant goes back to approved. */
export async function cancelSchedule(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:schedule");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const scheduleId = String(formData.get("scheduleId") ?? "");
  const db = getDb();

  const [row] = await db
    .select({ schedule: schedules, campaign: campaigns })
    .from(schedules)
    .innerJoin(campaigns, eq(campaigns.id, schedules.campaignId))
    .where(eq(schedules.id, scheduleId))
    .limit(1);

  if (!row) return { message: "That plan no longer exists." };

  if (row.schedule.status !== "PENDING") {
    return { message: "Only a pending plan can be taken off the calendar." };
  }

  await db
    .update(schedules)
    .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(schedules.id, scheduleId));

  const remaining = await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(
      and(
        eq(schedules.variantId, row.schedule.variantId),
        eq(schedules.status, "PENDING"),
      ),
    );

  if (remaining.length === 0) {
    await db
      .update(channelVariants)
      .set({ status: "APPROVED", updatedAt: new Date() })
      .where(eq(channelVariants.id, row.schedule.variantId));
  }

  await db.insert(auditEvents).values({
    action: "SCHEDULE_CANCELLED",
    actorId: user.id,
    subjectType: "Schedule",
    subjectId: scheduleId,
    campaignId: row.campaign.id,
    summary: `${user.name} took a plan off the calendar.`,
  });

  revalidatePath("/calendar");
  revalidatePath(`/campaigns/${row.campaign.slug}`);
  return { ok: true };
}
