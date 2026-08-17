"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import {
  auditEvents,
  productClaims,
  productTruth,
  sources,
  type ClaimKind,
} from "@/db/schema";
import { can, NotAuthorisedError, requireCapability } from "@/lib/auth";
import type { FormState } from "@/lib/campaign/actions";
import { canVerify, nextReviewFor, validateVerification } from "./verify";

/**
 * Markeert een feit als geverifieerd, met de bron erbij.
 *
 * De bron wordt als losse rij opgeslagen en aan de claim gehangen. Dat is de
 * hele reden dat dit scherm bestaat: over drie maanden wil je kunnen zien waar
 * iemand naar keek toen hij dit afvinkte, niet alleen dat hij het deed.
 */
export async function verifyClaim(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:read");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const verdict = canVerify(can(user.role, "truth:verify"));
  if (!verdict.allowed) return { message: verdict.reason };

  const claimId = String(formData.get("claimId") ?? "");
  const value = String(formData.get("value") ?? "");
  const checkedAgainst = String(formData.get("checkedAgainst") ?? "");
  const statement = String(formData.get("statement") ?? "").trim();

  const db = getDb();
  const [claim] = await db
    .select()
    .from(productClaims)
    .where(eq(productClaims.id, claimId))
    .limit(1);

  if (!claim) return { message: "Dat feit bestaat niet meer." };

  const errors = validateVerification({
    kind: claim.kind as ClaimKind,
    value,
    checkedAgainst,
  });

  if (Object.keys(errors).length > 0) return { errors };

  const now = new Date();

  const [source] = await db
    .insert(sources)
    .values({
      title: checkedAgainst.trim(),
      retrievedAt: now,
      publisher: "Gecontroleerd door het team",
    })
    .returning();

  await db
    .update(productClaims)
    .set({
      status: "VERIFIED",
      value: value.trim() || claim.value,
      statement: statement || claim.statement,
      confidence: "HIGH",
      verifiedAt: now,
      verifiedById: user.id,
      sourceId: source.id,
      nextReviewAt: nextReviewFor(claim.kind as ClaimKind, now),
      updatedAt: now,
    })
    .where(eq(productClaims.id, claimId));

  // Het versienummer staat ook op de Product Truth zelf, want de
  // assetbibliotheek vergelijkt screenshots daartegen.
  if (claim.key === "release.current_version" && value.trim()) {
    await db
      .update(productTruth)
      .set({ productVersion: value.trim(), updatedAt: now })
      .where(eq(productTruth.id, claim.productTruthId));
  }

  await db.insert(auditEvents).values({
    action: "CLAIM_VERIFIED",
    actorId: user.id,
    subjectType: "ProductClaim",
    subjectId: claimId,
    summary: `${user.name} verifieerde ${claim.key}.`,
    detail: { value: value.trim(), checkedAgainst: checkedAgainst.trim() },
  });

  revalidatePath("/truth");
  revalidatePath("/assets");
  return { ok: true };
}

/**
 * Trekt een verificatie terug.
 *
 * Nodig zodra je merkt dat iets veranderd is. Alles wat op dit feit leunt wordt
 * daarna weer geblokkeerd, en dat is precies de bedoeling.
 */
export async function retractClaim(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:read");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const verdict = canVerify(can(user.role, "truth:verify"));
  if (!verdict.allowed) return { message: verdict.reason };

  const claimId = String(formData.get("claimId") ?? "");
  const db = getDb();

  const [claim] = await db
    .select()
    .from(productClaims)
    .where(eq(productClaims.id, claimId))
    .limit(1);

  if (!claim) return { message: "Dat feit bestaat niet meer." };

  await db
    .update(productClaims)
    .set({ status: "STALE", confidence: "LOW", updatedAt: new Date() })
    .where(eq(productClaims.id, claimId));

  await db.insert(auditEvents).values({
    action: "CLAIM_EXPIRED",
    actorId: user.id,
    subjectType: "ProductClaim",
    subjectId: claimId,
    summary: `${user.name} trok de verificatie van ${claim.key} in.`,
  });

  revalidatePath("/truth");
  return { ok: true };
}
