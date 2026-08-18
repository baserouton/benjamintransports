ALTER TABLE `vehicles` ADD `km_atual` int;
--> statement-breakpoint
ALTER TABLE `vehicles` ADD `km_ultima_troca_oleo` int;
--> statement-breakpoint
ALTER TABLE `vehicles` ADD `intervalo_troca_oleo_km` int NOT NULL DEFAULT 5000;
--> statement-breakpoint
CREATE INDEX `vehicles_km_atual_idx` ON `vehicles` (`km_atual`);
