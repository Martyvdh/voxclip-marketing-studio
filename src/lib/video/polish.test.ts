import { describe, expect, it } from "vitest";

import {
  breathe,
  crossfadeAlpha,
  CROSSFADE_MS,
  kenBurns,
  progressWidth,
  wordsVisible,
} from "./polish";

describe("crossfadeAlpha", () => {
  it("begint onzichtbaar en eindigt vol", () => {
    expect(crossfadeAlpha(0)).toBe(0);
    expect(crossfadeAlpha(CROSSFADE_MS)).toBe(1);
  });

  it("blijft vol na de overgang", () => {
    expect(crossfadeAlpha(5000)).toBe(1);
  });

  it("is halverwege ook ongeveer halverwege", () => {
    expect(crossfadeAlpha(CROSSFADE_MS / 2)).toBeCloseTo(0.5, 2);
  });

  it("loopt zacht aan en zacht uit, niet lineair", () => {
    // Lineair leest als een dia die verschuift. Een kwart van de tijd hoort
    // minder dan een kwart van de dekking te geven.
    expect(crossfadeAlpha(CROSSFADE_MS * 0.25)).toBeLessThan(0.25);
    expect(crossfadeAlpha(CROSSFADE_MS * 0.75)).toBeGreaterThan(0.75);
  });

  it("blijft binnen nul en een", () => {
    for (const ms of [-100, 0, 50, 220, 1000]) {
      const a = crossfadeAlpha(ms);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it("staat meteen vol als de overgang is uitgezet", () => {
    expect(crossfadeAlpha(0, 0)).toBe(1);
  });

  it("duurt kort genoeg om niet op te vallen", () => {
    expect(CROSSFADE_MS).toBeLessThan(400);
    expect(CROSSFADE_MS).toBeGreaterThan(120);
  });
});

describe("kenBurns", () => {
  it("begint op ware grootte", () => {
    expect(kenBurns(0).scale).toBe(1);
  });

  it("zoomt over de clip langzaam in", () => {
    expect(kenBurns(1).scale).toBeCloseTo(1.05, 3);
  });

  it("beweegt ook een klein beetje opzij", () => {
    // Pure zoom leest als een technisch effect; meebewegen leest als camera.
    expect(kenBurns(1).offsetX).toBeLessThan(0);
    expect(kenBurns(0).offsetX).toBe(0);
  });

  it("blijft ver onder wat zeeziek maakt", () => {
    expect(kenBurns(1).scale).toBeLessThan(1.1);
  });

  it("klemt waarden buiten de clip", () => {
    expect(kenBurns(-1).scale).toBe(1);
    expect(kenBurns(2).scale).toBe(kenBurns(1).scale);
  });
});

describe("wordsVisible", () => {
  it("toont het eerste woord meteen", () => {
    expect(wordsVisible(6, 0)).toBe(1);
  });

  it("heeft alles op tijd staan, ruim voor het einde", () => {
    // Tekst die pas op de laatste tel compleet is, heeft niemand gelezen.
    expect(wordsVisible(6, 0.55)).toBe(6);
    expect(wordsVisible(6, 0.6)).toBe(6);
  });

  it("bouwt op tussen begin en einde", () => {
    const halfway = wordsVisible(8, 0.25);
    expect(halfway).toBeGreaterThan(1);
    expect(halfway).toBeLessThan(8);
  });

  it("gaat nooit over het aantal woorden heen", () => {
    for (const t of [0, 0.3, 0.9, 1, 2]) {
      expect(wordsVisible(4, t)).toBeLessThanOrEqual(4);
    }
  });

  it("doet niets bij lege tekst", () => {
    expect(wordsVisible(0, 0.5)).toBe(0);
  });
});

describe("progressWidth", () => {
  it("begint op nul en eindigt vol", () => {
    expect(progressWidth(0, 8000, 1080)).toBe(0);
    expect(progressWidth(8000, 8000, 1080)).toBe(1080);
  });

  it("staat halverwege in het midden", () => {
    expect(progressWidth(4000, 8000, 1080)).toBe(540);
  });

  it("loopt niet door na het einde", () => {
    expect(progressWidth(99999, 8000, 1080)).toBe(1080);
  });

  it("valt niet om bij een lege tijdlijn", () => {
    expect(progressWidth(100, 0, 1080)).toBe(0);
  });

  it("geeft hele pixels terug", () => {
    expect(Number.isInteger(progressWidth(1234, 8000, 1080))).toBe(true);
  });
});

describe("breathe", () => {
  it("begint op ware grootte", () => {
    expect(breathe(0)).toBe(1);
  });

  it("blijft onder wat je als beweging herkent", () => {
    expect(breathe(1)).toBeLessThan(1.02);
    expect(breathe(1)).toBeGreaterThan(1);
  });
});
