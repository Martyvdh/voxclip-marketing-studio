import { and, eq, inArray, isNull, lte, ne } from "drizzle-orm";

import { getDb } from "@/db";
import {
  campaigns,
  channelVariants,
  metricObservations,
  productClaims,
  productTruth,
  publicationAttempts,
  schedules,
} from "@/db/schema";
import { loadCampaignBoard } from "@/lib/campaign/queries";
import { isDue } from "@/lib/truth/verify";
import { nextStep, type CoachState, type Step } from "./steps";

/**
 * Leest de stand en bepaalt de stap.
 *
 * Draait op elke pagina, dus het zijn kleine tellingen naast het bord dat er
 * toch al opgehaald wordt voor Home.
 */
export async function loadCoachStep(now = new Date()): Promise<Step | null> {
  const db = getDb();

  const [current] = await db
    .select({ id: productTruth.id })
    .from(productTruth)
    .where(eq(productTruth.isCurrent, true))
    .limit(1);

  const claims = current
    ? await db
        .select({
          status: productClaims.status,
          nextReviewAt: productClaims.nextReviewAt,
        })
        .from(productClaims)
        .where(eq(productClaims.productTruthId, current.id))
    : [];

  const board = await loadCampaignBoard();

  // De campagne waar de eerstvolgende handeling ligt: de bovenste met een
  // volgende stap die je zelf kunt zetten.
  const focusRow =
    board.find(
      (row) => row.action.target !== undefined || row.readiness.variantsFailingGate > 0,
    ) ?? board[0];

  const [awaiting, approvedNotPlanned, due, logged] = await Promise.all([
    db
      .select({ id: channelVariants.id })
      .from(channelVariants)
      .innerJoin(campaigns, eq(campaigns.id, channelVariants.campaignId))
      .where(
        and(
          isNull(channelVariants.archivedAt),
          isNull(campaigns.archivedAt),
          eq(channelVariants.status, "IN_REVIEW"),
        ),
      ),
    db
      .select({ id: channelVariants.id })
      .from(channelVariants)
      .innerJoin(campaigns, eq(campaigns.id, channelVariants.campaignId))
      .where(
        and(
          isNull(channelVariants.archivedAt),
          isNull(campaigns.archivedAt),
          eq(channelVariants.status, "APPROVED"),
        ),
      ),
    db
      .select({ variantId: schedules.variantId })
      .from(schedules)
      .where(
        and(
          eq(schedules.status, "PENDING"),
          lte(schedules.runAt, now),
        ),
      ),
    db
      .select({ variantId: publicationAttempts.variantId })
      .from(publicationAttempts)
      .where(ne(publicationAttempts.status, "FAILED")),
  ]);

  // Een geplande post die al is afgevinkt hoeft niet meer.
  const postedIds = new Set(logged.map((row) => row.variantId));
  const duePosts = due.filter((row) => !postedIds.has(row.variantId)).length;

  const withMetrics = postedIds.size
    ? await db
        .select({ variantId: metricObservations.variantId })
        .from(metricObservations)
        .where(inArray(metricObservations.variantId, [...postedIds]))
    : [];

  const measured = new Set(withMetrics.map((row) => row.variantId));

  const state: CoachState = {
    unverifiedFacts: claims.filter((claim) => isDue(claim, now)).length,
    campaignCount: board.length,
    focus: focusRow
      ? {
          slug: focusRow.campaign.slug,
          title: focusRow.campaign.title,
          actionLabel: focusRow.action.label,
          actionDetail: focusRow.action.detail,
          status: focusRow.campaign.status,
          briefComplete: focusRow.readiness.briefMissingFields.length === 0,
          variantCount: focusRow.readiness.variantCount,
          variantsFailingGate: focusRow.readiness.variantsFailingGate,
        }
      : undefined,
    awaitingReview: awaiting.length,
    approvedNotPlanned: approvedNotPlanned.length,
    duePosts,
    postedWithoutResults: [...postedIds].filter((id) => !measured.has(id)).length,
  };

  return nextStep(state);
}
