CREATE TABLE "tasks" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"size" text,
	"contexts" text,
	"deadline" timestamp with time zone,
	"has_check_needed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE INDEX "idx_tasks_user_id_synced_at" ON "tasks" USING btree ("user_id","synced_at");