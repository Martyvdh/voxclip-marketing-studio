"use server";

/**
 * De koppeling met TikTok, en het ophalen van de cijfers.
 *
 * Dit is de laag die praat met de database en met TikTok. Wat te beslissen valt
 * staat in `sync.ts` en is daar getest; hier gebeurt alleen het heen en weer.
 *
 * Tokens gaan versleuteld de database in en komen nooit in een antwoord aan de
 * browser terecht. Ze staan ook niet in logs: bij een fout gaat er hoogstens een
 * gemaskeerd token mee, en meestal niets.
 */

import { and, desc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/db";
import {
  channelConnections,
  metricObservations,
  publicationAttempts,
} from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import { listVideos, refreshTokens, type Tokens } from "./api";
import {
  describeRun,
  matchVideos,
  needsRefresh,
  toObservations,
  type PostedVariant,
} from "./sync";

/** Bewaart of vernieuwt de koppeling. Eén per kanaal. */
export async function saveConnection(tokens: Tokens, displayName: string): Promise<void> {
  const db = getDb();

  const [existing] = await db
    .select({ id: channelConnections.id })
    .from(channelConnections)
    .where(eq(channelConnections.channel, "TIKTOK"))
    .limit(1);

  const values = {
    channel: "TIKTOK" as const,
    // B: koppeling voor cijfers, maar plaatsen blijft handwerk. Zie api.ts.
    tier: "B" as const,
    displayName,
    status: "CONNECTED" as const,
    providerAccountId: tokens.openId,
    accessTokenEnc: encryptSecret(tokens.accessToken),
    refreshTokenEnc: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
    tokenExpiresAt: tokens.expiresAt,
    scopes: tokens.scopes,
    // Niet langer een nepadapter: dit praat met de echte API.
    isFake: false,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(channelConnections).set(values).where(eq(channelConnections.id, existing.id));
  } else {
    await db.insert(channelConnections).values(values);
  }
}

export interface ConnectionState {
  connected: boolean;
  displayName?: string;
  expiresAt?: Date | null;
  lastRun?: string;
}

/** Voor de knop in de app. Geeft nooit een token terug. */
export async function connectionState(): Promise<ConnectionState> {
  const db = getDb();
  const [row] = await db
    .select({
      displayName: channelConnections.displayName,
      status: channelConnections.status,
      tokenExpiresAt: channelConnections.tokenExpiresAt,
    })
    .from(channelConnections)
    .where(eq(channelConnections.channel, "TIKTOK"))
    .limit(1);

  if (!row || row.status !== "CONNECTED") return { connected: false };
  return {
    connected: true,
    displayName: row.displayName,
    expiresAt: row.tokenExpiresAt,
  };
}

/** Haalt een geldig toegangstoken, en ververst het als het bijna om is. */
async function validAccessToken(now: Date): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(channelConnections)
    .where(
      and(
        eq(channelConnections.channel, "TIKTOK"),
        eq(channelConnections.status, "CONNECTED"),
      ),
    )
    .limit(1);

  if (!row?.accessTokenEnc) return null;

  if (!needsRefresh(row.tokenExpiresAt, now)) {
    return decryptSecret(row.accessTokenEnc);
  }

  if (!row.refreshTokenEnc) return null;

  const fresh = await refreshTokens(decryptSecret(row.refreshTokenEnc));
  await db
    .update(channelConnections)
    .set({
      accessTokenEnc: encryptSecret(fresh.accessToken),
      refreshTokenEnc: fresh.refreshToken ? encryptSecret(fresh.refreshToken) : row.refreshTokenEnc,
      tokenExpiresAt: fresh.expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(channelConnections.id, row.id));

  return fresh.accessToken;
}

/**
 * Haalt de cijfers op en schrijft ze weg.
 *
 * Elke ronde schrijft nieuwe waarnemingen in plaats van bestaande bij te werken.
 * Dat is met opzet: zo houd je het verloop over de tijd, en zie je of een video
 * na drie dagen nog aantrekt. De grafiek pakt zelf de nieuwste.
 */
export async function syncMetrics(now = new Date()): Promise<string> {
  const token = await validAccessToken(now);
  if (!token) return "Geen koppeling met TikTok. Verbind je account eerst.";

  const db = getDb();

  const posted = await db
    .selectDistinct({
      variantId: publicationAttempts.variantId,
      campaignId: publicationAttempts.campaignId,
      providerUrl: publicationAttempts.providerUrl,
    })
    .from(publicationAttempts)
    .where(isNotNull(publicationAttempts.providerUrl))
    .orderBy(desc(publicationAttempts.variantId));

  const variants: PostedVariant[] = posted.map((row) => ({
    variantId: row.variantId,
    campaignId: row.campaignId,
    providerUrl: row.providerUrl,
  }));

  if (variants.length === 0) {
    return "Nog geen posts met een link. Plak de link van je TikTok bij het afvinken, dan kan ik de cijfers ophalen.";
  }

  // Twee pagina's is veertig video's. Wie meer heeft geplaatst dan dat sinds de
  // vorige ronde, heeft een luxeprobleem dat we dan oplossen.
  const first = await listVideos(token);
  const all = [...first.videos];
  if (first.hasMore && first.cursor) {
    const second = await listVideos(token, first.cursor);
    all.push(...second.videos);
  }

  const { matched, unmatchedVariants } = matchVideos(variants, all);

  const rows = matched.flatMap((match) =>
    toObservations(match, now).map((o) => ({
      campaignId: o.campaignId,
      variantId: o.variantId,
      channel: "TIKTOK" as const,
      stage: "PUBLICATION" as const,
      metricKey: o.metricKey,
      value: o.value,
      source: "PROVIDER_API" as const,
      windowStart: o.windowStart,
      windowEnd: o.windowEnd,
      isStale: false,
    })),
  );

  if (rows.length > 0) {
    await db.insert(metricObservations).values(rows);
  }

  return describeRun({
    matched: matched.length,
    unmatchedVariants: unmatchedVariants.length,
    observations: rows.length,
  });
}
