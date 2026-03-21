CREATE TABLE `skills_storage` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`instructions` text NOT NULL,
	`tools` text,
	`examples` text,
	`tags` text,
	`trigger_patterns` text,
	`license` text,
	`compatibility` text,
	`metadata` text,
	`allowed_tools` text,
	`scripts` text,
	`references` text,
	`assets` text,
	`asset_data` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_skills_storage_name` ON `skills_storage` (`name`);
