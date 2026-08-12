import { describe, expect, it } from "vitest";

import { ELEMENTS, ELEMENT_GROUPS, elementByKind, toneColours } from "./elements";

describe("the element library", () => {
  it("has around fifty, and an upper bound on purpose", () => {
    // The lesson of the 150 video styles: a palette nobody can hold in their
    // head is a palette where every asset looks like it came from a different
    // brand. Fifty grouped elements is browsable. A hundred is a junk drawer.
    expect(ELEMENTS.length).toBeGreaterThanOrEqual(50);
    expect(ELEMENTS.length).toBeLessThanOrEqual(60);
  });

  it("gives every element a unique kind, so a saved clip resolves to one thing", () => {
    const kinds = ELEMENTS.map((e) => e.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("gives every element a name a person would recognise in a list", () => {
    for (const e of ELEMENTS) {
      expect(e.name.length).toBeGreaterThan(2);
      expect(e.name).not.toBe(e.kind);
    }
  });

  it("sorts into a handful of groups, not fifty of them", () => {
    expect(ELEMENT_GROUPS.length).toBeLessThanOrEqual(8);
    for (const e of ELEMENTS) {
      expect(ELEMENT_GROUPS).toContain(e.group);
    }
  });

  it("gives every element that takes text a default, so it never draws blank", () => {
    for (const e of ELEMENTS) {
      if (e.hasText) expect(e.defaultText && e.defaultText.length > 0).toBe(true);
    }
  });

  it("finds an element by kind and returns nothing for one that does not exist", () => {
    expect(elementByKind("waveform")?.name).toBe("Waveform");
    expect(elementByKind("nope")).toBeUndefined();
  });
});

describe("tones", () => {
  it("keeps text readable by pairing every colour with its contrast", () => {
    for (const tone of ["ink", "paper", "teal"] as const) {
      const { colour, contrast } = toneColours(tone, false);
      expect(colour).toMatch(/^#[0-9A-F]{6}$/i);
      expect(contrast).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colour).not.toBe(contrast);
    }
  });

  it("uses the signal teal exactly, never an approximation of it", () => {
    expect(toneColours("teal", false).colour).toBe("#12B3A6");
  });
});

describe("nothing in the set reproduces the product interface", () => {
  it("has no element that claims to be the Timeline, the Quick-picker, or a window of the app", () => {
    const forbidden = /timeline|quick.?picker|app window|screenshot/i;
    for (const e of ELEMENTS) {
      expect(e.name).not.toMatch(forbidden);
      expect(e.kind).not.toMatch(forbidden);
    }
  });

  it("keeps the frames generic, because a frame is a shape and not a claim", () => {
    const frames = ELEMENTS.filter((e) => e.group === "Frames");
    expect(frames.length).toBeGreaterThan(0);
    for (const f of frames) {
      expect(f.name.toLowerCase()).toMatch(/outline|third/);
    }
  });
});
