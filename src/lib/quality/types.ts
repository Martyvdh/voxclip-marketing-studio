import type {
  Channel,
  ClaimKind,
  ClaimStatus,
  Severity,
} from "@/db/schema";

export type { Channel, ClaimKind, ClaimStatus, Severity };

/** The subset of a ProductClaim the gate needs. Keeps the gate pure and testable. */
export interface ClaimLike {
  key: string;
  kind: ClaimKind;
  status: ClaimStatus;
  /** The machine-comparable value, where one exists. */
  value: string | null;
  /** The approved wording. */
  statement: string;
  nextReviewAt: Date | null;
}

/** Anything that is about to face the public. */
export interface PublicAsset {
  channel: Channel;
  title?: string | null;
  body: string;
  hashtags?: string[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  altText?: string | null;
  hasMedia?: boolean;
  /** The campaign's attribution code. The CTA link must carry it. */
  campaignCode?: string | null;
  /** The variant's attribution code. The CTA link should carry it as utm_content. */
  variantCode?: string | null;
}

export interface GateContext {
  now: Date;
  /** Hosts a call to action is allowed to point at. */
  publicSiteHosts: string[];
  claims: ClaimLike[];
}

export interface Finding {
  ruleId: string;
  severity: Severity;
  /** Plain language. Says what is wrong and what to do about it. */
  message: string;
  /** The offending text, so the operator can find it. */
  excerpt?: string;
  /** The ProductClaim this contradicts or depends on, when applicable. */
  claimKey?: string;
}

export interface GateResult {
  /** False when any finding is a BLOCKER. */
  passed: boolean;
  ruleSetVersion: string;
  findings: Finding[];
}
