ALTER TABLE `designers` MODIFY COLUMN `joinDate` varchar(10);--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `startDate` varchar(10);--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `endDate` varchar(10);--> statement-breakpoint
ALTER TABLE `schedules` MODIFY COLUMN `startDate` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` MODIFY COLUMN `endDate` varchar(10) NOT NULL;