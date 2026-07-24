ALTER TABLE `tasks` ADD `skip_window_started_at` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `last_engaged_at` integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE `tasks` SET `last_engaged_at` = `updated_at`;
