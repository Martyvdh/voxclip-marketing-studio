import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { productClaims, productTruth } from "@/db/schema";
import { getEnv } from "@/lib/env";
import type { GateContext } from "./types";

/**
 * Loads the facts the gate checks against.
 *
 * If there is no current Product Truth record, the context comes back with no
 * claims, and the gate still runs its brand and structural rules. It does not
 * silently pass truth checks it could not perform: with no claims there is
 * nothing to contradict, and the Product Truth page says the record is missing.
 */
export async function loadGateContext(now = new Date()): Promise<GateContext> {
  const db = getDb();
  const env = getEnv();

  const [current] = await db
    .select({ id: productTruth.id })
    .from(productTruth)
    .where(eq(productTruth.isCurrent, true))
    .limit(1);

  const claims = current
    ? await db
        .select({
          key: productClaims.key,
          kind: productClaims.kind,
          status: productClaims.status,
          value: productClaims.value,
          statement: productClaims.statement,
          nextReviewAt: productClaims.nextReviewAt,
        })
        .from(productClaims)
        .where(and(eq(productClaims.productTruthId, current.id)))
    : [];

  const siteHost = new URL(env.PUBLIC_SITE_URL).host;

  return {
    now,
    publicSiteHosts: [siteHost, `www.${siteHost}`, "github.com"],
    claims,
  };
}
