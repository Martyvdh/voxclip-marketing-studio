import { describe, expect, it } from "vitest";

import type { Pillar } from "@/db/schema";
import { filledCount, suggestBrief, type SuggestInput } from "./suggest";

const defaults = {
  pillar: "P1_ONE_PLACE" as Pillar,
  headline: "Alles wat je kopieert of zegt, op één plek.",
  subhead: "Eén tijdlijn, één zoekveld.",
  halfword: "Eén plek",
  example1: "Plak het adres dat je vanochtend kopieerde.",
  example2: "Vind de zin die je gisteren insprak.",
  payoff: "Niets kwijt.",
};

const input = (over: Partial<SuggestInput> = {}): SuggestInput => ({
  pillar: "P1_ONE_PLACE",
  defaults,
  hooks: [
    {
      code: "SF02",
      family: "short",
      pillar: "P1_ONE_PLACE",
      text: "Je zoekt in drie apps naar iets wat je vijf minuten geleden had.",
    },
    {
      code: "SF01",
      family: "linkedin",
      pillar: "P1_ONE_PLACE",
      text: "Kopiëren en iets zeggen zijn dezelfde gewoonte.",
    },
    {
      code: "PR01",
      family: "short",
      pillar: "P3_YOUR_STUFF_STAYS_YOURS",
      text: "Je plakbord is een dagboek dat je nooit hebt gelezen.",
    },
  ],
  ctas: [
    { family: "short", text: "Download VoxClip" },
    { family: "linkedin", text: "Probeer het gratis" },
  ],
  claims: [
    {
      key: "identity.one_liner",
      status: "VERIFIED",
      statement: "VoxClip legt alles vast wat je kopieert en dicteert.",
    },
    {
      key: "hotkey.quickpicker.macos",
      status: "UNVERIFIED",
      statement: "De Quick-picker opent met een sneltoets.",
    },
  ],
  ...over,
});

describe("suggestBrief", () => {
  it("vult alle zeven velden als het materiaal er is", () => {
    expect(filledCount(suggestBrief(input()))).toBe(7);
  });

  it("zet de pijlerkop in de belofte", () => {
    expect(suggestBrief(input()).promise).toBe(defaults.headline);
  });

  it("pakt een hook van de juiste pijler", () => {
    expect(suggestBrief(input()).problem).toContain("drie apps");
  });

  it("pakt nooit een hook van een andere pijler", () => {
    const suggestion = suggestBrief(
      input({ pillar: "P4_FREE_WHERE_LOCAL", defaults: undefined }),
    );
    expect(suggestion.problem).toBe("");
  });

  it("geeft twee keer hetzelfde antwoord", () => {
    // Anders klik je door tot het goed klinkt, en dat is het tegenovergestelde
    // van zelf nadenken.
    expect(suggestBrief(input())).toEqual(suggestBrief(input()));
  });

  it("kiest niet op volgorde van de database maar op hookcode", () => {
    const reversed = input();
    reversed.hooks.reverse();
    expect(suggestBrief(reversed).problem).toBe(suggestBrief(input()).problem);
  });
});

describe("bewijs komt alleen uit geverifieerde feiten", () => {
  it("gebruikt een geverifieerd feit", () => {
    expect(suggestBrief(input()).proof).toContain("kopieert en dicteert");
  });

  it("gebruikt nooit een feit dat nog niet geverifieerd is", () => {
    const suggestion = suggestBrief(
      input({
        claims: [
          {
            key: "identity.one_liner",
            status: "UNVERIFIED",
            statement: "Iets wat nog niemand heeft gecontroleerd.",
          },
        ],
      }),
    );

    expect(suggestion.proof).toBe("");
    expect(suggestion.gaps.join(" ")).toMatch(/geverifieerd feit/i);
  });

  it("laat het veld leeg in plaats van er iets aannemelijks in te zetten", () => {
    const suggestion = suggestBrief(input({ claims: [] }));
    expect(suggestion.proof).toBe("");
  });

  it("kiest per pijler een passend feit", () => {
    const suggestion = suggestBrief(
      input({
        pillar: "P3_YOUR_STUFF_STAYS_YOURS",
        defaults: { ...defaults, pillar: "P3_YOUR_STUFF_STAYS_YOURS" },
        claims: [
          {
            key: "privacy.local_first",
            status: "VERIFIED",
            statement: "De tijdlijn staat op je eigen apparaat.",
          },
          {
            key: "identity.one_liner",
            status: "VERIFIED",
            statement: "Niet het feit dat hierbij hoort.",
          },
        ],
      }),
    );

    expect(suggestion.proof).toContain("eigen apparaat");
  });
});

describe("wat er ontbreekt wordt gezegd", () => {
  it("noemt een ontbrekende pijlertekst", () => {
    const suggestion = suggestBrief(input({ defaults: undefined }));
    expect(suggestion.gaps.join(" ")).toMatch(/pijlertekst/i);
    expect(suggestion.promise).toBe("");
  });

  it("noemt een lege hookbibliotheek", () => {
    const suggestion = suggestBrief(input({ hooks: [] }));
    expect(suggestion.gaps.join(" ")).toMatch(/hook/i);
  });

  it("valt terug op een cta als er geen enkele in de database staat", () => {
    const suggestion = suggestBrief(input({ ctas: [] }));
    expect(suggestion.primaryCta.length).toBeGreaterThan(0);
  });

  it("vertelt per veld waar het vandaan komt", () => {
    const suggestion = suggestBrief(input());
    expect(suggestion.sources.length).toBeGreaterThanOrEqual(4);
    expect(suggestion.sources.join(" ")).toContain("SF02");
  });

  it("verzint geen bronnen voor velden die leeg bleven", () => {
    const suggestion = suggestBrief(
      input({ defaults: undefined, hooks: [], claims: [] }),
    );
    expect(suggestion.sources.join(" ")).not.toMatch(/hook|feit|pijlertekst/i);
  });
});
