ALTER TABLE `maintenance` MODIFY COLUMN `tipo` enum('preventiva','corretiva','troca_oleo') NOT NULL;
--> statement-breakpoint
ALTER TABLE `maintenance` ADD `km_troca` int;
--> statement-breakpoint
ALTER TABLE `maintenance` ADD `km_proxima` int;
--> statement-breakpoint
CREATE INDEX `maintenance_tipo_idx` ON `maintenance` (`tipo`);
