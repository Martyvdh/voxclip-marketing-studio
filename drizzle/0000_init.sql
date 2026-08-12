CREATE TYPE "public"."asset_kind" AS ENUM('SCREENSHOT', 'SCREEN_RECORDING', 'RENDERED_VIDEO', 'IMAGE', 'AUDIO', 'DOCUMENT');--> statement-breakpoint
CREATE TYPE "public"."asset_origin" AS ENUM('REAL_PRODUCT_CAPTURE', 'DESIGNED', 'GENERATED');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_REVOKED', 'USER_CREATED', 'USER_ROLE_CHANGED', 'USER_DEACTIVATED', 'PRODUCT_TRUTH_UPDATED', 'CLAIM_VERIFIED', 'CLAIM_EXPIRED', 'CAMPAIGN_CREATED', 'CAMPAIGN_TRANSITIONED', 'CAMPAIGN_ARCHIVED', 'VARIANT_CREATED', 'VARIANT_REVISED', 'REVIEW_REQUESTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SCHEDULED', 'SCHEDULE_CANCELLED', 'PUBLISH_ATTEMPTED', 'PUBLISH_SUCCEEDED', 'PUBLISH_FAILED', 'PUBLISH_RETRIED', 'CONNECTION_ADDED', 'CONNECTION_REVOKED', 'ASSET_UPLOADED', 'EXPORTED', 'DATA_DELETED');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('IDEA', 'BRIEF', 'DRAFT', 'NEEDS_ASSET', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'REJECTED', 'FAILED', 'CANCELLED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."capability_kind" AS ENUM('DRAFT', 'PREVIEW', 'SCHEDULE', 'PUBLISH', 'METRICS', 'MANUAL_ONLY');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('TIKTOK', 'INSTAGRAM_REELS', 'YOUTUBE_SHORTS', 'YOUTUBE_LONG', 'LINKEDIN', 'X', 'THREADS', 'FACEBOOK', 'BLOG', 'EMAIL', 'REDDIT', 'PRODUCT_HUNT', 'HACKER_NEWS');--> statement-breakpoint
CREATE TYPE "public"."channel_tier" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."claim_kind" AS ENUM('PLATFORM', 'PRICING', 'CAPABILITY_FREE', 'CAPABILITY_PLUS', 'PRIVACY', 'HOTKEY', 'RELEASE', 'IDENTITY', 'CUT_LIST', 'PROHIBITED');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('VERIFIED', 'UNVERIFIED', 'STALE', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('NOT_CONNECTED', 'CONNECTED', 'TOKEN_EXPIRED', 'REVOKED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."funnel_stage" AS ENUM('PUBLICATION', 'LANDING_VISIT', 'INSTALLER_CLICK', 'INSTALL_SUCCEEDED', 'FIRST_CAPTURE', 'FIRST_RECALL', 'WEEK_ONE_RETENTION', 'PLUS_TRIAL', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."metric_source" AS ENUM('PROVIDER_API', 'WEBSITE_ANALYTICS', 'MANUAL_ENTRY', 'NOT_INSTRUMENTED');--> statement-breakpoint
CREATE TYPE "public"."pillar" AS ENUM('P1_ONE_PLACE', 'P2_INSTANT_RECALL', 'P3_YOUR_STUFF_STAYS_YOURS', 'P4_FREE_WHERE_LOCAL');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('DRY_RUN', 'MANUAL_HANDOFF', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."review_decision" AS ENUM('PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'PUBLISHER', 'REVIEWER', 'AUTHOR', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('PENDING', 'RUNNING', 'DONE', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('BLOCKER', 'WARNING', 'INFO');--> statement-breakpoint
CREATE TYPE "public"."signal_kind" AS ENUM('PRODUCT_FACT', 'MARKET_OBSERVATION', 'CONTENT_ANGLE', 'EXPERIMENT_IDEA');--> statement-breakpoint
CREATE TYPE "public"."signal_status" AS ENUM('CAPTURED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."variant_status" AS ENUM('DRAFT', 'NEEDS_ASSET', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"version_id" text NOT NULL,
	"approver_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "asset_renditions" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"label" text NOT NULL,
	"storage_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text,
	"kind" "asset_kind" NOT NULL,
	"origin" "asset_origin" NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"alt_text" text,
	"caption" text,
	"product_version_shown" text,
	"approved" boolean DEFAULT false NOT NULL,
	"uploaded_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attribution_touches" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"variant_code" text,
	"channel" "channel",
	"stage" "funnel_stage" NOT NULL,
	"landing_path" text,
	"referrer_host" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audiences" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"job_to_be_done" text NOT NULL,
	"frustration" text NOT NULL,
	"desired_outcome" text NOT NULL,
	"channels" "channel"[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "audiences_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"action" "audit_action" NOT NULL,
	"actor_id" text,
	"subject_type" text NOT NULL,
	"subject_id" text,
	"campaign_id" text,
	"summary" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_briefs" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"problem" text NOT NULL,
	"desired_outcome" text NOT NULL,
	"promise" text NOT NULL,
	"proof" text NOT NULL,
	"offer" text NOT NULL,
	"primary_cta" text NOT NULL,
	"cta_url" text NOT NULL,
	"product_context" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_briefs_campaign_id_unique" UNIQUE("campaign_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_transitions" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"from_status" "campaign_status" NOT NULL,
	"to_status" "campaign_status" NOT NULL,
	"actor_id" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" "campaign_status" DEFAULT 'IDEA' NOT NULL,
	"pillar" "pillar" NOT NULL,
	"objective" text NOT NULL,
	"owner_id" text NOT NULL,
	"audience_id" text,
	"signal_id" text,
	"campaign_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug"),
	CONSTRAINT "campaigns_campaign_code_unique" UNIQUE("campaign_code")
);
--> statement-breakpoint
CREATE TABLE "channel_capabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"kind" "capability_kind" NOT NULL,
	"supported" boolean NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "channel_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" "channel" NOT NULL,
	"tier" "channel_tier" NOT NULL,
	"display_name" text NOT NULL,
	"status" "connection_status" DEFAULT 'NOT_CONNECTED' NOT NULL,
	"provider_account_id" text,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"is_fake" boolean DEFAULT true NOT NULL,
	"owner_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "channel_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"channel" "channel" NOT NULL,
	"status" "variant_status" DEFAULT 'DRAFT' NOT NULL,
	"variant_code" text NOT NULL,
	"current_version_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"version_no" integer NOT NULL,
	"body" text NOT NULL,
	"title" text,
	"hashtags" text[] DEFAULT '{}' NOT NULL,
	"cta_label" text,
	"cta_url" text,
	"alt_text" text,
	"asset_ids" text[] DEFAULT '{}' NOT NULL,
	"metadata" jsonb,
	"author_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"hypothesis" text NOT NULL,
	"metric_key" text NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"outcome" text,
	"learning" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "house_formats" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"intent" text NOT NULL,
	"channels" "channel"[] DEFAULT '{}' NOT NULL,
	"aspect_ratios" text[] DEFAULT '{}' NOT NULL,
	"hook_guidance" text NOT NULL,
	"evidence_needed" text NOT NULL,
	"shot_list" jsonb NOT NULL,
	"subtitle_rule" text NOT NULL,
	"audio_rule" text NOT NULL,
	"thumbnail_rule" text NOT NULL,
	"cta_rule" text NOT NULL,
	"a11y_rule" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "house_formats_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "master_content" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"house_format_id" text,
	"headline" text NOT NULL,
	"body" text NOT NULL,
	"proof_asset_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_content_campaign_id_unique" UNIQUE("campaign_id")
);
--> statement-breakpoint
CREATE TABLE "metric_observations" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text,
	"variant_id" text,
	"channel" "channel",
	"stage" "funnel_stage" NOT NULL,
	"metric_key" text NOT NULL,
	"value" double precision,
	"source" "metric_source" NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_stale" boolean DEFAULT false NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "product_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"product_truth_id" text NOT NULL,
	"key" text NOT NULL,
	"kind" "claim_kind" NOT NULL,
	"statement" text NOT NULL,
	"value" text,
	"status" "claim_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"confidence" "confidence" DEFAULT 'MEDIUM' NOT NULL,
	"verified_at" timestamp with time zone,
	"next_review_at" timestamp with time zone,
	"verified_by_id" text,
	"source_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_truth" (
	"id" text PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"product_version" text,
	"release_state" text,
	"verified_at" timestamp with time zone NOT NULL,
	"next_review_at" timestamp with time zone NOT NULL,
	"owner_name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publication_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"version_id" text NOT NULL,
	"schedule_id" text,
	"connection_id" text,
	"status" "publication_status" NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload_hash" text NOT NULL,
	"provider_post_id" text,
	"provider_url" text,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quality_findings" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"rule_id" text NOT NULL,
	"severity" "severity" NOT NULL,
	"message" text NOT NULL,
	"excerpt" text,
	"claim_key" text
);
--> statement-breakpoint
CREATE TABLE "quality_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"passed" boolean NOT NULL,
	"rule_set_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"evidence" text,
	"kind" "signal_kind" NOT NULL,
	"status" "signal_status" DEFAULT 'CAPTURED' NOT NULL,
	"confidence" "confidence" DEFAULT 'MEDIUM' NOT NULL,
	"relevance" text NOT NULL,
	"source_id" text NOT NULL,
	"reviewed_by_id" text,
	"reviewed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "review_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"author_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"version_id" text NOT NULL,
	"reviewer_id" text,
	"decision" "review_decision" DEFAULT 'PENDING' NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"version_id" text NOT NULL,
	"connection_id" text,
	"run_at" timestamp with time zone NOT NULL,
	"status" "schedule_status" DEFAULT 'PENDING' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "schedules_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_hash" text,
	"user_agent" text,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text,
	"repo_ref" text,
	"title" text NOT NULL,
	"publisher" text,
	"published_at" timestamp with time zone,
	"retrieved_at" timestamp with time zone NOT NULL,
	"excerpt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'AUTHOR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_variant_id_channel_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."channel_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_renditions" ADD CONSTRAINT "asset_renditions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribution_touches" ADD CONSTRAINT "attribution_touches_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_briefs" ADD CONSTRAINT "campaign_briefs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_transitions" ADD CONSTRAINT "campaign_transitions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_transitions" ADD CONSTRAINT "campaign_transitions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_audience_id_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_signal_id_research_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."research_signals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_capabilities" ADD CONSTRAINT "channel_capabilities_connection_id_channel_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."channel_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_variants" ADD CONSTRAINT "channel_variants_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_variant_id_channel_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."channel_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_content" ADD CONSTRAINT "master_content_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_content" ADD CONSTRAINT "master_content_house_format_id_house_formats_id_fk" FOREIGN KEY ("house_format_id") REFERENCES "public"."house_formats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_observations" ADD CONSTRAINT "metric_observations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_observations" ADD CONSTRAINT "metric_observations_variant_id_channel_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."channel_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_claims" ADD CONSTRAINT "product_claims_product_truth_id_product_truth_id_fk" FOREIGN KEY ("product_truth_id") REFERENCES "public"."product_truth"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_claims" ADD CONSTRAINT "product_claims_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_claims" ADD CONSTRAINT "product_claims_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_attempts" ADD CONSTRAINT "publication_attempts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_attempts" ADD CONSTRAINT "publication_attempts_variant_id_channel_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."channel_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_attempts" ADD CONSTRAINT "publication_attempts_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_attempts" ADD CONSTRAINT "publication_attempts_connection_id_channel_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."channel_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_findings" ADD CONSTRAINT "quality_findings_run_id_quality_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."quality_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_runs" ADD CONSTRAINT "quality_runs_version_id_content_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."content_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_signals" ADD CONSTRAINT "research_signals_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_signals" ADD CONSTRAINT "research_signals_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_variant_id_channel_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."channel_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_variant_id_channel_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."channel_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_connection_id_channel_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."channel_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_variant_version_uq" ON "approvals" USING btree ("variant_id","version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_renditions_label_uq" ON "asset_renditions" USING btree ("asset_id","label");--> statement-breakpoint
CREATE INDEX "assets_campaign_idx" ON "assets" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "assets_kind_idx" ON "assets" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "attribution_touches_campaign_idx" ON "attribution_touches" USING btree ("campaign_id","stage");--> statement-breakpoint
CREATE INDEX "attribution_touches_occurred_idx" ON "attribution_touches" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_subject_idx" ON "audit_events" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "audit_events_campaign_idx" ON "audit_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "audit_events_created_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "campaign_transitions_idx" ON "campaign_transitions" USING btree ("campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_pillar_idx" ON "campaigns" USING btree ("pillar");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_capabilities_uq" ON "channel_capabilities" USING btree ("connection_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_connections_uq" ON "channel_connections" USING btree ("channel","display_name");--> statement-breakpoint
CREATE INDEX "channel_connections_status_idx" ON "channel_connections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_variants_code_uq" ON "channel_variants" USING btree ("campaign_id","variant_code");--> statement-breakpoint
CREATE INDEX "channel_variants_status_idx" ON "channel_variants" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "content_versions_no_uq" ON "content_versions" USING btree ("variant_id","version_no");--> statement-breakpoint
CREATE INDEX "experiments_campaign_idx" ON "experiments" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "metric_observations_stage_idx" ON "metric_observations" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "metric_observations_observed_idx" ON "metric_observations" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "metric_observations_campaign_idx" ON "metric_observations" USING btree ("campaign_id","metric_key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_claims_truth_key_uq" ON "product_claims" USING btree ("product_truth_id","key");--> statement-breakpoint
CREATE INDEX "product_claims_status_idx" ON "product_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_claims_kind_idx" ON "product_claims" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "product_truth_current_idx" ON "product_truth" USING btree ("is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "publication_attempts_idem_uq" ON "publication_attempts" USING btree ("idempotency_key","attempt_no");--> statement-breakpoint
CREATE INDEX "publication_attempts_campaign_idx" ON "publication_attempts" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "publication_attempts_status_idx" ON "publication_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quality_findings_run_idx" ON "quality_findings" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "quality_runs_version_idx" ON "quality_runs" USING btree ("version_id","created_at");--> statement-breakpoint
CREATE INDEX "research_signals_status_idx" ON "research_signals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "research_signals_expires_idx" ON "research_signals" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "review_comments_review_idx" ON "review_comments" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "reviews_variant_idx" ON "reviews" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "schedules_due_idx" ON "schedules" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sources_url_idx" ON "sources" USING btree ("url");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");