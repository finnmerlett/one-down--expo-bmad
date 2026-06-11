CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`details` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`size` text,
	`contexts` text,
	`deadline` integer,
	`has_check_needed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
