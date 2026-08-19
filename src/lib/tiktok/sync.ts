/**
 * Welke TikTok-video hoort bij welke post van jou, en wat schrijven we op.
 *
 * Alles hier is puur: geen netwerk, geen database, geen klok behalve wat je
 * meegeeft. Dat is met opzet, want dit is het stuk dat stil fout kan gaan. Een
 * verkeerd gekoppelde video betekent dat je de cijfers van video A onder video B
 * ziet staan, en daar neem je dan beslissingen op.
 */

import type { TikTokVideo } from "./api";

/**
 * Normaliseert een TikTok-link tot iets vergelijkbaars.
 *
 * Dezelfde video komt in het wild in meerdere vormen voorbij: met en zonder
 * `www`, met een sleep aan trackingparameters, met een schuine streep aan het
 * eind. Vergelijken op de rauwe tekst mislukt dan terwijl het dezelfde video is.
 *
 * We houden de video-id over als die te vinden is, want dat is het enige stukje
 * dat echt uniek is.
 */
export function normaliseUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 0) return "";

  const byId = trimmed.match(/\/video\/(\d+)/);
  if (byId) return byId[1];

  try {
    const parsed = new URL(trimmed);
    return `${parsed.host.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/, "").toLowerCase();
  }
}

/** Of deze twee links naar dezelfde video wijzen. */
export function sameVideo(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = normaliseUrl(a);
  const right = normaliseUrl(b);
  return left.length > 0 && left === right;
}

export interface PostedVariant {
  variantId: string;
  campaignId: string | null;
  /** De link die je bij het afvinken hebt geplakt. */
  providerUrl: string | null;
}

export interface Match {
  variantId: string;
  campaignId: string | null;
  video: TikTokVideo;
}

/**
 * Koppelt opgehaalde video's aan je posts.
 *
 * Alleen op de link, nooit op de titel of de tekst. Twee video's met hetzelfde
 * bijschrift zijn geen zeldzaamheid als je varianten test, en dan zou raden op
 * tekst precies de verkeerde twee door elkaar halen.
 */
export function matchVideos(
  variants: PostedVariant[],
  videos: TikTokVideo[],
): { matched: Match[]; unmatchedVariants: PostedVariant[]; unmatchedVideos: TikTokVideo[] } {
  const matched: Match[] = [];
  const usedVideos = new Set<string>();
  const usedVariants = new Set<string>();

  for (const variant of variants) {
    const video = videos.find(
      (candidate) => !usedVideos.has(candidate.id) && sameVideo(variant.providerUrl, candidate.share_url),
    );
    if (!video) continue;

    usedVideos.add(video.id);
    usedVariants.add(variant.variantId);
    matched.push({ variantId: variant.variantId, campaignId: variant.campaignId, video });
  }

  return {
    matched,
    unmatchedVariants: variants.filter((v) => !usedVariants.has(v.variantId)),
    unmatchedVideos: videos.filter((v) => !usedVideos.has(v.id)),
  };
}

export interface Observation {
  variantId: string;
  campaignId: string | null;
  metricKey: string;
  value: number | null;
  windowStart: Date;
  windowEnd: Date;
}

/**
 * De cijfers van één video als waarnemingen.
 *
 * Een ontbrekend getal wordt `null` en geen nul. Dat onderscheid is de hele
 * reden dat de kolom `value` mag leeg zijn: nul views en "TikTok gaf geen
 * views terug" zijn twee verschillende dingen, en als je ze op één hoop gooit
 * ziet een mislukte ophaalronde eruit als een mislukte video.
 *
 * Het venster loopt van het moment van plaatsen tot nu: dit zijn cumulatieve
 * tellers, geen cijfers over een dag.
 */
export function toObservations(match: Match, now: Date): Observation[] {
  const postedAt = match.video.create_time
    ? new Date(match.video.create_time * 1000)
    : now;

  const pairs: [string, number | undefined][] = [
    ["views", match.video.view_count],
    ["likes", match.video.like_count],
    ["comments", match.video.comment_count],
    ["shares", match.video.share_count],
  ];

  return pairs.map(([metricKey, value]) => ({
    variantId: match.variantId,
    campaignId: match.campaignId,
    metricKey,
    value: typeof value === "number" ? value : null,
    windowStart: postedAt,
    windowEnd: now,
  }));
}

/**
 * Of het toegangstoken ververst moet worden.
 *
 * Vijf minuten marge: een token dat tijdens de ophaalronde verloopt laat je met
 * de helft van je cijfers achter, en een keer te vroeg verversen kost niets.
 */
export function needsRefresh(expiresAt: Date | null, now: Date): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;
}

/**
 * Een leesbare samenvatting van een ophaalronde, voor het logboek.
 *
 * Niet alleen wat er gelukt is. Juist het aantal posts zonder link is wat je
 * wilt zien: dat zijn de video's waarvan je nooit cijfers krijgt totdat je die
 * link erbij zet.
 */
export function describeRun(input: {
  matched: number;
  unmatchedVariants: number;
  observations: number;
}): string {
  const parts = [
    `${input.matched} ${input.matched === 1 ? "post" : "posts"} bijgewerkt`,
    `${input.observations} ${input.observations === 1 ? "cijfer" : "cijfers"} opgeslagen`,
  ];

  if (input.unmatchedVariants > 0) {
    parts.push(
      `${input.unmatchedVariants} zonder link op TikTok gevonden — plak de link van de post erbij, anders blijven die cijfers leeg`,
    );
  }

  return `${parts.join(", ")}.`;
}
