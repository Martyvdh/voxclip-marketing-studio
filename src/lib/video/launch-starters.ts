/**
 * Startpunten voor de eerste weken van een nieuw product.
 *
 * Het probleem bij een lancering is niet de montage, het is dat je voor een
 * leeg account staat en niet weet wat de eerste video moet zijn. Deze twaalf
 * zijn de gesprekken die je in die eerste weken hoe dan ook voert: wat is het,
 * waarom bestaat het, is dit niet gewoon een plakbord, wat kost het, waar blijft
 * mijn data.
 *
 * Geen enkele tekent de app na. Waar het scherm te zien moet zijn staat een
 * notitie met wat je opneemt en hoe lang. Dat is geen beperking van de editor
 * maar de regel uit AGENTS.md: een beeld dat op het product lijkt is een
 * uitspraak over het product.
 */

import { newClip, type Clip, type Project } from "./project";
import type { Starter, StarterSource } from "./starters";
import type { RatioKey } from "./timeline";

function project(ratio: RatioKey, clips: Clip[]): Project {
  return { ratio, showMark: true, clips };
}

const CTA_NOTE =
  "De link staat niet in beeld. Die gaat in het bijschrift, getagd, zodat de klik geteld kan worden.";

const el = (
  kind: string,
  x: number,
  y: number,
  over: Partial<{
    scale: number;
    tone: "ink" | "paper" | "teal";
    text: string;
    delay: number;
  }> = {},
) => ({
  id: `${kind}-${Math.round(x * 100)}-${Math.round(y * 100)}`,
  kind,
  x,
  y,
  scale: over.scale ?? 1,
  tone: over.tone ?? ("ink" as const),
  text: over.text ?? "",
  delay: over.delay ?? 0.15,
});

/** De afsluiter is overal hetzelfde, want herhaling werkt bij een lancering. */
const closer = (s: StarterSource) =>
  newClip({
    text: s.ctaLabel,
    secondary: "voxclip.it",
    animation: "hold",
    seconds: 2,
    note: CTA_NOTE,
    elements: [el("wordmark", 0.5, 0.78, { tone: "ink", delay: 0.2 })],
  });

export const LAUNCH_STARTERS: Starter[] = [
  {
    slug: "launch-what-is-it",
    name: "Lancering: wat is dit, in acht seconden",
    intent:
      "De eerste video op een leeg account. Iemand die je niet kent moet in acht seconden snappen wat het is.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Alles wat je kopieert of zegt.",
          secondary: "Op één plek.",
          animation: "fade-rise",
          seconds: 2.5,
          size: "l",
        }),
        newClip({
          text: "Eén tijdlijn. Eén zoekveld.",
          animation: "wipe-up",
          seconds: 4,
          note: "Opnemen: open de Timeline, scroll er kort doorheen. Vier seconden, één take, geen muisgeklungel.",
          elements: [el("chips-copied", 0.5, 0.82, { tone: "paper", delay: 0.2 })],
        }),
        newClip({
          text: "Gratis voor Mac en Windows.",
          animation: "letter-fade",
          seconds: 2.5,
          elements: [
            el("badge-mac", 0.36, 0.72, { tone: "ink", delay: 0.15 }),
            el("badge-win", 0.64, 0.72, { tone: "ink", delay: 0.3 }),
          ],
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-why-built",
    name: "Lancering: waarom ik dit gebouwd heb",
    intent:
      "Een nieuw product heeft geen reviews. Het enige dat je in week één hebt is waarom het bestaat.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: s.problem,
          animation: "stack",
          seconds: 4,
          theme: "ink",
        }),
        newClip({
          text: "Daar bestond niets voor.",
          secondary: "Dus heb ik het gemaakt.",
          animation: "fade-rise",
          seconds: 3.5,
          note: "Optioneel: jezelf in beeld, of gewoon je scherm. Iets echts werkt hier beter dan iets moois.",
        }),
        newClip({
          text: s.promise,
          animation: "letter-fade",
          seconds: 3,
          elements: [el("rule-thick", 0.5, 0.7, { tone: "teal", delay: 0.2 })],
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-not-a-clipboard",
    name: "Lancering: nee, dit is geen plakbordbeheerder",
    intent:
      "De eerste reactie die je gaat krijgen, vóór iemand hem stelt beantwoord.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Is dit niet gewoon een plakbordbeheerder?",
          animation: "typeline",
          seconds: 3,
          theme: "ink",
          elements: [el("quote-open", 0.18, 0.32, { tone: "paper", delay: 0.1 })],
        }),
        newClip({
          text: "Kopiëren en iets zeggen zijn dezelfde gewoonte.",
          secondary: "Het kwam langs en je hebt het zo weer nodig.",
          animation: "wipe-up",
          seconds: 4,
        }),
        newClip({
          text: "Daarom staan ze in dezelfde tijdlijn.",
          animation: "spotlight",
          seconds: 4.5,
          note: "Opnemen: één tijdlijn waarin een gekopieerde regel en een ingesproken notitie naast elkaar staan. Dit is het hele punt, neem er de tijd voor.",
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-two-keystrokes",
    name: "Lancering: twee toetsaanslagen",
    intent:
      "Snelheid laat je zien, niet vertellen. Kortste video van de reeks.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Van 'waar was dat' naar geplakt.",
          animation: "fade-rise",
          seconds: 2,
          size: "l",
        }),
        newClip({
          text: "",
          animation: "hold",
          seconds: 4,
          note: "Opnemen: de Quick-picker openen, kiezen, plakken. Geen tekst in beeld, alleen de handeling. Als het langer dan vier seconden duurt, doe het opnieuw.",
          elements: [
            el("key-cmd", 0.34, 0.8, { tone: "paper", delay: 0.1 }),
            el("key-shift", 0.5, 0.8, { tone: "paper", delay: 0.2 }),
            el("key-wide", 0.68, 0.8, { tone: "teal", delay: 0.3 }),
          ],
        }),
        newClip({
          text: "Dat was het.",
          animation: "letter-fade",
          seconds: 2,
          size: "l",
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-privacy",
    name: "Lancering: het blijft op je eigen machine",
    intent:
      "De vraag die iedereen stelt bij een app die alles vastlegt. Eerlijk en zonder omhaal.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Een app die alles bewaart wat je kopieert.",
          secondary: "Waar gaat dat heen?",
          animation: "stack",
          seconds: 3.5,
          theme: "ink",
        }),
        newClip({
          text: "Nergens heen.",
          animation: "spotlight",
          seconds: 2.5,
          size: "l",
          elements: [el("circle-highlight", 0.5, 0.5, { tone: "teal", delay: 0.1 })],
        }),
        newClip({
          text: "De tijdlijn staat op je eigen apparaat.",
          secondary: "Wat je inspreekt gaat er nooit af.",
          animation: "fade-rise",
          seconds: 4,
          note: "Optioneel opnemen: de instelling waar dit staat. Alleen als het er echt zo staat.",
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-free-vs-paid",
    name: "Lancering: wat is gratis en wat kost geld",
    intent:
      "De eerlijke lijn, letterlijk. Dit is de video die je bij elke prijsvraag opnieuw kunt sturen.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Draait het op jouw machine?",
          secondary: "Dan is het gratis.",
          animation: "fade-rise",
          seconds: 3,
          elements: [el("badge-free", 0.5, 0.74, { tone: "teal", delay: 0.2 })],
        }),
        newClip({
          text: "Heeft het onze servers nodig?",
          secondary: "Dan betaal je ervoor.",
          animation: "wipe-up",
          seconds: 3,
          theme: "ink",
          elements: [el("badge-plus", 0.5, 0.74, { tone: "paper", delay: 0.2 })],
        }),
        newClip({
          text: "Dat is de hele regel.",
          animation: "letter-fade",
          seconds: 2.5,
          size: "l",
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-before-after",
    name: "Lancering: hoe het was, hoe het is",
    intent:
      "Twee opnames naast elkaar. Werkt zonder geluid, en dat is hoe de meeste mensen kijken.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Eerst",
          animation: "hold",
          seconds: 5,
          theme: "ink",
          note: "Opnemen: het gedoe. Drie vensters langs om iets terug te vinden. Overdrijf niet, één echte zoektocht is genoeg.",
          elements: [el("label-mono", 0.18, 0.16, { tone: "paper", text: "EERST" })],
        }),
        newClip({
          text: "Nu",
          animation: "hold",
          seconds: 4,
          note: "Opnemen: dezelfde handeling met VoxClip. Zelfde begin, zelfde eind, veel korter.",
          elements: [el("label-mono", 0.18, 0.16, { tone: "ink", text: "NU" })],
        }),
        newClip({
          text: s.payoff,
          animation: "spotlight",
          seconds: 2.5,
          size: "l",
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-day-in-the-life",
    name: "Lancering: drie momenten op een dag",
    intent:
      "Drie korte fragmenten in plaats van één demo. Laat zien dat het een gewoonte is en geen truc.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Ochtend",
          animation: "fade-rise",
          seconds: 3.5,
          note: "Opnemen: iets kopiëren dat je later nodig hebt. Een adres, een code.",
          elements: [el("step-1", 0.2, 0.16, { tone: "ink" })],
        }),
        newClip({
          text: "Tussendoor",
          animation: "fade-rise",
          seconds: 3.5,
          note: "Opnemen: een gedachte inspreken zonder ergens naartoe te navigeren.",
          elements: [el("step-2", 0.2, 0.16, { tone: "ink" })],
        }),
        newClip({
          text: "Als je het nodig hebt",
          animation: "wipe-up",
          seconds: 4,
          note: "Opnemen: allebei terugvinden in dezelfde tijdlijn en plakken.",
          elements: [el("step-3", 0.2, 0.16, { tone: "teal" })],
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-talk-to-stash",
    name: "Lancering: vraag het aan je eigen geschiedenis",
    intent:
      "De betaalde held. Alleen maken als de functie echt draait in de build die je opneemt.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Je weet dat je het hebt gehad.",
          secondary: "Alleen niet meer waar.",
          animation: "stack",
          seconds: 3.5,
          theme: "ink",
        }),
        newClip({
          text: "Vraag het gewoon.",
          animation: "typeline",
          seconds: 5,
          note: "Opnemen: hardop een vraag stellen over je eigen geschiedenis en het antwoord krijgen. Neem alleen op wat de app echt doet.",
          elements: [el("waveform-wide", 0.5, 0.8, { tone: "teal", delay: 0.1 })],
        }),
        newClip({
          text: "Dit zit in VoxClip Plus.",
          secondary: "Zeven dagen proberen.",
          animation: "letter-fade",
          seconds: 3,
          elements: [el("badge-plus", 0.5, 0.74, { tone: "ink", delay: 0.2 })],
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-install",
    name: "Lancering: installeren in dertig seconden",
    intent:
      "Inclusief de waarschuwing van je besturingssysteem, want die komt en die schrikt mensen af.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Downloaden en starten.",
          animation: "fade-rise",
          seconds: 4,
          note: "Opnemen: de download en de eerste start. Kort.",
        }),
        newClip({
          text: "Je krijgt een waarschuwing.",
          secondary: "Die betekent: onbekende maker, niet: gevaarlijk.",
          animation: "wipe-up",
          seconds: 4.5,
          theme: "ink",
          note: "Opnemen: het echte scherm van Gatekeeper of SmartScreen, en hoe je verdergaat. Verstop dit niet, het is de reden dat mensen afhaken.",
        }),
        newClip({
          text: "Ondertekenen staat op de lijst.",
          animation: "letter-fade",
          seconds: 2.5,
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-one-feature",
    name: "Lancering: één functie, één minuut",
    intent:
      "Het formaat dat je twintig keer kunt herhalen. Per keer één ding, nooit twee.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: s.hook,
          animation: "fade-rise",
          seconds: 2.5,
          size: "l",
        }),
        newClip({
          text: "",
          animation: "hold",
          seconds: 6,
          note: "Opnemen: die ene functie, van begin tot eind, zonder knippen. Zes seconden is lang genoeg om te volgen en kort genoeg om te blijven kijken.",
          elements: [el("frame-window", 0.5, 0.5, { tone: "ink", delay: 0.05 })],
        }),
        newClip({
          text: s.desiredOutcome,
          animation: "spotlight",
          seconds: 3,
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-square-recap",
    name: "Lancering: vierkant, voor de feed",
    intent:
      "Dezelfde boodschap in 1:1 voor Instagram en LinkedIn. Werkt zonder geluid.",
    build: (s) =>
      project("1:1", [
        newClip({
          text: s.headline,
          animation: "fade-rise",
          seconds: 3,
          size: "l",
        }),
        newClip({
          text: s.subhead,
          animation: "wipe-up",
          seconds: 3,
          elements: [el("rule-thin", 0.5, 0.68, { tone: "teal", delay: 0.2 })],
        }),
        newClip({
          text: s.payoff,
          animation: "letter-fade",
          seconds: 3,
          theme: "ink",
        }),
        closer(s),
      ]),
  },
];
