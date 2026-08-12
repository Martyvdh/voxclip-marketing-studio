/**
 * Which scenes each house format plays.
 *
 * The prototype had 150 named looks. These are the six jobs underneath them,
 * built from the campaign's own words rather than from a template picked at
 * random. Decoration is a setting inside a format, not another format.
 *
 * None of these draws a product interface. The prototype's demo frames painted
 * a fake Timeline on canvas, which the brand book forbids: real captures only.
 * A demonstration format leaves a slot for a real recording instead.
 */

import type { Scene } from "./timeline";

export interface SceneSource {
  hook: string;
  problem: string;
  promise: string;
  desiredOutcome: string;
  payoff: string;
  ctaLabel: string;
  headline: string;
  subhead: string;
}

export interface VideoFormat {
  slug: string;
  name: string;
  /** What it is for, in the operator's language. */
  intent: string;
  /** True when it cannot be finished without a real screen recording. */
  needsRealCapture: boolean;
  defaultSeconds: number;
  build: (s: SceneSource) => Scene[];
}

const line = (text: string) => text.trim();

export const VIDEO_FORMATS: VideoFormat[] = [
  {
    slug: "statement",
    name: "Statement",
    intent:
      "One idea, said plainly, held long enough to read twice. Works when the thought is the whole point.",
    needsRealCapture: false,
    defaultSeconds: 8,
    build: (s) => [
      { id: "hook", weight: 3, lines: [line(s.hook)] },
      { id: "promise", weight: 3, lines: [line(s.promise)] },
      { id: "payoff", weight: 2, lines: [line(s.payoff)] },
      { id: "cta", weight: 2, lines: [line(s.ctaLabel), "voxclip.it"] },
    ],
  },
  {
    slug: "frustration-resolution",
    name: "One frustration, one resolution",
    intent:
      "Name a single annoyance and end it once. No list, no montage, no build-up.",
    needsRealCapture: false,
    defaultSeconds: 10,
    build: (s) => [
      { id: "frustration", weight: 3, lines: [line(s.problem)] },
      { id: "turn", weight: 2, lines: [line(s.promise)] },
      { id: "resolution", weight: 3, lines: [line(s.desiredOutcome)] },
      { id: "cta", weight: 2, lines: [line(s.ctaLabel), "voxclip.it"] },
    ],
  },
  {
    slug: "before-after",
    name: "Before and after",
    intent:
      "The same task, the honest old way and the new way. Neither half exaggerated.",
    needsRealCapture: true,
    defaultSeconds: 12,
    build: (s) => [
      { id: "task", weight: 2, lines: ["The task"], note: "Name the task first." },
      {
        id: "before",
        weight: 4,
        lines: ["Before", line(s.problem)],
        note: "Real recording of the old way. Do not slow it down on purpose.",
      },
      {
        id: "after",
        weight: 4,
        lines: ["After", line(s.desiredOutcome)],
        note: "Real recording of the same task in VoxClip.",
      },
      { id: "cta", weight: 2, lines: [line(s.ctaLabel), "voxclip.it"] },
    ],
  },
  {
    slug: "local-first",
    name: "Local-first explanation",
    intent:
      "Answer the question the viewer already has: where does this go. Privacy wording comes from Product Truth.",
    needsRealCapture: false,
    defaultSeconds: 12,
    build: (s) => [
      { id: "question", weight: 2, lines: ["Where does it go?"] },
      { id: "device", weight: 3, lines: ["It stays on your device."] },
      {
        id: "cloud",
        weight: 3,
        lines: ["Turn on a cloud feature", "and VoxClip says so first."],
      },
      {
        id: "line",
        weight: 3,
        lines: ["If it runs on your machine, it is free.", "If it needs our servers, it is paid."],
      },
      { id: "cta", weight: 2, lines: [line(s.ctaLabel), "voxclip.it"] },
    ],
  },
  {
    slug: "capture-recall",
    name: "Capture to recall",
    intent:
      "The whole product in one take. Needs a real screen recording; the text only frames it.",
    needsRealCapture: true,
    defaultSeconds: 14,
    build: (s) => [
      { id: "hook", weight: 3, lines: [line(s.hook)] },
      {
        id: "capture",
        weight: 4,
        lines: ["Copy it. Say it."],
        note: "Real recording: copy three things, dictate one note.",
      },
      {
        id: "recall",
        weight: 4,
        lines: ["Find it. Paste it."],
        note: "Real recording: search the Timeline and paste at the cursor.",
      },
      { id: "payoff", weight: 2, lines: [line(s.payoff)] },
      { id: "cta", weight: 2, lines: [line(s.ctaLabel), "voxclip.it"] },
    ],
  },
  {
    slug: "headline-pair",
    name: "Headline pair",
    intent:
      "The pillar's own two lines, set large, with the payoff. The calmest thing in the set.",
    needsRealCapture: false,
    defaultSeconds: 7,
    build: (s) => [
      { id: "h1", weight: 3, lines: [line(s.headline)] },
      { id: "h2", weight: 3, lines: [line(s.subhead)] },
      { id: "payoff", weight: 3, lines: [line(s.payoff)] },
      { id: "cta", weight: 2, lines: [line(s.ctaLabel), "voxclip.it"] },
    ],
  },
];

export function formatBySlug(slug: string): VideoFormat {
  return VIDEO_FORMATS.find((f) => f.slug === slug) ?? VIDEO_FORMATS[0];
}
