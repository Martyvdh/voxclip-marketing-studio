import { describe, expect, it } from "vitest";

import { briefSchema, firstErrors, newCampaignSchema } from "./validation";

function errorsFor(schema: typeof newCampaignSchema, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : firstErrors(result.error);
}

const validCampaign = {
  title: "One place for everything",
  pillar: "P1_ONE_PLACE",
  objective: "Get solo pros to try recall on their own machine within a week.",
  audienceId: "aud_1",
};

const validBrief = {
  problem: "The thing you need is three apps back and retyping it costs the thread.",
  desiredOutcome: "It is pasted where your cursor is, without leaving the document.",
  promise: "Everything you copy or say, one keystroke away.",
  proof: "A screen recording of a copied address being recalled in the Timeline.",
  offer: "Free download, no account.",
  primaryCta: "Download VoxClip",
  ctaPath: "/download",
};

describe("newCampaignSchema", () => {
  it("accepts a complete campaign", () => {
    expect(newCampaignSchema.safeParse(validCampaign).success).toBe(true);
  });

  it("accepts a campaign without an audience, because that is chosen later", () => {
    const { audienceId, ...rest } = validCampaign;
    void audienceId;
    expect(newCampaignSchema.safeParse(rest).success).toBe(true);
  });

  it("asks for a title a person could read", () => {
    expect(errorsFor(newCampaignSchema, { ...validCampaign, title: "a" }).title)
      .toMatch(/title/i);
  });

  it("asks what changes if the campaign works", () => {
    const message = errorsFor(newCampaignSchema, {
      ...validCampaign,
      objective: "more views",
    }).objective;
    expect(message).toMatch(/differently|objective/i);
  });

  it("refuses a pillar that is not one of the four", () => {
    expect(
      errorsFor(newCampaignSchema, { ...validCampaign, pillar: "P9_MAGIC" }).pillar,
    ).toBeTruthy();
  });

  it("trims whitespace so a title of spaces does not pass", () => {
    expect(errorsFor(newCampaignSchema, { ...validCampaign, title: "     " }).title)
      .toBeTruthy();
  });
});

describe("briefSchema", () => {
  it("accepts a complete brief", () => {
    expect(briefSchema.safeParse(validBrief).success).toBe(true);
  });

  it("names every field that is still empty, not just the first", () => {
    const result = briefSchema.safeParse({
      ...validBrief,
      proof: "",
      offer: "",
      primaryCta: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const keys = Object.keys(firstErrors(result.error));
      expect(keys).toContain("proof");
      expect(keys).toContain("offer");
      expect(keys).toContain("primaryCta");
    }
  });

  it("explains what proof means rather than saying required", () => {
    const message = firstErrors(
      briefSchema.safeParse({ ...validBrief, proof: "" }).error!,
    ).proof;
    expect(message.length).toBeGreaterThan(25);
    expect(message).not.toMatch(/^required$/i);
  });

  it("refuses a call to action that points off our own site", () => {
    const message = firstErrors(
      briefSchema.safeParse({
        ...validBrief,
        ctaPath: "https://example.com/download",
      }).error!,
    ).ctaPath;
    expect(message).toMatch(/path/i);
  });

  it("accepts a path with a query string", () => {
    expect(
      briefSchema.safeParse({ ...validBrief, ctaPath: "/download?os=mac" }).success,
    ).toBe(true);
  });

  it("adds the leading slash when it is missing", () => {
    const result = briefSchema.safeParse({ ...validBrief, ctaPath: "download" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ctaPath).toBe("/download");
  });

  it("allows one call to action and nothing about a second", () => {
    expect(Object.keys(briefSchema.shape)).not.toContain("secondaryCta");
  });
});
