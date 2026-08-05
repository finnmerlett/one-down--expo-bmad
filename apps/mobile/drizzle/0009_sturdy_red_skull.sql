CREATE TABLE `task_offers` (
	`task_id` text PRIMARY KEY NOT NULL,
	`amount` integer NOT NULL,
	`spent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
