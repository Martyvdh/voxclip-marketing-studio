import { describe, expect, it } from "vitest";

import { nextStep, TOTAL_STEPS, type CoachState } from "./steps";

const state = (over: Partial<CoachState> = {}): CoachState => ({
  unverifiedFacts: 0,
  campaignCount: 2,
  focus: undefined,
  awaitingReview: 0,
  approvedNotPlanned: 0,
  duePosts: 0,
  postedWithoutResults: 0,
  ...over,
});

const focus = (over: Partial<NonNullable<CoachState["focus"]>> = {}) => ({
  slug: "een-plek",
  title: "Eén plek",
  actionLabel: "Send for review",
  actionDetail: "Alles komt door de controle.",
  status: "DRAFT",
  variantCount: 2,
  variantsFailingGate: 0,
  ...over,
});

describe("de eerste keer", () => {
  it("stuurt je naar Product Truth voordat je iets aanmaakt", () => {
    const step = nextStep(state({ unverifiedFacts: 3, campaignCount: 0 }));
    expect(step?.href).toBe("/truth");
    expect(step?.title).toContain("3 feiten");
  });

  it("stuurt daarna naar een eerste campagne", () => {
    const step = nextStep(state({ campaignCount: 0 }));
    expect(step?.href).toBe("/campaigns/new");
    expect(step?.number).toBe(1);
  });

  it("schrijft enkelvoud bij één feit", () => {
    const step = nextStep(state({ unverifiedFacts: 1, campaignCount: 0 }));
    expect(step?.title).toBe("Verifieer eerst 1 feit");
    expect(step?.title).not.toContain("feiten");
  });
});

describe("de stappen in een campagne", () => {
  it("wijst op de brief zolang de campagne een idee is", () => {
    const step = nextStep(state({ focus: focus({ status: "IDEA" }) }));
    expect(step?.href).toBe("/campaigns/een-plek/brief");
    expect(step?.number).toBe(2);
  });

  it("wijst op de teksten zodra de brief er is", () => {
    const step = nextStep(
      state({ focus: focus({ status: "BRIEF", variantCount: 0 }) }),
    );
    expect(step?.number).toBe(3);
  });

  it("zet blokkades vóór alles binnen die campagne", () => {
    const step = nextStep(
      state({ focus: focus({ status: "IDEA", variantsFailingGate: 2 }) }),
    );
    expect(step?.number).toBe(4);
    expect(step?.title).toMatch(/blokkades/i);
  });

  it("wijst op review als alles door de controle komt", () => {
    const step = nextStep(state({ focus: focus() }));
    expect(step?.number).toBe(5);
    expect(step?.title).toMatch(/naar review/i);
  });

  it("gebruikt de tekst van de statemachine voor statussen die het niet kent", () => {
    const step = nextStep(
      state({
        focus: focus({
          status: "FAILED",
          actionLabel: "Retry safely",
          actionDetail: "De poging hield zijn diagnostiek.",
        }),
      }),
    );
    expect(step?.title).toContain("Retry safely");
    expect(step?.body).toContain("diagnostiek");
  });
});

describe("wat het eerst noemt", () => {
  it("zet ontbrekende cijfers boven al het andere werk", () => {
    // Cijfers invullen is het enige dat je echt vergeet, en zonder cijfers
    // heeft de rest geen zin gehad.
    const step = nextStep(
      state({
        postedWithoutResults: 1,
        duePosts: 2,
        awaitingReview: 3,
        focus: focus(),
      }),
    );
    expect(step?.number).toBe(9);
  });

  it("zet posten die klaarstaan boven review", () => {
    const step = nextStep(state({ duePosts: 1, awaitingReview: 2 }));
    expect(step?.number).toBe(8);
  });

  it("zet review boven inplannen", () => {
    const step = nextStep(state({ awaitingReview: 1, approvedNotPlanned: 1 }));
    expect(step?.number).toBe(6);
  });

  it("zet inplannen boven het werk in een campagne", () => {
    const step = nextStep(state({ approvedNotPlanned: 1, focus: focus() }));
    expect(step?.number).toBe(7);
  });

  it("noemt Product Truth pas als laatste als er campagnes zijn", () => {
    // Anders staat er een herinnering over feiten terwijl er iets dringender is.
    const withWork = nextStep(state({ unverifiedFacts: 3, focus: focus() }));
    expect(withWork?.href).toBe("/campaigns/een-plek");

    const withoutWork = nextStep(state({ unverifiedFacts: 3 }));
    expect(withoutWork?.href).toBe("/truth");
  });
});

describe("als er niets te doen is", () => {
  it("geeft niets terug in plaats van een lege aanmoediging", () => {
    expect(nextStep(state())).toBeNull();
  });
});

describe("elke stap is bruikbaar", () => {
  const cases: CoachState[] = [
    state({ unverifiedFacts: 2, campaignCount: 0 }),
    state({ campaignCount: 0 }),
    state({ focus: focus({ status: "IDEA" }) }),
    state({ focus: focus({ status: "BRIEF", variantCount: 0 }) }),
    state({ focus: focus({ variantsFailingGate: 1 }) }),
    state({ focus: focus() }),
    state({ awaitingReview: 1 }),
    state({ approvedNotPlanned: 1 }),
    state({ duePosts: 1 }),
    state({ postedWithoutResults: 1 }),
  ];

  it("heeft altijd een titel, een uitleg en een werkende link", () => {
    for (const input of cases) {
      const step = nextStep(input);
      expect(step).not.toBeNull();
      expect(step!.title.length).toBeGreaterThan(5);
      expect(step!.body.length).toBeGreaterThan(20);
      expect(step!.href.startsWith("/")).toBe(true);
      expect(step!.linkLabel.length).toBeGreaterThan(3);
    }
  });

  it("houdt het stapnummer binnen de negen", () => {
    for (const input of cases) {
      const step = nextStep(input);
      expect(step!.number).toBeGreaterThanOrEqual(0);
      expect(step!.number).toBeLessThanOrEqual(TOTAL_STEPS);
      expect(step!.total).toBe(TOTAL_STEPS);
    }
  });
});
