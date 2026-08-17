/**
 * De campagnestatus volgt de teksten.
 *
 * Eerst moest je hem met de hand doorzetten met de knoppen onderaan de
 * campagnepagina. Dat leverde de staat op waar iedereen op stukloopt: teksten
 * die goedgekeurd en ingepland zijn in een campagne die officieel nog een idee
 * is. Alles wat naar die status kijkt zegt dan iets anders dan wat je ziet.
 *
 * Dus: de teksten zijn de waarheid en de status is de samenvatting. Handmatig
 * doorzetten kan nog steeds, voor de statussen die geen tekst kennen.
 */

import type { CampaignStatus, VariantStatus } from "@/db/schema";

/**
 * Statussen waar de samenvatting van afblijft.
 *
 * Deze zijn door een mens gezet en betekenen iets wat je uit de teksten niet
 * kunt aflezen. Een geannuleerde campagne met een goedgekeurde tekst erin is
 * nog steeds geannuleerd; dat is precies wat annuleren betekent.
 */
export const NOT_DERIVED: CampaignStatus[] = [
  "CANCELLED",
  "ARCHIVED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
];

export interface DeriveInput {
  current: CampaignStatus;
  variants: VariantStatus[];
  briefComplete: boolean;
}

/**
 * Wat de status hoort te zijn, gegeven de teksten.
 *
 * De volgorde loopt van ver naar dichtbij: één ingeplande tekst maakt de
 * campagne ingepland, ook als er nog een concept naast ligt. Dat is de
 * bedoeling, want er staat dan echt iets in de agenda.
 */
export function deriveCampaignStatus(input: DeriveInput): CampaignStatus {
  if (NOT_DERIVED.includes(input.current)) return input.current;

  const live = input.variants.filter((status) => status !== "ARCHIVED");

  if (live.some((status) => status === "PUBLISHED")) return "PUBLISHED";
  if (live.some((status) => status === "SCHEDULED")) return "SCHEDULED";

  if (live.length > 0 && live.every((status) => status === "APPROVED")) {
    return "APPROVED";
  }

  if (live.some((status) => status === "IN_REVIEW")) return "IN_REVIEW";

  if (live.length > 0) return "DRAFT";

  return input.briefComplete ? "BRIEF" : "IDEA";
}

/** Of de samenvatting is veranderd en dus opgeslagen moet worden. */
export function needsUpdate(input: DeriveInput): CampaignStatus | null {
  const next = deriveCampaignStatus(input);
  return next === input.current ? null : next;
}
