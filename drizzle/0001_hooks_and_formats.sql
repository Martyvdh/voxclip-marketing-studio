CREATE TABLE "cta_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"family" text NOT NULL,
	"text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hooks" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"family" text NOT NULL,
	"pillar" "pillar" NOT NULL,
	"text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hooks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pillar_defaults" (
	"id" text PRIMARY KEY NOT NULL,
	"pillar" "pillar" NOT NULL,
	"headline" text NOT NULL,
	"subhead" text NOT NULL,
	"halfword" text NOT NULL,
	"example_1" text NOT NULL,
	"example_2" text NOT NULL,
	"payoff" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pillar_defaults_pillar_unique" UNIQUE("pillar")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cta_lines_uq" ON "cta_lines" USING btree ("family","text");--> statement-breakpoint
CREATE INDEX "hooks_family_pillar_idx" ON "hooks" USING btree ("family","pillar");