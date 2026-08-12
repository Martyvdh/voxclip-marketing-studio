/**
 * The campaign lifecycle.
 *
 * Idea -> Brief -> Draft -> Needs asset -> In review -> Approved -> Scheduled
 *      -> Publishing -> Published, with Rejected, Failed, Cancelled, and Archived
 *      as the exception routes.
 *
 * Two things are enforced here and nowhere else:
 *  1. Which transitions exist at all.
 *  2. What has to be true before a transition is allowed.
 *
 * Pure functions. The caller loads the readiness facts from the database and
 * this module decides. That keeps the rules testable and keeps the server the
 * only authority.
 */

import type { CampaignStatus } from "@/db/schema";

export const ALL_STATUSES: CampaignStatus[] = [
  "IDEA",
  "BRIEF",
  "DRAFT",
  "NEEDS_ASSET",
  "IN_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "REJECTED",
  "FAILED",
  "CANCELLED",
  "ARCHIVED",
];

export const LEGAL_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  IDEA: ["BRIEF", "CANCELLED", "ARCHIVED"],
  BRIEF: ["DRAFT", "IDEA", "CANCELLED"],
  DRAFT: ["NEEDS_ASSET", "IN_REVIEW", "BRIEF", "CANCELLED"],
  NEEDS_ASSET: ["DRAFT", "IN_REVIEW", "CANCELLED"],
  IN_REVIEW: ["APPROVED", "REJECTED", "DRAFT", "CANCELLED"],
  // An approved campaign can still be revised. It goes back to DRAFT and the
  // approval no longer binds, because approval is tied to an exact version.
  APPROVED: ["SCHEDULED", "DRAFT", "CANCELLED"],
  SCHEDULED: ["PUBLISHING", "APPROVED", "CANCELLED"],
  PUBLISHING: ["PUBLISHED", "FAILED"],
  PUBLISHED: ["ARCHIVED"],
  // Rejected work is never deleted. It goes back to the author with its history.
  REJECTED: ["DRAFT", "ARCHIVED"],
  // A failed publication keeps its diagnostics and can be retried safely.
  FAILED: ["SCHEDULED", "APPROVED", "ARCHIVED"],
  CANCELLED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function isTerminal(status: CampaignStatus): boolean {
  return LEGAL_TRANSITIONS[status].length === 0;
}

/**
 * The facts a transition decision needs. The caller reads these from the
 * database in one query; this module never touches the database itself.
 */
export interface CampaignReadiness {
  hasObjective: boolean;
  hasAudience: boolean;
  /** Names of brief fields that are still empty. */
  briefMissingFields: string[];
  variantCount: number;
  /** Variants whose current version fails the quality gate. */
  variantsFailingGate: number;
  /** Variants whose format requires a proof asset that is not attached yet. */
  variantsNeedingAsset: number;
  /** Variants that have been sent for review and have no decision yet. */
  variantsAwaitingApproval: number;
  /** False when an approval points at a version that is no longer current. */
  approvalsBindToCurrentVersion: boolean;
  /** False when the only approver is the person who wrote it. */
  approverIsNotAuthor: boolean;
  scheduledCount: number;
  successfulPublications: number;
  /** Attempts that started and have not finished. Blocks a retry. */
  inFlightPublications: number;
}

export type TransitionVerdict =
  | { allowed: true }
  | {
      allowed: false;
      code: "ILLEGAL_TRANSITION" | "NOT_READY";
      reasons: string[];
    };

/** What has to be true before entering each status. */
function requirementsFor(
  to: CampaignStatus,
  r: CampaignReadiness,
): string[] {
  const reasons: string[] = [];

  switch (to) {
    case "BRIEF":
      if (!r.hasObjective)
        reasons.push("Write the objective: what changes if this works.");
      if (!r.hasAudience)
        reasons.push("Pick the audience this campaign speaks to.");
      break;

    case "DRAFT":
      if (r.briefMissingFields.length > 0)
        reasons.push(
          `The brief is not finished. Still empty: ${r.briefMissingFields.join(", ")}.`,
        );
      break;

    case "NEEDS_ASSET":
      // Always reachable from DRAFT. It exists to make the missing proof visible.
      break;

    case "IN_REVIEW":
      if (r.variantCount === 0)
        reasons.push("There is nothing to review yet. Create at least one channel variant.");
      if (r.variantsNeedingAsset > 0)
        reasons.push(
          `${r.variantsNeedingAsset} variant(s) still need a real proof screenshot or recording. Move to Needs asset instead.`,
        );
      if (r.variantsFailingGate > 0)
        reasons.push(
          `${r.variantsFailingGate} variant(s) fail the quality gate. Fix the blockers before asking anyone to read this.`,
        );
      break;

    case "APPROVED":
      if (r.variantsAwaitingApproval > 0)
        reasons.push(
          `${r.variantsAwaitingApproval} variant(s) are still waiting on a reviewer.`,
        );
      if (!r.approverIsNotAuthor)
        reasons.push(
          "The approver is the author. Someone else has to read it before it goes out.",
        );
      if (r.variantsFailingGate > 0)
        reasons.push(
          `${r.variantsFailingGate} variant(s) fail the quality gate and cannot be approved.`,
        );
      break;

    case "SCHEDULED":
      if (!r.approvalsBindToCurrentVersion)
        reasons.push(
          "The approval points at an older version. Approve the exact version you are about to schedule.",
        );
      if (r.scheduledCount === 0)
        reasons.push("Nothing is scheduled yet. Pick a time for at least one variant.");
      if (r.inFlightPublications > 0)
        reasons.push(
          `${r.inFlightPublications} publication attempt(s) are still in flight. Wait for them to finish so a retry cannot duplicate a post.`,
        );
      break;

    case "PUBLISHING":
      if (r.scheduledCount === 0)
        reasons.push("Nothing is scheduled, so there is nothing to publish.");
      break;

    case "PUBLISHED":
      if (r.successfulPublications === 0)
        reasons.push(
          "No publication has succeeded yet. A campaign is only published once a provider confirmed it.",
        );
      break;

    default:
      break;
  }

  return reasons;
}

export function evaluateTransition(
  from: CampaignStatus,
  to: CampaignStatus,
  readiness: CampaignReadiness,
): TransitionVerdict {
  if (!LEGAL_TRANSITIONS[from].includes(to)) {
    return {
      allowed: false,
      code: "ILLEGAL_TRANSITION",
      reasons: [
        `A campaign cannot go from ${from} to ${to}. From ${from} it can go to: ${
          LEGAL_TRANSITIONS[from].join(", ") || "nowhere, this status is final"
        }.`,
      ],
    };
  }

  const reasons = requirementsFor(to, readiness);
  if (reasons.length > 0) {
    return { allowed: false, code: "NOT_READY", reasons };
  }

  return { allowed: true };
}

export interface NextAction {
  /** The button the operator should press. */
  label: string;
  /** Why, in plain language. */
  detail: string;
  /** The status this action moves the campaign into, when there is one. */
  target?: CampaignStatus;
}

/**
 * The one obvious next step for a campaign, used by the operational Home.
 * Never more than one. If something blocks progress, this says what.
 */
export function nextAction(
  status: CampaignStatus,
  r: CampaignReadiness,
): NextAction {
  switch (status) {
    case "IDEA": {
      const missing = requirementsFor("BRIEF", r);
      return missing.length > 0
        ? { label: "Finish the idea", detail: missing.join(" ") }
        : {
            label: "Write the brief",
            detail: "The objective and audience are set. Turn this into a brief.",
            target: "BRIEF",
          };
    }
    case "BRIEF": {
      const missing = requirementsFor("DRAFT", r);
      return missing.length > 0
        ? { label: "Finish the brief", detail: missing.join(" ") }
        : {
            label: "Start drafting",
            detail: "The brief is complete. Write the master concept and its channel variants.",
            target: "DRAFT",
          };
    }
    case "DRAFT": {
      if (r.variantsNeedingAsset > 0)
        return {
          label: "Capture the proof",
          detail: `${r.variantsNeedingAsset} variant(s) need a real screenshot or screen recording of the shipping app.`,
          target: "NEEDS_ASSET",
        };
      if (r.variantsFailingGate > 0)
        return {
          label: "Fix the blockers",
          detail: `${r.variantsFailingGate} variant(s) fail the quality gate. Open the findings and fix them.`,
        };
      if (r.variantCount === 0)
        return {
          label: "Add a channel variant",
          detail: "There is nothing to review yet. Create at least one channel variant.",
        };
      return {
        label: "Send for review",
        detail: "Everything passes the gate. Ask a reviewer to read it.",
        target: "IN_REVIEW",
      };
    }
    case "NEEDS_ASSET":
      return {
        label: "Attach the proof asset",
        detail:
          "Upload the real screenshot or screen recording, then send this back for review.",
        target: "DRAFT",
      };
    case "IN_REVIEW":
      return r.variantsAwaitingApproval > 0
        ? {
            label: "Waiting on a reviewer",
            detail: `${r.variantsAwaitingApproval} variant(s) still need a decision.`,
          }
        : {
            label: "Approve",
            detail: "Every variant has a decision. Approve the exact version to schedule.",
            target: "APPROVED",
          };
    case "APPROVED": {
      const missing = requirementsFor("SCHEDULED", r);
      return missing.length > 0
        ? { label: "Before scheduling", detail: missing.join(" ") }
        : {
            label: "Schedule it",
            detail: "Approved and tagged. Pick the times and confirm the exact payload.",
            target: "SCHEDULED",
          };
    }
    case "SCHEDULED":
      return {
        label: "Nothing to do",
        detail: "This is queued. It will publish at the scheduled time.",
      };
    case "PUBLISHING":
      return {
        label: "Publishing",
        detail: "An attempt is running. Do not retry until it finishes.",
      };
    case "PUBLISHED":
      return {
        label: "Read the results",
        detail:
          "Check what the tagged links brought in, write the learning, and pick the next hypothesis.",
      };
    case "REJECTED":
      return {
        label: "Revise",
        detail:
          "The reviewer asked for changes. The old version stays visible; write a new one.",
        target: "DRAFT",
      };
    case "FAILED": {
      const missing = requirementsFor("SCHEDULED", r);
      return missing.length > 0
        ? { label: "Before retrying", detail: missing.join(" ") }
        : {
            label: "Retry safely",
            detail:
              "The attempt kept its diagnostics. Retrying reuses the same idempotency key, so it cannot post twice.",
            target: "SCHEDULED",
          };
    }
    case "CANCELLED":
      return {
        label: "Archive",
        detail: "This campaign was cancelled. Archive it to clear the board.",
        target: "ARCHIVED",
      };
    case "ARCHIVED":
      return {
        label: "Nothing to do",
        detail: "This campaign is archived and read only.",
      };
  }
}
