/**
 * The deterministic quality gate.
 *
 * Every public-facing asset passes through here before it can be approved,
 * scheduled, or published. The gate blocks; it never silently rewrites. When a
 * claim contradicts Product Truth the operator is shown the exact fact and has
 * to make a deliberate revision.
 *
 * Pure functions only. No database, no clock, no network. Everything the rules
 * need arrives in the GateContext, so a stored run can always be reproduced.
 */

import type { Channel } from "@/db/schema";
import type { Finding, GateContext, GateResult, PublicAsset } from "./types";

export type * from "./types";

export const RULE_SET_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Rule data
// ---------------------------------------------------------------------------

/** Words the brand book bans outright. */
const HYPE_WORDS = [
  "game[- ]?changing",
  "game[- ]?changer",
  "supercharge",
  "revolutionary",
  "seamless",
  "leverage",
  "synergy",
  "unleash",
  "effortless",
  "blazing[- ]fast",
  "next[- ]level",
  "cutting[- ]edge",
  "disrupt",
  "10x",
  "mind[- ]blowing",
];

/** Everything cut from v1. Marketing may not imply any of it. */
const CUT_LIST: { pattern: RegExp; what: string }[] = [
  { pattern: /\blinux\b/i, what: "Linux" },
  { pattern: /\bandroid\b/i, what: "Android" },
  { pattern: /\b(iphone|ipad|ios app|on mobile|mobile app)\b/i, what: "mobile" },
  {
    pattern: /\b(browser|chrome|safari|firefox|edge) extension\b/i,
    what: "a browser extension",
  },
  {
    pattern: /\b(your|the) team\b|\bteams\b|\bcollaborat(e|ion|ing)\b|\bshared workspace\b/i,
    what: "teams, sharing, or collaboration",
  },
  {
    pattern: /\btranscri(be|ption|bing)\b|\bmeeting notes\b|\bdiariz/i,
    what: "meeting transcription",
  },
  {
    pattern: /\b(notion|slack|zapier) integration\b|\bplugins?\b|\bautomation workflows?\b/i,
    what: "plugins or third-party integrations",
  },
];

/** Superlatives that need a cited, dated source. */
const SUPERLATIVES =
  /\bthe (fastest|best|most \w+|leading|number one|#1)\b|\bworld'?s (fastest|best|leading)\b|\bthe only (app|tool|way)\b/i;

/** A quoted sentence with an attribution reads as a testimonial. */
const TESTIMONIAL =
  /["“][^"”]{15,}["”]\s*[,.]?\s*(says|said|according to|-{1,2}|—)\s*[A-Z]/;

/** Social proof numbers we cannot back up. */
const SOCIAL_PROOF =
  /\b(trusted|loved|used|downloaded) by\s+[\d.,]+\s*\+?|\b[\d.,]{2,}\s*\+\s*(users|people|customers|downloads|installs)\b|\bjoin\s+[\d.,]+\s*\+?\s*(users|people)\b/i;

/** A keystroke stated in copy. */
const HOTKEY_SHAPE =
  /[⌘⇧⌥⌃]|\b(ctrl|cmd|command|alt|option|shift)\s*\+\s*\S/i;

/** Hard channel limits. Anything not listed has no practical limit. */
const LENGTH_LIMITS: Partial<Record<Channel, number>> = {
  X: 280,
  THREADS: 500,
  LINKEDIN: 3000,
  TIKTOK: 2200,
  INSTAGRAM_REELS: 2200,
  YOUTUBE_SHORTS: 5000,
  YOUTUBE_LONG: 5000,
};

const URL_IN_TEXT = /https?:\/\/[^\s)<>"']+/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function excerptAround(text: string, index: number, length = 1): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + length + 30);
  return (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
}

function firstMatch(text: string, pattern: RegExp): RegExpExecArray | null {
  const re = new RegExp(pattern.source, pattern.flags.replace("g", ""));
  return re.exec(text);
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

function normaliseAmount(raw: string): string {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? String(n) : raw;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function brandRules(text: string, findings: Finding[]): void {
  const dash = firstMatch(text, /[—–―]/);
  if (dash) {
    findings.push({
      ruleId: "brand.no-dash",
      severity: "BLOCKER",
      message:
        "Public copy uses no em dash and no en dash. Replace it with a comma, a full stop, or rewrite the sentence.",
      excerpt: excerptAround(text, dash.index, dash[0].length),
    });
  }

  const nameRe = /\bvox[\s]?clip\b/gi;
  let m: RegExpExecArray | null;
  while ((m = nameRe.exec(text)) !== null) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 5);
    const isDomain = /^\.[a-z]{2,}/i.test(after);
    if (isDomain) continue;
    if (m[0] !== "VoxClip") {
      findings.push({
        ruleId: "brand.product-name",
        severity: "BLOCKER",
        message: `The product name is written "VoxClip", one word with a capital V and a capital C. Found "${m[0]}".`,
        excerpt: excerptAround(text, m.index, m[0].length),
      });
      break;
    }
  }

  const hype = firstMatch(text, new RegExp(`\\b(${HYPE_WORDS.join("|")})\\b`, "i"));
  if (hype) {
    findings.push({
      ruleId: "brand.no-hype",
      severity: "BLOCKER",
      message: `"${hype[0]}" is hype vocabulary. Say plainly what happens for the reader instead.`,
      excerpt: excerptAround(text, hype.index, hype[0].length),
    });
  }

  const bang = text.indexOf("!");
  if (bang !== -1) {
    findings.push({
      ruleId: "brand.no-exclamation",
      severity: "BLOCKER",
      message:
        "The brand voice is calm. Drop the exclamation mark and let the sentence carry itself.",
      excerpt: excerptAround(text, bang),
    });
  }

  const lowerTimeline = /\btimeline\b/.exec(text);
  if (lowerTimeline) {
    findings.push({
      ruleId: "brand.feature-name",
      severity: "WARNING",
      message:
        'The Timeline is a proper noun. Write "the Timeline" with a capital T when you mean the feature.',
      excerpt: excerptAround(text, lowerTimeline.index, lowerTimeline[0].length),
    });
  }

  const qpRe = /\bquick[-\s]?picker\b/gi;
  let q: RegExpExecArray | null;
  while ((q = qpRe.exec(text)) !== null) {
    if (q[0] !== "Quick-picker") {
      findings.push({
        ruleId: "brand.feature-name-quickpicker",
        severity: "BLOCKER",
        message: `The feature is called the Quick-picker, hyphenated and capitalised. Found "${q[0]}".`,
        excerpt: excerptAround(text, q.index, q[0].length),
      });
      break;
    }
  }

  const words = text.split(/\s+/).filter((w) => w.length > 3);
  const shouty = words.filter((w) => w === w.toUpperCase() && /[A-Z]{4,}/.test(w));
  if (shouty.length >= 2) {
    findings.push({
      ruleId: "brand.no-all-caps",
      severity: "WARNING",
      message: "Headlines are sentence case, never all caps.",
      excerpt: shouty.slice(0, 3).join(" "),
    });
  }
}

function ctaRules(
  asset: PublicAsset,
  ctx: GateContext,
  text: string,
  findings: Finding[],
): void {
  if (!asset.ctaUrl) {
    findings.push({
      ruleId: "cta.required",
      severity: "BLOCKER",
      message:
        "Every public asset needs exactly one call to action with a tagged link. Add one before asking for review.",
    });
  } else {
    const host = hostOf(asset.ctaUrl);
    if (!host) {
      findings.push({
        ruleId: "cta.unexpected-domain",
        severity: "BLOCKER",
        message: "The call to action link is not a valid URL.",
        excerpt: asset.ctaUrl,
      });
    } else {
      if (!ctx.publicSiteHosts.map((h) => h.toLowerCase()).includes(host)) {
        findings.push({
          ruleId: "cta.unexpected-domain",
          severity: "BLOCKER",
          message: `The call to action points at ${host}, which is not one of our domains. Check the link before this goes out.`,
          excerpt: asset.ctaUrl,
        });
      }

      const params = new URL(asset.ctaUrl).searchParams;
      const campaign = params.get("utm_campaign");
      if (!campaign || !params.get("utm_source") || !params.get("utm_medium")) {
        findings.push({
          ruleId: "cta.untagged",
          severity: "BLOCKER",
          message:
            "The call to action link is not tagged. It needs utm_source, utm_medium, and utm_campaign, or this campaign cannot be measured.",
          excerpt: asset.ctaUrl,
        });
      } else if (asset.campaignCode && campaign !== asset.campaignCode) {
        findings.push({
          ruleId: "cta.wrong-campaign",
          severity: "BLOCKER",
          message: `The link is tagged utm_campaign=${campaign} but this campaign is ${asset.campaignCode}. The results would land on the wrong campaign.`,
          excerpt: asset.ctaUrl,
        });
      } else if (
        asset.variantCode &&
        params.get("utm_content") !== asset.variantCode
      ) {
        findings.push({
          ruleId: "cta.variant-untagged",
          severity: "WARNING",
          message: `Set utm_content=${asset.variantCode} so this variant can be compared with the others.`,
          excerpt: asset.ctaUrl,
        });
      }
    }
  }

  const inBody = Array.from(new Set(text.match(URL_IN_TEXT) ?? []));
  if (inBody.length > 1) {
    findings.push({
      ruleId: "cta.single-destination",
      severity: "BLOCKER",
      message:
        "There is more than one link in the copy. One asset, one destination. Pick the link that matters and remove the rest.",
      excerpt: inBody.join(" "),
    });
  }
}

function hashtagRules(asset: PublicAsset, findings: Finding[]): void {
  const tags = asset.hashtags ?? [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      findings.push({
        ruleId: "hashtags.duplicate",
        severity: "BLOCKER",
        message: `"${tag}" appears twice. Duplicate hashtags read as sloppy and some platforms drop the post.`,
        excerpt: tags.join(" "),
      });
      break;
    }
    seen.add(key);
  }

  const malformed = tags.filter((t) => !/^#[A-Za-z0-9_]+$/.test(t));
  if (malformed.length > 0) {
    findings.push({
      ruleId: "hashtags.malformed",
      severity: "BLOCKER",
      message: `A hashtag must start with # and contain only letters, numbers, and underscores. Fix: ${malformed.join(", ")}.`,
      excerpt: malformed.join(" "),
    });
  }
}

function accessibilityRules(asset: PublicAsset, findings: Finding[]): void {
  if (asset.hasMedia && !asset.altText?.trim()) {
    findings.push({
      ruleId: "a11y.alt-text",
      severity: "BLOCKER",
      message:
        "This asset has media but no alt text. Describe what the image or video shows, in one plain sentence.",
    });
  }
}

function productTruthRules(
  text: string,
  ctx: GateContext,
  findings: Finding[],
): void {
  // Prices stated in copy must match a verified pricing claim.
  const priceRe = /€\s?(\d+(?:[.,]\d{1,2})?)/g;
  const pricing = ctx.claims.filter(
    (c) => c.kind === "PRICING" && c.status === "VERIFIED" && c.value,
  );
  let p: RegExpExecArray | null;
  while ((p = priceRe.exec(text)) !== null) {
    const stated = normaliseAmount(p[1]);
    const tail = text.slice(p.index, p.index + 60).toLowerCase();
    const period = /month|maand|\/mo\b/.test(tail)
      ? "monthly"
      : /year|annual|jaar|\/yr\b/.test(tail)
        ? "yearly"
        : null;

    const candidates = period
      ? pricing.filter((c) => c.key.includes(period))
      : pricing;
    if (candidates.length === 0) continue;

    const match = candidates.find((c) => normaliseAmount(c.value!) === stated);
    if (!match) {
      const expected = candidates[0];
      findings.push({
        ruleId: "truth.contradiction",
        severity: "BLOCKER",
        message: `The copy says €${p[1]} but Product Truth says "${expected.statement}". Fix the copy, or verify and update the fact first.`,
        excerpt: excerptAround(text, p.index, p[0].length),
        claimKey: expected.key,
      });
      break;
    }
  }

  // A hotkey may not be stated while its fact is unverified or stale.
  if (HOTKEY_SHAPE.test(text)) {
    const unreliable = ctx.claims.find(
      (c) =>
        c.kind === "HOTKEY" &&
        (c.status === "UNVERIFIED" ||
          c.status === "STALE" ||
          (c.status === "VERIFIED" &&
            c.nextReviewAt !== null &&
            c.nextReviewAt < ctx.now)),
    );
    if (unreliable) {
      const hit = firstMatch(text, HOTKEY_SHAPE)!;
      findings.push({
        ruleId: "truth.unverified-dependency",
        severity: "BLOCKER",
        message:
          "This copy states a keystroke, and the shortcut fact has not been verified against the shipping build. Confirm the default first. It is better to say nothing than to teach a keystroke that does not work.",
        excerpt: excerptAround(text, hit.index, hit[0].length),
        claimKey: unreliable.key,
      });
    }
  }

  // Nothing on the cut list may be implied.
  for (const entry of CUT_LIST) {
    const hit = firstMatch(text, entry.pattern);
    if (hit) {
      findings.push({
        ruleId: "truth.cut-list",
        severity: "BLOCKER",
        message: `This mentions ${entry.what}, which is cut from VoxClip by design. Remove it, or raise the scope change first.`,
        excerpt: excerptAround(text, hit.index, hit[0].length),
      });
      break;
    }
  }

  const sup = firstMatch(text, SUPERLATIVES);
  if (sup) {
    findings.push({
      ruleId: "truth.unsupported-superlative",
      severity: "BLOCKER",
      message: `"${sup[0]}" is a claim we cannot back up. Say what VoxClip does instead of how it ranks.`,
      excerpt: excerptAround(text, sup.index, sup[0].length),
    });
  }
}

function proofRules(text: string, findings: Finding[]): void {
  const quote = firstMatch(text, TESTIMONIAL);
  if (quote) {
    findings.push({
      ruleId: "proof.unsourced-testimonial",
      severity: "BLOCKER",
      message:
        "This reads as a customer quote. We do not publish testimonials unless the person is real, named with permission, and recorded as an approved source.",
      excerpt: excerptAround(text, quote.index, quote[0].length),
    });
  }

  const proof = firstMatch(text, SOCIAL_PROOF);
  if (proof) {
    findings.push({
      ruleId: "proof.unsourced-social-proof",
      severity: "BLOCKER",
      message:
        "This states a usage number we cannot evidence. Remove it, or attach the source that proves it.",
      excerpt: excerptAround(text, proof.index, proof[0].length),
    });
  }
}

function platformRules(asset: PublicAsset, findings: Finding[]): void {
  const limit = LENGTH_LIMITS[asset.channel];
  if (limit && asset.body.length > limit) {
    findings.push({
      ruleId: "platform.length",
      severity: "BLOCKER",
      message: `${asset.channel} allows ${limit} characters and this is ${asset.body.length}. Cut ${asset.body.length - limit}.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function runQualityGate(
  asset: PublicAsset,
  ctx: GateContext,
): GateResult {
  const findings: Finding[] = [];
  const text = [asset.title, asset.body].filter(Boolean).join("\n");

  brandRules(text, findings);
  ctaRules(asset, ctx, text, findings);
  hashtagRules(asset, findings);
  accessibilityRules(asset, findings);
  productTruthRules(text, ctx, findings);
  proofRules(text, findings);
  platformRules(asset, findings);

  return {
    passed: !findings.some((f) => f.severity === "BLOCKER"),
    ruleSetVersion: RULE_SET_VERSION,
    findings,
  };
}
