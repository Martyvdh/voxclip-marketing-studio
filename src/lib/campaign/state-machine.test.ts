import { describe, expect, it } from "vitest";

import type { CampaignStatus } from "@/db/schema";
import {
  ALL_STATUSES,
  LEGAL_TRANSITIONS,
  evaluateTransition,
  isTerminal,
  nextAction,
  type CampaignReadiness,
} from "./state-machine";

/** A campaign that is ready for anything. Each test takes away what it needs to. */
function ready(overrides: Partial<CampaignReadiness> = {}): CampaignReadiness {
  return {
    hasObjective: true,
    hasAudience: true,
    briefMissingFields: [],
    variantCount: 3,
    variantsFailingGate: 0,
    variantsNeedingAsset: 0,
    variantsAwaitingApproval: 0,
    approvalsBindToCurrentVersion: true,
    approverIsNotAuthor: true,
    scheduledCount: 2,
    successfulPublications: 0,
    inFlightPublications: 0,
    ...overrides,
  };
}

function reasons(from: CampaignStatus, to: CampaignStatus, r: CampaignReadiness) {
  const verdict = evaluateTransition(from, to, r);
  return verdict.allowed ? [] : verdict.reasons;
}

describe("the transition table", () => {
  it("covers every status", () => {
    for (const status of ALL_STATUSES) {
      expect(LEGAL_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("never lists a status that does not exist", () => {
    for (const targets of Object.values(LEGAL_TRANSITIONS)) {
      for (const target of targets) {
        expect(ALL_STATUSES).toContain(target);
      }
    }
  });

  it("treats ARCHIVED as terminal", () => {
    expect(LEGAL_TRANSITIONS.ARCHIVED).toEqual([]);
    expect(isTerminal("ARCHIVED")).toBe(true);
    expect(isTerminal("PUBLISHED")).toBe(false);
  });

  it("lets every non-terminal status be cancelled or archived, except while publishing", () => {
    for (const status of ALL_STATUSES) {
      if (isTerminal(status)) continue;
      // PUBLISHING is in flight at a provider. Cancelling there would leave us
      // unsure whether the post exists, which is exactly how duplicates happen.
      // It resolves to PUBLISHED or FAILED and is cancelled from there.
      if (status === "PUBLISHING") continue;
      const targets = LEGAL_TRANSITIONS[status];
      expect(
        targets.includes("CANCELLED") || targets.includes("ARCHIVED"),
      ).toBe(true);
    }
  });

  it("does not allow cancelling an in-flight publication", () => {
    expect(LEGAL_TRANSITIONS.PUBLISHING).toEqual(["PUBLISHED", "FAILED"]);
  });
});

describe("illegal transitions", () => {
  it("refuses a jump from IDEA straight to PUBLISHED", () => {
    const verdict = evaluateTransition("IDEA", "PUBLISHED", ready());
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) expect(verdict.code).toBe("ILLEGAL_TRANSITION");
  });

  it("refuses a transition out of a terminal status", () => {
    const verdict = evaluateTransition("ARCHIVED", "DRAFT", ready());
    expect(verdict.allowed).toBe(false);
  });

  it("refuses a transition to the same status", () => {
    const verdict = evaluateTransition("DRAFT", "DRAFT", ready());
    expect(verdict.allowed).toBe(false);
  });
});

describe("readiness gates", () => {
  it("needs an objective and an audience before a brief", () => {
    expect(
      reasons("IDEA", "BRIEF", ready({ hasObjective: false })),
    ).toContainEqual(expect.stringContaining("objective"));
    expect(
      reasons("IDEA", "BRIEF", ready({ hasAudience: false })),
    ).toContainEqual(expect.stringContaining("audience"));
  });

  it("needs a complete brief before drafting, and names what is missing", () => {
    const result = reasons(
      "BRIEF",
      "DRAFT",
      ready({ briefMissingFields: ["proof", "ctaUrl"] }),
    );
    expect(result.join(" ")).toContain("proof");
    expect(result.join(" ")).toContain("ctaUrl");
  });

  it("needs at least one variant before review", () => {
    expect(reasons("DRAFT", "IN_REVIEW", ready({ variantCount: 0 }))).toHaveLength(
      1,
    );
  });

  it("refuses review while a variant fails its quality gate", () => {
    expect(
      reasons("DRAFT", "IN_REVIEW", ready({ variantsFailingGate: 2 })).join(" "),
    ).toContain("quality");
  });

  it("routes to NEEDS_ASSET rather than review when proof is missing", () => {
    const toReview = evaluateTransition(
      "DRAFT",
      "IN_REVIEW",
      ready({ variantsNeedingAsset: 1 }),
    );
    expect(toReview.allowed).toBe(false);

    const toNeedsAsset = evaluateTransition(
      "DRAFT",
      "NEEDS_ASSET",
      ready({ variantsNeedingAsset: 1 }),
    );
    expect(toNeedsAsset.allowed).toBe(true);
  });

  it("refuses approval while a variant is still waiting on a reviewer", () => {
    expect(
      reasons("IN_REVIEW", "APPROVED", ready({ variantsAwaitingApproval: 1 }))
        .length,
    ).toBeGreaterThan(0);
  });

  it("refuses approval when the approver is the author", () => {
    expect(
      reasons("IN_REVIEW", "APPROVED", ready({ approverIsNotAuthor: false }))
        .join(" "),
    ).toContain("author");
  });

  it("refuses scheduling when the approval is for a different version", () => {
    expect(
      reasons(
        "APPROVED",
        "SCHEDULED",
        ready({ approvalsBindToCurrentVersion: false }),
      ).join(" "),
    ).toContain("version");
  });

  it("refuses scheduling with nothing scheduled", () => {
    expect(
      reasons("APPROVED", "SCHEDULED", ready({ scheduledCount: 0 })).length,
    ).toBeGreaterThan(0);
  });

  it("refuses PUBLISHED without a successful publication", () => {
    expect(
      reasons("PUBLISHING", "PUBLISHED", ready({ successfulPublications: 0 }))
        .length,
    ).toBeGreaterThan(0);
    expect(
      evaluateTransition(
        "PUBLISHING",
        "PUBLISHED",
        ready({ successfulPublications: 1 }),
      ).allowed,
    ).toBe(true);
  });
});

describe("the unhappy paths keep their history", () => {
  it("sends a rejected campaign back to DRAFT rather than deleting it", () => {
    expect(LEGAL_TRANSITIONS.REJECTED).toContain("DRAFT");
  });

  it("lets a failed publication be retried without a new campaign", () => {
    expect(LEGAL_TRANSITIONS.FAILED).toContain("SCHEDULED");
  });

  it("lets an approved campaign go back to DRAFT for a revision", () => {
    expect(LEGAL_TRANSITIONS.APPROVED).toContain("DRAFT");
  });

  it("refuses to re-schedule a failed campaign while an attempt is still in flight", () => {
    expect(
      reasons("FAILED", "SCHEDULED", ready({ inFlightPublications: 1 })).join(
        " ",
      ),
    ).toContain("in flight");
  });
});

describe("nextAction", () => {
  it("names one concrete next step for every status", () => {
    for (const status of ALL_STATUSES) {
      const action = nextAction(status, ready());
      expect(action.label.length).toBeGreaterThan(0);
      expect(action.detail.length).toBeGreaterThan(0);
    }
  });

  it("points at the missing brief field when that is what blocks progress", () => {
    const action = nextAction("BRIEF", ready({ briefMissingFields: ["proof"] }));
    expect(action.detail).toContain("proof");
  });

  it("points at the failing quality gate when that is what blocks progress", () => {
    const action = nextAction("DRAFT", ready({ variantsFailingGate: 1 }));
    expect(action.detail.toLowerCase()).toContain("quality");
  });
});
