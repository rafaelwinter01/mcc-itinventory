CREATE TABLE `attribute` (
	`id` int AUTO_INCREMENT NOT NULL,
	`device_id` int,
	`key` varchar(100),
	`value` text,
	CONSTRAINT `attribute_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `department` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text,
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `department_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`device_type_id` int NOT NULL,
	`location_id` int,
	`status_id` int,
	`make_model_id` int,
	`serial_number` varchar(150),
	`product_number` varchar(150),
	`mac_address` varchar(50),
	`warranty_start` date,
	`warranty_end` date,
	`warranty_type` varchar(50),
	`warranty_link` varchar(255),
	`cost` decimal(10,2),
	`support_site` text,
	`drivers_site` text,
	`description` text,
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `device_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_computer` (
	`device_id` int NOT NULL,
	`domain` varchar(150),
	`os` varchar(100) NOT NULL,
	`config` json,
	CONSTRAINT `device_computer_device_id` PRIMARY KEY(`device_id`)
);
--> statement-breakpoint
CREATE TABLE `device_lifecycle` (
	`id` int AUTO_INCREMENT NOT NULL,
	`device_id` int NOT NULL,
	`purchase_date` date,
	`end_of_life` date,
	`expected_replacement_year` int,
	`plan_description` varchar(100),
	`extra_notes` text,
	`billed_to` int,
	`cost_to` int,
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `device_lifecycle_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_lifecycle_device_id_unique` UNIQUE(`device_id`)
);
--> statement-breakpoint
CREATE TABLE `device_type` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	CONSTRAINT `device_type_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_type_name_idx` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`action` varchar(255) NOT NULL,
	`entity_name` varchar(255) NOT NULL,
	`description` text,
	`entity_id` int,
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `license` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`description` text,
	`cost` decimal(10,2),
	`billing_frequency` varchar(50),
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `license_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`address` text,
	`manager_id` int,
	CONSTRAINT `location_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `make_model` (
	`id` int AUTO_INCREMENT NOT NULL,
	`make` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`device_type_id` int,
	`description` text,
	CONSTRAINT `make_model_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peripheral` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	CONSTRAINT `peripheral_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`system_user_id` int NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `session_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(50),
	CONSTRAINT `status_id` PRIMARY KEY(`id`),
	CONSTRAINT `status_name_idx` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `system_user` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`username` varchar(100) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`invitation_hash` varchar(64),
	`role` enum('admin','common') DEFAULT 'common',
	`is_active` int DEFAULT 1,
	`preferences` json DEFAULT (JSON_OBJECT()),
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`last_login_at` datetime,
	CONSTRAINT `system_user_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_user_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `system_user_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstname` text NOT NULL,
	`lastname` text NOT NULL,
	`email` varchar(255),
	`department_id` int,
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `user_device` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`device_id` int NOT NULL,
	`date_assignment` date,
	`assigned` boolean DEFAULT true,
	CONSTRAINT `user_device_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_license` (
	`user_id` int NOT NULL,
	`license_id` int NOT NULL,
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`cost` decimal(10,2),
	`billing_frequency` varchar(50),
	`active` boolean,
	CONSTRAINT `user_license_user_id_license_id_pk` PRIMARY KEY(`user_id`,`license_id`)
);
--> statement-breakpoint
CREATE TABLE `workstation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`info` json,
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workstation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workstation_device` (
	`device_id` int NOT NULL,
	`workstation_id` int NOT NULL,
	CONSTRAINT `workstation_device_device_id_workstation_id_pk` PRIMARY KEY(`device_id`,`workstation_id`)
);
--> statement-breakpoint
CREATE TABLE `workstation_peripheral` (
	`workstation_id` int NOT NULL,
	`peripheral_id` int NOT NULL,
	`quantity` int DEFAULT 1,
	CONSTRAINT `workstation_peripheral_workstation_id_peripheral_id_pk` PRIMARY KEY(`workstation_id`,`peripheral_id`)
);
--> statement-breakpoint
CREATE TABLE `workstation_user` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workstation_id` int NOT NULL,
	`user_id` int NOT NULL,
	`created_at` datetime DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `workstation_user_id` PRIMARY KEY(`id`),
	CONSTRAINT `workstation_user_workstation_id_user_id_unique` UNIQUE(`workstation_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `device_lifecycle` ADD CONSTRAINT `device_lifecycle_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_lifecycle` ADD CONSTRAINT `device_lifecycle_billed_to_department_id_fk` FOREIGN KEY (`billed_to`) REFERENCES `department`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_lifecycle` ADD CONSTRAINT `device_lifecycle_cost_to_department_id_fk` FOREIGN KEY (`cost_to`) REFERENCES `department`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `make_model` ADD CONSTRAINT `make_model_device_type_id_device_type_id_fk` FOREIGN KEY (`device_type_id`) REFERENCES `device_type`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_department_id_department_id_fk` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workstation_user` ADD CONSTRAINT `workstation_user_workstation_id_workstation_id_fk` FOREIGN KEY (`workstation_id`) REFERENCES `workstation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workstation_user` ADD CONSTRAINT `workstation_user_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;