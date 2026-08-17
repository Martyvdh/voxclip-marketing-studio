/**
 * Wanneer een campagne echt weg mag.
 *
 * AGENTS.md zegt dat er niets hard verwijderd wordt, en die regel blijft staan.
 * Waar hij voor bedoeld is: het dossier van wat er naar buiten ging. Wie keurde
 * wat goed, welke versie ging de deur uit, wat stond erin. Dat mag nooit
 * verdwijnen omdat iemand er later ongemakkelijk van wordt.
 *
 * Een campagne die nooit gepost is heeft dat dossier niet. Er is niets om te
 * beschermen, en een proefcampagne die je niet kwijtraakt maakt het archief
 * binnen een week onbruikbaar. Vandaar: weg mag, zolang er nooit iets uit is
 * gegaan, en de auditregels blijven hoe dan ook staan.
 */

import type { CampaignStatus } from "@/db/schema";

export interface Verdict {
  allowed: boolean;
  reason?: string;
}

/** Statussen die betekenen dat er iets naar buiten is gegaan of gaat. */
export const WENT_OUT: CampaignStatus[] = [
  "PUBLISHING",
  "PUBLISHED",
  "SCHEDULED",
];

export interface DeleteInput {
  status: CampaignStatus;
  /** Of er ooit een publicatiepoging is vastgelegd, ook een handmatige. */
  hasPublications: boolean;
  /** De titel zoals hij is ingetypt in het bevestigingsveld. */
  typedTitle: string;
  /** De echte titel. */
  title: string;
}

export function canDeleteCampaign(input: DeleteInput): Verdict {
  if (input.hasPublications) {
    return {
      allowed: false,
      reason:
        "Hier is iets van gepost. Dat blijft staan. Archiveer hem, dan is hij van het bord af en blijft het dossier bestaan.",
    };
  }

  if (WENT_OUT.includes(input.status)) {
    return {
      allowed: false,
      reason:
        "Deze campagne staat ingepland of is onderweg. Haal hem eerst van de kalender.",
    };
  }

  if (input.typedTitle.trim() !== input.title.trim()) {
    return {
      allowed: false,
      reason:
        "Typ de titel van de campagne over om te bevestigen. Verwijderen kan niet ongedaan gemaakt worden.",
    };
  }

  return { allowed: true };
}

/**
 * Wat er meegaat, in mensentaal, zodat het bevestigingsscherm het kan opnoemen.
 *
 * Verrassingen bij verwijderen zijn de vervelende soort. Wat hier niet in staat
 * verdwijnt ook niet: de auditregels houden hun beschrijving en verliezen
 * alleen de verwijzing naar de campagne.
 */
export function whatGoesWithIt(counts: {
  variants: number;
  versions: number;
  schedules: number;
  videoProjects: number;
}): string[] {
  const lines: string[] = ["de brief"];

  if (counts.variants > 0) {
    lines.push(`${counts.variants} tekst${counts.variants === 1 ? "" : "en"}`);
  }
  if (counts.versions > 0) {
    lines.push(
      `${counts.versions} opgeslagen versie${counts.versions === 1 ? "" : "s"}`,
    );
  }
  if (counts.schedules > 0) {
    lines.push(`${counts.schedules} plek${counts.schedules === 1 ? "" : "ken"} op de kalender`);
  }
  if (counts.videoProjects > 0) {
    lines.push(
      `${counts.videoProjects} videoproject${counts.videoProjects === 1 ? "" : "en"}`,
    );
  }

  return lines;
}
