CREATE TABLE `exchange_rate_cache` (
	`id` varchar(16) NOT NULL,
	`srd_per_usd` decimal(18,6) NOT NULL,
	`eur_per_usd` decimal(18,6) NOT NULL,
	`fetched_at` timestamp NOT NULL,
	`source` varchar(40) NOT NULL,
	CONSTRAINT `exchange_rate_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `finance_entries` ADD `valor_usd` decimal(14,2) NULL;
--> statement-breakpoint
ALTER TABLE `finance_entries` ADD `taxa_usd` decimal(18,6) NULL;
--> statement-breakpoint
ALTER TABLE `finance_entries` ADD `cotacao_em` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `finance_entries` ADD `cotacao_fonte` varchar(40);
--> statement-breakpoint
UPDATE `finance_entries`
SET
	`valor_usd` = `valor`,
	`taxa_usd` = 1,
	`cotacao_em` = `created_at`,
	`cotacao_fonte` = 'usd'
WHERE `moeda` = 'USD';
