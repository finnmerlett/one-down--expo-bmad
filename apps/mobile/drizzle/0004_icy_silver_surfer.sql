CREATE TABLE `sync_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`last_pushed_at` integer,
	`pull_cursor` integer
);
