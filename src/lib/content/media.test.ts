import { describe, expect, it } from "vitest";

import type { Channel } from "@/db/schema";
import { describeMedia, mediaVerdict, needsMedia, NEEDS_MEDIA } from "./media";

const verdict = (over: Partial<Parameters<typeof mediaVerdict>[0]> = {}) =>
  mediaVerdict({
    channel: "TIKTOK",
    attachedAssetCount: 1,
    approvedAssetCount: 1,
    ...over,
  });

describe("welke kanalen beeld nodig hebben", () => {
  it("noemt de verticale kanalen", () => {
    expect(needsMedia("TIKTOK")).toBe(true);
    expect(needsMedia("INSTAGRAM_REELS")).toBe(true);
    expect(needsMedia("YOUTUBE_SHORTS")).toBe(true);
  });

  it("laat tekstkanalen met rust", () => {
    for (const channel of ["LINKEDIN", "X", "THREADS", "BLOG", "EMAIL"] as Channel[]) {
      expect(needsMedia(channel), channel).toBe(false);
    }
  });

  it("houdt de lijst kort en expliciet", () => {
    expect(NEEDS_MEDIA.length).toBeGreaterThan(2);
    expect(NEEDS_MEDIA.length).toBeLessThan(6);
  });
});

describe("mediaVerdict", () => {
  it("laat een tekstkanaal altijd door", () => {
    expect(
      verdict({ channel: "LINKEDIN", attachedAssetCount: 0, approvedAssetCount: 0 })
        .ok,
    ).toBe(true);
  });

  it("laat een verticaal kanaal met goedgekeurd beeld door", () => {
    expect(verdict().ok).toBe(true);
  });

  it("weigert een TikTok zonder beeld", () => {
    const result = verdict({ attachedAssetCount: 0, approvedAssetCount: 0 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/maak de video/i);
  });

  it("weigert beeld dat nog niemand heeft goedgekeurd", () => {
    // Anders verschuift het probleem van geen beeld naar beeld waarvan niemand
    // weet of het klopt.
    const result = verdict({ attachedAssetCount: 1, approvedAssetCount: 0 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/goedgekeurd/i);
  });

  it("geeft altijd een reden als het weigert", () => {
    for (const attached of [0, 1]) {
      const result = verdict({
        attachedAssetCount: attached,
        approvedAssetCount: 0,
      });
      expect(result.reason, `attached ${attached}`).toBeTruthy();
    }
  });

  it("weigert voor elk kanaal dat beeld nodig heeft", () => {
    for (const channel of NEEDS_MEDIA) {
      expect(
        verdict({ channel, attachedAssetCount: 0, approvedAssetCount: 0 }).ok,
        channel,
      ).toBe(false);
    }
  });
});

describe("describeMedia", () => {
  it("zegt niets over een kanaal dat geen beeld nodig heeft", () => {
    expect(
      describeMedia({
        channel: "LINKEDIN",
        attachedAssetCount: 0,
        approvedAssetCount: 0,
      }),
    ).toBeNull();
  });

  it("telt goedgekeurd beeld", () => {
    expect(
      describeMedia({
        channel: "TIKTOK",
        attachedAssetCount: 2,
        approvedAssetCount: 2,
      }),
    ).toContain("2");
  });

  it("onderscheidt geen beeld van niet goedgekeurd beeld", () => {
    const none = describeMedia({
      channel: "TIKTOK",
      attachedAssetCount: 0,
      approvedAssetCount: 0,
    });
    const unapproved = describeMedia({
      channel: "TIKTOK",
      attachedAssetCount: 1,
      approvedAssetCount: 0,
    });

    expect(none).not.toBe(unapproved);
    expect(none).toMatch(/geen beeld/i);
  });
});
