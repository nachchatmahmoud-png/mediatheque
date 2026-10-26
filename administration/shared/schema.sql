CREATE TABLE `administrators` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`requires_password_change` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `administrators_username_unique` ON `administrators` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_owner` ON `administrators` (`role`) WHERE "administrators"."role" = 'owner';--> statement-breakpoint
CREATE TABLE `attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`username` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_token_hash_unique` ON `invitations` (`token_hash`);--> statement-breakpoint
CREATE TABLE `publications` (
	`folder` text PRIMARY KEY NOT NULL,
	`record` text NOT NULL,
	`assets` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`account_version` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`object_path` text NOT NULL,
	`metadata` text NOT NULL
);
