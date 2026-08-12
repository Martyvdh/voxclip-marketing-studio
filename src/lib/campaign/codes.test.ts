import { describe, expect, it } from "vitest";

import {
  buildCampaignCode,
  buildTaggedUrl,
  nextAvailableCode,
  slugify,
  utmSourceFor,
} from "./codes";

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("One place for everything")).toBe("one-place-for-everything");
  });

  it("strips accents so a Dutch title still gives a clean slug", () => {
    expect(slugify("Één plek voor alles")).toBe("een-plek-voor-alles");
  });

  it("drops punctuation rather than encoding it", () => {
    expect(slugify("Recall, instantly: the Quick-picker!")).toBe(
      "recall-instantly-the-quick-picker",
    );
  });

  it("collapses repeated separators and trims the ends", () => {
    expect(slugify("  --One   place--  ")).toBe("one-place");
  });

  it("keeps digits", () => {
    expect(slugify("Week 34 launch")).toBe("week-34-launch");
  });

  it("caps the length so a code stays readable in a URL", () => {
    const slug = slugify("a".repeat(200));
    expect(slug.length).toBeLessThanOrEqual(60);
  });

  it("refuses a title that leaves nothing behind", () => {
    expect(() => slugify("!!! ???")).toThrow(/title/i);
  });
});

describe("buildCampaignCode", () => {
  it("combines the slug with the year and month", () => {
    const code = buildCampaignCode("One place", new Date("2026-08-12T00:00:00Z"));
    expect(code).toBe("one-place-2608");
  });

  it("pads a single-digit month", () => {
    const code = buildCampaignCode("One place", new Date("2026-01-05T00:00:00Z"));
    expect(code).toBe("one-place-2601");
  });

  it("produces something safe to put in a URL", () => {
    const code = buildCampaignCode("Recall, instantly!", new Date("2026-08-12T00:00:00Z"));
    expect(code).toBe(encodeURIComponent(code));
  });
});

describe("nextAvailableCode", () => {
  it("returns the code itself when nothing has taken it", () => {
    expect(nextAvailableCode("one-place-2608", [])).toBe("one-place-2608");
  });

  it("adds a counter when the code is taken", () => {
    expect(nextAvailableCode("one-place-2608", ["one-place-2608"])).toBe(
      "one-place-2608-2",
    );
  });

  it("keeps counting past the first collision", () => {
    expect(
      nextAvailableCode("one-place-2608", [
        "one-place-2608",
        "one-place-2608-2",
        "one-place-2608-3",
      ]),
    ).toBe("one-place-2608-4");
  });
});

describe("utmSourceFor", () => {
  it("maps a channel to the source name that platform reports", () => {
    expect(utmSourceFor("LINKEDIN")).toBe("linkedin");
    expect(utmSourceFor("INSTAGRAM_REELS")).toBe("instagram");
    expect(utmSourceFor("YOUTUBE_SHORTS")).toBe("youtube");
    expect(utmSourceFor("EMAIL")).toBe("email");
  });
});

describe("buildTaggedUrl", () => {
  const base = {
    siteUrl: "https://voxclip.it",
    path: "/download",
    channel: "LINKEDIN" as const,
    campaignCode: "one-place-2608",
  };

  it("tags the link with the campaign so results cannot land on the wrong one", () => {
    const url = new URL(buildTaggedUrl(base));
    expect(url.origin + url.pathname).toBe("https://voxclip.it/download");
    expect(url.searchParams.get("utm_campaign")).toBe("one-place-2608");
    expect(url.searchParams.get("utm_source")).toBe("linkedin");
    expect(url.searchParams.get("utm_medium")).toBe("social");
  });

  it("uses the email medium for email", () => {
    const url = new URL(buildTaggedUrl({ ...base, channel: "EMAIL" }));
    expect(url.searchParams.get("utm_medium")).toBe("email");
  });

  it("uses the referral medium for the blog", () => {
    const url = new URL(buildTaggedUrl({ ...base, channel: "BLOG" }));
    expect(url.searchParams.get("utm_medium")).toBe("referral");
  });

  it("adds the variant as utm_content when there is one", () => {
    const url = new URL(buildTaggedUrl({ ...base, variantCode: "li-a" }));
    expect(url.searchParams.get("utm_content")).toBe("li-a");
  });

  it("leaves utm_content off when there is no variant", () => {
    const url = new URL(buildTaggedUrl(base));
    expect(url.searchParams.has("utm_content")).toBe(false);
  });

  it("normalises a path given without a leading slash", () => {
    const url = new URL(buildTaggedUrl({ ...base, path: "pricing" }));
    expect(url.pathname).toBe("/pricing");
  });

  it("keeps a query the path already carried", () => {
    const url = new URL(buildTaggedUrl({ ...base, path: "/download?os=mac" }));
    expect(url.searchParams.get("os")).toBe("mac");
    expect(url.searchParams.get("utm_campaign")).toBe("one-place-2608");
  });

  it("refuses a path that points at another host", () => {
    expect(() =>
      buildTaggedUrl({ ...base, path: "https://example.com/steal" }),
    ).toThrow(/path/i);
  });

  it("produces a URL the quality gate accepts", () => {
    // The gate requires utm_source, utm_medium, and a matching utm_campaign.
    const url = new URL(buildTaggedUrl({ ...base, variantCode: "li-a" }));
    for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
      expect(url.searchParams.get(key)).toBeTruthy();
    }
  });
});
