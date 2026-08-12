/**
 * The handoff package.
 *
 * No platform lets us post without an approved API integration, and pretending
 * otherwise is the thing this system exists not to do. So instead of a fake
 * publish button: everything laid out ready to paste, in the order the platform
 * asks for it, with the things that platform gets wrong called out.
 *
 * Pure. The page renders what this returns.
 */

import type { Channel } from "@/db/schema";

export interface ChannelGuide {
  channel: Channel;
  name: string;
  /** Where the link goes on this platform. They all differ. */
  linkPlacement: string;
  /** True when a link in the caption is clickable. */
  linkInCaption: boolean;
  captionLimit: number | null;
  /** What to check before pressing post, in this platform's own terms. */
  checklist: string[];
}

const VERTICAL_CHECKS = [
  "The first two seconds hold up without sound.",
  "Subtitles sit inside the safe area, clear of the caption and the buttons.",
  "The video is 9:16 and the thumbnail is legible at thumbnail size.",
];

export const CHANNEL_GUIDES: ChannelGuide[] = [
  {
    channel: "TIKTOK",
    name: "TikTok",
    linkPlacement: "TikTok captions are not clickable. Put the link in your bio and say so on screen.",
    linkInCaption: false,
    captionLimit: 2200,
    checklist: [...VERTICAL_CHECKS, "The bio link points at the tagged URL."],
  },
  {
    channel: "INSTAGRAM_REELS",
    name: "Instagram Reels",
    linkPlacement: "Captions are not clickable. Link in bio, and mention it in the caption.",
    linkInCaption: false,
    captionLimit: 2200,
    checklist: [...VERTICAL_CHECKS, "The bio link points at the tagged URL."],
  },
  {
    channel: "YOUTUBE_SHORTS",
    name: "YouTube Shorts",
    linkPlacement: "The description takes a clickable link. Put it on the first line.",
    linkInCaption: true,
    captionLimit: 5000,
    checklist: [...VERTICAL_CHECKS, "The title reads on its own in a feed."],
  },
  {
    channel: "YOUTUBE_LONG",
    name: "YouTube",
    linkPlacement: "The description takes a clickable link. Put it above the fold.",
    linkInCaption: true,
    captionLimit: 5000,
    checklist: [
      "The thumbnail is made on purpose, not a grabbed frame.",
      "Chapters are set if the video is longer than three minutes.",
      "Subtitles are uploaded or auto-captions are corrected.",
    ],
  },
  {
    channel: "LINKEDIN",
    name: "LinkedIn",
    linkPlacement: "A link in the post works. Putting it in the first comment is a myth people repeat; do what reads better.",
    linkInCaption: true,
    captionLimit: 3000,
    checklist: [
      "The first line stands alone, because the rest is hidden behind see more.",
      "It reads as a person talking, not a company announcing.",
      "Any image has alt text set in the LinkedIn composer.",
    ],
  },
  {
    channel: "X",
    name: "X",
    linkPlacement: "A link in the post is clickable and counts toward the limit.",
    linkInCaption: true,
    captionLimit: 280,
    checklist: [
      "It fits without the last word being cut.",
      "It makes sense without the link.",
      "Any image has alt text.",
    ],
  },
  {
    channel: "THREADS",
    name: "Threads",
    linkPlacement: "A link in the post is clickable.",
    linkInCaption: true,
    captionLimit: 500,
    checklist: [
      "It fits in one post rather than a thread.",
      "Any image has alt text.",
      "It does not read like a cross-post from somewhere else.",
    ],
  },
  {
    channel: "FACEBOOK",
    name: "Facebook",
    linkPlacement: "A link in the post is clickable and pulls a preview.",
    linkInCaption: true,
    captionLimit: 63206,
    checklist: [
      "The link preview shows the right image and title.",
      "The first line works before the fold.",
      "Any image has alt text.",
    ],
  },
  {
    channel: "BLOG",
    name: "Blog and Learn",
    linkPlacement: "Links go in the body, where they help. One is the tagged call to action.",
    linkInCaption: true,
    captionLimit: null,
    checklist: [
      "Title, description, slug, author, and date are all set.",
      "Every image has alt text.",
      "The tagged call to action appears once, not three times.",
    ],
  },
  {
    channel: "EMAIL",
    name: "Email",
    linkPlacement: "The tagged link goes on the button and nowhere else.",
    linkInCaption: true,
    captionLimit: null,
    checklist: [
      "The subject line makes sense in a crowded inbox.",
      "There is an unsubscribe link and it works.",
      "It reads in plain text, not only in HTML.",
    ],
  },
  {
    channel: "REDDIT",
    name: "Reddit",
    linkPlacement: "Read the subreddit's rules on links first. Many forbid them outright.",
    linkInCaption: true,
    captionLimit: 40000,
    checklist: [
      "You have read that subreddit's rules, this week.",
      "You are answering a real conversation, not dropping a post.",
      "You say you made it, without being asked.",
    ],
  },
  {
    channel: "PRODUCT_HUNT",
    name: "Product Hunt",
    linkPlacement: "The link is the listing itself.",
    linkInCaption: true,
    captionLimit: 260,
    checklist: [
      "Tagline is under sixty characters.",
      "The maker's first comment is written and ready.",
      "No bought upvotes. Product Hunt punishes it and it is a lie.",
    ],
  },
  {
    channel: "HACKER_NEWS",
    name: "Hacker News",
    linkPlacement: "The link is the submission. No marketing copy in the title.",
    linkInCaption: false,
    captionLimit: 80,
    checklist: [
      "The title is plain and factual. No adjectives.",
      "You are around to answer for the next few hours.",
      "You are not asking anyone for upvotes.",
    ],
  },
];

export function guideFor(channel: Channel): ChannelGuide {
  return (
    CHANNEL_GUIDES.find((g) => g.channel === channel) ??
    CHANNEL_GUIDES.find((g) => g.channel === "BLOG")!
  );
}

export interface HandoffVariant {
  channel: Channel;
  code: string;
  title: string | null;
  body: string;
  hashtags: string[];
  ctaLabel: string | null;
  ctaUrl: string | null;
  altText: string | null;
  hasMedia: boolean;
}

export interface HandoffField {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

export interface Handoff {
  guide: ChannelGuide;
  fields: HandoffField[];
  captionLength: number;
  warnings: string[];
}

export function buildHandoff(variant: HandoffVariant): Handoff {
  const guide = guideFor(variant.channel);
  const fields: HandoffField[] = [];
  const warnings: string[] = [];

  if (variant.title?.trim()) {
    fields.push({
      id: "title",
      label: guide.channel === "EMAIL" ? "Subject" : "Title",
      value: variant.title.trim(),
    });
  }

  const captionParts = [variant.body.trim()];
  if (guide.linkInCaption && variant.ctaUrl) {
    captionParts.push(
      variant.ctaLabel ? `${variant.ctaLabel}: ${variant.ctaUrl}` : variant.ctaUrl,
    );
  }
  if (variant.hashtags.length > 0) {
    captionParts.push(variant.hashtags.join(" "));
  }

  const caption = captionParts.join("\n\n");
  fields.push({
    id: "caption",
    label: guide.channel === "BLOG" ? "Body" : "Caption",
    value: caption,
    hint: guide.captionLimit
      ? `${caption.length} of ${guide.captionLimit} characters`
      : undefined,
  });

  if (!guide.linkInCaption && variant.ctaUrl) {
    fields.push({
      id: "link",
      label: "Tagged link",
      value: variant.ctaUrl,
      hint: guide.linkPlacement,
    });
  }

  if (variant.altText?.trim()) {
    fields.push({ id: "alt", label: "Alt text", value: variant.altText.trim() });
  }

  if (guide.captionLimit && caption.length > guide.captionLimit) {
    warnings.push(
      `The caption is ${caption.length} characters and ${guide.name} takes ${guide.captionLimit}. Cut ${caption.length - guide.captionLimit} before posting.`,
    );
  }

  if (variant.hasMedia && !variant.altText?.trim()) {
    warnings.push(
      "There is media but no alt text. Write one plain sentence describing what it shows.",
    );
  }

  if (!variant.ctaUrl) {
    warnings.push(
      "There is no tagged link, so nothing this post brings in can be traced back to it.",
    );
  }

  return { guide, fields, captionLength: caption.length, warnings };
}
