ALTER TABLE `vehicles` ADD `oculto` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `vehicles_oculto_idx` ON `vehicles` (`oculto`);
