import { describe, expect, it } from "vitest";

import type { VariantStatus } from "@/db/schema";
import {
  approvalIsStale,
  canApprove,
  canSendForReview,
  queueOrder,
  REVIEWABLE_FROM,
} from "./rules";

describe("canSendForReview", () => {
  it("allows a passing draft", () => {
    expect(
      canSendForReview({ status: "DRAFT", gatePassed: true }).allowed,
    ).toBe(true);
  });

  it("allows a variant that came back with changes requested", () => {
    expect(
      canSendForReview({ status: "CHANGES_REQUESTED", gatePassed: true }).allowed,
    ).toBe(true);
  });

  it("refuses a draft that fails the gate", () => {
    const verdict = canSendForReview({ status: "DRAFT", gatePassed: false });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/quality gate/i);
  });

  it("refuses to send the same thing twice", () => {
    expect(
      canSendForReview({ status: "IN_REVIEW", gatePassed: true }).allowed,
    ).toBe(false);
  });

  it("refuses anything already past review", () => {
    for (const status of ["APPROVED", "SCHEDULED", "PUBLISHED"] as VariantStatus[]) {
      expect(canSendForReview({ status, gatePassed: true }).allowed).toBe(false);
    }
  });

  it("gives a reason every time it refuses", () => {
    const statuses: VariantStatus[] = [
      "DRAFT",
      "NEEDS_ASSET",
      "IN_REVIEW",
      "CHANGES_REQUESTED",
      "APPROVED",
      "SCHEDULED",
      "PUBLISHING",
      "PUBLISHED",
      "FAILED",
      "ARCHIVED",
    ];

    for (const status of statuses) {
      for (const gatePassed of [true, false]) {
        const verdict = canSendForReview({ status, gatePassed });
        if (!verdict.allowed) {
          expect(verdict.reason, `${status}/${gatePassed}`).toBeTruthy();
        }
      }
    }
  });

  it("lists NEEDS_ASSET as reviewable, because the words can be read before the recording exists", () => {
    expect(REVIEWABLE_FROM).toContain("NEEDS_ASSET");
  });
});

describe("canApprove", () => {
  const base = {
    status: "IN_REVIEW" as VariantStatus,
    gatePassed: true,
    isOwner: false,
    hasCapability: true,
  };

  it("allows a reviewer who does not own the campaign", () => {
    expect(canApprove(base).allowed).toBe(true);
  });

  it("refuses the owner even when they have the capability", () => {
    const verdict = canApprove({ ...base, isOwner: true });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/someone else/i);
  });

  it("lets an admin approve their own campaign", () => {
    // A rule that stops the work on a team of two gets worked around rather
    // than followed. Allowed, and marked.
    const verdict = canApprove({ ...base, isOwner: true, isAdmin: true });
    expect(verdict.allowed).toBe(true);
    expect(verdict.selfApproval).toBe(true);
  });

  it("does not mark it as self-approved when somebody else reads it", () => {
    const verdict = canApprove({ ...base, isAdmin: true });
    expect(verdict.allowed).toBe(true);
    expect(verdict.selfApproval).toBeFalsy();
  });

  it("does not give a reviewer the exception", () => {
    expect(
      canApprove({ ...base, isOwner: true, isAdmin: false }).allowed,
    ).toBe(false);
  });

  it("still refuses an admin whose own version fails the gate", () => {
    // The exception is about who reads it, not about what may go out.
    expect(
      canApprove({ ...base, isOwner: true, isAdmin: true, gatePassed: false })
        .allowed,
    ).toBe(false);
  });

  it("still refuses an admin when nothing was sent for review", () => {
    expect(
      canApprove({ ...base, isOwner: true, isAdmin: true, status: "DRAFT" })
        .allowed,
    ).toBe(false);
  });

  it("refuses without the capability", () => {
    expect(canApprove({ ...base, hasCapability: false }).allowed).toBe(false);
  });

  it("refuses a version that fails the gate", () => {
    expect(canApprove({ ...base, gatePassed: false }).allowed).toBe(false);
  });

  it("refuses when nothing was sent for review", () => {
    expect(canApprove({ ...base, status: "DRAFT" }).allowed).toBe(false);
  });

  it("checks the capability before the admin exception", () => {
    // An admin flag on a role without the capability is not a way in.
    expect(
      canApprove({
        ...base,
        isOwner: true,
        isAdmin: true,
        hasCapability: false,
      }).allowed,
    ).toBe(false);
  });

  it("checks the capability before it mentions ownership", () => {
    // A viewer who happens to own the campaign should be told the plain thing:
    // their role cannot approve. Leading with ownership implies a role upgrade
    // would help, and it would not.
    const verdict = canApprove({ ...base, isOwner: true, hasCapability: false });
    expect(verdict.reason).toMatch(/role/i);
  });
});

describe("approvalIsStale", () => {
  it("is false when there is no approval yet", () => {
    expect(
      approvalIsStale({ approvedVersionId: null, currentVersionId: "v2" }),
    ).toBe(false);
  });

  it("is false when the approval matches what is on screen", () => {
    expect(
      approvalIsStale({ approvedVersionId: "v2", currentVersionId: "v2" }),
    ).toBe(false);
  });

  it("is true once the variant has been revised", () => {
    expect(
      approvalIsStale({ approvedVersionId: "v2", currentVersionId: "v3" }),
    ).toBe(true);
  });
});

describe("queueOrder", () => {
  const at = (iso: string) => new Date(iso);

  it("puts decisions ahead of work that is already back with the author", () => {
    const sorted = queueOrder([
      { status: "CHANGES_REQUESTED" as VariantStatus, updatedAt: at("2026-01-01") },
      { status: "IN_REVIEW" as VariantStatus, updatedAt: at("2026-06-01") },
    ]);

    expect(sorted[0].status).toBe("IN_REVIEW");
  });

  it("puts the oldest wait first within a status", () => {
    const sorted = queueOrder([
      { status: "IN_REVIEW" as VariantStatus, updatedAt: at("2026-06-01") },
      { status: "IN_REVIEW" as VariantStatus, updatedAt: at("2026-01-01") },
    ]);

    expect(sorted[0].updatedAt.toISOString()).toContain("2026-01-01");
  });

  it("does not mutate the array it was given", () => {
    const items = [
      { status: "CHANGES_REQUESTED" as VariantStatus, updatedAt: at("2026-01-01") },
      { status: "IN_REVIEW" as VariantStatus, updatedAt: at("2026-06-01") },
    ];
    queueOrder(items);
    expect(items[0].status).toBe("CHANGES_REQUESTED");
  });
});
