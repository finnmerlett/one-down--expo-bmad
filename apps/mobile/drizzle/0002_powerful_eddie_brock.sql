CREATE TABLE `star_activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`task_title` text NOT NULL,
	`action` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL
);
