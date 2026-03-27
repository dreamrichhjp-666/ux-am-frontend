CREATE TABLE `designers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`roleType` varchar(16) NOT NULL,
	`styleTags` json,
	`status` enum('available','busy','leave') NOT NULL DEFAULT 'available',
	`am` varchar(64),
	`avatarUrl` text,
	`bio` text,
	`contact` varchar(128),
	`joinDate` date,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `designers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(256) NOT NULL,
	`name` varchar(64) NOT NULL,
	`platformRole` varchar(32) NOT NULL DEFAULT 'viewer',
	`designerId` int,
	`dept` varchar(64),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `portfolios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`designerId` int NOT NULL,
	`title` varchar(128) NOT NULL,
	`description` text,
	`fileUrl` text NOT NULL,
	`fileType` varchar(16) NOT NULL DEFAULT 'image',
	`thumbnailUrl` text,
	`projectName` varchar(128),
	`tags` json,
	`sortOrder` int DEFAULT 0,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`code` varchar(32),
	`status` enum('active','completed','paused','cancelled') NOT NULL DEFAULT 'active',
	`startDate` date,
	`endDate` date,
	`pm` varchar(64),
	`description` text,
	`color` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`designerId` int NOT NULL,
	`roleType` varchar(16) NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`workloadPercent` int DEFAULT 100,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`)
);
