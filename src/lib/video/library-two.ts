/**
 * Twintig startpunten in vier vormen die er nog niet waren.
 *
 * De klacht was steeds dat alles op elkaar leek, en dat kwam niet doordat er te
 * weinig onderwerpen waren maar doordat elke video dezelfde vorm had: kop,
 * kop, kop, afsluiter. Deze vier zijn geen nieuwe onderwerpen in de oude vorm.
 *
 * - Twee manieren: dezelfde taak twee keer, met een labelbalk eronder.
 * - Met opzet niet: een ontkenning die blijft hangen, dan pas de reden.
 * - De eerste vijf minuten: genummerde stappen, vraagt om jouw opname.
 * - Door een mens gemaakt: één lange zin per beeld, stil, licht.
 *
 * Alles moet waar zijn volgens `docs/product-truth.md`. De laatste familie raakt
 * aan wie het maakt: eenmanszaak in Nederland, GDPR-first. Geen team, geen
 * kantoor, geen "wij" dat groter klinkt dan het is.
 */

import { beat } from "./beats";
import { closerFor, hashSlug, showsMark } from "./closers";
import { newClip, type Project } from "./project";
import type { Starter, StarterSource } from "./starters";

const el = (kind: string, x: number, y: number, tone: "ink" | "paper" | "teal", text = "") => ({
  id: `${kind}-${Math.round(x * 100)}-${Math.round(y * 100)}`,
  kind,
  x,
  y,
  scale: 1,
  tone,
  text,
  delay: 0,
});

// ---------------------------------------------------------------------------
// 1 — Twee manieren. Dezelfde taak, twee keer.
// ---------------------------------------------------------------------------

interface TwoWaysRow {
  slug: string;
  task: string;
  before: string;
  after: string;
  record?: string;
}

export const TWO_WAYS: TwoWaysRow[] = [
  {
    slug: "address",
    task: "Pasting an address you copied earlier",
    before: "Reopen the email. Find it. Copy it again.",
    after: "Two keys. It was still there.",
    record: "Record both ways for real. Do the old way honestly — do not fumble it on purpose.",
  },
  {
    slug: "same-reply",
    task: "Sending the reply you send every day",
    before: "Type it out. Again.",
    after: "Two keys, and it is written.",
  },
  {
    slug: "note-to-self",
    task: "Keeping a thought before it goes",
    before: "Open an app. Find a note. Type it.",
    after: "One keystroke and say it.",
  },
  {
    slug: "four-fields",
    task: "Filling a form from four places",
    before: "Four tabs. Four switches. Four copies.",
    after: "One list. Four pastes.",
    record: "Record the after: fill four fields from the Timeline without leaving the form.",
  },
  {
    slug: "lost-quote",
    task: "Finding the line you read this morning",
    before: "Scroll. Search. Give up. Write it again.",
    after: "Search what you meant. There it is.",
  },
];

/**
 * Zes tellen, hard heen en weer.
 *
 * Het label onderin doet het werk: dezelfde taak, twee keer, en je ziet aan de
 * balk welke helft je kijkt. Donker voor het oude, licht voor het nieuwe.
 */
function buildTwoWays(row: TwoWaysRow, s: StarterSource): Project {
  const slug = `two-${row.slug}`;
  return {
    ratio: "9:16",
    showMark: showsMark(slug),
    clips: [
      newClip({ text: row.task, animation: "rise-fast", seconds: 2.2, size: "s", align: "left" }),
      newClip({
        text: row.before,
        animation: "whip",
        seconds: 3,
        theme: "ink",
        align: "left",
        note: row.record,
        elements: [el("lower-third", 0.5, 0.88, "paper", "Before")],
      }),
      beat("objection", { seconds: 0.4, theme: "paper" }),
      newClip({
        text: row.after,
        animation: "fly-in",
        seconds: 3,
        size: "l",
        align: "left",
        elements: [el("lower-third", 0.5, 0.88, "teal", "After")],
      }),
      closerFor(slug, s),
    ],
  };
}

// ---------------------------------------------------------------------------
// 2 — Met opzet niet. De ontkenning eerst.
// ---------------------------------------------------------------------------

interface OnPurposeRow {
  slug: string;
  /** Kort. Staat alleen in beeld en moet blijven hangen. */
  no: string;
  why: string;
  proof: string;
}

export const ON_PURPOSE: OnPurposeRow[] = [
  { slug: "no-account", no: "No account.", why: "Nothing to sign up for, nothing to sign in to.", proof: "Install it and it works." },
  { slug: "no-cloud", no: "No cloud.", why: "Not until you switch it on yourself.", proof: "Your Timeline lives on this machine." },
  { slug: "no-ads", no: "No ads.", why: "And no upsell popping up mid-sentence.", proof: "The free tier is the real product." },
  { slug: "no-phone", no: "No phone app.", why: "This is for the machine you type on.", proof: "Mac and Windows. That is the list." },
  { slug: "no-trial", no: "No trial.", why: "Free is not a countdown here.", proof: "If it runs on your machine, it is free." },
];

/**
 * De ontkenning krijgt bijna alles.
 *
 * Twee woorden, groot, en dan drie seconden stilte. Dat is de enige vorm hier
 * die durft te wachten, en dat is precies waarom hij opvalt tussen de rest.
 */
function buildOnPurpose(row: OnPurposeRow, s: StarterSource): Project {
  const slug = `nope-${row.slug}`;
  const dark = hashSlug(slug) % 2 === 0;
  return {
    ratio: "9:16",
    showMark: showsMark(slug),
    clips: [
      newClip({
        text: row.no,
        animation: "punch",
        seconds: 3.2,
        size: "l",
        theme: dark ? "ink" : "paper",
      }),
      newClip({
        text: row.why,
        animation: "drop-in",
        seconds: 2.8,
        theme: dark ? "paper" : "ink",
      }),
      newClip({
        text: row.proof,
        animation: "spotlight",
        seconds: 2.6,
        align: "left",
        elements: [el("tick", 0.2, 0.82, "teal")],
      }),
      closerFor(slug, s),
    ],
  };
}

// ---------------------------------------------------------------------------
// 3 — De eerste vijf minuten. Genummerde stappen.
// ---------------------------------------------------------------------------

interface FirstRunRow {
  slug: string;
  title: string;
  one: string;
  two: string;
  three: string;
  record: string;
}

export const FIRST_RUN: FirstRunRow[] = [
  {
    slug: "install",
    title: "Your first five minutes",
    one: "Copy three things.",
    two: "Press ⌥Space.",
    three: "Pick one. It is pasted.",
    record: "Record all three steps in one take. Slowly enough to follow, quickly enough to impress.",
  },
  {
    slug: "first-snippet",
    title: "Save your first Snippet",
    one: "Find something you type a lot.",
    two: "Save it once.",
    three: "Two keys from now on.",
    record: "Record: saving a Snippet, then recalling it in another app.",
  },
  {
    slug: "first-dictation",
    title: "Your first dictation",
    one: "Put the cursor anywhere.",
    two: "Start dictation and talk.",
    three: "It lands in the same Timeline.",
    record: "Record: one short spoken sentence appearing as text. Keep it under four seconds.",
  },
  {
    slug: "first-privacy",
    title: "Set it up the way you want",
    one: "Open Settings, then Privacy.",
    two: "Add the apps it should ignore.",
    three: "Now it never looks at those.",
    record: "Record: adding one app to the ignore list. Your password manager is the obvious one.",
  },
  {
    slug: "first-search",
    title: "Find something you lost",
    one: "Open the Timeline.",
    two: "Type roughly what it was.",
    three: "Not the exact words. Still found.",
    record: "Record: a search by meaning that lands on the right item.",
  },
];

/** Drie genummerde tellen met een cijfer eronder, dan de opname. */
function buildFirstRun(row: FirstRunRow, s: StarterSource): Project {
  const slug = `first-${row.slug}`;
  return {
    ratio: "9:16",
    showMark: showsMark(slug),
    clips: [
      newClip({ text: row.title, animation: "rise-fast", seconds: 2, size: "l", theme: "ink" }),
      newClip({
        text: row.one,
        animation: "split-in",
        seconds: 2,
        align: "left",
        elements: [el("step-1", 0.2, 0.82, "ink")],
      }),
      newClip({
        text: row.two,
        animation: "split-in",
        seconds: 2,
        align: "left",
        theme: "ink",
        elements: [el("step-2", 0.2, 0.82, "paper")],
      }),
      newClip({
        text: row.three,
        animation: "split-in",
        seconds: 4.5,
        align: "left",
        note: row.record,
        elements: [el("step-3", 0.2, 0.82, "teal")],
      }),
      closerFor(slug, s),
    ],
  };
}

// ---------------------------------------------------------------------------
// 4 — Door een mens gemaakt. Eén zin per beeld, stil.
// ---------------------------------------------------------------------------

interface MakerRow {
  slug: string;
  line: string;
  second: string;
}

export const MAKER: MakerRow[] = [
  { slug: "why", line: "I kept losing things I had copied five minutes earlier.", second: "Nothing did what I wanted, so I built it." },
  { slug: "solo", line: "One person, in the Netherlands.", second: "No team, no investors, no roadmap written by someone else." },
  { slug: "local", line: "I did not want my clipboard on someone's server.", second: "So by default it is not on one." },
  { slug: "free", line: "The part that runs on your machine costs me nothing.", second: "So it costs you nothing." },
  { slug: "honest", line: "The installer is not signed yet.", second: "Your Mac will say so. It means unverified, not harmful." },
];

/**
 * De rustigste vorm in de hele bibliotheek.
 *
 * Klein gezet, links, licht, en zonder enkele harde animatie. Dat is met opzet:
 * dit is het enige moment waarop er iemand aan het woord is in plaats van een
 * merk, en dat verdraagt geen invliegende letters.
 */
function buildMaker(row: MakerRow, s: StarterSource): Project {
  const slug = `maker-${row.slug}`;
  return {
    ratio: hashSlug(slug) % 2 === 0 ? "9:16" : "1:1",
    showMark: showsMark(slug),
    clips: [
      newClip({
        text: row.line,
        animation: "typeline",
        seconds: 4.5,
        size: "s",
        align: "left",
      }),
      beat("explain", { seconds: 0.8, theme: "paper" }),
      newClip({
        text: row.second,
        animation: "letter-fade",
        seconds: 4,
        size: "s",
        align: "left",
      }),
      closerFor(slug, s),
    ],
  };
}

// ---------------------------------------------------------------------------

export const TWO_WAYS_LIBRARY: Starter[] = TWO_WAYS.map((row) => ({
  slug: `two-${row.slug}`,
  name: `Two ways: ${row.task}`,
  intent: `The old way and the new one, labelled. ${row.record ? "Needs your footage." : "No footage needed."}`,
  build: (s) => buildTwoWays(row, s),
}));

export const ON_PURPOSE_LIBRARY: Starter[] = ON_PURPOSE.map((row) => ({
  slug: `nope-${row.slug}`,
  name: row.no,
  intent: `What it does not do, and why that is the point. ${row.why}`,
  build: (s) => buildOnPurpose(row, s),
}));

export const FIRST_RUN_LIBRARY: Starter[] = FIRST_RUN.map((row) => ({
  slug: `first-${row.slug}`,
  name: row.title,
  intent: `Three numbered steps. Needs one recording. ${row.record}`,
  build: (s) => buildFirstRun(row, s),
}));

export const MAKER_LIBRARY: Starter[] = MAKER.map((row) => ({
  slug: `maker-${row.slug}`,
  name: row.line,
  intent: `Quiet, small, first person. ${row.second}`,
  build: (s) => buildMaker(row, s),
}));
