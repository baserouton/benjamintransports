ALTER TABLE `rentals` ADD `prazo_indeterminado` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `rentals` ADD `renovacoes` json;
