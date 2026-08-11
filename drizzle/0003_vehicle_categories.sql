CREATE TABLE `vehicle_categories` (
	`id` varchar(36) NOT NULL,
	`nome` varchar(80) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicle_categories_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE INDEX `vehicle_categories_ativo_idx` ON `vehicle_categories` (`ativo`);
--> statement-breakpoint
INSERT INTO `vehicle_categories` (`id`, `nome`, `ativo`) VALUES
	('cat-vans', 'VANS', true),
	('cat-carros', 'CARROS', true),
	('cat-particular', 'PARTICULAR', true),
	('cat-picape', 'PICAPE PARA GARIMPO', true);
--> statement-breakpoint
ALTER TABLE `vehicles` MODIFY COLUMN `categoria` varchar(80) NOT NULL;
--> statement-breakpoint
UPDATE `vehicles` SET `categoria` = 'PICAPE PARA GARIMPO' WHERE `categoria` = 'PICAPE';
