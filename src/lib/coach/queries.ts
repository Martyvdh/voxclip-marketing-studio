import { and, count, desc, eq, isNull, lte, ne, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  campaignBriefs,
  campaigns,
  channelVariants,
  contentVersions,
  metricObservations,
  productClaims,
  productTruth,
  publicationAttempts,
  qualityRuns,
  schedules,
} from "@/db/schema";
import { nextStep, type CoachState, type Step } from "./steps";

/**
 * De stand, in tellingen.
 *
 * Dit draait op elke pagina, dus het mag niet zijn wat het eerst was: een
 * volledig campagnebord ophalen met vijf tabellen erbij. Dat was geschreven
 * voor Home, waar het één keer gebeurt en de aggregatie in TypeScript
 * makkelijker leesbaar is dan in SQL. Op elke pagina, met de database in
 * Frankfurt, is diezelfde keuze een seconde wachten.
 *
 * Dus: tellingen in de database, en van de campagnes precies één rij, namelijk
 * die waar de eerstvolgende handeling ligt.
 */
export async function loadCoachStep(now = new Date()): Promise<Step | null> {
  const db = getDb();

  const [claimRows, campaignCountRows, focusRows, variantStateRows] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(productClaims)
        .innerJoin(
          productTruth,
          and(
            eq(productTruth.id, productClaims.productTruthId),
            eq(productTruth.isCurrent, true),
          ),
        )
        .where(
          or(
            ne(productClaims.status, "VERIFIED"),
            isNull(productClaims.nextReviewAt),
            lte(productClaims.nextReviewAt, now),
          ),
        ),

      db
        .select({ total: count() })
        .from(campaigns)
        .where(isNull(campaigns.archivedAt)),

      // Eén campagne: de laatst aangeraakte die nog niet gepubliceerd is.
      db
        .select({
          slug: campaigns.slug,
          title: campaigns.title,
          campaignCode: campaigns.campaignCode,
          status: campaigns.status,
          briefId: campaignBriefs.id,
          problem: campaignBriefs.problem,
          promise: campaignBriefs.promise,
          proof: campaignBriefs.proof,
          primaryCta: campaignBriefs.primaryCta,
          ctaUrl: campaignBriefs.ctaUrl,
        })
        .from(campaigns)
        .leftJoin(campaignBriefs, eq(campaignBriefs.campaignId, campaigns.id))
        .where(
          and(
            isNull(campaigns.archivedAt),
            sql`${campaigns.status} not in ('PUBLISHED', 'ARCHIVED', 'CANCELLED')`,
          ),
        )
        .orderBy(desc(campaigns.updatedAt))
        .limit(1),

      // Alle variantstanden in één keer, gegroepeerd. Zeven tellingen die
      // anders zeven ritjes naar Frankfurt waren.
      db
        .select({
          campaignSlug: campaigns.slug,
          status: channelVariants.status,
          passed: qualityRuns.passed,
          total: count(),
        })
        .from(channelVariants)
        .innerJoin(campaigns, eq(campaigns.id, channelVariants.campaignId))
        .leftJoin(
          contentVersions,
          eq(contentVersions.id, channelVariants.currentVersionId),
        )
        .leftJoin(qualityRuns, eq(qualityRuns.versionId, contentVersions.id))
        .where(
          and(isNull(channelVariants.archivedAt), isNull(campaigns.archivedAt)),
        )
        .groupBy(campaigns.slug, channelVariants.status, qualityRuns.passed),
    ]);

  const focusRow = focusRows[0];

  const forFocus = focusRow
    ? variantStateRows.filter((row) => row.campaignSlug === focusRow.slug)
    : [];

  const sum = (rows: typeof variantStateRows) =>
    rows.reduce((total, row) => total + Number(row.total), 0);

  // Posten en cijfers hebben de datum nodig, dus die twee blijven apart.
  const [due, logged] = await Promise.all([
    db
      .select({ variantId: schedules.variantId })
      .from(schedules)
      .where(and(eq(schedules.status, "PENDING"), lte(schedules.runAt, now))),
    db
      .select({ variantId: publicationAttempts.variantId })
      .from(publicationAttempts)
      .where(ne(publicationAttempts.status, "FAILED")),
  ]);

  const postedIds = new Set(logged.map((row) => row.variantId));
  const duePosts = due.filter((row) => !postedIds.has(row.variantId)).length;

  const measured = postedIds.size
    ? new Set(
        (
          await db
            .selectDistinct({ variantId: metricObservations.variantId })
            .from(metricObservations)
        ).map((row) => row.variantId),
      )
    : new Set<string>();

  const briefComplete = Boolean(
    focusRow?.briefId &&
      focusRow.problem?.trim() &&
      focusRow.promise?.trim() &&
      focusRow.proof?.trim() &&
      focusRow.primaryCta?.trim() &&
      focusRow.ctaUrl?.trim(),
  );

  const state: CoachState = {
    unverifiedFacts: Number(claimRows[0]?.total ?? 0),
    campaignCount: Number(campaignCountRows[0]?.total ?? 0),
    focus: focusRow
      ? {
          slug: focusRow.slug,
          title: focusRow.title,
          campaignCode: focusRow.campaignCode,
          actionLabel: "Open de campagne",
          actionDetail: "Er ligt hier nog werk.",
          status: focusRow.status,
          briefComplete,
          variantCount: sum(forFocus),
          variantsFailingGate: sum(
            forFocus.filter((row) => row.passed === false),
          ),
        }
      : undefined,
    awaitingReview: sum(
      variantStateRows.filter((row) => row.status === "IN_REVIEW"),
    ),
    approvedNotPlanned: sum(
      variantStateRows.filter((row) => row.status === "APPROVED"),
    ),
    duePosts,
    postedWithoutResults: [...postedIds].filter((id) => !measured.has(id))
      .length,
  };

  return nextStep(state);
}
