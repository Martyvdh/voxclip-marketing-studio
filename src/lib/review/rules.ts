/**
 * Who may do what to a variant, as pure functions.
 *
 * The interesting rules are here rather than in the server actions so they can
 * be tested without a database, and so the page and the action ask the same
 * question and get the same answer. The action is still the one that decides:
 * the page hides a button, the server refuses.
 */

import type { VariantStatus } from "@/db/schema";

export interface Verdict {
  allowed: boolean;
  /** Plain language, written for the person who just got refused. */
  reason?: string;
  /**
   * Set when an admin is approving their own campaign.
   *
   * Allowed, because a team of two cannot wait for the other person to be
   * awake. Recorded and shown, because an approval that nobody else read is a
   * different thing from one that somebody did, and the record should say
   * which of the two it was.
   */
  selfApproval?: boolean;
}

const ALLOWED: Verdict = { allowed: true };

function refuse(reason: string): Verdict {
  return { allowed: false, reason };
}

/** Statuses a variant can be sent for review from. */
export const REVIEWABLE_FROM: VariantStatus[] = [
  "DRAFT",
  "CHANGES_REQUESTED",
  "NEEDS_ASSET",
];

/** Statuses that sit in the queue waiting on a person. */
export const WAITING_STATUSES: VariantStatus[] = [
  "IN_REVIEW",
  "CHANGES_REQUESTED",
];

export function canSendForReview(input: {
  status: VariantStatus;
  gatePassed: boolean;
}): Verdict {
  if (input.status === "IN_REVIEW") {
    return refuse("This is already with a reviewer.");
  }

  if (!REVIEWABLE_FROM.includes(input.status)) {
    return refuse(
      `A variant that is ${input.status.toLowerCase().replace(/_/g, " ")} is past review. Revise it first and it goes back to draft.`,
    );
  }

  // A blocked draft is not a review problem, it is a writing problem. Sending
  // it costs somebody a read of copy that cannot go out either way.
  if (!input.gatePassed) {
    return refuse(
      "This still fails the quality gate. Fix the blockers first; asking someone to read copy that cannot go out wastes their time.",
    );
  }

  return ALLOWED;
}

/**
 * What makes an approval mean something: it covers the version that is actually
 * there, and somebody read it.
 *
 * On the second half there is one deliberate exception. An admin may approve
 * their own campaign. On a team of two, waiting for the other person to be
 * awake means the work stops, and a rule that stops the work gets worked
 * around rather than followed. So it is allowed, marked as self-approved in
 * the record, and shown on the card. Everyone else still needs a second
 * reader.
 */
export function canApprove(input: {
  status: VariantStatus;
  gatePassed: boolean;
  isOwner: boolean;
  hasCapability: boolean;
  /** Admins carry the exception. A reviewer does not. */
  isAdmin?: boolean;
}): Verdict {
  if (!input.hasCapability) {
    return refuse("Your role can read this but not approve it.");
  }

  if (input.isOwner && !input.isAdmin) {
    return refuse(
      "You own this campaign, so you cannot approve it. Someone else has to read it before it goes out.",
    );
  }

  if (input.status !== "IN_REVIEW") {
    return refuse("Nothing is waiting on a decision here.");
  }

  if (!input.gatePassed) {
    return refuse("This version fails the quality gate and cannot be approved.");
  }

  return input.isOwner ? { allowed: true, selfApproval: true } : ALLOWED;
}

/**
 * True when an approval no longer covers what is on screen.
 *
 * This is the whole reason approvals record a version id. Revising after an
 * approval is allowed and normal; silently keeping the approval is not.
 */
export function approvalIsStale(input: {
  approvedVersionId: string | null;
  currentVersionId: string | null;
}): boolean {
  if (!input.approvedVersionId) return false;
  return input.approvedVersionId !== input.currentVersionId;
}

/** Sorted so the oldest wait is at the top. Nothing should sit for days. */
export function queueOrder<T extends { status: VariantStatus; updatedAt: Date }>(
  items: T[],
): T[] {
  const rank = (s: VariantStatus) => (s === "IN_REVIEW" ? 0 : 1);
  return [...items].sort(
    (a, b) =>
      rank(a.status) - rank(b.status) ||
      a.updatedAt.getTime() - b.updatedAt.getTime(),
  );
}
