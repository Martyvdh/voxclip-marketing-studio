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

import { newClip, type Clip, type Project } from "./project";
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
