/**
 * One concept becomes a draft per channel.
 *
 * This replaces the prototype's per-channel script functions. The difference is
 * not the wording, it is where the wording comes from: a campaign brief, a
 * pillar, and one hook, rather than a template picked at random. Every draft
 * carries the same campaign identity and the same tagged link.
 *
 * Pure. No database, no clock, no network. What comes out has to pass the
 * quality gate, and there is a test that proves it for every channel.
 */

import type { Channel, Pillar } from "@/db/schema";
import { buildTaggedUrl } from "@/lib/campaign/codes";

export interface DraftBrief {
  problem: string;
  desiredOutcome: string;
  promise: string;
  proof: string;
  offer: string;
  primaryCta: string;
  ctaPath: string;
}

export interface DraftPillarDefault {
  headline: string;
  subhead: string;
  payoff: string;
}

export interface DraftFormat {
  slug: string;
  name: string;
  ctaRule: string;
}

export interface DraftInput {
  channel: Channel;
  campaignCode: string;
  variantCode: string;
  siteUrl: string;
  pillar: Pillar;
  hook: string;
  brief: DraftBrief;
  pillarDefault: DraftPillarDefault;
  format: DraftFormat;
}

export interface Draft {
  title?: string;
  body: string;
  hashtags: string[];
  ctaLabel: string;
  ctaUrl: string;
  /** True when this channel's draft is not publishable without real proof. */
  needsAsset: boolean;
  /** What the drafter changed on the way in, so nothing is silent. */
  notes: string[];
}

/**
 * Public copy carries no em dash and no en dash. Source material still does,
 * so it is converted here rather than left for the gate to reject. Typography
 * is not a claim, so fixing it is not the same as rewriting a fact.
 */
export function normaliseDashes(text: string): string {
  return text
    .replace(/\s*[—–―]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Anything that reads as a keystroke, removed while the fact is unverified. */
function stripHotkeys(text: string): { text: string; removed: boolean } {
  const pattern = /\s*\(?\b(?:ctrl|cmd|command|alt|option|shift)\s*\+\s*\S+\)?|[⌘⇧⌥⌃]\S*/gi;
  if (!pattern.test(text)) return { text, removed: false };
  return { text: text.replace(pattern, "").replace(/\s{2,}/g, " ").trim(), removed: true };
}

const HASHTAG_CHANNELS: Channel[] = [
  "TIKTOK",
  "INSTAGRAM_REELS",
  "YOUTUBE_SHORTS",
  "THREADS",
];

const ASSET_CHANNELS: Channel[] = [
  "TIKTOK",
  "INSTAGRAM_REELS",
  "YOUTUBE_SHORTS",
  "YOUTUBE_LONG",
];

/** Kept deliberately short. More tags is not more reach, it is more noise. */
const TAGS_BY_PILLAR: Record<Pillar, string[]> = {
  P1_ONE_PLACE: ["#VoxClip", "#productivity"],
  P2_INSTANT_RECALL: ["#VoxClip", "#workflow"],
  P3_YOUR_STUFF_STAYS_YOURS: ["#VoxClip", "#privacy"],
  P4_FREE_WHERE_LOCAL: ["#VoxClip", "#freetools"],
};

/** How much room the body has, leaving space for the link. */
const BODY_BUDGET: Partial<Record<Channel, number>> = {
  X: 200,
  THREADS: 380,
  TIKTOK: 400,
  INSTAGRAM_REELS: 400,
  YOUTUBE_SHORTS: 400,
  LINKEDIN: 1200,
};

function sentences(...parts: (string | undefined)[]): string[] {
  return parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => {
      const clean = normaliseDashes(p);
      return /[.!?]$/.test(clean) ? clean : `${clean}.`;
    });
}

/** Trims whole sentences rather than cutting a word in half. */
function fitTo(parts: string[], budget: number | undefined): string {
  if (!budget) return parts.join("\n\n");

  const kept: string[] = [];
  let length = 0;
  for (const part of parts) {
    const added = length === 0 ? part.length : part.length + 1;
    if (length + added > budget) break;
    kept.push(part);
    length += added;
  }
  if (kept.length === 0) kept.push(parts[0].slice(0, budget));
  return kept.join(" ");
}

export function draftVariant(input: DraftInput): Draft {
  const notes: string[] = [];

  const rawHook = input.hook;
  const hook = normaliseDashes(rawHook);
  if (hook !== rawHook.trim()) {
    notes.push("Replaced a dash in the hook, because public copy carries none.");
  }

  const hookResult = stripHotkeys(hook);
  if (hookResult.removed) {
    notes.push(
      "Removed a keystroke from the hook. The shortcut fact is not verified against the shipping build yet.",
    );
  }

  const ctaUrl = buildTaggedUrl({
    siteUrl: input.siteUrl,
    path: input.brief.ctaPath,
    channel: input.channel,
    campaignCode: input.campaignCode,
    variantCode: input.variantCode,
  });

  const isLong = input.channel === "LINKEDIN" || input.channel === "BLOG";
  const isEmail = input.channel === "EMAIL";

  const parts = isLong
    ? sentences(
        hookResult.text,
        input.brief.problem,
        input.brief.promise,
        input.brief.desiredOutcome,
        input.pillarDefault.payoff,
        input.brief.offer,
      )
    : isEmail
      ? sentences(
          hookResult.text,
          input.brief.promise,
          input.brief.desiredOutcome,
          input.brief.offer,
        )
      : sentences(hookResult.text, input.brief.promise, input.pillarDefault.payoff);

  const body = fitTo(parts, BODY_BUDGET[input.channel]);

  const hashtags = HASHTAG_CHANNELS.includes(input.channel)
    ? Array.from(new Set(TAGS_BY_PILLAR[input.pillar]))
    : [];

  const title =
    input.channel === "BLOG" || isEmail
      ? normaliseDashes(input.pillarDefault.headline)
      : undefined;

  return {
    title,
    body,
    hashtags,
    ctaLabel: normaliseDashes(input.brief.primaryCta),
    ctaUrl,
    needsAsset: ASSET_CHANNELS.includes(input.channel),
    notes,
  };
}
