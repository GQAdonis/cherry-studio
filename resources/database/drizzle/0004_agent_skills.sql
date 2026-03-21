CREATE TABLE `agent_skills` (
	`agent_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`enabled` text DEFAULT 'true' NOT NULL,
	`priority` text DEFAULT '0',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`agent_id`, `skill_id`),
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_agent_skills_agent_id` ON `agent_skills` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_skills_skill_id` ON `agent_skills` (`skill_id`);