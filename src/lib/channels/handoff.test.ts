import { describe, expect, it } from "vitest";

import { channelEnum } from "@/db/schema";
import { CHANNEL_GUIDES, buildHandoff, guideFor } from "./handoff";

const variant = {
  channel: "LINKEDIN" as const,
  code: "li-a",
  title: null as string | null,
  body: "We copy and talk all day. Everything you copy or say, one keystroke away.",
  hashtags: [] as string[],
  ctaLabel: "Download VoxClip",
  ctaUrl:
    "https://voxclip.it/download?utm_source=linkedin&utm_medium=social&utm_campaign=one-place-2608&utm_content=li-a",
  altText: null as string | null,
  hasMedia: false,
};

describe("the channel guides", () => {
  it("covers every channel the system knows", () => {
    for (const channel of channelEnum.enumValues) {
      expect(guideFor(channel)).toBeDefined();
      // One character is a valid name. The platform is called X.
      expect(guideFor(channel).name.length).toBeGreaterThan(0);
    }
  });

  it("says where the link goes, because every platform is different about it", () => {
    for (const guide of CHANNEL_GUIDES) {
      expect(guide.linkPlacement.length).toBeGreaterThan(10);
    }
  });

  it("knows that TikTok does not take a link in the caption", () => {
    expect(guideFor("TIKTOK").linkPlacement.toLowerCase()).toContain("bio");
  });

  it("gives every channel at least three things to check before posting", () => {
    for (const guide of CHANNEL_GUIDES) {
      expect(guide.checklist.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("buildHandoff", () => {
  it("gives the caption as one block, ready to paste", () => {
    const handoff = buildHandoff(variant);
    const caption = handoff.fields.find((f) => f.id === "caption");
    expect(caption?.value).toContain("one keystroke away");
  });

  it("puts the link in the caption where the platform allows it", () => {
    const caption = buildHandoff(variant).fields.find((f) => f.id === "caption");
    expect(caption?.value).toContain("utm_campaign=one-place-2608");
  });

  it("keeps the link out of the caption on TikTok and offers it separately", () => {
    const handoff = buildHandoff({ ...variant, channel: "TIKTOK" });
    const caption = handoff.fields.find((f) => f.id === "caption");
    const link = handoff.fields.find((f) => f.id === "link");
    expect(caption?.value).not.toContain("http");
    expect(link?.value).toContain("http");
  });

  it("adds hashtags to the caption when there are any", () => {
    const handoff = buildHandoff({
      ...variant,
      channel: "TIKTOK",
      hashtags: ["#VoxClip", "#productivity"],
    });
    const caption = handoff.fields.find((f) => f.id === "caption");
    expect(caption?.value).toContain("#VoxClip #productivity");
  });

  it("offers a title only where the channel has one", () => {
    const blog = buildHandoff({ ...variant, channel: "BLOG", title: "One place" });
    expect(blog.fields.some((f) => f.id === "title")).toBe(true);
    expect(buildHandoff(variant).fields.some((f) => f.id === "title")).toBe(false);
  });

  it("warns when the caption is longer than the channel takes", () => {
    const handoff = buildHandoff({
      ...variant,
      channel: "X",
      body: "a".repeat(400),
    });
    expect(handoff.warnings.join(" ")).toMatch(/280/);
  });

  it("warns about media without alt text rather than letting it go out", () => {
    const handoff = buildHandoff({ ...variant, hasMedia: true, altText: null });
    expect(handoff.warnings.join(" ").toLowerCase()).toContain("alt text");
  });

  it("stays quiet when there is nothing to warn about", () => {
    expect(buildHandoff(variant).warnings).toEqual([]);
  });

  it("counts the caption so you can see it fits before you paste it", () => {
    const handoff = buildHandoff(variant);
    const caption = handoff.fields.find((f) => f.id === "caption");
    expect(caption?.value.length).toBe(handoff.captionLength);
  });

  it("never invents a field that has no content", () => {
    const handoff = buildHandoff({ ...variant, ctaUrl: null, hashtags: [] });
    expect(handoff.fields.every((f) => f.value.trim().length > 0)).toBe(true);
  });
});
