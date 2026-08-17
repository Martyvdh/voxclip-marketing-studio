import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { campaignBriefs, campaigns, channelVariants } from "@/db/schema";
import { needsUpdate } from "./derive-status";

const REQUIRED_BRIEF_FIELDS = [
  "problem",
  "desiredOutcome",
  "promise",
  "proof",
  "offer",
  "primaryCta",
  "ctaUrl",
] as const;

/**
 * Zet de campagnestatus gelijk aan wat de teksten zeggen.
 *
 * Wordt aangeroepen na elke handeling die een tekst van stand verandert. Geen
 * auditregel: dit is geen besluit van iemand, het is de samenvatting die
 * bijtrekt. De besluiten staan al vast bij de tekst zelf.
 */
export async function syncCampaignStatus(campaignId: string): Promise<void> {
  const db = getDb();

  const [campaign] = await db
    .select({ id: campaigns.id, status: campaigns.status })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) return;

  const [variants, briefs] = await Promise.all([
    db
      .select({ status: channelVariants.status })
      .from(channelVariants)
      .where(eq(channelVariants.campaignId, campaignId)),
    db
      .select()
      .from(campaignBriefs)
      .where(eq(campaignBriefs.campaignId, campaignId))
      .limit(1),
  ]);

  const brief = briefs[0];
  const briefComplete = Boolean(
    brief &&
      REQUIRED_BRIEF_FIELDS.every((field) => {
        const value = brief[field];
        return typeof value === "string" && value.trim().length > 0;
      }),
  );

  const next = needsUpdate({
    current: campaign.status,
    variants: variants.map((variant) => variant.status),
    briefComplete,
  });

  if (!next) return;

  await db
    .update(campaigns)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(campaigns.id, campaignId));
}
