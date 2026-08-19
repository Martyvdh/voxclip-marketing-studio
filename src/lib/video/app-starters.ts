/**
 * Demo's waarin het venster van begin tot eind in beeld staat.
 *
 * Dit is wat er ontbrak: honderddrieënzeventig startpunten waren tekst op een
 * vlak, en de terugkerende klacht was "ik zie het product niet". Terecht.
 *
 * Deze vijf tekenen het venster als achtergrond en zetten de zin eronder als
 * bijschrift. Ze zijn allemaal klaar om te exporteren — je hoeft er niets voor
 * op te nemen. Zodra je wel een echte schermopname hebt, is die beter dan dit;
 * zie de opmerking bovenaan `app-frame.ts` voor waar de grens ligt.
 */

import { newClip, type Project } from "./project";
import type { Starter, StarterSource } from "./starters";
import { closerFor, showsMark } from "./closers";

interface Beat {
  text: string;
  seconds: number;
  query?: string;
  filter?: number;
  highlight?: number;
  picker?: boolean;
  chosen?: number;
}

function build(slug: string, beats: Beat[], s: StarterSource): Project {
  return {
    ratio: "9:16",
    showMark: showsMark(slug),
    clips: [
      ...beats.map((b) =>
        newClip({
          text: b.text,
          animation: "fade-rise",
          seconds: b.seconds,
          size: "m",
          theme: "app",
          app: {
            query: b.query ?? "",
            filter: b.filter ?? 0,
            highlight: b.highlight ?? -1,
            picker: b.picker ?? false,
            chosen: b.chosen ?? -1,
          },
        }),
      ),
      closerFor(slug, s),
    ],
  };
}

const SCENES: { slug: string; name: string; intent: string; beats: Beat[] }[] = [
  {
    slug: "app-recall",
    name: "In the app: type three letters and paste",
    intent: "The whole loop, with the window on screen the entire time.",
    beats: [
      { text: "Everything you copy or say.", seconds: 2 },
      { text: "Type three letters.", seconds: 1.8, query: "invo" },
      { text: "There it is.", seconds: 1.6, query: "invo" },
      { text: "Or ⌥Space, from any app.", seconds: 2.2, picker: true, query: "invo" },
      { text: "Pick it.", seconds: 1.4, picker: true, query: "invo", chosen: 0 },
      { text: "Pasted where your cursor was.", seconds: 2, highlight: 0 },
    ],
  },
  {
    slug: "app-filter",
    name: "In the app: copies and voice notes",
    intent: "One tap between what you copied and what you said.",
    beats: [
      { text: "Copies and voice notes, together.", seconds: 2.2 },
      { text: "Only what you copied.", seconds: 2.4, filter: 1 },
      { text: "Or only what you said.", seconds: 2.4, filter: 2 },
      { text: "One tap. No menus.", seconds: 2 },
    ],
  },
  {
    slug: "app-search",
    name: "In the app: search the whole Timeline",
    intent: "The list narrowing as you type. Free, on your device.",
    beats: [
      { text: "Your history is long.", seconds: 2 },
      { text: "So do not scroll it.", seconds: 1.6, query: "or" },
      { text: "Three letters is enough.", seconds: 2.2, query: "order" },
      { text: "Search is free and local.", seconds: 2.2, query: "order", highlight: 0 },
    ],
  },
  {
    slug: "app-picker",
    name: "In the app: the Quick-picker, anywhere",
    intent: "The overlay coming up over whatever you were doing.",
    beats: [
      { text: "You are somewhere else entirely.", seconds: 2 },
      { text: "⌥Space.", seconds: 2, picker: true },
      { text: "Your whole history, on top.", seconds: 2.2, picker: true, chosen: 1 },
      { text: "Two keys, start to finish.", seconds: 2, highlight: 1 },
    ],
  },
  {
    slug: "app-local",
    name: "In the app: it stays on this machine",
    intent: "The privacy answer, with the Timeline visible behind it.",
    beats: [
      { text: "An app that keeps everything you copy.", seconds: 2.4 },
      { text: "Where does it go?", seconds: 1.8 },
      { text: "Nowhere. It stays on this Mac.", seconds: 2.4 },
      { text: "Free where it runs on your machine.", seconds: 2.2 },
    ],
  },
];

export const APP_STARTERS: Starter[] = SCENES.map((scene) => ({
  slug: scene.slug,
  name: scene.name,
  intent: scene.intent,
  build: (s) => build(scene.slug, scene.beats, s),
}));
