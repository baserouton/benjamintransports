CREATE TABLE `activity_logs` (
	`id` varchar(36) NOT NULL,
	`quando` timestamp NOT NULL DEFAULT (now()),
	`usuario` varchar(80) NOT NULL,
	`acao` varchar(1000) NOT NULL,
	`categoria` varchar(80),
	`pagina` varchar(500),
	`detalhes` json,
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` varchar(36) NOT NULL,
	`nome` varchar(180) NOT NULL,
	`rg` varchar(40) NOT NULL DEFAULT '',
	`cpf` varchar(40) NOT NULL DEFAULT '',
	`endereco` varchar(500) NOT NULL DEFAULT '',
	`whatsapp` varchar(40) NOT NULL DEFAULT '',
	`email` varchar(254),
	`cnh_url` varchar(1000),
	`suriname` boolean NOT NULL DEFAULT false,
	`passaporte_url` varchar(1000),
	`identiteitskaart_url` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_entries` (
	`id` varchar(36) NOT NULL,
	`data` date NOT NULL,
	`descricao` varchar(500) NOT NULL,
	`valor` decimal(14,2) NOT NULL,
	`moeda` enum('SRD','USD','EUR') NOT NULL,
	`tipo` enum('entrada','despesa') NOT NULL,
	`veiculo_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `finance_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance` (
	`id` varchar(36) NOT NULL,
	`veiculo_id` varchar(36) NOT NULL,
	`tipo` enum('preventiva','corretiva') NOT NULL,
	`pecas` varchar(1000) NOT NULL,
	`custo` decimal(14,2) NOT NULL,
	`moeda` enum('SRD','USD','EUR') NOT NULL,
	`data` date NOT NULL,
	`obs` varchar(2000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rentals` (
	`id` varchar(36) NOT NULL,
	`veiculo_id` varchar(36) NOT NULL,
	`cliente_id` varchar(36) NOT NULL,
	`data_retirada` date NOT NULL,
	`data_saida` date NOT NULL,
	`status` enum('pendente','entregue','devolvido') NOT NULL DEFAULT 'pendente',
	`valor_aluguel` decimal(14,2) NOT NULL,
	`moeda` enum('SRD','USD','EUR') NOT NULL,
	`seguro_valor` decimal(14,2),
	`seguro_obs` varchar(1000),
	`caucao_valor` decimal(14,2),
	`caucao_status` enum('retido','devolvido'),
	`vistoria_retirada` json,
	`vistoria_devolucao` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rentals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`nome` varchar(180) NOT NULL,
	`email` varchar(254) NOT NULL,
	`login` varchar(80) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_login_unique` UNIQUE(`login`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` varchar(36) NOT NULL,
	`modelo` varchar(160) NOT NULL,
	`placa` varchar(32) NOT NULL,
	`categoria` enum('VANS','CARROS','PARTICULAR','PICAPE') NOT NULL,
	`fotos` json NOT NULL,
	`ano` int,
	`disponivel` boolean NOT NULL DEFAULT true,
	`seguro_validade` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_placa_unique` UNIQUE(`placa`)
);
--> statement-breakpoint
ALTER TABLE `finance_entries` ADD CONSTRAINT `finance_entries_veiculo_id_vehicles_id_fk` FOREIGN KEY (`veiculo_id`) REFERENCES `vehicles`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_veiculo_id_vehicles_id_fk` FOREIGN KEY (`veiculo_id`) REFERENCES `vehicles`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `rentals` ADD CONSTRAINT `rentals_veiculo_id_vehicles_id_fk` FOREIGN KEY (`veiculo_id`) REFERENCES `vehicles`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `rentals` ADD CONSTRAINT `rentals_cliente_id_clients_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `activity_logs_quando_idx` ON `activity_logs` (`quando`);--> statement-breakpoint
CREATE INDEX `activity_logs_usuario_idx` ON `activity_logs` (`usuario`);--> statement-breakpoint
CREATE INDEX `activity_logs_categoria_idx` ON `activity_logs` (`categoria`);--> statement-breakpoint
CREATE INDEX `clients_nome_idx` ON `clients` (`nome`);--> statement-breakpoint
CREATE INDEX `clients_cpf_idx` ON `clients` (`cpf`);--> statement-breakpoint
CREATE INDEX `finance_data_idx` ON `finance_entries` (`data`);--> statement-breakpoint
CREATE INDEX `finance_tipo_idx` ON `finance_entries` (`tipo`);--> statement-breakpoint
CREATE INDEX `finance_veiculo_idx` ON `finance_entries` (`veiculo_id`);--> statement-breakpoint
CREATE INDEX `maintenance_veiculo_idx` ON `maintenance` (`veiculo_id`);--> statement-breakpoint
CREATE INDEX `maintenance_data_idx` ON `maintenance` (`data`);--> statement-breakpoint
CREATE INDEX `rentals_veiculo_idx` ON `rentals` (`veiculo_id`);--> statement-breakpoint
CREATE INDEX `rentals_cliente_idx` ON `rentals` (`cliente_id`);--> statement-breakpoint
CREATE INDEX `rentals_status_idx` ON `rentals` (`status`);--> statement-breakpoint
CREATE INDEX `rentals_periodo_idx` ON `rentals` (`data_retirada`,`data_saida`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `vehicles_categoria_idx` ON `vehicles` (`categoria`);--> statement-breakpoint
CREATE INDEX `vehicles_disponivel_idx` ON `vehicles` (`disponivel`);