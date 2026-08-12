"use server";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { auditEvents, channelVariants, publicationAttempts } from "@/db/schema";
import { NotAuthorisedError, requireCapability } from "@/lib/auth";
import type { FormState } from "@/lib/campaign/actions";

/**
 * Records that a human posted this somewhere, by hand.
 *
 * Status is MANUAL_HANDOFF, never SUCCEEDED, because nothing here talked to a
 * provider. The URL is the receipt: it is what makes the claim checkable.
 */
export async function recordManualPublication(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:publish");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const variantId = String(formData.get("variantId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const url = String(formData.get("url") ?? "").trim();

  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return {
      errors: {
        url: "Paste the full address of the post, starting with https://.",
      },
    };
  }

  const db = getDb();
  const [variant] = await db
    .select()
    .from(channelVariants)
    .where(eq(channelVariants.id, variantId))
    .limit(1);

  if (!variant) return { message: "That variant no longer exists." };
  if (!variant.currentVersionId) {
    return { message: "This variant has no version to record against." };
  }

  const existing = await db
    .select({ id: publicationAttempts.id })
    .from(publicationAttempts)
    .where(eq(publicationAttempts.variantId, variantId));

  // The same variant cannot be recorded twice by accident. Deliberately posting
  // it again is a new variant, which is also how you tell the results apart.
  if (existing.length > 0) {
    return {
      message:
        "This variant is already recorded as posted. Posting it again is a new variant, which is also how you keep the results apart.",
    };
  }

  const idempotencyKey = `manual:${variantId}:${variant.currentVersionId}`;

  await db.insert(publicationAttempts).values({
    campaignId: variant.campaignId,
    variantId: variant.id,
    versionId: variant.currentVersionId,
    status: "MANUAL_HANDOFF",
    attemptNo: 1,
    idempotencyKey,
    payloadHash: createHash("sha256").update(url).digest("hex"),
    providerUrl: url,
    finishedAt: new Date(),
  });

  await db
    .update(channelVariants)
    .set({ status: "PUBLISHED", updatedAt: new Date() })
    .where(eq(channelVariants.id, variantId));

  await db.insert(auditEvents).values({
    action: "PUBLISH_SUCCEEDED",
    actorId: user.id,
    subjectType: "ChannelVariant",
    subjectId: variantId,
    campaignId: variant.campaignId,
    summary: `${user.name} posted ${variant.variantCode} on ${variant.channel} by hand and recorded it.`,
    detail: { host, manual: true },
  });

  revalidatePath(`/campaigns/${slug}`);
  revalidatePath(`/campaigns/${slug}/handoff/${variant.variantCode}`);
  return { ok: true };
}
