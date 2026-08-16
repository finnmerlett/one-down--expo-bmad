CREATE TABLE "state_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_state_snapshots_user_id_created_at" ON "state_snapshots" USING btree ("user_id","created_at");