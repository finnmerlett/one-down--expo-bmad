ALTER TABLE `preferences` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `star_activity_log` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `star_activity_log` ADD `updated_at` integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE `star_activity_log` SET `updated_at` = `created_at`;--> statement-breakpoint
ALTER TABLE `subtasks` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `deleted_at` integer;--> statement-breakpoint
UPDATE `sync_meta` SET `id` = 'tasks' WHERE `id` = 'singleton';