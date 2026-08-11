CREATE TABLE `transfer_services` (
	`id` varchar(36) NOT NULL,
	`veiculo_id` varchar(36) NOT NULL,
	`tipo_servico` varchar(40) NOT NULL,
	`destino` varchar(300) NOT NULL,
	`data` date NOT NULL,
	`valor` decimal(14,2) NOT NULL,
	`moeda` enum('SRD','USD','EUR') NOT NULL,
	`cliente_nome` varchar(180),
	`obs` varchar(2000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transfer_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `transfer_services` ADD CONSTRAINT `transfer_services_veiculo_id_vehicles_id_fk` FOREIGN KEY (`veiculo_id`) REFERENCES `vehicles`(`id`) ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX `transfer_services_veiculo_idx` ON `transfer_services` (`veiculo_id`);
--> statement-breakpoint
CREATE INDEX `transfer_services_data_idx` ON `transfer_services` (`data`);
--> statement-breakpoint
CREATE INDEX `transfer_services_tipo_idx` ON `transfer_services` (`tipo_servico`);
