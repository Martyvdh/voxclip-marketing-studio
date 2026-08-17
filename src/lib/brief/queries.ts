import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  ctaLines,
  hooks,
  pillarDefaults,
  productClaims,
  productTruth,
  type Pillar,
} from "@/db/schema";
import { suggestBrief, type Suggestion } from "./suggest";

/**
 * Haalt het materiaal op en stelt het voorstel samen, op de server.
 *
 * Op de server omdat de hookbibliotheek en de goedgekeurde cta-regels niet in
 * de pagina hoeven te staan om één voorstel te maken. Alleen het resultaat gaat
 * naar de browser.
 */
export async function buildSuggestion(pillar: Pillar): Promise<Suggestion> {
  const db = getDb();

  const [defaults] = await db
    .select()
    .from(pillarDefaults)
    .where(eq(pillarDefaults.pillar, pillar))
    .limit(1);

  const [current] = await db
    .select({ id: productTruth.id })
    .from(productTruth)
    .where(eq(productTruth.isCurrent, true))
    .limit(1);

  const [hookRows, ctaRows, claimRows] = await Promise.all([
    db.select().from(hooks).where(eq(hooks.isActive, true)),
    db.select().from(ctaLines).where(eq(ctaLines.isActive, true)),
    current
      ? db
          .select({
            key: productClaims.key,
            statement: productClaims.statement,
            status: productClaims.status,
          })
          .from(productClaims)
          .where(eq(productClaims.productTruthId, current.id))
      : Promise.resolve([]),
  ]);

  return suggestBrief({
    pillar,
    defaults: defaults
      ? {
          pillar: defaults.pillar,
          headline: defaults.headline,
          subhead: defaults.subhead,
          halfword: defaults.halfword,
          example1: defaults.example1,
          example2: defaults.example2,
          payoff: defaults.payoff,
        }
      : undefined,
    hooks: hookRows.map((hook) => ({
      code: hook.code,
      family: hook.family,
      pillar: hook.pillar,
      text: hook.text,
    })),
    ctas: ctaRows.map((cta) => ({ family: cta.family, text: cta.text })),
    claims: claimRows,
  });
}
