ALTER TABLE "tasks" ADD COLUMN "skip_window_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "last_engaged_at" timestamp with time zone NOT NULL DEFAULT now();--> statement-breakpoint
UPDATE "tasks" SET "last_engaged_at" = "updated_at";--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "last_engaged_at" DROP DEFAULT;
