ALTER TABLE `vehicles` ADD `seguro_feito` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `vehicles` ADD `vistoria_feita` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `vehicles` ADD `vistoria_validade` date;
--> statement-breakpoint
UPDATE `vehicles` SET `seguro_feito` = true WHERE `seguro_validade` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `vehicles_seguro_validade_idx` ON `vehicles` (`seguro_validade`);
--> statement-breakpoint
CREATE INDEX `vehicles_vistoria_validade_idx` ON `vehicles` (`vistoria_validade`);
