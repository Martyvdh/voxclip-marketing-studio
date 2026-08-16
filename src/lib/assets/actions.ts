"use server";

import { desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import {
  assetBlobs,
  assets,
  auditEvents,
  campaigns,
  productTruth,
  type AssetKind,
  type AssetOrigin,
} from "@/db/schema";
import { NotAuthorisedError, requireCapability } from "@/lib/auth";
import type { FormState } from "@/lib/campaign/actions";
import {
  canApproveAsset,
  storageKeyFor,
  validateUpload,
  MAX_BYTES,
} from "./rules";

const KINDS: AssetKind[] = [
  "SCREENSHOT",
  "SCREEN_RECORDING",
  "RENDERED_VIDEO",
  "IMAGE",
  "AUDIO",
  "DOCUMENT",
];

const ORIGINS: AssetOrigin[] = ["REAL_PRODUCT_CAPTURE", "DESIGNED", "GENERATED"];

/**
 * Takes a file and everything we need to know about it.
 *
 * The metadata is not paperwork. Alt text and the app version are the two
 * things nobody writes later, and both are the difference between an asset
 * that can be used and one that quietly goes stale in a folder.
 */
export async function uploadAsset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("asset:upload");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "");
  const origin = String(formData.get("origin") ?? "");
  const altText = String(formData.get("altText") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const productVersionShown = String(formData.get("productVersionShown") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "");

  if (!KINDS.includes(kind as AssetKind) || !ORIGINS.includes(origin as AssetOrigin)) {
    return { message: "Pick what this is and where it came from." };
  }

  if (!(file instanceof File)) {
    return { errors: { file: "Pick a file." } };
  }

  const errors = validateUpload({
    kind: kind as AssetKind,
    origin: origin as AssetOrigin,
    mimeType: file.type,
    byteSize: file.size,
    altText,
    productVersionShown,
  });

  if (Object.keys(errors).length > 0) return { errors };

  // Read only after the size check passed, so an oversized file is refused
  // before it is pulled into memory.
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return { errors: { file: "That file is larger than it claimed to be." } };
  }

  const db = getDb();

  const [asset] = await db
    .insert(assets)
    .values({
      campaignId: campaignId || null,
      kind: kind as AssetKind,
      origin: origin as AssetOrigin,
      storageKey: "pending",
      mimeType: file.type,
      byteSize: bytes.byteLength,
      altText: altText.trim(),
      caption: caption || null,
      productVersionShown: productVersionShown.trim() || null,
      approved: false,
      uploadedById: user.id,
    })
    .returning();

  await db
    .update(assets)
    .set({ storageKey: storageKeyFor(asset.id, file.type) })
    .where(eq(assets.id, asset.id));

  await db.insert(assetBlobs).values({ assetId: asset.id, bytes });

  await db.insert(auditEvents).values({
    action: "ASSET_UPLOADED",
    actorId: user.id,
    subjectType: "Asset",
    subjectId: asset.id,
    campaignId: campaignId || null,
    summary: `${user.name} added a ${kind.toLowerCase().replace(/_/g, " ")}.`,
    detail: { origin, byteSize: bytes.byteLength, mimeType: file.type },
  });

  revalidatePath("/assets");
  return { ok: true };
}

/** Marks it usable. The last cheap moment to catch a stale screenshot. */
export async function approveAsset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:approve");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const assetId = String(formData.get("assetId") ?? "");
  const db = getDb();

  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset) return { message: "That asset no longer exists." };

  const verdict = canApproveAsset({
    origin: asset.origin,
    kind: asset.kind,
    altText: asset.altText,
    productVersionShown: asset.productVersionShown,
  });

  if (!verdict.allowed) return { message: verdict.reason };

  await db
    .update(assets)
    .set({ approved: true, updatedAt: new Date() })
    .where(eq(assets.id, assetId));

  await db.insert(auditEvents).values({
    action: "APPROVED",
    actorId: user.id,
    subjectType: "Asset",
    subjectId: assetId,
    campaignId: asset.campaignId,
    summary: `${user.name} approved an asset for use.`,
  });

  revalidatePath("/assets");
  return { ok: true };
}

/** Fixes the description or the version without re-uploading the file. */
export async function updateAsset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("asset:upload");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const assetId = String(formData.get("assetId") ?? "");
  const altText = String(formData.get("altText") ?? "").trim();
  const productVersionShown = String(formData.get("productVersionShown") ?? "").trim();

  if (altText.length < 5) {
    return { errors: { altText: "Describe what is in it." } };
  }

  const db = getDb();
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset) return { message: "That asset no longer exists." };

  // Changing what it says withdraws the approval. Somebody approved the old
  // description, not this one.
  await db
    .update(assets)
    .set({
      altText,
      productVersionShown: productVersionShown || null,
      approved: asset.approved && altText === asset.altText,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, assetId));

  await db.insert(auditEvents).values({
    action: "ASSET_UPLOADED",
    actorId: user.id,
    subjectType: "Asset",
    subjectId: assetId,
    campaignId: asset.campaignId,
    summary: `${user.name} edited the details of an asset.`,
  });

  revalidatePath("/assets");
  return { ok: true };
}

/** Off the shelf, still on the record. Nothing here is hard-deleted. */
export async function archiveAsset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("asset:upload");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const assetId = String(formData.get("assetId") ?? "");
  const db = getDb();

  await db
    .update(assets)
    .set({ archivedAt: new Date(), approved: false, updatedAt: new Date() })
    .where(eq(assets.id, assetId));

  await db.insert(auditEvents).values({
    action: "DATA_DELETED",
    actorId: user.id,
    subjectType: "Asset",
    subjectId: assetId,
    summary: `${user.name} archived an asset. The file is still stored.`,
  });

  revalidatePath("/assets");
  return { ok: true };
}

/** The version the library compares captures against. */
export async function currentProductVersion(): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ version: productTruth.productVersion })
    .from(productTruth)
    .where(eq(productTruth.isCurrent, true))
    .limit(1);
  return row?.version ?? null;
}

/** Campaigns an asset can be filed under. */
export async function campaignOptions(): Promise<{ id: string; title: string }[]> {
  const db = getDb();
  return db
    .select({ id: campaigns.id, title: campaigns.title })
    .from(campaigns)
    .where(isNull(campaigns.archivedAt))
    .orderBy(desc(campaigns.createdAt));
}
