/**
 * Afsluiters.
 *
 * Er was er één. Elke video eindigde met dezelfde twee seconden: mark, wordmark,
 * "One Timeline. Local.", "free · Mac & Windows", knop. In een export van
 * veertien seconden was dat bijna de helft, en twee video's naast elkaar waren
 * vanaf seconde acht niet meer uit elkaar te houden.
 *
 * Herhaling is bij een merk het punt — maar herhaling van een *zin* is iets
 * anders dan herhaling van een *scherm*. De zin mag terugkomen; het beeld moet
 * verschillen, anders leest niemand hem nog.
 *
 * Dus acht afsluiters, en een keuze die vastligt per startpunt. Vast en niet
 * willekeurig: hetzelfde startpunt moet twee keer hetzelfde bouwen, anders is
 * ongedaan maken kapot en kun je een export niet reproduceren.
 */

import { newClip, type Clip } from "./project";

const NOTE =
  "The link is not drawn on the video. It goes in the caption, tagged, so the click can be measured.";

export interface CloserInput {
  ctaLabel: string;
}

type Build = (input: CloserInput) => Clip;

/**
 * De acht. Ze verschillen in lengte, kleur, animatie en in wat er groot staat —
 * de merknaam, de belofte, de prijs of het adres.
 */
export const CLOSERS: { id: string; build: Build }[] = [
  {
    id: "wordmark-calm",
    build: (i) =>
      newClip({
        text: i.ctaLabel,
        secondary: "voxclip.it",
        animation: "hold",
        seconds: 2,
        note: NOTE,
      }),
  },
  {
    id: "address-large",
    build: () =>
      newClip({
        text: "voxclip.it",
        animation: "letter-fade",
        seconds: 1.8,
        size: "l",
        theme: "ink",
        note: NOTE,
      }),
  },
  {
    id: "price-plain",
    build: () =>
      newClip({
        text: "Free.",
        secondary: "Mac and Windows.",
        animation: "word-pop",
        seconds: 1.6,
        size: "l",
        note: NOTE,
      }),
  },
  {
    id: "promise-left",
    build: () =>
      newClip({
        text: "Everything you copy or say.",
        secondary: "voxclip.it",
        animation: "slide-left",
        seconds: 2.4,
        align: "left",
        theme: "ink",
        note: NOTE,
      }),
  },
  {
    id: "cta-zoom",
    build: (i) =>
      newClip({
        text: i.ctaLabel,
        animation: "zoom-in",
        seconds: 1.5,
        size: "l",
        note: NOTE,
      }),
  },
  {
    id: "two-keys",
    build: () =>
      newClip({
        text: "One keystroke away.",
        secondary: "voxclip.it · free",
        animation: "spotlight",
        seconds: 2.2,
        theme: "ink",
        note: NOTE,
      }),
  },
  {
    id: "badges",
    build: (i) =>
      newClip({
        text: i.ctaLabel,
        animation: "fade-rise",
        seconds: 2,
        elements: [
          {
            id: "badge-mac-36-80",
            kind: "badge-mac",
            x: 0.36,
            y: 0.8,
            scale: 1,
            tone: "ink" as const,
            text: "",
            delay: 0.15,
          },
          {
            id: "badge-win-64-80",
            kind: "badge-win",
            x: 0.64,
            y: 0.8,
            scale: 1,
            tone: "ink" as const,
            text: "",
            delay: 0.3,
          },
        ],
        note: NOTE,
      }),
  },
  {
    id: "quiet-stop",
    build: () =>
      newClip({
        text: "VoxClip",
        secondary: "voxclip.it",
        animation: "stack",
        seconds: 1.4,
        theme: "ink",
        note: NOTE,
      }),
  },
];

/**
 * Een stabiel getal uit een slug.
 *
 * Geen `Math.random`: een startpunt dat elke keer anders bouwt maakt ongedaan
 * maken onvoorspelbaar en een export onherhaalbaar. Dit is de bekende djb2, ruim
 * genoeg voor acht bakjes.
 */
export function hashSlug(slug: string): number {
  let hash = 5381;
  for (let i = 0; i < slug.length; i += 1) {
    hash = ((hash << 5) + hash + slug.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** De afsluiter die bij dit startpunt hoort. Altijd dezelfde. */
export function closerFor(slug: string, input: CloserInput): Clip {
  return CLOSERS[hashSlug(slug) % CLOSERS.length].build(input);
}

/** Of dit startpunt zijn merkteken toont. Niet alle: een mark op elke video is
 *  precies wat het einde overal hetzelfde maakte. */
export function showsMark(slug: string): boolean {
  return hashSlug(slug) % 3 !== 0;
}
