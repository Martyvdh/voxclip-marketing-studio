/**
 * The VoxClip house formats.
 *
 * Ten, not a hundred and fifty. The prototype's twelve style families were six
 * real jobs times a decorative variation, so this keeps the jobs and moves the
 * decoration inside them. Each one is a reusable campaign system: it says what
 * evidence it needs, what to shoot, and what it may not claim.
 */

import type { Channel } from "@/db/schema";

export interface HouseFormatSeed {
  slug: string;
  name: string;
  intent: string;
  channels: Channel[];
  aspectRatios: string[];
  hookGuidance: string;
  evidenceNeeded: string;
  shotList: { step: number; shot: string; seconds: number }[];
  subtitleRule: string;
  audioRule: string;
  thumbnailRule: string;
  ctaRule: string;
  a11yRule: string;
}

const VERTICAL: Channel[] = ["TIKTOK", "INSTAGRAM_REELS", "YOUTUBE_SHORTS"];

const BURNED_IN =
  "Burned-in subtitles, sentence case, at most six words a line, inside the safe area.";
const NO_VOICEOVER =
  "Readable without sound. Music stays under the voice and never above it. No stock drama.";
const ONE_CTA =
  "One call to action, at the end, tagged with the campaign code. Never mid-video.";
const A11Y =
  "Alt text describes what the screen shows, not the mood. Contrast passes AA. Teal stays one element.";

export const HOUSE_FORMATS: HouseFormatSeed[] = [
  {
    slug: "capture-to-recall",
    name: "Capture to recall",
    intent:
      "Show the whole product in one take: something is copied, something is said, and the right one comes back where the cursor is.",
    channels: [...VERTICAL, "LINKEDIN"],
    aspectRatios: ["9:16", "1:1"],
    hookGuidance:
      "Open on the moment of loss, not on the product. The viewer should recognise the problem before they see any UI.",
    evidenceNeeded:
      "A real screen recording of the shipping app. No mock-up, no rebuilt interface.",
    shotList: [
      { step: 1, shot: "Copy three different things in quick succession", seconds: 4 },
      { step: 2, shot: "Dictate one short note", seconds: 3 },
      { step: 3, shot: "Open the Timeline and search", seconds: 4 },
      { step: 4, shot: "Paste the right one into the document", seconds: 3 },
      { step: 5, shot: "End card with the payoff line", seconds: 2 },
    ],
    subtitleRule: BURNED_IN,
    audioRule: NO_VOICEOVER,
    thumbnailRule: "The Timeline mid-search, legible at thumbnail size.",
    ctaRule: ONE_CTA,
    a11yRule: A11Y,
  },
  {
    slug: "dictation-to-cursor",
    name: "Dictation to cursor",
    intent:
      "Prove that speaking lands in the same place as copying, and that the audio never leaves the machine.",
    channels: [...VERTICAL, "LINKEDIN"],
    aspectRatios: ["9:16"],
    hookGuidance:
      "Start mid-sentence, already speaking. The viewer sees the words appear before they know what the app is.",
    evidenceNeeded:
      "A real recording with the local dictation model enabled. A development build with the mock must never be used.",
    shotList: [
      { step: 1, shot: "Speak a sentence, words appear", seconds: 5 },
      { step: 2, shot: "It lands in the Timeline next to a copied item", seconds: 4 },
      { step: 3, shot: "Recall and paste at the cursor", seconds: 4 },
      { step: 4, shot: "End card: the audio stayed on the device", seconds: 3 },
    ],
    subtitleRule: BURNED_IN,
    audioRule:
      "The spoken line is the audio. No music over the dictation itself, or the proof is lost.",
    thumbnailRule: "Mid-sentence, with the transcribed words visible.",
    ctaRule: ONE_CTA,
    a11yRule: A11Y,
  },
  {
    slug: "one-frustration-one-resolution",
    name: "One frustration, one calm resolution",
    intent:
      "Name a single small daily annoyance and resolve it once. No list, no montage.",
    channels: [...VERTICAL, "LINKEDIN", "X", "THREADS"],
    aspectRatios: ["9:16", "1:1"],
    hookGuidance:
      "The first line is the frustration in the viewer's own words. If it needs explaining, it is the wrong frustration.",
    evidenceNeeded: "A real screenshot or recording of the step that resolves it.",
    shotList: [
      { step: 1, shot: "The frustration, stated plainly", seconds: 3 },
      { step: 2, shot: "The single action that ends it", seconds: 5 },
      { step: 3, shot: "The calm after", seconds: 3 },
    ],
    subtitleRule: BURNED_IN,
    audioRule: NO_VOICEOVER,
    thumbnailRule: "The frustration as text, no product yet.",
    ctaRule: ONE_CTA,
    a11yRule: A11Y,
  },
  {
    slug: "before-and-after-workflow",
    name: "Before and after workflow",
    intent:
      "Show the same task done the old way and the VoxClip way, at the same speed, without exaggerating either.",
    channels: [...VERTICAL, "LINKEDIN"],
    aspectRatios: ["9:16", "16:9"],
    hookGuidance: "State the task first. The comparison means nothing without it.",
    evidenceNeeded:
      "Both halves recorded for real. The before half may not be slowed down or fumbled on purpose.",
    shotList: [
      { step: 1, shot: "The task, named", seconds: 2 },
      { step: 2, shot: "Before: the honest old way", seconds: 6 },
      { step: 3, shot: "After: the same task in VoxClip", seconds: 5 },
      { step: 4, shot: "End card, no gloating", seconds: 2 },
    ],
    subtitleRule: BURNED_IN,
    audioRule: NO_VOICEOVER,
    thumbnailRule: "Split frame, both halves legible.",
    ctaRule: ONE_CTA,
    a11yRule: A11Y,
  },
  {
    slug: "feature-proof",
    name: "Feature proof with real product UI",
    intent: "One feature, shown working, with nothing claimed beyond what is on screen.",
    channels: [...VERTICAL, "LINKEDIN", "BLOG"],
    aspectRatios: ["9:16", "16:9"],
    hookGuidance:
      "Name the feature in plain words. Not the internal name, the thing it does.",
    evidenceNeeded:
      "A real capture, tagged with the app version it shows, so it can be retired when the UI changes.",
    shotList: [
      { step: 1, shot: "The feature named", seconds: 2 },
      { step: 2, shot: "It working, uncut", seconds: 8 },
      { step: 3, shot: "What that means for the day", seconds: 3 },
    ],
    subtitleRule: BURNED_IN,
    audioRule: NO_VOICEOVER,
    thumbnailRule: "The feature mid-action.",
    ctaRule: ONE_CTA,
    a11yRule: A11Y,
  },
  {
    slug: "local-first-explainer",
    name: "Local-first explanation",
    intent:
      "Explain plainly what stays on the device and what does not, and say when something is sent.",
    channels: [...VERTICAL, "LINKEDIN", "BLOG", "EMAIL"],
    aspectRatios: ["9:16", "16:9"],
    hookGuidance:
      "Ask the question the viewer already has: where does this go. Then answer it in one line.",
    evidenceNeeded:
      "The privacy claims come from Product Truth verbatim. Nothing paraphrased, nothing softened.",
    shotList: [
      { step: 1, shot: "The question", seconds: 3 },
      { step: 2, shot: "What is on the device", seconds: 5 },
      { step: 3, shot: "What a paid cloud feature sends, and when it says so", seconds: 5 },
      { step: 4, shot: "The freemium line, verbatim", seconds: 3 },
    ],
    subtitleRule: BURNED_IN,
    audioRule: NO_VOICEOVER,
    thumbnailRule: "Plain text. No padlocks, no shields, no surveillance imagery.",
    ctaRule: ONE_CTA,
    a11yRule: A11Y,
  },
  {
    slug: "persona-use-case",
    name: "Persona use case",
    intent: "One named audience, one real hour of their day, one place VoxClip fits.",
    channels: ["LINKEDIN", "BLOG", "EMAIL", ...VERTICAL],
    aspectRatios: ["9:16", "1:1"],
    hookGuidance:
      "Open inside their work, not with their job title. Nobody recognises themselves in a segment.",
    evidenceNeeded:
      "Real work shown on screen. Invented client names are fine; invented people saying things are not.",
    shotList: [
      { step: 1, shot: "The moment in their day", seconds: 4 },
      { step: 2, shot: "Where it currently breaks", seconds: 4 },
      { step: 3, shot: "The same moment with VoxClip", seconds: 5 },
    ],
    subtitleRule: BURNED_IN,
    audioRule: NO_VOICEOVER,
    thumbnailRule: "Their screen, not a stock person at a desk.",
    ctaRule: ONE_CTA,
    a11yRule: A11Y,
  },
  {
    slug: "release-note",
    name: "Release note or improvement",
    intent: "Say what changed in this version, in the words of someone who will notice.",
    channels: ["LINKEDIN", "BLOG", "EMAIL", "X"],
    aspectRatios: ["1:1", "16:9"],
    hookGuidance: "Lead with what is now possible, not with the version number.",
    evidenceNeeded:
      "The version must be verified in Product Truth. While it is unverified, this format cannot ship.",
    shotList: [
      { step: 1, shot: "What is different", seconds: 3 },
      { step: 2, shot: "It working", seconds: 6 },
      { step: 3, shot: "Where to get it", seconds: 2 },
    ],
    subtitleRule: BURNED_IN,
    audioRule: NO_VOICEOVER,
    thumbnailRule: "The change itself, on screen.",
    ctaRule: ONE_CTA,
    a11yRule: A11Y,
  },
  {
    slug: "category-education",
    name: "Category education",
    intent:
      "Explain why clipboard history and dictation belong together, without ranking anyone.",
    channels: ["LINKEDIN", "BLOG", "X", "THREADS"],
    aspectRatios: ["1:1", "16:9"],
    hookGuidance:
      "Start from the habit, not the category. People do not think of themselves as clipboard users.",
    evidenceNeeded:
      "No competitor claim without a dated source. No superlatives about us either.",
    shotList: [
      { step: 1, shot: "The habit, described", seconds: 4 },
      { step: 2, shot: "Why it is split across two tools today", seconds: 5 },
      { step: 3, shot: "What one Timeline changes", seconds: 5 },
    ],
    subtitleRule: BURNED_IN,
    audioRule: NO_VOICEOVER,
    thumbnailRule: "One clear sentence.",
    ctaRule: ONE_CTA,
    a11yRule: A11Y,
  },
  {
    slug: "learn-article-distillation",
    name: "Learn article distillation",
    intent:
      "Take one published Learn article and give away its most useful part, so the click is earned.",
    channels: ["LINKEDIN", "X", "THREADS", "EMAIL", ...VERTICAL],
    aspectRatios: ["9:16", "1:1"],
    hookGuidance:
      "Give the answer away in the first line. Withholding it to force a click is the tactic we do not use.",
    evidenceNeeded: "The article has to be published first. Link to the real URL, tagged.",
    shotList: [
      { step: 1, shot: "The useful part, stated", seconds: 4 },
      { step: 2, shot: "Why it works", seconds: 5 },
      { step: 3, shot: "Where the rest is", seconds: 2 },
    ],
    subtitleRule: BURNED_IN,
    audioRule: NO_VOICEOVER,
    thumbnailRule: "The useful sentence, set large.",
    ctaRule: ONE_CTA,
    a11yRule: A11Y,
  },
];
