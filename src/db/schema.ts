/**
 * VoxClip Marketing Studio — domain model.
 *
 * Rules encoded here:
 *  - Everything public-facing hangs off exactly one Campaign.
 *  - Every claim traces back to a ProductClaim, which traces back to a Source.
 *  - Provider IDs are never primary keys; they are recorded as fields on the attempt.
 *  - Nothing is hard-deleted. archivedAt is the soft-delete marker.
 *  - Every state change writes an audit event.
 */

import { randomUUID } from "node:crypto";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", [
  "ADMIN", // everything, including connections and user management
  "PUBLISHER", // can schedule and publish approved work
  "REVIEWER", // can approve or request changes
  "AUTHOR", // can create and revise, cannot approve or publish
  "VIEWER", // read only
]);

export const auditActionEnum = pgEnum("audit_action", [
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED",
  "LOGOUT",
  "SESSION_REVOKED",
  "USER_CREATED",
  "USER_ROLE_CHANGED",
  "USER_DEACTIVATED",
  "PRODUCT_TRUTH_UPDATED",
  "CLAIM_VERIFIED",
  "CLAIM_EXPIRED",
  "CAMPAIGN_CREATED",
  "CAMPAIGN_TRANSITIONED",
  "CAMPAIGN_ARCHIVED",
  "VARIANT_CREATED",
  "VARIANT_REVISED",
  "REVIEW_REQUESTED",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "SCHEDULED",
  "SCHEDULE_CANCELLED",
  "PUBLISH_ATTEMPTED",
  "PUBLISH_SUCCEEDED",
  "PUBLISH_FAILED",
  "PUBLISH_RETRIED",
  "CONNECTION_ADDED",
  "CONNECTION_REVOKED",
  "ASSET_UPLOADED",
  "EXPORTED",
  "DATA_DELETED",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "VERIFIED", // checked against a source, inside its review window
  "UNVERIFIED", // carried over, not yet checked. Blocks any asset that uses it.
  "STALE", // was verified, past its review date
  "RETIRED", // no longer true
]);

export const confidenceEnum = pgEnum("confidence", ["HIGH", "MEDIUM", "LOW"]);

export const claimKindEnum = pgEnum("claim_kind", [
  "PLATFORM",
  "PRICING",
  "CAPABILITY_FREE",
  "CAPABILITY_PLUS",
  "PRIVACY",
  "HOTKEY",
  "RELEASE",
  "IDENTITY",
  "CUT_LIST",
  "PROHIBITED", // a phrase that must never appear
]);

export const signalKindEnum = pgEnum("signal_kind", [
  "PRODUCT_FACT",
  "MARKET_OBSERVATION",
  "CONTENT_ANGLE",
  "EXPERIMENT_IDEA",
]);

export const signalStatusEnum = pgEnum("signal_status", [
  "CAPTURED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
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
]);

export const pillarEnum = pgEnum("pillar", [
  "P1_ONE_PLACE",
  "P2_INSTANT_RECALL",
  "P3_YOUR_STUFF_STAYS_YOURS",
  "P4_FREE_WHERE_LOCAL",
]);

export const channelEnum = pgEnum("channel", [
  "TIKTOK",
  "INSTAGRAM_REELS",
  "YOUTUBE_SHORTS",
  "YOUTUBE_LONG",
  "LINKEDIN",
  "X",
  "THREADS",
  "FACEBOOK",
  "BLOG",
  "EMAIL",
  "REDDIT",
  "PRODUCT_HUNT",
  "HACKER_NEWS",
]);

export const channelTierEnum = pgEnum("channel_tier", [
  "A", // full workflow: draft, preview, schedule, publish, metrics
  "B", // partial
  "C", // manual handoff with a checklist
]);

export const variantStatusEnum = pgEnum("variant_status", [
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
]);

export const severityEnum = pgEnum("severity", ["BLOCKER", "WARNING", "INFO"]);

export const assetKindEnum = pgEnum("asset_kind", [
  "SCREENSHOT",
  "SCREEN_RECORDING",
  "RENDERED_VIDEO",
  "IMAGE",
  "AUDIO",
  "DOCUMENT",
]);

export const assetOriginEnum = pgEnum("asset_origin", [
  "REAL_PRODUCT_CAPTURE", // a real screenshot or recording of the shipping app
  "DESIGNED", // made by us, not claiming to be product UI
  "GENERATED", // model-generated. Never allowed to depict product UI.
]);

export const reviewDecisionEnum = pgEnum("review_decision", [
  "PENDING",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
]);

export const capabilityKindEnum = pgEnum("capability_kind", [
  "DRAFT",
  "PREVIEW",
  "SCHEDULE",
  "PUBLISH",
  "METRICS",
  "MANUAL_ONLY",
]);

export const connectionStatusEnum = pgEnum("connection_status", [
  "NOT_CONNECTED",
  "CONNECTED",
  "TOKEN_EXPIRED",
  "REVOKED",
  "ERROR",
]);

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "PENDING",
  "RUNNING",
  "DONE",
  "CANCELLED",
  "FAILED",
]);

export const publicationStatusEnum = pgEnum("publication_status", [
  "DRY_RUN",
  "MANUAL_HANDOFF",
  "SUCCEEDED",
  "FAILED",
]);

export const metricSourceEnum = pgEnum("metric_source", [
  "PROVIDER_API",
  "WEBSITE_ANALYTICS",
  "MANUAL_ENTRY",
  "NOT_INSTRUMENTED",
]);

export const funnelStageEnum = pgEnum("funnel_stage", [
  "PUBLICATION",
  "LANDING_VISIT",
  "INSTALLER_CLICK",
  "INSTALL_SUCCEEDED", // not instrumented, see docs/decisions.md D-008
  "FIRST_CAPTURE", // not instrumented
  "FIRST_RECALL", // not instrumented
  "WEEK_ONE_RETENTION", // not instrumented
  "PLUS_TRIAL", // not instrumented
  "PAID", // not instrumented
]);

// ---------------------------------------------------------------------------
// Identity, sessions
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("AUTHOR"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [index("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    /** SHA-256 of the session token. The raw token exists only in the cookie. */
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    /** Hashed, never the raw address. */
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

// ---------------------------------------------------------------------------
// Sources and Product Truth
// ---------------------------------------------------------------------------

/** An external thing we can point at. A claim without a source cannot be approved. */
export const sources = pgTable(
  "sources",
  {
    id: id(),
    url: text("url"),
    /** e.g. "Arend0/voxclip-releases@v0.4.1" */
    repoRef: text("repo_ref"),
    title: text("title").notNull(),
    publisher: text("publisher"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    /** Short, within copyright limits. */
    excerpt: text("excerpt"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sources_url_idx").on(t.url)],
);

/** A dated snapshot of what is true about the product. Exactly one row is current. */
export const productTruth = pgTable(
  "product_truth",
  {
    id: id(),
    version: text("version").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    /** The shipping app version. Null when unknown. Never guessed. */
    productVersion: text("product_version"),
    releaseState: text("release_state"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
    ownerName: text("owner_name").notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("product_truth_current_idx").on(t.isCurrent)],
);

/**
 * One atomic fact. Copy that contradicts a VERIFIED claim, or relies on an
 * UNVERIFIED or STALE claim, fails its quality gate.
 */
export const productClaims = pgTable(
  "product_claims",
  {
    id: id(),
    productTruthId: text("product_truth_id")
      .notNull()
      .references(() => productTruth.id, { onDelete: "cascade" }),
    /** Stable machine key, e.g. "pricing.monthly_eur". */
    key: text("key").notNull(),
    kind: claimKindEnum("kind").notNull(),
    /** The approved wording, usable verbatim. */
    statement: text("statement").notNull(),
    /** The machine-comparable value, where one exists. */
    value: text("value"),
    status: claimStatusEnum("status").notNull().default("UNVERIFIED"),
    confidence: confidenceEnum("confidence").notNull().default("MEDIUM"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    verifiedById: text("verified_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sourceId: text("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("product_claims_truth_key_uq").on(t.productTruthId, t.key),
    index("product_claims_status_idx").on(t.status),
    index("product_claims_kind_idx").on(t.kind),
  ],
);

// ---------------------------------------------------------------------------
// Audience and research
// ---------------------------------------------------------------------------

export const audiences = pgTable("audiences", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  jobToBeDone: text("job_to_be_done").notNull(),
  frustration: text("frustration").notNull(),
  desiredOutcome: text("desired_outcome").notNull(),
  channels: channelEnum("channels").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const researchSignals = pgTable(
  "research_signals",
  {
    id: id(),
    title: text("title").notNull(),
    /** Our words. */
    summary: text("summary").notNull(),
    /** Quoted from the source, kept distinguishable from our words. */
    evidence: text("evidence"),
    kind: signalKindEnum("kind").notNull(),
    status: signalStatusEnum("status").notNull().default("CAPTURED"),
    confidence: confidenceEnum("confidence").notNull().default("MEDIUM"),
    relevance: text("relevance").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    reviewedById: text("reviewed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("research_signals_status_idx").on(t.status),
    index("research_signals_expires_idx").on(t.expiresAt),
  ],
);

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

export const campaigns = pgTable(
  "campaigns",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    status: campaignStatusEnum("status").notNull().default("IDEA"),
    pillar: pillarEnum("pillar").notNull(),
    /** What changes if this works. */
    objective: text("objective").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    audienceId: text("audience_id").references(() => audiences.id, {
      onDelete: "set null",
    }),
    signalId: text("signal_id").references(() => researchSignals.id, {
      onDelete: "set null",
    }),
    /** Attribution identity, stable for the life of the campaign. Used as utm_campaign. */
    campaignCode: text("campaign_code").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("campaigns_status_idx").on(t.status),
    index("campaigns_pillar_idx").on(t.pillar),
  ],
);

export const campaignBriefs = pgTable("campaign_briefs", {
  id: id(),
  campaignId: text("campaign_id")
    .notNull()
    .unique()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  problem: text("problem").notNull(),
  desiredOutcome: text("desired_outcome").notNull(),
  promise: text("promise").notNull(),
  /** What makes the promise believable. */
  proof: text("proof").notNull(),
  offer: text("offer").notNull(),
  /** Exactly one. */
  primaryCta: text("primary_cta").notNull(),
  /** Must be tagged with the campaign code. */
  ctaUrl: text("cta_url").notNull(),
  productContext: text("product_context"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Every status change, with who did it and why. Nothing is overwritten. */
export const campaignTransitions = pgTable(
  "campaign_transitions",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    fromStatus: campaignStatusEnum("from_status").notNull(),
    toStatus: campaignStatusEnum("to_status").notNull(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("campaign_transitions_idx").on(t.campaignId, t.createdAt)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    action: auditActionEnum("action").notNull(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** e.g. "Campaign", "ChannelVariant", "User". */
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id"),
    campaignId: text("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    /** Plain language, safe to show an operator. */
    summary: text("summary").notNull(),
    /** Never contains secrets or personal data. */
    detail: jsonb("detail"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_events_subject_idx").on(t.subjectType, t.subjectId),
    index("audit_events_campaign_idx").on(t.campaignId),
    index("audit_events_created_idx").on(t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/** One of the 8 to 12 reusable VoxClip house formats. A campaign system, not a template. */
export const houseFormats = pgTable("house_formats", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** The job this format does. */
  intent: text("intent").notNull(),
  channels: channelEnum("channels").array().notNull().default([]),
  aspectRatios: text("aspect_ratios").array().notNull().default([]),
  hookGuidance: text("hook_guidance").notNull(),
  /** What proof this format requires. */
  evidenceNeeded: text("evidence_needed").notNull(),
  shotList: jsonb("shot_list").notNull(),
  subtitleRule: text("subtitle_rule").notNull(),
  audioRule: text("audio_rule").notNull(),
  thumbnailRule: text("thumbnail_rule").notNull(),
  ctaRule: text("cta_rule").notNull(),
  a11yRule: text("a11y_rule").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** The one approved concept a campaign's channel variants are derived from. */
export const masterContent = pgTable("master_content", {
  id: id(),
  campaignId: text("campaign_id")
    .notNull()
    .unique()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  houseFormatId: text("house_format_id").references(() => houseFormats.id, {
    onDelete: "set null",
  }),
  headline: text("headline").notNull(),
  body: text("body").notNull(),
  proofAssetId: text("proof_asset_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const channelVariants = pgTable(
  "channel_variants",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    channel: channelEnum("channel").notNull(),
    status: variantStatusEnum("status").notNull().default("DRAFT"),
    /** Used as utm_content. Unique within the campaign. */
    variantCode: text("variant_code").notNull(),
    currentVersionId: text("current_version_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("channel_variants_code_uq").on(t.campaignId, t.variantCode),
    index("channel_variants_status_idx").on(t.status),
  ],
);

/** Immutable. A revision creates a new version; the old one stays visible. */
export const contentVersions = pgTable(
  "content_versions",
  {
    id: id(),
    variantId: text("variant_id")
      .notNull()
      .references(() => channelVariants.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    body: text("body").notNull(),
    title: text("title"),
    hashtags: text("hashtags").array().notNull().default([]),
    ctaLabel: text("cta_label"),
    ctaUrl: text("cta_url"),
    altText: text("alt_text"),
    assetIds: text("asset_ids").array().notNull().default([]),
    /** Channel-specific fields, e.g. blog slug and canonical. */
    metadata: jsonb("metadata"),
    authorId: text("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("content_versions_no_uq").on(t.variantId, t.versionNo)],
);

// ---------------------------------------------------------------------------
// Quality gates
// ---------------------------------------------------------------------------

/** One execution of the deterministic gate against one version. */
export const qualityRuns = pgTable(
  "quality_runs",
  {
    id: id(),
    versionId: text("version_id")
      .notNull()
      .references(() => contentVersions.id, { onDelete: "cascade" }),
    passed: boolean("passed").notNull(),
    ruleSetVersion: text("rule_set_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("quality_runs_version_idx").on(t.versionId, t.createdAt)],
);

export const qualityFindings = pgTable(
  "quality_findings",
  {
    id: id(),
    runId: text("run_id")
      .notNull()
      .references(() => qualityRuns.id, { onDelete: "cascade" }),
    /** e.g. "brand.no-em-dash". */
    ruleId: text("rule_id").notNull(),
    severity: severityEnum("severity").notNull(),
    /** Plain language. Tells the operator what to do. */
    message: text("message").notNull(),
    excerpt: text("excerpt"),
    /** The ProductClaim key this contradicts, when applicable. */
    claimKey: text("claim_key"),
  },
  (t) => [index("quality_findings_run_idx").on(t.runId)],
);

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export const assets = pgTable(
  "assets",
  {
    id: id(),
    campaignId: text("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    kind: assetKindEnum("kind").notNull(),
    origin: assetOriginEnum("origin").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    altText: text("alt_text"),
    caption: text("caption"),
    /** Which app version this capture shows. */
    productVersionShown: text("product_version_shown"),
    approved: boolean("approved").notNull().default(false),
    uploadedById: text("uploaded_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("assets_campaign_idx").on(t.campaignId),
    index("assets_kind_idx").on(t.kind),
  ],
);

export const assetRenditions = pgTable(
  "asset_renditions",
  {
    id: id(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    /** e.g. "9:16", "thumbnail". */
    label: text("label").notNull(),
    storageKey: text("storage_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    byteSize: integer("byte_size").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("asset_renditions_label_uq").on(t.assetId, t.label)],
);

// ---------------------------------------------------------------------------
// Review and approval
// ---------------------------------------------------------------------------

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    variantId: text("variant_id")
      .notNull()
      .references(() => channelVariants.id, { onDelete: "cascade" }),
    versionId: text("version_id").notNull(),
    reviewerId: text("reviewer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decision: reviewDecisionEnum("decision").notNull().default("PENDING"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("reviews_variant_idx").on(t.variantId)],
);

export const reviewComments = pgTable(
  "review_comments",
  {
    id: id(),
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("review_comments_review_idx").on(t.reviewId)],
);

/** Approval binds to an exact version. Scheduling a different version is not allowed. */
export const approvals = pgTable(
  "approvals",
  {
    id: id(),
    variantId: text("variant_id")
      .notNull()
      .references(() => channelVariants.id, { onDelete: "cascade" }),
    versionId: text("version_id").notNull(),
    approverId: text("approver_id").references(() => users.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("approvals_variant_version_uq").on(t.variantId, t.versionId),
  ],
);

// ---------------------------------------------------------------------------
// Channels, scheduling, publishing
// ---------------------------------------------------------------------------

export const channelConnections = pgTable(
  "channel_connections",
  {
    id: id(),
    channel: channelEnum("channel").notNull(),
    tier: channelTierEnum("tier").notNull(),
    /** The account this posts as. */
    displayName: text("display_name").notNull(),
    status: connectionStatusEnum("status").notNull().default("NOT_CONNECTED"),
    /** The provider's ID. Recorded, never used as our primary key. */
    providerAccountId: text("provider_account_id"),
    /** Encrypted at rest. Never leaves the server, never reaches the browser. */
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: text("scopes").array().notNull().default([]),
    /** True until real, official provider access exists. */
    isFake: boolean("is_fake").notNull().default(true),
    ownerId: text("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("channel_connections_uq").on(t.channel, t.displayName),
    index("channel_connections_status_idx").on(t.status),
  ],
);

export const channelCapabilities = pgTable(
  "channel_capabilities",
  {
    id: id(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => channelConnections.id, { onDelete: "cascade" }),
    kind: capabilityKindEnum("kind").notNull(),
    supported: boolean("supported").notNull(),
    /** Why not, when unsupported. */
    note: text("note"),
  },
  (t) => [uniqueIndex("channel_capabilities_uq").on(t.connectionId, t.kind)],
);

export const schedules = pgTable(
  "schedules",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => channelVariants.id, { onDelete: "cascade" }),
    /** The exact approved version. */
    versionId: text("version_id").notNull(),
    connectionId: text("connection_id").references(
      () => channelConnections.id,
      { onDelete: "set null" },
    ),
    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    status: scheduleStatusEnum("status").notNull().default("PENDING"),
    /** Prevents a duplicate post under retry or concurrent workers. */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdById: text("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [index("schedules_due_idx").on(t.status, t.runAt)],
);

export const publicationAttempts = pgTable(
  "publication_attempts",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => channelVariants.id, { onDelete: "cascade" }),
    versionId: text("version_id").notNull(),
    scheduleId: text("schedule_id").references(() => schedules.id, {
      onDelete: "set null",
    }),
    connectionId: text("connection_id").references(
      () => channelConnections.id,
      { onDelete: "set null" },
    ),
    status: publicationStatusEnum("status").notNull(),
    attemptNo: integer("attempt_no").notNull().default(1),
    idempotencyKey: text("idempotency_key").notNull(),
    /** Proves the operator's preview matched what was actually sent. */
    payloadHash: text("payload_hash").notNull(),
    /** The provider's ID. Recorded, never a key. */
    providerPostId: text("provider_post_id"),
    providerUrl: text("provider_url"),
    errorCode: text("error_code"),
    /** Redacted. Never contains a token. */
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("publication_attempts_idem_uq").on(
      t.idempotencyKey,
      t.attemptNo,
    ),
    index("publication_attempts_campaign_idx").on(t.campaignId),
    index("publication_attempts_status_idx").on(t.status),
  ],
);

// ---------------------------------------------------------------------------
// Attribution, metrics, learning
// ---------------------------------------------------------------------------

/** Every number the dashboard shows carries its source, window, and freshness. */
export const metricObservations = pgTable(
  "metric_observations",
  {
    id: id(),
    campaignId: text("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    variantId: text("variant_id").references(() => channelVariants.id, {
      onDelete: "set null",
    }),
    channel: channelEnum("channel"),
    stage: funnelStageEnum("stage").notNull(),
    /** e.g. "views", "clicks", "spend_eur". */
    metricKey: text("metric_key").notNull(),
    /** Null means not instrumented. Never write a zero to mean "we do not know". */
    value: doublePrecision("value"),
    source: metricSourceEnum("source").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    isStale: boolean("is_stale").notNull().default(false),
    note: text("note"),
  },
  (t) => [
    index("metric_observations_stage_idx").on(t.stage),
    index("metric_observations_observed_idx").on(t.observedAt),
    index("metric_observations_campaign_idx").on(t.campaignId, t.metricKey),
  ],
);

export const attributionTouches = pgTable(
  "attribution_touches",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    variantCode: text("variant_code"),
    channel: channelEnum("channel"),
    stage: funnelStageEnum("stage").notNull(),
    landingPath: text("landing_path"),
    /** Host only. Never a full referrer with a query string. */
    referrerHost: text("referrer_host"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("attribution_touches_campaign_idx").on(t.campaignId, t.stage),
    index("attribution_touches_occurred_idx").on(t.occurredAt),
  ],
);

export const experiments = pgTable(
  "experiments",
  {
    id: id(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    /** "If we X, then Y, because Z". */
    hypothesis: text("hypothesis").notNull(),
    /** The one number that decides it. */
    metricKey: text("metric_key").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    outcome: text("outcome"),
    /** What we now believe, and what we will do next. */
    learning: text("learning"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("experiments_campaign_idx").on(t.campaignId)],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type ProductTruthRow = typeof productTruth.$inferSelect;
export type ProductClaim = typeof productClaims.$inferSelect;
export type NewProductClaim = typeof productClaims.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignBrief = typeof campaignBriefs.$inferSelect;
export type ChannelVariant = typeof channelVariants.$inferSelect;
export type ContentVersion = typeof contentVersions.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type CampaignStatus = (typeof campaignStatusEnum.enumValues)[number];
export type VariantStatus = (typeof variantStatusEnum.enumValues)[number];
export type Channel = (typeof channelEnum.enumValues)[number];
export type Pillar = (typeof pillarEnum.enumValues)[number];
export type ClaimStatus = (typeof claimStatusEnum.enumValues)[number];
export type ClaimKind = (typeof claimKindEnum.enumValues)[number];
export type Severity = (typeof severityEnum.enumValues)[number];
export type AuditAction = (typeof auditActionEnum.enumValues)[number];
