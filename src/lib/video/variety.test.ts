import { describe, expect, it } from "vitest";

import { CLOSERS, closerFor, hashSlug, showsMark } from "./closers";
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

/**
 * De klacht was niet dat er iets stuk was. Het was dat honderdvijftig video's
 * er één leken, en dat de laatste zes seconden overal woordelijk gelijk waren.
 * Dat is geen bug die een typecheck vindt, dus staat hij hier.
 */
describe("de startpunten lijken niet op elkaar", () => {
  const built = ALL_STARTERS.map((starter) => ({
    slug: starter.slug,
    project: starter.build(source),
  }));

  it("gebruikt alle drie de vormen", () => {
    const ratios = new Set(built.map((b) => b.project.ratio));
    expect(ratios.size).toBeGreaterThanOrEqual(3);
  });

  it("staat niet overal met het merkteken in beeld", () => {
    const withMark = built.filter((b) => b.project.showMark).length;
    expect(withMark).toBeGreaterThan(0);
    expect(withMark).toBeLessThan(built.length);
  });

  it("laat geen enkele animatie de dienst uitmaken", () => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const { project } of built) {
      for (const clip of project.clips) {
        counts.set(clip.animation, (counts.get(clip.animation) ?? 0) + 1);
        total += 1;
      }
    }
    // Zeven van de tien animaties moeten voorkomen, en geen enkele mag meer dan
    // een kwart van alle clips zijn.
    expect(counts.size).toBeGreaterThanOrEqual(7);
    for (const [animation, n] of counts) {
      expect(n / total, `${animation} is ${Math.round((n / total) * 100)}% van alles`).toBeLessThan(
        0.25,
      );
    }
  });

  it("varieert de lengte", () => {
    const lengths = built.map((b) =>
      b.project.clips.reduce((t, c) => t + c.seconds, 0),
    );
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(5);
  });

  it("varieert het aantal clips", () => {
    const counts = new Set(built.map((b) => b.project.clips.length));
    expect(counts.size).toBeGreaterThanOrEqual(4);
  });

  it("eindigt niet overal op hetzelfde scherm", () => {
    const endings = new Map<string, number>();
    for (const { project } of built) {
      const last = project.clips[project.clips.length - 1];
      const key = `${last.text}|${last.secondary}|${last.animation}|${last.theme}`;
      endings.set(key, (endings.get(key) ?? 0) + 1);
    }
    expect(endings.size).toBeGreaterThanOrEqual(6);
    for (const [ending, n] of endings) {
      expect(n / built.length, `dit einde is ${Math.round((n / built.length) * 100)}%: ${ending}`)
        .toBeLessThan(0.35);
    }
  });

  it("gebruikt beide uitlijningen", () => {
    const aligns = new Set(
      built.flatMap((b) => b.project.clips.map((c) => c.align)),
    );
    expect(aligns.size).toBe(2);
  });
});

describe("de afsluiters", () => {
  it("kiest er altijd dezelfde bij dezelfde slug", () => {
    // Anders is ongedaan maken onvoorspelbaar en een export onherhaalbaar.
    const once = closerFor("demo-recall-basic", source);
    const twice = closerFor("demo-recall-basic", source);
    expect(once.text).toBe(twice.text);
    expect(once.animation).toBe(twice.animation);
  });

  it("verdeelt de startpunten over alle acht", () => {
    const used = new Set(ALL_STARTERS.map((s) => hashSlug(s.slug) % CLOSERS.length));
    expect(used.size).toBe(CLOSERS.length);
  });

  it("laat overal weten waar de link hoort", () => {
    for (const closer of CLOSERS) {
      expect(closer.build({ ctaLabel: "Try it free" }).note).toContain("caption");
    }
  });
});

describe("hashSlug", () => {
  it("geeft hetzelfde getal voor dezelfde tekst", () => {
    expect(hashSlug("abc")).toBe(hashSlug("abc"));
  });

  it("geeft verschillende getallen voor verschillende tekst", () => {
    expect(hashSlug("abc")).not.toBe(hashSlug("abd"));
  });

  it("blijft een positief geheel getal", () => {
    for (const slug of ALL_STARTERS.map((s) => s.slug)) {
      const hash = hashSlug(slug);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
    }
  });

  it("beslist stabiel of het merkteken meedoet", () => {
    expect(showsMark("demo-recall-basic")).toBe(showsMark("demo-recall-basic"));
  });
});
