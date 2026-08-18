import { describe, expect, it } from "vitest";

import {
  AUDIENCE_LIBRARY,
  DEMO_LIBRARY,
  EXPLAINER_LIBRARY,
  FEATURE_LIBRARY,
  OBJECTION_LIBRARY,
} from "./library";
import { MAX_CLIP_SECONDS, MIN_CLIP_SECONDS } from "./project";
import {
  ALL_STARTERS,
  STARTER_GROUPS,
  matchesQuery,
  starterMeta,
} from "./starters";

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

/** Alle tekst die een startpunt op het scherm zet. Notities tellen niet mee:
 *  die staan in de editor en worden nooit getekend. */
function drawnText(starter: (typeof ALL_STARTERS)[number]): string {
  return starter
    .build(source)
    .clips.map((c) => `${c.text} ${c.secondary}`)
    .join(" ");
}

describe("de bibliotheek", () => {
  it("levert genoeg startpunten om uit te kiezen", () => {
    expect(ALL_STARTERS.length).toBeGreaterThanOrEqual(150);
  });

  it("heeft geen dubbele slugs", () => {
    const slugs = ALL_STARTERS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("laat elke familie in de kiezer zien", () => {
    const inGroups = new Set(
      STARTER_GROUPS.flatMap((g) => g.starters.map((s) => s.slug)),
    );
    for (const starter of ALL_STARTERS) {
      expect(inGroups.has(starter.slug), `${starter.slug} zit in geen familie`).toBe(
        true,
      );
    }
  });

  it("bouwt elk startpunt zonder om te vallen", () => {
    for (const starter of ALL_STARTERS) {
      const project = starter.build(source);
      // "Blank" is er met opzet één. De rest heeft er meer.
      expect(project.clips.length, starter.slug).toBeGreaterThanOrEqual(1);
      for (const clip of project.clips) {
        expect(clip.seconds, starter.slug).toBeGreaterThanOrEqual(MIN_CLIP_SECONDS);
        expect(clip.seconds, starter.slug).toBeLessThanOrEqual(MAX_CLIP_SECONDS);
      }
    }
  });
});

describe("wat er niet in mag staan", () => {
  // De sneltoets stond overal verkeerd. ⌘⇧Space start dictation; de
  // Quick-picker is ⌥Space. Zie docs/product-truth.md.
  it("noemt nooit de dictation-toets als recall", () => {
    for (const starter of ALL_STARTERS) {
      expect(drawnText(starter), starter.slug).not.toContain("⌘⇧Space");
    }
  });

  // Zeggen dát iets er niet is, is juist goed: "No Linux, no phone. On purpose."
  // Wat niet mag is het beloven. Dus zoeken we naar de belofte, niet naar het woord.
  it("belooft niets van de niet-doen-lijst", () => {
    const promises = [
      "on linux",
      "for linux",
      "on android",
      "for android",
      "on your phone",
      "browser extension",
      "plug-in",
      "meeting notes",
      "transcribe your meeting",
    ];
    for (const starter of ALL_STARTERS) {
      const text = drawnText(starter).toLowerCase();
      for (const phrase of promises) {
        expect(text, `${starter.slug} belooft ${phrase}`).not.toContain(phrase);
      }
    }
  });

  it("schrijft geen reclametaal", () => {
    const banned = [
      "supercharge",
      "seamless",
      "revolutionary",
      "game-changing",
      "leverage",
      "synergy",
      "ai-powered",
    ];
    for (const starter of ALL_STARTERS) {
      const text = drawnText(starter).toLowerCase();
      for (const word of banned) {
        expect(text, `${starter.slug} zegt ${word}`).not.toContain(word);
      }
    }
  });

  it("gebruikt geen uitroeptekens", () => {
    for (const starter of ALL_STARTERS) {
      expect(drawnText(starter), starter.slug).not.toContain("!");
    }
  });
});

describe("starterMeta", () => {
  it("telt de seconden van de clips op", () => {
    const meta = starterMeta(DEMO_LIBRARY[0], source);
    const project = DEMO_LIBRARY[0].build(source);
    expect(meta.seconds).toBeCloseTo(
      project.clips.reduce((t, c) => t + c.seconds, 0),
      5,
    );
  });

  it("ziet welke clips op een opname wachten", () => {
    // Elke demo heeft er precies één, en dat is het punt van die familie.
    for (const starter of DEMO_LIBRARY) {
      expect(starterMeta(starter, source).shotsToRecord, starter.slug).toBe(1);
    }
  });

  it("meldt bij de uitleggers dat er niets opgenomen hoeft te worden", () => {
    for (const starter of EXPLAINER_LIBRARY) {
      expect(starterMeta(starter, source).shotsToRecord, starter.slug).toBe(0);
    }
  });

  it("geeft de vorm door die het startpunt zelf koos", () => {
    const square = FEATURE_LIBRARY.find((s) => s.slug === "feat-templates");
    expect(square && starterMeta(square, source).ratio).toBe("1:1");
  });
});

describe("matchesQuery", () => {
  it("vindt op een woord uit de naam", () => {
    const starter = OBJECTION_LIBRARY[0];
    expect(matchesQuery(starter, "Questions", "copy")).toBe(true);
  });

  it("vindt op de familienaam", () => {
    expect(matchesQuery(AUDIENCE_LIBRARY[0], "Who it is for", "who")).toBe(true);
  });

  it("wil alle woorden terugzien, niet één", () => {
    const starter = AUDIENCE_LIBRARY[0];
    expect(matchesQuery(starter, "Who it is for", "write living")).toBe(true);
    expect(matchesQuery(starter, "Who it is for", "write bicycle")).toBe(false);
  });

  it("laat alles staan bij een leeg zoekveld", () => {
    expect(matchesQuery(FEATURE_LIBRARY[0], "One feature", "   ")).toBe(true);
  });
});
