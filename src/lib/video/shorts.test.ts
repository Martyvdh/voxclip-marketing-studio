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

/**
 * Hier stond dat alle vijftig gelijk moesten zijn: vijf clips, veertien
 * seconden, overal donker, overal dezelfde afsluiter. Dat was de bedoeling en
 * het was fout — vijftig video's die je na de tweede niet meer uit elkaar houdt.
 *
 * De eis is omgedraaid. Ze delen een stem, geen scherm.
 */
describe("de vijftig delen een stem, geen vorm", () => {
  it("blijven kort genoeg voor een telefoon", () => {
    for (const starter of SHORT_STARTERS) {
      const total = starter
        .build(source)
        .clips.reduce((sum, c) => sum + c.seconds, 0);
      expect(total, starter.slug).toBeGreaterThanOrEqual(8);
      expect(total, starter.slug).toBeLessThanOrEqual(16);
    }
  });

  it("komen in vijf verschillende vormen voor", () => {
    const shapes = new Set(
      SHORT_STARTERS.map((starter) => {
        const project = starter.build(source);
        return `${project.ratio}|${project.clips.length}|${project.clips[0].animation}`;
      }),
    );
    expect(shapes.size).toBeGreaterThanOrEqual(5);
  });

  it("staan niet allemaal verticaal en niet allemaal donker", () => {
    const projects = SHORT_STARTERS.map((s) => s.build(source));
    expect(new Set(projects.map((p) => p.ratio)).size).toBeGreaterThan(1);
    const themes = new Set(projects.flatMap((p) => p.clips.map((c) => c.theme)));
    expect(themes.size).toBeGreaterThan(1);
  });

  it("eindigen wel allemaal met de link in het bijschrift", () => {
    // Dit is het stuk herhaling dat wel moet blijven: nergens een link in beeld.
    for (const starter of SHORT_STARTERS) {
      const clips = starter.build(source).clips;
      expect(clips[clips.length - 1].note, starter.slug).toContain("caption");
    }
  });

  it("gebruiken niet allemaal dezelfde afsluiter", () => {
    const endings = new Set(
      SHORT_STARTERS.map((s) => {
        const clips = s.build(source).clips;
        return clips[clips.length - 1].text;
      }),
    );
    expect(endings.size).toBeGreaterThanOrEqual(4);
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
