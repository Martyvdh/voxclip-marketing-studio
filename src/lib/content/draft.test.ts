import { describe, expect, it } from "vitest";

import { runQualityGate } from "@/lib/quality";
import type { GateContext } from "@/lib/quality/types";
import { draftVariant, normaliseDashes, type DraftInput } from "./draft";

const input = (over: Partial<DraftInput> = {}): DraftInput => ({
  channel: "LINKEDIN",
  campaignCode: "one-place-2608",
  variantCode: "li-a",
  siteUrl: "https://voxclip.it",
  pillar: "P1_ONE_PLACE",
  hook: "We copy and talk all day. Why does that live in two separate apps?",
  brief: {
    problem:
      "The thing you need is three apps back and retyping it costs the thread.",
    desiredOutcome:
      "It is pasted where your cursor is, without leaving the document.",
    promise: "Everything you copy or say, one keystroke away.",
    proof: "A screen recording of a copied address recalled in the Timeline.",
    offer: "Free download, no account.",
    primaryCta: "Download VoxClip",
    ctaPath: "/download",
  },
  pillarDefault: {
    headline: "Everything you copy.",
    subhead: "Everything you say.",
    payoff: "One Timeline. Local.",
  },
  format: {
    slug: "capture-to-recall",
    name: "Capture to recall",
    ctaRule: "One call to action, at the end, tagged.",
  },
  ...over,
});

const gateContext: GateContext = {
  now: new Date("2026-08-12T12:00:00Z"),
  publicSiteHosts: ["voxclip.it", "www.voxclip.it"],
  claims: [
    {
      key: "hotkey.quickpicker.macos",
      kind: "HOTKEY",
      status: "UNVERIFIED",
      value: "⌘⇧Space",
      statement: "The Quick-picker opens with ⌘⇧Space on macOS.",
      nextReviewAt: null,
    },
    {
      key: "pricing.monthly_eur",
      kind: "PRICING",
      status: "VERIFIED",
      value: "6.99",
      statement: "VoxClip Plus costs €6.99 per month.",
      nextReviewAt: new Date("2026-12-01T00:00:00Z"),
    },
  ],
};

describe("normaliseDashes", () => {
  it("turns an em dash into a comma", () => {
    expect(normaliseDashes("Call the notary — 3:00 PM")).toBe(
      "Call the notary, 3:00 PM",
    );
  });

  it("turns an en dash between words into a comma", () => {
    expect(normaliseDashes("Free – until you turn on the cloud")).toBe(
      "Free, until you turn on the cloud",
    );
  });

  it("does not leave a double space or a stray comma", () => {
    const out = normaliseDashes("One place — for everything");
    expect(out).not.toMatch(/\s{2,}/);
    expect(out).not.toMatch(/,\s*,/);
  });

  it("leaves a hyphen inside a word alone", () => {
    expect(normaliseDashes("the Quick-picker")).toBe("the Quick-picker");
  });

  it("leaves text without dashes untouched", () => {
    expect(normaliseDashes("Copy it. Say it. Find it.")).toBe(
      "Copy it. Say it. Find it.",
    );
  });
});

describe("draftVariant", () => {
  it("opens with the hook", () => {
    const draft = draftVariant(input());
    expect(draft.body.startsWith("We copy and talk all day")).toBe(true);
  });

  it("carries the promise and the proof into the body", () => {
    const draft = draftVariant(input());
    expect(draft.body).toContain("one keystroke away");
    expect(draft.body.toLowerCase()).toContain("timeline");
  });

  it("builds a tagged call to action rather than leaving it to be typed", () => {
    const draft = draftVariant(input());
    const url = new URL(draft.ctaUrl);
    expect(url.searchParams.get("utm_campaign")).toBe("one-place-2608");
    expect(url.searchParams.get("utm_content")).toBe("li-a");
    expect(draft.ctaLabel).toBe("Download VoxClip");
  });

  it("strips dashes the source material still contains", () => {
    const draft = draftVariant(
      input({ hook: "One place — for everything you copy" }),
    );
    expect(draft.body).not.toMatch(/[—–]/);
  });

  it("reports what it changed rather than changing it quietly", () => {
    const draft = draftVariant(
      input({ hook: "One place — for everything you copy" }),
    );
    expect(draft.notes.join(" ")).toMatch(/dash/i);
  });

  it("never states a hotkey, because that fact is not verified", () => {
    const draft = draftVariant(input());
    expect(draft.body).not.toMatch(/[⌘⇧⌥⌃]|ctrl\s*\+/i);
  });

  it("stays inside the channel limit", () => {
    const draft = draftVariant(input({ channel: "X" }));
    expect(draft.body.length).toBeLessThanOrEqual(280);
  });

  it("uses fewer, shorter sentences on a short channel than on LinkedIn", () => {
    const short = draftVariant(input({ channel: "X" }));
    const long = draftVariant(input({ channel: "LINKEDIN" }));
    expect(short.body.length).toBeLessThan(long.body.length);
  });

  it("gives a blog variant a title and the others none", () => {
    expect(draftVariant(input({ channel: "BLOG" })).title).toBeTruthy();
    expect(draftVariant(input({ channel: "X" })).title).toBeUndefined();
  });

  it("produces hashtags only where the channel uses them", () => {
    expect(draftVariant(input({ channel: "TIKTOK" })).hashtags.length).toBeGreaterThan(0);
    expect(draftVariant(input({ channel: "BLOG" })).hashtags).toEqual([]);
    expect(draftVariant(input({ channel: "EMAIL" })).hashtags).toEqual([]);
  });

  it("never repeats a hashtag", () => {
    const tags = draftVariant(input({ channel: "TIKTOK" })).hashtags;
    expect(new Set(tags.map((t) => t.toLowerCase())).size).toBe(tags.length);
  });

  it("asks for alt text when the format expects a proof asset", () => {
    const draft = draftVariant(input({ channel: "INSTAGRAM_REELS" }));
    expect(draft.needsAsset).toBe(true);
  });
});

describe("what it drafts passes its own quality gate", () => {
  const channels = [
    "LINKEDIN",
    "TIKTOK",
    "INSTAGRAM_REELS",
    "X",
    "BLOG",
    "EMAIL",
  ] as const;

  for (const channel of channels) {
    it(`${channel} draft has no blockers apart from a missing asset`, () => {
      const draft = draftVariant(input({ channel }));
      const result = runQualityGate(
        {
          channel,
          title: draft.title,
          body: draft.body,
          hashtags: draft.hashtags,
          ctaLabel: draft.ctaLabel,
          ctaUrl: draft.ctaUrl,
          campaignCode: "one-place-2608",
          variantCode: "li-a",
          // A draft has no asset attached yet; that is what NEEDS_ASSET is for.
          hasMedia: false,
          altText: null,
        },
        gateContext,
      );

      const blockers = result.findings.filter((f) => f.severity === "BLOCKER");
      expect(blockers.map((b) => `${b.ruleId}: ${b.message}`)).toEqual([]);
    });
  }
});
