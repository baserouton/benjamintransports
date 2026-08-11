ALTER TABLE `finance_entries` ADD `categoria` varchar(40) NOT NULL DEFAULT 'outro';
--> statement-breakpoint
ALTER TABLE `finance_entries` ADD `manual` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE INDEX `finance_categoria_idx` ON `finance_entries` (`categoria`);
--> statement-breakpoint
UPDATE `finance_entries` SET `categoria` = 'aluguel' WHERE `descricao` LIKE 'Aluguel%';
--> statement-breakpoint
UPDATE `finance_entries` SET `categoria` = 'manutencao' WHERE `descricao` LIKE 'Manutenção%';
--> statement-breakpoint
UPDATE `finance_entries` SET `categoria` = 'taxa' WHERE `descricao` LIKE 'Taxa%';
--> statement-breakpoint
UPDATE `finance_entries` SET `categoria` = 'seguro' WHERE `descricao` LIKE 'Seguro%';
--> statement-breakpoint
INSERT INTO `finance_entries` (`id`, `data`, `descricao`, `valor`, `moeda`, `tipo`, `categoria`, `manual`, `veiculo_id`)
SELECT
	UUID(),
	DATE(v.`created_at`),
	CONCAT('Aquisição — ', v.`modelo`, ' (', v.`placa`, ')'),
	v.`custo_aquisicao`,
	COALESCE(v.`moeda_aquisicao`, 'SRD'),
	'despesa',
	'aquisicao',
	false,
	v.`id`
FROM `vehicles` v
WHERE v.`custo_aquisicao` IS NOT NULL
	AND v.`custo_aquisicao` > 0
	AND NOT EXISTS (
		SELECT 1 FROM `finance_entries` f
		WHERE f.`veiculo_id` = v.`id` AND f.`categoria` = 'aquisicao'
	);
