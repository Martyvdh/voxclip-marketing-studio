/**
 * Starting points for the first weeks of a product nobody has heard of.
 *
 * The hard part of a launch is not the editing, it is standing in front of an
 * empty account with no idea what the first video should be. These twelve are
 * the conversations you end up having anyway: what is this, why does it exist,
 * isn't this just a clipboard manager, what does it cost, where does my stuff
 * go.
 *
 * None of them draws the app. Where the screen should be seen there is a note
 * saying what to record and for how long. That is not a limitation of the
 * editor; it is the rule from AGENTS.md, because a picture that looks like the
 * product is a claim about the product.
 */

import { newClip, type Clip, type Project } from "./project";
import type { Starter, StarterSource } from "./starters";
import type { RatioKey } from "./timeline";

function project(ratio: RatioKey, clips: Clip[]): Project {
  return { ratio, showMark: true, clips };
}

const CTA_NOTE =
  "The link is not drawn on the video. It goes in the caption, tagged, so the click can be measured.";

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

/** The same close everywhere. Repetition is what a launch is made of. */
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
    name: "Launch: what is this, in eight seconds",
    intent:
      "The first video on an empty account. Someone who has never heard of you has eight seconds to get it.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Everything you copy or say.",
          secondary: "In one place.",
          animation: "fade-rise",
          seconds: 2.5,
          size: "l",
        }),
        newClip({
          text: "One timeline. One search.",
          animation: "wipe-up",
          seconds: 4,
          note: "Record: open the Timeline and scroll through it briefly. Four seconds, one take, no fumbling with the mouse.",
          elements: [el("chips-copied", 0.5, 0.82, { tone: "paper", delay: 0.2 })],
        }),
        newClip({
          text: "Free for Mac and Windows.",
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
    name: "Launch: why I built this",
    intent:
      "A new product has no reviews. In week one the only thing you have is why it exists.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: s.problem,
          animation: "stack",
          seconds: 4,
          theme: "ink",
        }),
        newClip({
          text: "Nothing did that.",
          secondary: "So I made it.",
          animation: "fade-rise",
          seconds: 3.5,
          note: "Optional: yourself on camera, or just your screen. Something real beats something polished here.",
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
    name: "Launch: no, this is not a clipboard manager",
    intent:
      "The first reply you are going to get. Answer it before anyone asks.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Isn't this just a clipboard manager?",
          animation: "typeline",
          seconds: 3,
          theme: "ink",
          elements: [el("quote-open", 0.18, 0.32, { tone: "paper", delay: 0.1 })],
        }),
        newClip({
          text: "Copying and saying something are the same habit.",
          secondary: "It crossed your screen and you will want it back.",
          animation: "wipe-up",
          seconds: 4,
        }),
        newClip({
          text: "So they live in the same timeline.",
          animation: "spotlight",
          seconds: 4.5,
          note: "Record: one timeline with a copied line and a dictated note sitting next to each other. This is the whole point, so take your time.",
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-two-keystrokes",
    name: "Launch: two keystrokes",
    intent: "Speed is shown, not described. The shortest one in the set.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "From where was that to pasted.",
          animation: "fade-rise",
          seconds: 2,
          size: "l",
        }),
        newClip({
          text: "",
          animation: "hold",
          seconds: 4,
          note: "Record: open the Quick-picker, pick, paste. No text on screen, just the action. If it takes longer than four seconds, do it again.",
          elements: [
            el("key-cmd", 0.34, 0.8, { tone: "paper", delay: 0.1 }),
            el("key-shift", 0.5, 0.8, { tone: "paper", delay: 0.2 }),
            el("key-wide", 0.68, 0.8, { tone: "teal", delay: 0.3 }),
          ],
        }),
        newClip({
          text: "That was it.",
          animation: "letter-fade",
          seconds: 2,
          size: "l",
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-privacy",
    name: "Launch: it stays on your machine",
    intent:
      "The question everyone asks about an app that keeps everything. Answer it plainly.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "An app that keeps everything you copy.",
          secondary: "Where does that go?",
          animation: "stack",
          seconds: 3.5,
          theme: "ink",
        }),
        newClip({
          text: "Nowhere.",
          animation: "spotlight",
          seconds: 2.5,
          size: "l",
          elements: [el("circle-highlight", 0.5, 0.5, { tone: "teal", delay: 0.1 })],
        }),
        newClip({
          text: "The timeline lives on your device.",
          secondary: "What you dictate never leaves it.",
          animation: "fade-rise",
          seconds: 4,
          note: "Optional record: the setting where this is stated. Only if it really says that.",
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-free-vs-paid",
    name: "Launch: what is free and what costs money",
    intent:
      "The honest line, literally. Send this again every time someone asks about pricing.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Does it run on your machine?",
          secondary: "Then it is free.",
          animation: "fade-rise",
          seconds: 3,
          elements: [el("badge-free", 0.5, 0.74, { tone: "teal", delay: 0.2 })],
        }),
        newClip({
          text: "Does it need our servers?",
          secondary: "Then you pay for it.",
          animation: "wipe-up",
          seconds: 3,
          theme: "ink",
          elements: [el("badge-plus", 0.5, 0.74, { tone: "paper", delay: 0.2 })],
        }),
        newClip({
          text: "That is the whole rule.",
          animation: "letter-fade",
          seconds: 2.5,
          size: "l",
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-before-after",
    name: "Launch: how it was, how it is",
    intent:
      "Two recordings side by side. Works with the sound off, which is how most people watch.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Before",
          animation: "hold",
          seconds: 5,
          theme: "ink",
          note: "Record: the mess. Three windows to find one thing. Do not exaggerate, one real search is enough.",
          elements: [el("label-mono", 0.18, 0.16, { tone: "paper", text: "BEFORE" })],
        }),
        newClip({
          text: "Now",
          animation: "hold",
          seconds: 4,
          note: "Record: the same task with VoxClip. Same start, same end, much shorter.",
          elements: [el("label-mono", 0.18, 0.16, { tone: "ink", text: "NOW" })],
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
    name: "Launch: three moments in a day",
    intent:
      "Three short clips instead of one demo. Shows it is a habit rather than a trick.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Morning",
          animation: "fade-rise",
          seconds: 3.5,
          note: "Record: copying something you will need later. An address, a code.",
          elements: [el("step-1", 0.2, 0.16, { tone: "ink" })],
        }),
        newClip({
          text: "Somewhere in between",
          animation: "fade-rise",
          seconds: 3.5,
          note: "Record: dictating a thought without navigating anywhere first.",
          elements: [el("step-2", 0.2, 0.16, { tone: "ink" })],
        }),
        newClip({
          text: "When you need it",
          animation: "wipe-up",
          seconds: 4,
          note: "Record: finding both in the same timeline and pasting one.",
          elements: [el("step-3", 0.2, 0.16, { tone: "teal" })],
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-talk-to-stash",
    name: "Launch: ask your own history",
    intent:
      "The paid hero. Only make this if the feature really runs in the build you record.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "You know you had it.",
          secondary: "Just not where.",
          animation: "stack",
          seconds: 3.5,
          theme: "ink",
        }),
        newClip({
          text: "So ask.",
          animation: "typeline",
          seconds: 5,
          note: "Record: asking a question out loud about your own history and getting the answer. Record only what the app actually does.",
          elements: [el("waveform-wide", 0.5, 0.8, { tone: "teal", delay: 0.1 })],
        }),
        newClip({
          text: "This is in VoxClip Plus.",
          secondary: "Seven days to try it.",
          animation: "letter-fade",
          seconds: 3,
          elements: [el("badge-plus", 0.5, 0.74, { tone: "ink", delay: 0.2 })],
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-install",
    name: "Launch: installed in thirty seconds",
    intent:
      "Including the warning from the operating system, because it comes and it scares people off.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "Download it and open it.",
          animation: "fade-rise",
          seconds: 4,
          note: "Record: the download and the first launch. Keep it short.",
        }),
        newClip({
          text: "You will get a warning.",
          secondary: "It means unverified developer, not harmful.",
          animation: "wipe-up",
          seconds: 4.5,
          theme: "ink",
          note: "Record: the real Gatekeeper or SmartScreen screen, and how you get past it. Do not hide this. It is the reason people give up.",
        }),
        newClip({
          text: "Signing is on the list.",
          animation: "letter-fade",
          seconds: 2.5,
        }),
        closer(s),
      ]),
  },
  {
    slug: "launch-one-feature",
    name: "Launch: one feature, one minute",
    intent:
      "The format you can repeat twenty times. One thing per video, never two.",
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
          note: "Record: that one feature, start to finish, no cuts. Six seconds is long enough to follow and short enough to keep watching.",
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
    name: "Launch: square, for the feed",
    intent:
      "The same message in 1:1 for Instagram and LinkedIn. Works with the sound off.",
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

/**
 * Explainers that need no footage at all.
 *
 * There is a line here worth naming. A video that looks like a recording of
 * VoxClip but is not one is a claim about the product, and if someone downloads
 * on the strength of it and finds something else, you spent their trust at the
 * only moment it mattered.
 *
 * These stay on the safe side of that line on purpose: shapes, keys and rules,
 * never a rebuilt interface. Anyone can see it is a diagram. Nobody feels
 * misled later. And it still shows what happens, which is the part that was
 * actually being asked for.
 *
 * They exist so you have something to post this week. They are not a substitute
 * for the four seconds of real recording, and the day that exists these move to
 * second place.
 */
export const EXPLAINER_STARTERS: Starter[] = [
  {
    slug: "explain-two-keys",
    name: "Explainer: two keys, no footage",
    intent:
      "Shows the idea with shapes rather than the app. Postable today, without a screen recording.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "You copy something.",
          animation: "fade-rise",
          seconds: 2,
          elements: [el("chips-copied", 0.5, 0.68, { tone: "ink", delay: 0.2 })],
        }),
        newClip({
          text: "Then something else.",
          secondary: "The first one is gone.",
          animation: "stack",
          seconds: 3,
          theme: "ink",
          elements: [
            el("chips-copied", 0.42, 0.66, { tone: "paper", delay: 0.1 }),
            el("cross", 0.68, 0.66, { tone: "paper", delay: 0.5 }),
          ],
        }),
        newClip({
          text: "Two keys.",
          animation: "spotlight",
          seconds: 2.5,
          size: "l",
          elements: [
            el("key-1", 0.38, 0.72, { tone: "ink", delay: 0.15 }),
            el("key-wide", 0.62, 0.72, { tone: "teal", delay: 0.3 }),
          ],
        }),
        newClip({
          text: "It is back.",
          animation: "letter-fade",
          seconds: 2.5,
          size: "l",
          elements: [
            el("tick", 0.5, 0.68, { tone: "teal", delay: 0.2 }),
          ],
        }),
        closer(s),
      ]),
  },
  {
    slug: "explain-one-timeline",
    name: "Explainer: two habits, one timeline",
    intent:
      "The wedge as a diagram. Two streams that turn out to be one. No footage needed.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "What you copy.",
          animation: "fade-rise",
          seconds: 2.5,
          elements: [el("chips-copied", 0.5, 0.66, { tone: "ink", delay: 0.2 })],
        }),
        newClip({
          text: "What you say.",
          animation: "fade-rise",
          seconds: 2.5,
          elements: [el("waveform-wide", 0.5, 0.66, { tone: "ink", delay: 0.2 })],
        }),
        newClip({
          text: "Same habit.",
          secondary: "It crossed your screen and you will want it back.",
          animation: "wipe-up",
          seconds: 3.5,
          theme: "ink",
        }),
        newClip({
          text: "So it goes in one place.",
          animation: "spotlight",
          seconds: 3,
          elements: [
            el("rule-thick", 0.5, 0.62, { tone: "teal", delay: 0.2 }),
            el("bracket-left", 0.28, 0.72, { tone: "ink", delay: 0.4 }),
            el("bracket-right", 0.72, 0.72, { tone: "ink", delay: 0.4 }),
          ],
        }),
        closer(s),
      ]),
  },
  {
    slug: "explain-stays-here",
    name: "Explainer: it stays here",
    intent:
      "Privacy as a diagram: one machine, nothing leaving it. The strongest first video, and it needs no recording.",
    build: (s) =>
      project("9:16", [
        newClip({
          text: "It keeps everything you copy.",
          animation: "stack",
          seconds: 3,
          theme: "ink",
          elements: [el("frame-window", 0.5, 0.64, { tone: "paper", delay: 0.2 })],
        }),
        newClip({
          text: "So where does it go?",
          animation: "typeline",
          seconds: 2.5,
          theme: "ink",
          elements: [
            el("arrow-right", 0.7, 0.64, { tone: "paper", delay: 0.3 }),
          ],
        }),
        newClip({
          text: "Nowhere.",
          animation: "spotlight",
          seconds: 3,
          size: "l",
          elements: [
            el("frame-window", 0.5, 0.66, { tone: "ink", delay: 0.1 }),
            el("circle-highlight", 0.5, 0.66, { tone: "teal", delay: 0.4 }),
          ],
        }),
        newClip({
          text: "It stays on your machine.",
          animation: "letter-fade",
          seconds: 3,
        }),
        closer(s),
      ]),
  },
];
