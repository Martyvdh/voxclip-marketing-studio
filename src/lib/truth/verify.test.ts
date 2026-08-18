import { describe, expect, it } from "vitest";

import type { ClaimKind } from "@/db/schema";
import {
  canVerify,
  hotkeyWarning,
  isDue,
  looksLikeHotkey,
  nextReviewFor,
  NEEDS_VALUE,
  REVIEW_MONTHS,
  validateVerification,
} from "./verify";

describe("validateVerification", () => {
  const input = (over: Partial<Parameters<typeof validateVerification>[0]> = {}) =>
    validateVerification({
      kind: "HOTKEY",
      value: "⌥Space",
      checkedAgainst: "Build 0.4.2 op deze Mac",
      ...over,
    });

  it("laat een sneltoets met waarde en bron door", () => {
    expect(input()).toEqual({});
  });

  it("eist een waarde bij een sneltoets", () => {
    expect(input({ value: "" }).value).toBeTruthy();
    expect(input({ value: "   " }).value).toBeTruthy();
  });

  it("eist een waarde bij een prijs en een versie", () => {
    expect(input({ kind: "PRICING", value: "" }).value).toBeTruthy();
    expect(input({ kind: "RELEASE", value: "" }).value).toBeTruthy();
  });

  it("eist geen waarde bij een feit dat een zin is", () => {
    expect(input({ kind: "PRIVACY", value: "" }).value).toBeUndefined();
  });

  it("eist altijd een bron, ook bij een feit zonder waarde", () => {
    const errors = input({ kind: "PRIVACY", value: "", checkedAgainst: "" });
    expect(errors.checkedAgainst).toBeTruthy();
  });

  it("neemt geen genoegen met een bron van twee tekens", () => {
    expect(input({ checkedAgainst: "ja" }).checkedAgainst).toBeTruthy();
  });

  it("noemt beide problemen tegelijk", () => {
    const errors = input({ value: "", checkedAgainst: "" });
    expect(Object.keys(errors).sort()).toEqual(["checkedAgainst", "value"]);
  });
});

describe("de reviewdatum hangt af van hoe snel iets veroudert", () => {
  const from = new Date("2026-08-17T12:00:00Z");

  it("geeft een versienummer een maand", () => {
    expect(nextReviewFor("RELEASE", from).toISOString().slice(0, 7)).toBe(
      "2026-09",
    );
  });

  it("geeft een prijs een jaar", () => {
    expect(nextReviewFor("PRICING", from).toISOString().slice(0, 4)).toBe("2027");
  });

  it("geeft een sneltoets drie maanden", () => {
    expect(nextReviewFor("HOTKEY", from).toISOString().slice(0, 7)).toBe(
      "2026-11",
    );
  });

  it("heeft voor elke soort een termijn, zodat niets zonder datum blijft", () => {
    const kinds: ClaimKind[] = [
      "PLATFORM",
      "PRICING",
      "CAPABILITY_FREE",
      "CAPABILITY_PLUS",
      "PRIVACY",
      "HOTKEY",
      "RELEASE",
      "IDENTITY",
      "CUT_LIST",
      "PROHIBITED",
    ];
    for (const kind of kinds) {
      expect(REVIEW_MONTHS[kind], kind).toBeGreaterThan(0);
    }
  });

  it("zet de kortste termijn op wat het snelst veroudert", () => {
    expect(REVIEW_MONTHS.RELEASE).toBeLessThan(REVIEW_MONTHS.PRICING);
    expect(NEEDS_VALUE).toContain("RELEASE");
  });
});

describe("sneltoetsen worden geschreven zoals brand.md het vraagt", () => {
  it("herkent Mac-glyphs", () => {
    expect(looksLikeHotkey("⌥Space")).toBe(true);
    expect(looksLikeHotkey("⌥⌘V")).toBe(true);
  });

  it("herkent een Windows-combinatie", () => {
    expect(looksLikeHotkey("Ctrl+Shift+V")).toBe(true);
  });

  it("herkent uitgeschreven tekst niet als sneltoets", () => {
    expect(looksLikeHotkey("command shift spatie")).toBe(false);
    expect(looksLikeHotkey("")).toBe(false);
  });

  it("waarschuwt, maar blokkeert niet", () => {
    const warning = hotkeyWarning("HOTKEY", "command shift spatie");
    expect(warning).toMatch(/⌥Space/);
    expect(warning).toMatch(/laat het dan staan/i);
  });

  it("zwijgt als het goed staat", () => {
    expect(hotkeyWarning("HOTKEY", "Ctrl+Shift+V")).toBeNull();
  });

  it("bemoeit zich niet met andere soorten feiten", () => {
    expect(hotkeyWarning("PRICING", "6.99")).toBeNull();
  });
});

describe("isDue", () => {
  const now = new Date("2026-08-17T12:00:00Z");

  it("is waar zolang iets niet geverifieerd is", () => {
    expect(isDue({ status: "UNVERIFIED", nextReviewAt: null }, now)).toBe(true);
  });

  it("is waar als de reviewdatum voorbij is", () => {
    expect(
      isDue({ status: "VERIFIED", nextReviewAt: new Date("2026-01-01") }, now),
    ).toBe(true);
  });

  it("is onwaar voor een vers geverifieerd feit", () => {
    expect(
      isDue({ status: "VERIFIED", nextReviewAt: new Date("2026-12-01") }, now),
    ).toBe(false);
  });

  it("is waar bij een geverifieerd feit zonder datum, want dan weet niemand het", () => {
    expect(isDue({ status: "VERIFIED", nextReviewAt: null }, now)).toBe(true);
  });
});

describe("canVerify", () => {
  it("laat een reviewer door", () => {
    expect(canVerify(true).allowed).toBe(true);
  });

  it("legt uit waarom niet, in plaats van alleen te weigeren", () => {
    const verdict = canVerify(false);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/reviewer|beheerder/i);
  });
});
