CREATE TABLE `coupons` (
	`id` varchar(36) NOT NULL,
	`numero` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(32) NOT NULL,
	`tipo` enum('entrega','renovacao','devolucao','translato') NOT NULL,
	`rental_id` varchar(36),
	`transfer_service_id` varchar(36),
	`moeda` enum('SRD','USD','EUR') NOT NULL,
	`total` decimal(14,2) NOT NULL,
	`payload` json NOT NULL,
	`emitido_por` varchar(80) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_numero_unique` UNIQUE(`numero`),
	CONSTRAINT `coupons_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_rental_id_rentals_id_fk` FOREIGN KEY (`rental_id`) REFERENCES `rentals`(`id`) ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_transfer_service_id_transfer_services_id_fk` FOREIGN KEY (`transfer_service_id`) REFERENCES `transfer_services`(`id`) ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX `coupons_rental_idx` ON `coupons` (`rental_id`);
--> statement-breakpoint
CREATE INDEX `coupons_transfer_idx` ON `coupons` (`transfer_service_id`);
--> statement-breakpoint
CREATE INDEX `coupons_tipo_idx` ON `coupons` (`tipo`);
