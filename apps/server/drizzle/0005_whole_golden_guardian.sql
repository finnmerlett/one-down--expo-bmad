CREATE TABLE "preferences" (
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preferences_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "star_activity_log" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" text,
	"task_title" text NOT NULL,
	"action" text NOT NULL,
	"amount" integer NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "star_activity_log_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "subtasks" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"order_index" integer NOT NULL,
	"source" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subtasks_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_preferences_user_id_synced_at" ON "preferences" USING btree ("user_id","synced_at");--> statement-breakpoint
CREATE INDEX "idx_star_activity_user_id_synced_at" ON "star_activity_log" USING btree ("user_id","synced_at");--> statement-breakpoint
CREATE INDEX "idx_subtasks_user_id_synced_at" ON "subtasks" USING btree ("user_id","synced_at");