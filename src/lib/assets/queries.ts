import { desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import {
  assets,
  campaigns,
  users,
  type AssetKind,
  type AssetOrigin,
} from "@/db/schema";
import { looksStale } from "./rules";

export interface AssetView {
  id: string;
  kind: AssetKind;
  origin: AssetOrigin;
  mimeType: string;
  byteSize: number;
  altText: string | null;
  caption: string | null;
  productVersionShown: string | null;
  approved: boolean;
  stale: boolean;
  campaignTitle: string | null;
  campaignSlug: string | null;
  uploadedBy: string | null;
  createdAt: Date;
}

/**
 * The shelf.
 *
 * Metadata only: the bytes live in their own table and are served by one route,
 * so listing a library of recordings does not move a single megabyte.
 */
export async function loadAssets(currentVersion: string | null): Promise<AssetView[]> {
  const db = getDb();

  const rows = await db
    .select({
      asset: assets,
      campaignTitle: campaigns.title,
      campaignSlug: campaigns.slug,
      uploadedBy: users.name,
    })
    .from(assets)
    .leftJoin(campaigns, eq(campaigns.id, assets.campaignId))
    .leftJoin(users, eq(users.id, assets.uploadedById))
    .where(isNull(assets.archivedAt))
    .orderBy(desc(assets.createdAt));

  return rows.map((row) => ({
    id: row.asset.id,
    kind: row.asset.kind,
    origin: row.asset.origin,
    mimeType: row.asset.mimeType,
    byteSize: row.asset.byteSize,
    altText: row.asset.altText,
    caption: row.asset.caption,
    productVersionShown: row.asset.productVersionShown,
    approved: row.asset.approved,
    stale: looksStale({
      kind: row.asset.kind,
      productVersionShown: row.asset.productVersionShown,
      currentVersion,
    }),
    campaignTitle: row.campaignTitle,
    campaignSlug: row.campaignSlug,
    uploadedBy: row.uploadedBy,
    createdAt: row.asset.createdAt,
  }));
}
