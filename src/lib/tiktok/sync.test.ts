import { describe, expect, it } from "vitest";

import type { TikTokVideo } from "./api";
import {
  describeRun,
  matchVideos,
  needsRefresh,
  normaliseUrl,
  sameVideo,
  toObservations,
} from "./sync";

const video = (over: Partial<TikTokVideo> = {}): TikTokVideo => ({
  id: "7300000000000000001",
  share_url: "https://www.tiktok.com/@voxclip/video/7300000000000000001",
  create_time: 1_755_000_000,
  view_count: 1200,
  like_count: 43,
  comment_count: 5,
  share_count: 2,
  ...over,
});

describe("normaliseUrl", () => {
  it("houdt de video-id over", () => {
    expect(normaliseUrl("https://www.tiktok.com/@voxclip/video/12345")).toBe("12345");
  });

  it("negeert trackingparameters", () => {
    // TikTok plakt er van alles achter zodra je op Delen drukt.
    expect(normaliseUrl("https://www.tiktok.com/@a/video/999?is_from_webapp=1&sender=x")).toBe(
      "999",
    );
  });

  it("negeert www en een schuine streep aan het eind", () => {
    expect(normaliseUrl("https://vm.tiktok.com/ZM123/")).toBe(
      normaliseUrl("https://www.vm.tiktok.com/ZM123"),
    );
  });

  it("valt niet om over iets dat geen link is", () => {
    expect(normaliseUrl("zomaar tekst")).toBe("zomaar tekst");
    expect(normaliseUrl("   ")).toBe("");
  });
});

describe("sameVideo", () => {
  it("herkent dezelfde video in twee vormen", () => {
    expect(
      sameVideo(
        "https://www.tiktok.com/@voxclip/video/555?is_from_webapp=1",
        "https://tiktok.com/@voxclip/video/555",
      ),
    ).toBe(true);
  });

  it("koppelt niet zonder link", () => {
    expect(sameVideo(null, "https://www.tiktok.com/@a/video/1")).toBe(false);
    expect(sameVideo("", "")).toBe(false);
  });

  it("koppelt twee verschillende video's niet", () => {
    expect(
      sameVideo(
        "https://www.tiktok.com/@a/video/1",
        "https://www.tiktok.com/@a/video/2",
      ),
    ).toBe(false);
  });
});

describe("matchVideos", () => {
  it("koppelt op de link", () => {
    const result = matchVideos(
      [{ variantId: "v1", campaignId: "c1", providerUrl: "https://www.tiktok.com/@a/video/1" }],
      [video({ id: "1", share_url: "https://www.tiktok.com/@a/video/1" })],
    );
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].variantId).toBe("v1");
  });

  it("gebruikt een video niet twee keer", () => {
    // Twee varianten met per ongeluk dezelfde link mogen niet allebei de cijfers
    // van die ene video krijgen; dan tel je alles dubbel.
    const url = "https://www.tiktok.com/@a/video/1";
    const result = matchVideos(
      [
        { variantId: "v1", campaignId: "c1", providerUrl: url },
        { variantId: "v2", campaignId: "c1", providerUrl: url },
      ],
      [video({ id: "1", share_url: url })],
    );
    expect(result.matched).toHaveLength(1);
    expect(result.unmatchedVariants).toHaveLength(1);
  });

  it("meldt posts zonder link apart", () => {
    const result = matchVideos(
      [{ variantId: "v1", campaignId: null, providerUrl: null }],
      [video()],
    );
    expect(result.matched).toHaveLength(0);
    expect(result.unmatchedVariants).toHaveLength(1);
    expect(result.unmatchedVideos).toHaveLength(1);
  });

  it("raadt nooit op de titel", () => {
    // Twee varianten van dezelfde tekst is precies waar je op test.
    const result = matchVideos(
      [{ variantId: "v1", campaignId: null, providerUrl: null }],
      [video({ title: "One Timeline. Local." })],
    );
    expect(result.matched).toHaveLength(0);
  });
});

describe("toObservations", () => {
  const now = new Date("2026-08-19T12:00:00Z");

  it("schrijft de vier tellers weg", () => {
    const obs = toObservations(
      { variantId: "v1", campaignId: "c1", video: video() },
      now,
    );
    expect(obs.map((o) => o.metricKey).sort()).toEqual([
      "comments",
      "likes",
      "shares",
      "views",
    ]);
    expect(obs.find((o) => o.metricKey === "views")?.value).toBe(1200);
  });

  it("schrijft null als een cijfer ontbreekt, geen nul", () => {
    // Nul views en "TikTok gaf niets terug" zijn niet hetzelfde. Wie die twee op
    // een hoop gooit, ziet een mislukte ophaalronde aan voor een mislukte video.
    const obs = toObservations(
      { variantId: "v1", campaignId: null, video: video({ view_count: undefined }) },
      now,
    );
    expect(obs.find((o) => o.metricKey === "views")?.value).toBeNull();
  });

  it("laat een echte nul staan", () => {
    const obs = toObservations(
      { variantId: "v1", campaignId: null, video: video({ like_count: 0 }) },
      now,
    );
    expect(obs.find((o) => o.metricKey === "likes")?.value).toBe(0);
  });

  it("laat het venster lopen vanaf het plaatsen", () => {
    const obs = toObservations(
      { variantId: "v1", campaignId: null, video: video({ create_time: 1_755_000_000 }) },
      now,
    );
    expect(obs[0].windowStart.getTime()).toBe(1_755_000_000 * 1000);
    expect(obs[0].windowEnd).toEqual(now);
  });
});

describe("needsRefresh", () => {
  const now = new Date("2026-08-19T12:00:00Z");

  it("ververst op tijd", () => {
    expect(needsRefresh(new Date(now.getTime() + 60_000), now)).toBe(true);
  });

  it("laat een geldig token met rust", () => {
    expect(needsRefresh(new Date(now.getTime() + 3_600_000), now)).toBe(false);
  });

  it("ververst als er niets bekend is", () => {
    expect(needsRefresh(null, now)).toBe(true);
  });
});

describe("describeRun", () => {
  it("zegt wat er gebeurd is", () => {
    expect(describeRun({ matched: 3, unmatchedVariants: 0, observations: 12 })).toBe(
      "3 posts bijgewerkt, 12 cijfers opgeslagen.",
    );
  });

  it("noemt de posts zonder link, want dat is het echte werk", () => {
    const text = describeRun({ matched: 1, unmatchedVariants: 2, observations: 4 });
    expect(text).toContain("2 zonder link");
    expect(text).toContain("plak de link");
  });
});
