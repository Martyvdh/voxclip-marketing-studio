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

/**
 * De vormen die alleen staan.
 *
 * Eerst stonden hier kaders op halve schermgrootte in teal. Dat leest niet als
 * een leesteken maar als een leeg vak dat nog gevuld moet worden — en het brak
 * de merkregel dat teal één klein element is, hooguit een tiende van het beeld.
 *
 * Dus: klein, en geen kaders. Een kader is een gat; een streep of een paar
 * punten is een adempauze. De schaal blijft onder de één, want alles daarboven
 * begint te concurreren met de tekst ervoor en erna.
 */
export const BEATS: Record<string, { kind: string; scale: number }> = {
  /** Demo's: de golf van wat je zo gaat opnemen. */
  demo: { kind: "waveform", scale: 0.8 },
  /** Uitleggers: één streep. Zo rustig als het wordt. */
  explain: { kind: "rule-thick", scale: 0.9 },
  /** Bezwaren: een plus, alsof er iets aan toegevoegd wordt. */
  objection: { kind: "plus", scale: 0.6 },
  /** Voor wie: drie punten, alsof er iemand nadenkt. */
  audience: { kind: "dots-3", scale: 0.7 },
  /** Functies: een halve ring. */
  feature: { kind: "ring-half", scale: 0.7 },
  /** Shorts: een streepje. */
  short: { kind: "stripe", scale: 0.8 },
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
  const theme = over.theme ?? "ink";

  // Standaard meekleuren met de achtergrond in plaats van ertegenin. Een beat
  // hoort een adempauze te zijn; teal maakt er een aankondiging van. Wie hem
  // toch als accent wil, geeft `tone` mee.
  const tone: Tone = over.tone ?? (theme === "ink" ? "paper" : "ink");

  return newClip({
    text: "",
    secondary: "",
    animation: "hold",
    seconds: over.seconds ?? 0.5,
    theme,
    elements: [shape(kind, tone, scale)],
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
