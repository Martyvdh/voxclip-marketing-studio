"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import {
  assets,
  auditEvents,
  campaigns,
  channelVariants,
  contentVersions,
  type Channel,
} from "@/db/schema";
import { NotAuthorisedError, requireCapability } from "@/lib/auth";
import type { FormState } from "@/lib/campaign/actions";
import { needsMedia } from "./media";

/** Beeld dat aan een tekst hangt, met of het goedgekeurd is. */
export interface AttachedMedia {
  attachedAssetCount: number;
  approvedAssetCount: number;
}

/** Leest per tekst hoeveel beeld eraan hangt en hoeveel daarvan goedgekeurd is. */
export async function loadAttachedMedia(
  versionIds: string[],
): Promise<Map<string, AttachedMedia>> {
  const result = new Map<string, AttachedMedia>();
  if (versionIds.length === 0) return result;

  const db = getDb();

  const versions = await db
    .select({ id: contentVersions.id, assetIds: contentVersions.assetIds })
    .from(contentVersions)
    .where(inArray(contentVersions.id, versionIds));

  const allIds = [...new Set(versions.flatMap((version) => version.assetIds))];

  const approved = allIds.length
    ? await db
        .select({ id: assets.id })
        .from(assets)
        .where(
          and(
            inArray(assets.id, allIds),
            eq(assets.approved, true),
            isNull(assets.archivedAt),
          ),
        )
    : [];

  const approvedIds = new Set(approved.map((asset) => asset.id));

  for (const version of versions) {
    result.set(version.id, {
      attachedAssetCount: version.assetIds.length,
      approvedAssetCount: version.assetIds.filter((id) => approvedIds.has(id))
        .length,
    });
  }

  return result;
}

/** Assets uit de bibliotheek die aan een verticale post gehangen kunnen worden. */
export async function loadAttachableAssets(): Promise<
  { id: string; altText: string | null; kind: string; approved: boolean }[]
> {
  const db = getDb();
  return db
    .select({
      id: assets.id,
      altText: assets.altText,
      kind: assets.kind,
      approved: assets.approved,
    })
    .from(assets)
    .where(
      and(
        isNull(assets.archivedAt),
        inArray(assets.kind, ["RENDERED_VIDEO", "SCREEN_RECORDING"]),
      ),
    );
}

/**
 * Hangt beeld aan de huidige versie van een tekst.
 *
 * Op de versie en niet op de tekst, want de goedkeuring hangt ook aan een
 * versie. Zo hoort bij elke goedgekeurde versie precies het beeld dat erbij
 * hoorde toen iemand ja zei.
 */
export async function attachAsset(
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
  const assetId = String(formData.get("assetId") ?? "");
  const detach = String(formData.get("detach") ?? "") === "true";

  const db = getDb();

  const [row] = await db
    .select({ variant: channelVariants, campaign: campaigns })
    .from(channelVariants)
    .innerJoin(campaigns, eq(campaigns.id, channelVariants.campaignId))
    .where(eq(channelVariants.id, variantId))
    .limit(1);

  if (!row?.variant.currentVersionId) {
    return { message: "Die tekst bestaat niet meer." };
  }

  const [version] = await db
    .select()
    .from(contentVersions)
    .where(eq(contentVersions.id, row.variant.currentVersionId))
    .limit(1);

  if (!version) return { message: "Die versie bestaat niet meer." };

  const next = detach
    ? version.assetIds.filter((id) => id !== assetId)
    : [...new Set([...version.assetIds, assetId])];

  await db
    .update(contentVersions)
    .set({ assetIds: next })
    .where(eq(contentVersions.id, version.id));

  // Beeld erbij of eraf verandert wat er goedgekeurd is. Een variant die al
  // door was gaat terug naar concept, anders dekt de goedkeuring iets anders
  // dan wat er straks de deur uit gaat.
  const wasPastReview = ["APPROVED", "SCHEDULED"].includes(row.variant.status);
  if (wasPastReview && needsMedia(row.variant.channel as Channel)) {
    await db
      .update(channelVariants)
      .set({ status: "DRAFT", updatedAt: new Date() })
      .where(eq(channelVariants.id, variantId));
  }

  await db.insert(auditEvents).values({
    action: "VARIANT_REVISED",
    actorId: user.id,
    subjectType: "ChannelVariant",
    subjectId: variantId,
    campaignId: row.campaign.id,
    summary: detach
      ? `${user.name} haalde beeld van ${row.variant.variantCode}.`
      : `${user.name} hing beeld aan ${row.variant.variantCode}.`,
    detail: { assetId, assetIds: next },
  });

  revalidatePath(`/campaigns/${row.campaign.slug}`);
  revalidatePath("/review");
  revalidatePath("/calendar");
  return { ok: true };
}
