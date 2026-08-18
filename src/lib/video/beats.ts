/**
 * Beats: beeld zonder tekst.
 *
 * Het probleem was niet het ritme en niet de lengte. Het was dat elk frame
 * hetzelfde ding was — een kop, gecentreerd, op een egaal vlak. Honderdvijftig
 * video's van hetzelfde beeld, met andere woorden erin.
 *
 * Een beat is een halve tot een hele seconde waarin er geen tekst staat, alleen
 * een vorm. Dat is de enige compositie die de editor kent die géén kop-op-vlak
 * is, en hij doet meer voor het onderscheid dan alle animaties bij elkaar: je
 * oog krijgt even iets anders, en de zin erna landt harder.
 *
 * Ze zijn kort met opzet. Een beat van twee seconden is een pauze; een beat van
 * een halve is een ademhaling.
 */

import { hashSlug } from "./closers";
import { newClip, type Clip } from "./project";

type Tone = "ink" | "paper" | "teal";

function shape(kind: string, tone: Tone, scale: number) {
  return {
    id: `beat-${kind}`,
    kind,
    x: 0.5,
    y: 0.5,
    scale,
    tone,
    text: "",
    delay: 0,
  };
}

/** De vormen die alleen staan. Elk hoort bij een familie, zodat je aan het
 *  tussenbeeld al ziet wat voor video je kijkt. */
export const BEATS: Record<string, { kind: string; scale: number }> = {
  /** Demo's: het venster waar je opname in komt. */
  demo: { kind: "frame-window", scale: 2.2 },
  /** Uitleggers: de chip, rustig en groot. */
  explain: { kind: "frame-chip", scale: 2 },
  /** Bezwaren: het sluitingsteken van een citaat. */
  objection: { kind: "quote-close", scale: 2.4 },
  /** Voor wie: drie punten, alsof er iemand nadenkt. */
  audience: { kind: "dots-3", scale: 2 },
  /** Functies: de golf. */
  feature: { kind: "waveform-wide", scale: 1.8 },
  /** Shorts: het raster. */
  short: { kind: "dot-grid", scale: 2.6 },
};

/**
 * Een beat.
 *
 * `theme` bepaalt of hij donker of licht is, en die keuze doet het meeste werk:
 * een donkere beat tussen twee lichte clips knipt de video visueel in tweeën.
 */
export function beat(
  family: keyof typeof BEATS,
  over: { seconds?: number; theme?: "ink" | "paper"; tone?: Tone } = {},
): Clip {
  const { kind, scale } = BEATS[family];
  return newClip({
    text: "",
    secondary: "",
    animation: "hold",
    seconds: over.seconds ?? 0.6,
    theme: over.theme ?? "ink",
    elements: [shape(kind, over.tone ?? "teal", scale)],
  });
}

/**
 * Een kort, klein tussenwoord.
 *
 * Geen beat maar wel hetzelfde doel: het breekt de reeks van grote koppen. Klein
 * gezet en links, zodat het niet leest als weer een kop.
 */
export function aside(text: string, seconds = 0.8): Clip {
  return newClip({
    text,
    animation: "hold",
    seconds,
    size: "s",
    align: "left",
  });
}

/**
 * De scharnierwoordjes.
 *
 * Er stond overal "So." — in tien shorts hetzelfde. Eén woord, maar het viel op,
 * want het staat alleen in beeld. Dit zijn er zes, vast gekozen per slug.
 *
 * De slug wordt gezouten voordat hij gehasht wordt. Zonder dat zout deelt deze
 * keuze zijn rest met de keuze van de vorm, en krijgt elke short van vorm twee
 * hetzelfde woord — precies de herhaling die weg moest.
 */
export const ASIDES = ["So.", "Right.", "Then.", "Now.", "Which means:", "Here."];

export function asideFor(slug: string, seconds = 0.8): Clip {
  return aside(ASIDES[hashSlug(`${slug}:aside`) % ASIDES.length], seconds);
}

/** Korte payoff-regels, ook vast per slug. Dezelfde reden. */
export const PAYOFFS = [
  "Local. Free.",
  "On your machine.",
  "Free where it is local.",
  "Nothing leaves.",
  "Yours, on your disk.",
];

export function payoffFor(slug: string): string {
  return PAYOFFS[hashSlug(`${slug}:payoff`) % PAYOFFS.length];
}
