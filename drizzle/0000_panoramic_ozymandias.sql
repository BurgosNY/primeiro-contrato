CREATE TABLE `matches` (
	`profile_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`score` integer NOT NULL,
	`band` text NOT NULL,
	`blocked` integer NOT NULL,
	`payload_json` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`profile_id`, `opportunity_id`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `matches_profile_score_idx` ON `matches` (`profile_id`,`score`);--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_url` text NOT NULL,
	`status` text NOT NULL,
	`payload_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`captured_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `opportunities_status_idx` ON `opportunities` (`status`);--> statement-breakpoint
CREATE TABLE `opportunity_requirements` (
	`opportunity_id` text PRIMARY KEY NOT NULL,
	`content_hash` text NOT NULL,
	`model` text NOT NULL,
	`schema_version` text NOT NULL,
	`payload_json` text NOT NULL,
	`extracted_at` text NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_session_id_unique` ON `profiles` (`session_id`);--> statement-breakpoint
CREATE INDEX `profiles_session_idx` ON `profiles` (`session_id`);--> statement-breakpoint
CREATE TABLE `refresh_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`source` text NOT NULL,
	`opportunity_count` integer DEFAULT 0 NOT NULL,
	`requirements_count` integer DEFAULT 0 NOT NULL,
	`model` text,
	`message` text,
	`started_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `refresh_runs_started_idx` ON `refresh_runs` (`started_at`);