/**
 * Welke kanalen beeld nodig hebben, en wat er gebeurt als het ontbreekt.
 *
 * Een TikTok zonder video is geen post. Het systeem markeerde die kanalen wel
 * als "needs a real recording" bij het aanmaken, maar liet ze daarna gewoon
 * goedkeuren en inplannen. Op de dag zelf stond je dan met een caption en geen
 * beeld, en dat is precies het moment waarop je er niets meer aan kunt doen.
 *
 * Dus: geen beeld, geen goedkeuring en geen kalender.
 */

import type { Channel } from "@/db/schema";

/** Kanalen waar het beeld de post is en de tekst het bijschrift. */
export const NEEDS_MEDIA: Channel[] = [
  "TIKTOK",
  "INSTAGRAM_REELS",
  "YOUTUBE_SHORTS",
  "YOUTUBE_LONG",
];

export interface MediaVerdict {
  ok: boolean;
  reason?: string;
}

export function needsMedia(channel: Channel): boolean {
  return NEEDS_MEDIA.includes(channel);
}

/**
 * Of deze tekst verder mag met het beeld dat eraan hangt.
 *
 * `approvedAssetCount` telt alleen goedgekeurde assets. Een opname die nog
 * niemand heeft bekeken telt niet, want dan verschuift het probleem alleen van
 * "geen beeld" naar "beeld waarvan niemand weet of het klopt".
 */
export function mediaVerdict(input: {
  channel: Channel;
  attachedAssetCount: number;
  approvedAssetCount: number;
}): MediaVerdict {
  if (!needsMedia(input.channel)) return { ok: true };

  if (input.attachedAssetCount === 0) {
    return {
      ok: false,
      reason:
        "Dit kanaal is beeld met een bijschrift, niet andersom. Maak de video en hang hem hieraan voordat dit verder gaat.",
    };
  }

  if (input.approvedAssetCount === 0) {
    return {
      ok: false,
      reason:
        "Er hangt beeld aan, maar het is nog niet goedgekeurd in de assetbibliotheek. Daar staat ook welke appversie erop te zien is.",
    };
  }

  return { ok: true };
}

/** Kort label voor op de kaart. */
export function describeMedia(input: {
  channel: Channel;
  attachedAssetCount: number;
  approvedAssetCount: number;
}): string | null {
  if (!needsMedia(input.channel)) return null;
  if (input.approvedAssetCount > 0) {
    return `${input.approvedAssetCount} goedgekeurd beeld`;
  }
  if (input.attachedAssetCount > 0) return "beeld nog niet goedgekeurd";
  return "geen beeld";
}
