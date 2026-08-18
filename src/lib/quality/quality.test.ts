import { describe, expect, it } from "vitest";

import { runQualityGate } from "./index";
import type { GateContext, PublicAsset } from "./types";

const NOW = new Date("2026-08-12T12:00:00Z");

/** A minimal, clean asset. Every test starts from something that passes. */
function asset(overrides: Partial<PublicAsset> = {}): PublicAsset {
  return {
    channel: "LINKEDIN",
    body: "Paste the address you copied this morning. VoxClip keeps it in one Timeline.",
    hashtags: ["#voxclip", "#productivity"],
    ctaLabel: "Download VoxClip",
    ctaUrl:
      "https://voxclip.it/download?utm_source=linkedin&utm_medium=social&utm_campaign=one-place-aug&utm_content=li-a",
    campaignCode: "one-place-aug",
    variantCode: "li-a",
    hasMedia: false,
    altText: null,
    ...overrides,
  };
}

function context(overrides: Partial<GateContext> = {}): GateContext {
  return {
    now: NOW,
    publicSiteHosts: ["voxclip.it", "www.voxclip.it", "github.com"],
    claims: [
      {
        key: "pricing.monthly_eur",
        kind: "PRICING",
        status: "VERIFIED",
        value: "6.99",
        statement: "VoxClip Plus costs €6.99 per month.",
        nextReviewAt: new Date("2026-12-01T00:00:00Z"),
      },
      {
        key: "pricing.yearly_eur",
        kind: "PRICING",
        status: "VERIFIED",
        value: "59",
        statement: "VoxClip Plus costs €59 per year.",
        nextReviewAt: new Date("2026-12-01T00:00:00Z"),
      },
      {
        key: "hotkey.quickpicker.macos",
        kind: "HOTKEY",
        status: "UNVERIFIED",
        value: "⌥Space",
        statement: "The Quick-picker opens with ⌥Space on macOS.",
        nextReviewAt: null,
      },
      {
        key: "platform.linux",
        kind: "CUT_LIST",
        status: "VERIFIED",
        value: "unsupported",
        statement: "VoxClip does not support Linux.",
        nextReviewAt: new Date("2026-12-01T00:00:00Z"),
      },
    ],
    ...overrides,
  };
}

function ruleIds(result: { findings: { ruleId: string }[] }): string[] {
  return result.findings.map((f) => f.ruleId);
}

function blockerIds(result: {
  findings: { ruleId: string; severity: string }[];
}): string[] {
  return result.findings
    .filter((f) => f.severity === "BLOCKER")
    .map((f) => f.ruleId);
}

describe("runQualityGate", () => {
  it("passes a clean asset", () => {
    const result = runQualityGate(asset(), context());
    expect(result.findings).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("gives every finding a plain-language message and the offending excerpt", () => {
    const result = runQualityGate(
      asset({ body: "One place for everything — copies and dictations." }),
      context(),
    );
    const finding = result.findings.find((f) => f.ruleId === "brand.no-dash");
    expect(finding).toBeDefined();
    expect(finding!.message.length).toBeGreaterThan(20);
    expect(finding!.excerpt).toContain("—");
  });
});

describe("brand rules", () => {
  it("blocks an em dash", () => {
    const result = runQualityGate(
      asset({ body: "Copy it — say it — find it." }),
      context(),
    );
    expect(blockerIds(result)).toContain("brand.no-dash");
  });

  it("blocks an en dash", () => {
    const result = runQualityGate(
      asset({ body: "Free – until you turn on the cloud." }),
      context(),
    );
    expect(blockerIds(result)).toContain("brand.no-dash");
  });

  it("blocks a misspelled product name", () => {
    for (const wrong of ["Voxclip", "VOXCLIP", "Vox Clip"]) {
      const result = runQualityGate(
        asset({ body: `${wrong} keeps everything in one place.` }),
        context(),
      );
      expect(blockerIds(result)).toContain("brand.product-name");
    }
  });

  it("allows the lowercase domain name", () => {
    const result = runQualityGate(
      asset({ body: "Read more at voxclip.it and keep working." }),
      context(),
    );
    expect(ruleIds(result)).not.toContain("brand.product-name");
  });

  it("blocks hype vocabulary", () => {
    const result = runQualityGate(
      asset({ body: "A game-changing way to supercharge your workflow." }),
      context(),
    );
    expect(blockerIds(result)).toContain("brand.no-hype");
  });

  it("blocks exclamation-mark marketing", () => {
    const result = runQualityGate(
      asset({ body: "Try VoxClip today!" }),
      context(),
    );
    expect(blockerIds(result)).toContain("brand.no-exclamation");
  });

  it("warns about a lowercase feature name", () => {
    const result = runQualityGate(
      asset({ body: "Everything lands in one timeline you can search." }),
      context(),
    );
    expect(ruleIds(result)).toContain("brand.feature-name");
  });

  it("blocks a misspelled Quick-picker", () => {
    const result = runQualityGate(
      asset({ body: "Open the quick picker and paste." }),
      context(),
    );
    expect(blockerIds(result)).toContain("brand.feature-name-quickpicker");
  });
});

describe("call to action rules", () => {
  it("blocks a missing call to action", () => {
    const result = runQualityGate(
      asset({ ctaUrl: null, ctaLabel: null }),
      context(),
    );
    expect(blockerIds(result)).toContain("cta.required");
  });

  it("blocks an untagged call to action", () => {
    const result = runQualityGate(
      asset({ ctaUrl: "https://voxclip.it/download" }),
      context(),
    );
    expect(blockerIds(result)).toContain("cta.untagged");
  });

  it("blocks a call to action tagged with the wrong campaign", () => {
    const result = runQualityGate(
      asset({
        ctaUrl:
          "https://voxclip.it/download?utm_source=linkedin&utm_medium=social&utm_campaign=some-other&utm_content=li-a",
      }),
      context(),
    );
    expect(blockerIds(result)).toContain("cta.wrong-campaign");
  });

  it("blocks a call to action pointing at an unexpected domain", () => {
    const result = runQualityGate(
      asset({
        ctaUrl:
          "https://voxclip.dev/download?utm_source=linkedin&utm_medium=social&utm_campaign=one-place-aug&utm_content=li-a",
      }),
      context(),
    );
    expect(blockerIds(result)).toContain("cta.unexpected-domain");
  });

  it("blocks more than one link in the body", () => {
    const result = runQualityGate(
      asset({
        body: "Get it at https://voxclip.it and also https://voxclip.it/pricing",
      }),
      context(),
    );
    expect(blockerIds(result)).toContain("cta.single-destination");
  });
});

describe("hashtag rules", () => {
  it("blocks duplicate hashtags regardless of case", () => {
    const result = runQualityGate(
      asset({ hashtags: ["#VoxClip", "#voxclip"] }),
      context(),
    );
    expect(blockerIds(result)).toContain("hashtags.duplicate");
  });

  it("blocks a malformed hashtag", () => {
    const result = runQualityGate(
      asset({ hashtags: ["#one place", "productivity"] }),
      context(),
    );
    expect(blockerIds(result)).toContain("hashtags.malformed");
  });
});

describe("accessibility rules", () => {
  it("blocks media without alt text", () => {
    const result = runQualityGate(
      asset({ hasMedia: true, altText: null }),
      context(),
    );
    expect(blockerIds(result)).toContain("a11y.alt-text");
  });

  it("accepts media with alt text", () => {
    const result = runQualityGate(
      asset({
        hasMedia: true,
        altText: "The VoxClip Timeline showing a copied address being pasted.",
      }),
      context(),
    );
    expect(ruleIds(result)).not.toContain("a11y.alt-text");
  });
});

describe("Product Truth rules", () => {
  it("blocks a price that contradicts a verified claim", () => {
    const result = runQualityGate(
      asset({ body: "VoxClip Plus is €4.99 per month." }),
      context(),
    );
    const finding = result.findings.find(
      (f) => f.ruleId === "truth.contradiction",
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("BLOCKER");
    expect(finding!.claimKey).toBe("pricing.monthly_eur");
  });

  it("accepts a price that matches the verified claim", () => {
    const result = runQualityGate(
      asset({ body: "VoxClip Plus is €6.99 per month." }),
      context(),
    );
    expect(ruleIds(result)).not.toContain("truth.contradiction");
  });

  it("blocks copy that states a hotkey while the hotkey claim is unverified", () => {
    const result = runQualityGate(
      asset({ body: "Press ⌥Space and your Timeline opens." }),
      context(),
    );
    const finding = result.findings.find(
      (f) => f.ruleId === "truth.unverified-dependency",
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("BLOCKER");
    expect(finding!.claimKey).toBe("hotkey.quickpicker.macos");
  });

  it("blocks copy that states a hotkey whose claim went stale", () => {
    const ctx = context();
    ctx.claims = ctx.claims.map((c) =>
      c.kind === "HOTKEY" ? { ...c, status: "STALE" as const } : c,
    );
    const result = runQualityGate(
      asset({ body: "Press Ctrl+Shift+V to recall it." }),
      ctx,
    );
    expect(blockerIds(result)).toContain("truth.unverified-dependency");
  });

  it("blocks a cut-list capability", () => {
    for (const phrase of [
      "Now on Linux.",
      "VoxClip on Android is here.",
      "Install the browser extension.",
      "Share your Timeline with your team.",
      "Transcribe your meetings automatically.",
    ]) {
      const result = runQualityGate(asset({ body: phrase }), context());
      expect(blockerIds(result)).toContain("truth.cut-list");
    }
  });

  it("blocks an unsupported superlative", () => {
    const result = runQualityGate(
      asset({ body: "The fastest clipboard tool on the market." }),
      context(),
    );
    expect(blockerIds(result)).toContain("truth.unsupported-superlative");
  });
});

describe("proof rules", () => {
  it("blocks an unsourced testimonial", () => {
    const result = runQualityGate(
      asset({
        body: '"VoxClip changed how I work," says Anna, a product manager.',
      }),
      context(),
    );
    expect(blockerIds(result)).toContain("proof.unsourced-testimonial");
  });

  it("blocks an unsourced usage number", () => {
    const result = runQualityGate(
      asset({ body: "Trusted by 10,000+ people every day." }),
      context(),
    );
    expect(blockerIds(result)).toContain("proof.unsourced-social-proof");
  });
});

describe("platform rules", () => {
  it("blocks a post that exceeds the channel length limit", () => {
    const result = runQualityGate(
      asset({ channel: "X", body: "a".repeat(300) }),
      context(),
    );
    expect(blockerIds(result)).toContain("platform.length");
  });

  it("accepts a post inside the channel length limit", () => {
    const result = runQualityGate(
      asset({ channel: "X", body: "Copy it. Say it. Find it." }),
      context(),
    );
    expect(ruleIds(result)).not.toContain("platform.length");
  });
});

describe("gate result", () => {
  it("fails when any blocker is present and passes when only warnings are", () => {
    const blocked = runQualityGate(
      asset({ body: "Try it today!" }),
      context(),
    );
    expect(blocked.passed).toBe(false);

    const warned = runQualityGate(
      asset({ body: "Everything lands in one timeline you can search." }),
      context(),
    );
    expect(warned.findings.every((f) => f.severity !== "BLOCKER")).toBe(true);
    expect(warned.passed).toBe(true);
  });

  it("reports the rule set version so a stored run can be reproduced", () => {
    const result = runQualityGate(asset(), context());
    expect(result.ruleSetVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
