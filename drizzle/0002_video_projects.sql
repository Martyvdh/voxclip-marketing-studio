CREATE TABLE "video_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"name" text NOT NULL,
	"ratio" text NOT NULL,
	"show_mark" boolean DEFAULT true NOT NULL,
	"clips" jsonb NOT NULL,
	"total_seconds" double precision NOT NULL,
	"pending_media_count" integer DEFAULT 0 NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_projects_campaign_idx" ON "video_projects" USING btree ("campaign_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "video_projects_name_uq" ON "video_projects" USING btree ("campaign_id","name");