import { describe, expect, it } from "vitest";

import { SHORTS, SHORT_STARTERS } from "./shorts";
import { ALL_STARTERS } from "./starters";

const source = {
  hook: "h",
  problem: "p",
  promise: "pr",
  desiredOutcome: "d",
  payoff: "pay",
  ctaLabel: "Try it free",
  headline: "H",
  subhead: "S",
};

describe("de vijftig shorts", () => {
  it("zijn er vijftig", () => {
    expect(SHORTS).toHaveLength(50);
  });

  it("hebben allemaal een eigen slug", () => {
    const slugs = SHORTS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(50);
  });

  it("staan allemaal in de lijst die de editor toont", () => {
    for (const starter of SHORT_STARTERS) {
      expect(ALL_STARTERS.map((s) => s.slug)).toContain(starter.slug);
    }
  });

  it("botsen niet met een bestaande slug", () => {
    const slugs = ALL_STARTERS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("de vorm is bij alle vijftig gelijk", () => {
  it("vijf clips, veertien seconden", () => {
    for (const starter of SHORT_STARTERS) {
      const project = starter.build(source);
      expect(project.clips, starter.slug).toHaveLength(5);
      const total = project.clips.reduce((sum, c) => sum + c.seconds, 0);
      expect(total, starter.slug).toBe(14);
    }
  });

  it("staat overal verticaal", () => {
    for (const starter of SHORT_STARTERS) {
      expect(starter.build(source).ratio).toBe("9:16");
    }
  });

  it("is overal donker", () => {
    for (const starter of SHORT_STARTERS) {
      for (const clip of starter.build(source).clips) {
        expect(clip.theme, starter.slug).toBe("ink");
      }
    }
  });

  it("eindigt overal met dezelfde afsluiter", () => {
    // Bij vijftig video's op een account is die herhaling het enige dat ze
    // tot een ding maakt.
    for (const starter of SHORT_STARTERS) {
      const clips = starter.build(source).clips;
      expect(clips[clips.length - 1].text).toBe("Try it free");
      expect(clips[clips.length - 1].secondary).toContain("voxclip.it");
    }
  });
});

describe("de teksten", () => {
  it("hebben een haakje dat kort genoeg is voor een telefoon", () => {
    for (const short of SHORTS) {
      expect(short.hook.length, short.slug).toBeLessThan(70);
      expect(short.hook.length, short.slug).toBeGreaterThan(10);
    }
  });

  it("houden de reden op een regel", () => {
    for (const short of SHORTS) {
      expect(short.why.length, short.slug).toBeLessThan(45);
    }
  });

  it("gebruiken geen streepje waar een komma hoort", () => {
    // Zelfde regel als de kwaliteitscontrole op de teksten.
    for (const short of SHORTS) {
      const all = `${short.hook} ${short.meet} ${short.why}`;
      expect(all, short.slug).not.toMatch(/[—–]/);
    }
  });

  it("beloven nergens iets met een uitroepteken", () => {
    for (const short of SHORTS) {
      const all = `${short.hook} ${short.meet} ${short.why}`;
      expect(all, short.slug).not.toContain("!");
    }
  });

  it("herhalen geen enkel haakje", () => {
    const hooks = SHORTS.map((s) => s.hook.toLowerCase());
    expect(new Set(hooks).size).toBe(50);
  });
});
