import { describe, expect, it } from "vitest";

import { elementFloor, placeElementY, sitsInTextBand, TEXT_CLEARANCE } from "./layout";
import { ALL_STARTERS } from "./starters";

const source = {
  hook: "h", problem: "p", promise: "pr", desiredOutcome: "d",
  payoff: "pay", ctaLabel: "Try it free", headline: "H", subhead: "S",
};

describe("elementFloor", () => {
  it("houdt ruimte onder de tekst", () => {
    expect(elementFloor(960, 1920)).toBeCloseTo(0.5 + TEXT_CLEARANCE, 5);
  });

  it("legt geen ondergrens op als er geen tekst staat", () => {
    expect(elementFloor(0, 1920)).toBe(0);
  });

  it("laat altijd een strookje onderaan over", () => {
    expect(elementFloor(1900, 1920)).toBeLessThanOrEqual(0.92);
  });

  it("valt niet om bij een frame zonder hoogte", () => {
    expect(elementFloor(100, 0)).toBe(0);
  });
});

describe("placeElementY", () => {
  it("laat een element dat al laag staat met rust", () => {
    expect(placeElementY(0.85, 0.6)).toBe(0.85);
  });

  it("duwt een element onder de tekst", () => {
    // Dit ging mis: het vinkje stond dwars door het woord heen.
    expect(placeElementY(0.55, 0.62)).toBe(0.62);
  });

  it("verbergt niets", () => {
    // Zakken en niet weglaten. Een element dat je plaatste en niet terugziet
    // is verwarrender dan een element dat lager staat dan je bedoelde.
    expect(placeElementY(0.1, 0.7)).toBeGreaterThan(0);
  });
});

describe("geen enkel startpunt zet iets in de tekstband", () => {
  it("plaatst elk element onder de tekst", () => {
    for (const starter of ALL_STARTERS) {
      for (const clip of starter.build(source).clips) {
        for (const element of clip.elements ?? []) {
          expect(
            sitsInTextBand(element.y),
            `${starter.slug}: ${element.kind} op y=${element.y}`,
          ).toBe(false);
        }
      }
    }
  });
});
