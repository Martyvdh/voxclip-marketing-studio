import { describe, expect, it } from "vitest";

import { APP_STARTERS } from "./app-starters";
import {
  FILTERS,
  HOTKEY,
  SAMPLE_ROWS,
  SEARCH_PLACEHOLDER,
  visibleRows,
} from "./app-frame";

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
 * Dit tekent de interface, en dat mag alleen zolang het klopt met de app.
 * Deze tests zijn de grens: gaat er iets in staan dat er niet is, dan valt de
 * build om in plaats van dat het in een video terechtkomt.
 */
describe("wat het venster toont", () => {
  it("gebruikt de sneltoets van de Quick-picker", () => {
    // ⌘⇧Space start dictation. Zie docs/product-truth.md.
    expect(HOTKEY).toBe("⌥Space");
  });

  it("toont de drie filters die de app heeft", () => {
    expect([...FILTERS]).toEqual(["All", "Copied", "Spoke"]);
  });

  it("gebruikt de echte plaatshouder van het zoekveld", () => {
    expect(SEARCH_PLACEHOLDER).toBe("Search everything you've copied or said");
  });

  it("zet geen volledig adres in de voorbeeldrijen", () => {
    // Straat plus huisnummer plus postcode is iemands voordeur, ook verzonnen.
    for (const row of SAMPLE_ROWS) {
      expect(row.text, row.text).not.toMatch(/\d{4}\s?[A-Z]{2}\b/);
      expect(row.text, row.text).not.toMatch(
        /(straat|laan|weg|plein|kade|gracht)\s*\d/i,
      );
    }
  });
});

describe("visibleRows", () => {
  it("laat alles zien zonder zoekterm en zonder filter", () => {
    expect(visibleRows(SAMPLE_ROWS, "", 0)).toHaveLength(SAMPLE_ROWS.length);
  });

  it("filtert op de zoekterm", () => {
    const rows = visibleRows(SAMPLE_ROWS, "invo", 0);
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toContain("invoice");
  });

  it("laat bij Copied de gesproken regels weg", () => {
    const rows = visibleRows(SAMPLE_ROWS, "", 1);
    expect(rows.every((r) => r.kind !== "SPOKE")).toBe(true);
    expect(rows.length).toBeLessThan(SAMPLE_ROWS.length);
  });

  it("laat bij Spoke alleen de gesproken regels zien", () => {
    const rows = visibleRows(SAMPLE_ROWS, "", 2);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.kind === "SPOKE")).toBe(true);
  });
});

describe("de startpunten met het venster", () => {
  it("zijn er vijf", () => {
    expect(APP_STARTERS).toHaveLength(5);
  });

  it("hebben geen enkele clip die op een opname wacht", () => {
    // Dat is het punt: deze kun je vandaag exporteren.
    for (const starter of APP_STARTERS) {
      for (const clip of starter.build(source).clips) {
        expect((clip.note ?? "").toLowerCase().startsWith("record"), starter.slug).toBe(
          false,
        );
      }
    }
  });

  it("tekenen het venster in elke clip behalve de afsluiter", () => {
    for (const starter of APP_STARTERS) {
      const clips = starter.build(source).clips;
      for (const clip of clips.slice(0, -1)) {
        expect(clip.theme, starter.slug).toBe("app");
      }
    }
  });

  it("noemen nergens de dictation-toets als recall", () => {
    for (const starter of APP_STARTERS) {
      const text = starter
        .build(source)
        .clips.map((c) => `${c.text} ${c.secondary}`)
        .join(" ");
      expect(text, starter.slug).not.toContain("⌘⇧Space");
    }
  });
});
