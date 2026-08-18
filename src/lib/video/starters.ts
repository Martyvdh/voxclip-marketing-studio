/**
 * Starting points.
 *
 * Not templates you are stuck inside: each one lays out clips you then edit,
 * split, reorder, and restyle. They exist so nobody starts from a blank canvas
 * with a brief open in another tab.
 *
 * Every line comes from the campaign, so a video cannot promise something the
 * campaign never said.
 */

import {
  EXPLAINER_STARTERS,
  LAUNCH_STARTERS,
  THIRTY_SECOND,
} from "./launch-starters";
import {
  AUDIENCE_LIBRARY,
  DEMO_LIBRARY,
  EXPLAINER_LIBRARY,
  FEATURE_LIBRARY,
  OBJECTION_LIBRARY,
} from "./library";
import { newClip, type Clip, type Project } from "./project";
import { SHORT_STARTERS } from "./shorts";
import type { RatioKey } from "./timeline";

export interface StarterSource {
  hook: string;
  problem: string;
  promise: string;
  desiredOutcome: string;
  payoff: string;
  ctaLabel: string;
  headline: string;
  subhead: string;
}

export interface Starter {
  slug: string;
  name: string;
  intent: string;
  build: (s: StarterSource) => Project;
}

function project(ratio: RatioKey, clips: Clip[]): Project {
  return { ratio, showMark: true, clips };
}

const CTA_NOTE =
  "The link is not drawn on the video. It goes in the caption, tagged, so the click can be measured.";

export const STARTERS: Starter[] = [
  {
    slug: "statement",
    name: "Statement",
    intent: "One idea, held long enough to read twice.",
    build: (s) =>
      project("9:16", [
        newClip({ text: s.hook, animation: "fade-rise", seconds: 3, size: "l" }),
        newClip({ text: s.promise, animation: "letter-fade", seconds: 3 }),
        newClip({ text: s.payoff, animation: "spotlight", seconds: 2.5, size: "l" }),
        newClip({
          text: s.ctaLabel,
          secondary: "voxclip.it",
          animation: "hold",
          seconds: 2,
          note: CTA_NOTE,
        }),
      ]),
  },
  {
    slug: "frustration",
    name: "One frustration, one resolution",
    intent: "Name a single annoyance and end it once.",
    build: (s) =>
      project("9:16", [
        newClip({ text: s.problem, animation: "stack", seconds: 4, theme: "ink" }),
        newClip({ text: s.promise, animation: "wipe-up", seconds: 3 }),
        newClip({ text: s.desiredOutcome, animation: "fade-rise", seconds: 3.5 }),
        newClip({
          text: s.ctaLabel,
          secondary: "voxclip.it",
          animation: "hold",
          seconds: 2,
          note: CTA_NOTE,
        }),
      ]),
  },
  {
    slug: "demo",
    name: "Capture to recall",
    intent: "Frames a real screen recording. Two clips wait for your footage.",
    build: (s) =>
      project("9:16", [
        newClip({ text: s.hook, animation: "fade-rise", seconds: 2.5, size: "l" }),
        newClip({
          text: "Copy it. Say it.",
          animation: "wipe-up",
          seconds: 4,
          note: "Attach the recording: copy three things, dictate one note.",
        }),
        newClip({
          text: "Find it. Paste it.",
          animation: "wipe-up",
          seconds: 4,
          note: "Attach the recording: search the Timeline, paste at the cursor.",
        }),
        newClip({ text: s.payoff, animation: "letter-fade", seconds: 2.5 }),
        newClip({
          text: s.ctaLabel,
          secondary: "voxclip.it",
          animation: "hold",
          seconds: 2,
          note: CTA_NOTE,
        }),
      ]),
  },
  {
    slug: "local-first",
    name: "Local-first",
    intent: "Answers where the data goes, in the approved words.",
    build: (s) =>
      project("9:16", [
        newClip({ text: "Where does it go?", animation: "typeline", seconds: 3, size: "l" }),
        newClip({ text: "It stays on your device.", animation: "fade-rise", seconds: 3 }),
        newClip({
          text: "Turn on a cloud feature",
          secondary: "and VoxClip says so first.",
          animation: "stack",
          seconds: 3.5,
        }),
        newClip({
          text: "If it runs on your machine, it is free.",
          secondary: "If it needs our servers, it is paid.",
          animation: "letter-fade",
          seconds: 4,
          theme: "ink",
        }),
        newClip({
          text: s.ctaLabel,
          secondary: "voxclip.it",
          animation: "hold",
          seconds: 2,
          note: CTA_NOTE,
        }),
      ]),
  },
  {
    slug: "headline-pair",
    name: "Headline pair",
    intent: "The pillar's own two lines, set large. The calmest one.",
    build: (s) =>
      project("1:1", [
        newClip({ text: s.headline, animation: "word-pop", seconds: 2.5, size: "l" }),
        newClip({ text: s.subhead, animation: "word-pop", seconds: 2.5, size: "l" }),
        newClip({ text: s.payoff, animation: "spotlight", seconds: 3 }),
        newClip({
          text: s.ctaLabel,
          secondary: "voxclip.it",
          animation: "hold",
          seconds: 2,
          note: CTA_NOTE,
        }),
      ]),
  },
  {
    slug: "blank",
    name: "Blank",
    intent: "One empty clip. Build it yourself.",
    build: () => project("9:16", [newClip({ text: "Your first line", seconds: 3 })]),
  },
];

/**
 * Demo starting points.
 *
 * Built from the video ideas already in the prototype, with the elements placed
 * and the footage slots marked. Each one shows one thing VoxClip does. None of
 * them draws the interface: where the app should be seen, there is a note
 * telling you what to record.
 */
const el = (
  kind: string,
  x: number,
  y: number,
  over: Partial<{ scale: number; tone: "ink" | "paper" | "teal"; text: string; delay: number }> = {},
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

export const DEMO_STARTERS: Starter[] = [
  {
    slug: "demo-copy-three",
    name: "Demo: copy three, paste the right one",
    intent: "The core loss and the core relief. Needs one recording.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "You copied three things.",
          secondary: "Which one was the address?",
          animation: "stack",
          seconds: 3,
          theme: "ink",
          elements: [el("step-1", 0.22, 0.78, { tone: "paper" }), el("step-2", 0.5, 0.78, { tone: "paper", delay: 0.3 }), el("step-3", 0.78, 0.78, { tone: "paper", delay: 0.45 })],
        }),
        newClip({
          text: "Search. Pick. Paste.",
          animation: "wipe-up",
          seconds: 5,
          note: "Record: open the Timeline, search, paste into a document. One take.",
          elements: [el("chips-copied", 0.5, 0.82, { tone: "paper", delay: 0.2 })],
        }),
        newClip({
          text: s.payoff,
          animation: "letter-fade",
          seconds: 2.5,
          elements: [el("rule-thick", 0.5, 0.78, { tone: "teal", delay: 0.2 })],
        }),
        newClip({ text: s.ctaLabel, secondary: "voxclip.it", animation: "hold", seconds: 2, note: CTA_NOTE }),
      ]),
  },
  {
    slug: "demo-say-it",
    name: "Demo: say it, do not type it",
    intent: "Dictation landing in the same Timeline. Needs one recording.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Stop typing the note.",
          animation: "fade-rise",
          seconds: 2.5,
          elements: [el("waveform", 0.5, 0.74, { tone: "ink", delay: 0.1 })],
        }),
        newClip({
          text: "Say it instead.",
          animation: "typeline",
          seconds: 4.5,
          note: "Record: dictate one sentence and watch the words appear.",
          elements: [el("caret", 0.62, 0.78, { tone: "paper", delay: 0.05 })],
        }),
        newClip({
          text: "Your voice never leaves your device.",
          animation: "letter-fade",
          seconds: 3.5,
          theme: "ink",
          elements: [el("tick", 0.5, 0.72, { tone: "teal", delay: 0.25 })],
        }),
        newClip({ text: s.ctaLabel, secondary: "voxclip.it", animation: "hold", seconds: 2, note: CTA_NOTE }),
      ]),
  },
  {
    slug: "demo-search-meaning",
    name: "Demo: search by meaning",
    intent: "You do not have to remember the words. Free, on the device.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "You forgot the exact words.",
          animation: "stack",
          seconds: 3,
          elements: [el("quote-open", 0.16, 0.78, { tone: "ink" })],
        }),
        newClip({
          text: "Search what you meant.",
          animation: "wipe-up",
          seconds: 4.5,
          note: "Record: type a rough description and watch the right clip come up.",
          elements: [el("circle-highlight", 0.5, 0.78, { tone: "teal", delay: 0.35 })],
        }),
        newClip({
          text: "Free, and it runs on your machine.",
          animation: "fade-rise",
          seconds: 3,
          elements: [el("badge-free", 0.5, 0.72, { delay: 0.2 })],
        }),
        newClip({ text: s.ctaLabel, secondary: "voxclip.it", animation: "hold", seconds: 2, note: CTA_NOTE }),
      ]),
  },
  {
    slug: "demo-free-vs-plus",
    name: "Demo: free where it is local",
    intent: "The honest split, in the approved words.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "If it runs on your machine,",
          secondary: "it is free.",
          animation: "stack",
          seconds: 3.5,
          elements: [el("badge-free", 0.78, 0.78, { tone: "teal" })],
        }),
        newClip({
          text: "If it needs our servers,",
          secondary: "it is paid.",
          animation: "stack",
          seconds: 3.5,
          theme: "ink",
          elements: [el("badge-plus", 0.78, 0.78, { tone: "paper" })],
        }),
        newClip({
          text: "No trick, no countdown, no locked history.",
          animation: "letter-fade",
          seconds: 3,
          elements: [el("rule-thin", 0.5, 0.78, { tone: "teal", delay: 0.3 })],
        }),
        newClip({ text: s.ctaLabel, secondary: "voxclip.it", animation: "hold", seconds: 2, note: CTA_NOTE }),
      ]),
  },
  {
    slug: "demo-before-after",
    name: "Demo: before and after",
    intent: "The same task, twice. Needs two recordings.",
    build: (s) =>
      project("9:16", [
        newClip({ text: "The task", secondary: s.problem, animation: "fade-rise", seconds: 2.5, size: "s" }),
        newClip({
          text: "Before",
          animation: "hold",
          seconds: 5,
          theme: "ink",
          note: "Record the honest old way. Do not fumble it on purpose.",
          elements: [el("lower-third", 0.5, 0.86, { tone: "paper", text: "Before", delay: 0 })],
        }),
        newClip({
          text: "After",
          animation: "hold",
          seconds: 4,
          theme: "ink",
          note: "Record the same task in VoxClip.",
          elements: [el("lower-third", 0.5, 0.86, { tone: "teal", text: "After", delay: 0 })],
        }),
        newClip({ text: s.desiredOutcome, animation: "letter-fade", seconds: 3 }),
        newClip({ text: s.ctaLabel, secondary: "voxclip.it", animation: "hold", seconds: 2, note: CTA_NOTE }),
      ]),
  },
];

export const ALL_STARTERS: Starter[] = [
  ...STARTERS,
  ...DEMO_STARTERS,
  ...DEMO_LIBRARY,
  ...LAUNCH_STARTERS,
  ...EXPLAINER_STARTERS,
  ...EXPLAINER_LIBRARY,
  ...OBJECTION_LIBRARY,
  ...AUDIENCE_LIBRARY,
  ...FEATURE_LIBRARY,
  ...THIRTY_SECOND,
  ...SHORT_STARTERS,
];

/**
 * The starting points in families, for the picker.
 *
 * Each family gets a sentence, because a label alone does not tell you when to
 * reach for it. The picker shows these as columns rather than as one long list:
 * at a hundred and fifty, a dropdown stops being a menu and becomes a haystack.
 *
 * Order is the order you need them. What is this and why does it exist come
 * first, because that is the video nobody has made yet.
 */
export interface StarterGroup {
  label: string;
  /** One line on when to reach for this family. */
  blurb: string;
  /** True when every starter here waits for a screen recording. */
  needsFootage: boolean;
  starters: Starter[];
}

export const STARTER_GROUPS: StarterGroup[] = [
  {
    label: "What it is",
    blurb: "The plain answers. Nothing to record, nothing to film.",
    needsFootage: false,
    starters: [...EXPLAINER_LIBRARY, ...EXPLAINER_STARTERS],
  },
  {
    label: "How it works",
    blurb: "Each one frames one real recording. This is the set that converts.",
    needsFootage: true,
    starters: [...DEMO_LIBRARY, ...DEMO_STARTERS],
  },
  {
    label: "Questions people ask",
    blurb: "Answer the objection before anyone has to type it.",
    needsFootage: false,
    starters: OBJECTION_LIBRARY,
  },
  {
    label: "Who it is for",
    blurb: "One job, one moment they recognise.",
    needsFootage: false,
    starters: AUDIENCE_LIBRARY,
  },
  {
    label: "One feature at a time",
    blurb: "A single thing it does, held long enough to land.",
    needsFootage: false,
    starters: FEATURE_LIBRARY,
  },
  {
    label: "Launch, first weeks",
    blurb: "For an account with no followers and no reviews yet.",
    needsFootage: false,
    starters: LAUNCH_STARTERS,
  },
  {
    label: "Shorts, fourteen seconds",
    blurb: "Fifty in one shape. Post them daily without repeating yourself.",
    needsFootage: false,
    starters: SHORT_STARTERS,
  },
  {
    label: "Shapes",
    blurb: "Empty forms to pour your own brief into.",
    needsFootage: false,
    starters: STARTERS,
  },
  {
    label: "The full arc",
    blurb: "Thirty seconds, the whole story. For a pinned post.",
    needsFootage: false,
    starters: THIRTY_SECOND,
  },
];

export function starterBySlug(slug: string): Starter | undefined {
  return ALL_STARTERS.find((starter) => starter.slug === slug);
}

/**
 * What the picker prints under a name.
 *
 * Built rather than declared: the length and the shape are properties of the
 * clips, so asking the project is the only way they cannot drift from it.
 */
export interface StarterMeta {
  seconds: number;
  ratio: RatioKey;
  clipCount: number;
  /** How many clips wait for footage. Zero means you can export it today. */
  shotsToRecord: number;
}

export function starterMeta(starter: Starter, source: StarterSource): StarterMeta {
  const project = starter.build(source);
  return {
    seconds: project.clips.reduce((total, clip) => total + clip.seconds, 0),
    ratio: project.ratio,
    clipCount: project.clips.length,
    shotsToRecord: project.clips.filter((clip) =>
      (clip.note ?? "").toLowerCase().startsWith("record"),
    ).length,
  };
}

/** Free-text match over the name, the intent and the family. */
export function matchesQuery(starter: Starter, family: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  const haystack = `${starter.name} ${starter.intent} ${family}`.toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}
