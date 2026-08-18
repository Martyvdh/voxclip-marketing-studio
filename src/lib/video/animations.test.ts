import { describe, expect, it } from "vitest";

import { ANIMATIONS, ANIMATION_IDS, animationById, transformAt } from "./animations";

describe("the animation set", () => {
  it("gives every id a definition with a name a person would recognise", () => {
    for (const id of ANIMATION_IDS) {
      const a = animationById(id);
      expect(a.id).toBe(id);
      expect(a.name.length).toBeGreaterThan(2);
      expect(a.description.length).toBeGreaterThan(10);
    }
  });

  it("falls back to a safe animation rather than throwing on an unknown id", () => {
    expect(animationById("something-else").id).toBe("fade-rise");
  });

  it("has sixteen: ten quiet ones and six that move", () => {
    // Er waren er tien, met opzet: een set die je kunt onthouden. Maar ze
    // bewogen allemaal tussen de 12 en 90 eenheden op een doek van 1920 — één
    // tot vijf procent. Op een telefoon zie je dat niet, en honderdvijftig
    // video's voelden daardoor als stilstaande beelden met een fade.
    //
    // De zes erbij reizen over een derde van het beeld. Ze zijn niet netter,
    // ze zijn zichtbaar.
    expect(ANIMATIONS.length).toBe(16);
  });

  it("heeft animaties die echt over het beeld reizen", () => {
    const loud = ANIMATIONS.filter((anim) => {
      const start = anim.at(0, 0, 1);
      return Math.abs(start.dx) > 200 || Math.abs(start.dy) > 200;
    });
    expect(loud.length).toBeGreaterThanOrEqual(5);
  });

  it("houdt de harde animaties weg bij een call to action", () => {
    for (const id of ["fly-in", "drop-in", "punch", "whip", "rise-fast", "split-in"]) {
      expect(animationById(id).goodForCta, id).toBe(false);
    }
  });

  it("laat de harde animaties op tijd uitgewerkt zijn", () => {
    // Beweging die nog loopt terwijl je leest, leest niet.
    for (const id of ["fly-in", "punch", "whip", "rise-fast"]) {
      const late = animationById(id).at(0.5, 0, 1);
      expect(Math.abs(late.dx), id).toBeLessThan(2);
      expect(Math.abs(late.dy), id).toBeLessThan(2);
      expect(late.opacity, id).toBe(1);
    }
  });
});

describe("every animation, whatever it does", () => {
  for (const anim of ANIMATIONS) {
    describe(anim.id, () => {
      it("starts invisible or in place, and is fully settled by the end", () => {
        const start = transformAt(anim.id, 0, 0, 3);
        const end = transformAt(anim.id, 1, 0, 3);

        expect(start.opacity).toBeGreaterThanOrEqual(0);
        expect(end.opacity).toBeCloseTo(1, 1);
        expect(end.dx).toBeCloseTo(0, 1);
        expect(end.dy).toBeCloseTo(0, 1);
        expect(end.scale).toBeCloseTo(1, 1);
        expect(end.reveal).toBeCloseTo(1, 1);
      });

      it("never leaves its ranges, even when handed nonsense", () => {
        for (const p of [-5, -0.1, 0, 0.5, 1, 1.4, 99]) {
          const t = transformAt(anim.id, p, 1, 4);
          expect(t.opacity).toBeGreaterThanOrEqual(0);
          expect(t.opacity).toBeLessThanOrEqual(1);
          expect(t.reveal).toBeGreaterThanOrEqual(0);
          expect(t.reveal).toBeLessThanOrEqual(1);
          expect(t.scale).toBeGreaterThan(0);
          expect(Number.isFinite(t.dx)).toBe(true);
          expect(Number.isFinite(t.dy)).toBe(true);
        }
      });

      it("is deterministic, so the export matches the preview exactly", () => {
        const a = transformAt(anim.id, 0.42, 2, 5);
        const b = transformAt(anim.id, 0.42, 2, 5);
        expect(a).toEqual(b);
      });
    });
  }
});

describe("staggering", () => {
  it("word-pop brings later lines in later", () => {
    const first = transformAt("word-pop", 0.2, 0, 3);
    const third = transformAt("word-pop", 0.2, 2, 3);
    expect(first.opacity).toBeGreaterThan(third.opacity);
  });

  it("stack lifts later lines from further down", () => {
    const first = transformAt("stack", 0.15, 0, 3);
    const third = transformAt("stack", 0.15, 2, 3);
    expect(Math.abs(third.dy)).toBeGreaterThan(Math.abs(first.dy));
  });

  it("hold does not stagger, because that is the point of it", () => {
    const first = transformAt("hold", 0.1, 0, 3);
    const third = transformAt("hold", 0.1, 2, 3);
    expect(first.opacity).toBe(third.opacity);
  });
});

describe("the ones with a character by character reveal", () => {
  it("typeline reveals gradually rather than all at once", () => {
    expect(transformAt("typeline", 0.1, 0, 1).reveal).toBeLessThan(
      transformAt("typeline", 0.6, 0, 1).reveal,
    );
  });

  it("wipe-up reveals gradually too", () => {
    expect(transformAt("wipe-up", 0.1, 0, 1).reveal).toBeLessThan(1);
  });

  it("fade-rise does not clip its text, it moves it", () => {
    expect(transformAt("fade-rise", 0.3, 0, 1).reveal).toBe(1);
    expect(transformAt("fade-rise", 0.3, 0, 1).dy).not.toBe(0);
  });
});

describe("what each animation is for", () => {
  it("marks which ones suit a call to action", () => {
    const ctaSafe = ANIMATIONS.filter((a) => a.goodForCta);
    expect(ctaSafe.length).toBeGreaterThan(2);
    // Nothing that keeps moving at the end belongs on a call to action.
    for (const a of ctaSafe) {
      const end = transformAt(a.id, 0.95, 0, 2);
      expect(end.opacity).toBeGreaterThan(0.8);
    }
  });
});
