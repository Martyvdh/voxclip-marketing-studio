/**
 * Slugs, campaign codes, and tagged links.
 *
 * Attribution is built here rather than typed by hand. A link that leaves this
 * module already carries utm_source, utm_medium, and the campaign code, so it
 * passes the quality gate by construction instead of by somebody remembering.
 *
 * Pure functions. No clock of their own, no database.
 */

import type { Channel } from "@/db/schema";

const MAX_SLUG_LENGTH = 60;

export function slugify(title: string): string {
  const slug = title
    .normalize("NFD")
    // Strip combining accents so "Één" becomes "Een" rather than disappearing.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  if (slug.length === 0) {
    throw new Error(
      "That title has no letters or numbers in it, so there is nothing to build a link from. Give the campaign a title a person could read.",
    );
  }

  return slug;
}

/** The attribution identity. Stable for the life of the campaign. */
export function buildCampaignCode(title: string, now: Date): string {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${slugify(title)}-${yy}${mm}`;
}

/** Campaign codes are unique. When one is taken, count up rather than randomise. */
export function nextAvailableCode(code: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(code)) return code;

  let n = 2;
  while (used.has(`${code}-${n}`)) n += 1;
  return `${code}-${n}`;
}

/** The utm_source each platform reports itself as. */
const SOURCE: Record<Channel, string> = {
  TIKTOK: "tiktok",
  INSTAGRAM_REELS: "instagram",
  YOUTUBE_SHORTS: "youtube",
  YOUTUBE_LONG: "youtube",
  LINKEDIN: "linkedin",
  X: "x",
  THREADS: "threads",
  FACEBOOK: "facebook",
  BLOG: "blog",
  EMAIL: "email",
  REDDIT: "reddit",
  PRODUCT_HUNT: "producthunt",
  HACKER_NEWS: "hackernews",
};

const MEDIUM: Partial<Record<Channel, string>> = {
  EMAIL: "email",
  BLOG: "referral",
};

export function utmSourceFor(channel: Channel): string {
  return SOURCE[channel];
}

export function utmMediumFor(channel: Channel): string {
  return MEDIUM[channel] ?? "social";
}

/** Short, stable prefixes so a variant code reads at a glance in a report. */
const CHANNEL_PREFIX: Record<Channel, string> = {
  TIKTOK: "tt",
  INSTAGRAM_REELS: "ig",
  YOUTUBE_SHORTS: "yts",
  YOUTUBE_LONG: "yt",
  LINKEDIN: "li",
  X: "x",
  THREADS: "th",
  FACEBOOK: "fb",
  BLOG: "blog",
  EMAIL: "mail",
  REDDIT: "rd",
  PRODUCT_HUNT: "ph",
  HACKER_NEWS: "hn",
};

/** e.g. ("LINKEDIN", 0) becomes "li-a". Unique within one campaign. */
export function variantCodeFor(channel: Channel, index: number): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const suffix =
    index < letters.length
      ? letters[index]
      : `${letters[index % letters.length]}${Math.floor(index / letters.length) + 1}`;
  return `${CHANNEL_PREFIX[channel]}-${suffix}`;
}

export interface TaggedUrlInput {
  /** e.g. "https://voxclip.it". Comes from the environment, never hard-coded. */
  siteUrl: string;
  /** A path on our own site, e.g. "/download" or "/download?os=mac". */
  path: string;
  channel: Channel;
  campaignCode: string;
  variantCode?: string;
}

export function buildTaggedUrl(input: TaggedUrlInput): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input.path)) {
    throw new Error(
      "A campaign path has to be a path on our own site, such as /download. Give the path, not a full URL, so the link cannot quietly point somewhere else.",
    );
  }

  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const url = new URL(path, input.siteUrl);

  url.searchParams.set("utm_source", utmSourceFor(input.channel));
  url.searchParams.set("utm_medium", utmMediumFor(input.channel));
  url.searchParams.set("utm_campaign", input.campaignCode);
  if (input.variantCode) {
    url.searchParams.set("utm_content", input.variantCode);
  }

  return url.toString();
}
