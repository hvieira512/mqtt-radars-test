<?php

class SleepReportRepository
{
    private $db;
    private $mesRelatorioWritable = null;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function countReports(array $filters = []): int
    {
        return (int)$this->db->getOne(
            "SELECT COUNT(*)
             FROM radares_relatorios_sono" . $this->buildReportWhereClause($filters)
        );
    }

    public function deleteReports(array $filters = [], bool $allowDeleteAll = false): int
    {
        if (!$filters && !$allowDeleteAll) {
            throw new InvalidArgumentException('Deleting all sleep reports requires explicit confirmation.');
        }

        $this->db->execute(
            "DELETE FROM radares_relatorios_sono" . $this->buildReportWhereClause($filters)
        );

        return (int)$this->db->affectedRows();
    }

    public function findByDeviceAndDate(int $deviceId, string $reportDate): ?array
    {
        $row = $this->db->getRow(
            "SELECT data_relatorio, pontuacao, payload_bruto
             FROM radares_relatorios_sono
             WHERE dispositivo_id = " . (int)$deviceId . "
               AND tipo_relatorio = 'daily'
               AND data_relatorio = '" . $this->db->sanitize($reportDate) . "'
             LIMIT 1"
        );

        return $row ?: null;
    }

    public function listDatesByDeviceAndRange(int $deviceId, string $startDate, string $endDate): array
    {
        $rows = $this->db->getAll(
            "SELECT data_relatorio
             FROM radares_relatorios_sono
             WHERE dispositivo_id = " . (int)$deviceId . "
               AND tipo_relatorio = 'daily'
               AND data_relatorio >= '" . $this->db->sanitize($startDate) . "'
               AND data_relatorio <= '" . $this->db->sanitize($endDate) . "'
             GROUP BY data_relatorio
             ORDER BY data_relatorio ASC"
        );

        $dates = [];
        foreach ($rows as $row) {
            $dates[] = (string)$row['data_relatorio'];
        }

        return array_values($dates);
    }

    public function listAnyReportDatesByDeviceAndRange(int $deviceId, string $startDate, string $endDate): array
    {
        $rows = $this->db->getAll(
            "SELECT data_relatorio as report_date
             FROM radares_relatorios_sono
             WHERE dispositivo_id = " . (int)$deviceId . "
               AND data_relatorio >= '" . $this->db->sanitize($startDate) . "'
               AND data_relatorio <= '" . $this->db->sanitize($endDate) . "'"
        );

        $dates = [];
        foreach ($rows as $row) {
            $dates[] = (string)$row['report_date'];
        }

        return $dates;
    }

    public function listPayloadsByDeviceAndRange(int $deviceId, string $startDate, string $endDate): array
    {
        return $this->db->getAll(
            "SELECT data_relatorio, pontuacao, payload_bruto
             FROM radares_relatorios_sono
             WHERE dispositivo_id = " . (int)$deviceId . "
               AND tipo_relatorio = 'daily'
               AND data_relatorio >= '" . $this->db->sanitize($startDate) . "'
               AND data_relatorio <= '" . $this->db->sanitize($endDate) . "'
               AND payload_bruto IS NOT NULL
               AND payload_bruto <> ''
             ORDER BY data_relatorio ASC"
        );
    }

    public function insertOrUpdateReport(int $utilizadorId, int $deviceId, string $reportDate, array $payload): void
    {
        $score = (int)($payload['summary']['overallScore'] ?? 0);
        $payloadBruto = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $insertSql = "
            INSERT INTO radares_relatorios_sono (utilizador_id, dispositivo_id, data_relatorio, pontuacao, payload_bruto)
            VALUES (" . $utilizadorId . ", " . $deviceId . ", '" . $this->db->sanitize($reportDate) . "', " . $score . ", '" . $this->db->sanitize((string)$payloadBruto) . "')
            ON DUPLICATE KEY UPDATE
                pontuacao = VALUES(pontuacao),
                payload_bruto = VALUES(payload_bruto)
        ";
        $this->db->execute($insertSql);
    }

    public function findMonthlyByDeviceAndMonth(int $deviceId, string $month): ?array
    {
        [$startDate, $endDate] = $this->buildMonthDateRange($month);
        $normalizedMonth = substr($startDate, 0, 7);
        $row = $this->db->getRow(
            "SELECT data_relatorio, pontuacao, payload_bruto, completo
             FROM radares_relatorios_sono
             WHERE dispositivo_id = " . (int)$deviceId . "
            AND tipo_relatorio = 'monthly'
               AND mes_relatorio = '" . $this->db->sanitize($normalizedMonth) . "'
             ORDER BY data_relatorio DESC, id DESC
             LIMIT 1"
        );

        if ($row) {
            return $row;
        }

        // Transitional fallback for rows created before mes_relatorio was explicitly filled.
        $fallbackRow = $this->db->getRow(
            "SELECT data_relatorio, pontuacao, payload_bruto, completo
             FROM radares_relatorios_sono
             WHERE dispositivo_id = " . (int)$deviceId . "
               AND tipo_relatorio = 'monthly'
               AND (mes_relatorio IS NULL OR mes_relatorio = '')
               AND data_relatorio >= '" . $this->db->sanitize($startDate) . "'
               AND data_relatorio <= '" . $this->db->sanitize($endDate) . "'
             ORDER BY data_relatorio DESC, id DESC
             LIMIT 1"
        );

        return $fallbackRow ?: null;
    }

    public function insertOrUpdateMonthlyReport(int $utilizadorId, int $deviceId, string $month, string $latestDate, array $payload, bool $completo): void
    {
        [$startDate, $endDate] = $this->buildMonthDateRange($month);
        $normalizedMonth = substr($startDate, 0, 7);
        $score = (int)($payload['summary']['overallScore'] ?? 0);
        $payloadBruto = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $completoInt = $completo ? 1 : 0;
        $canWriteMesRelatorio = $this->isMesRelatorioWritable();
        $monthlyRowIds = $this->findMonthlyRowIdsByDeviceAndMonth($deviceId, $normalizedMonth, $startDate, $endDate);

        $updateSetSql = "
                utilizador_id = " . $utilizadorId . ",
                data_relatorio = '" . $this->db->sanitize($latestDate) . "',
                completo = " . $completoInt . ",
                pontuacao = " . $score . ",
                payload_bruto = '" . $this->db->sanitize((string)$payloadBruto) . "'";
        if ($canWriteMesRelatorio) {
            $updateSetSql .= ",
                mes_relatorio = '" . $this->db->sanitize($normalizedMonth) . "'";
        }

        if ($monthlyRowIds) {
            $primaryId = (int)$monthlyRowIds[0];
            $updateSql = "
                UPDATE radares_relatorios_sono
                SET
                    " . $updateSetSql . "
                WHERE id = " . $primaryId . "
                LIMIT 1
            ";
            $this->db->execute($updateSql);

            $this->deleteMonthlyDuplicateRows($monthlyRowIds);
            return;
        }

        if ($canWriteMesRelatorio) {
            $insertSql = "
                INSERT INTO radares_relatorios_sono
                    (utilizador_id, dispositivo_id, tipo_relatorio, mes_relatorio, data_relatorio, completo, pontuacao, payload_bruto)
                VALUES
                    (" . $utilizadorId . ", " . $deviceId . ", 'monthly', '" . $this->db->sanitize($normalizedMonth) . "', '" . $this->db->sanitize($latestDate) . "', " . $completoInt . ", " . $score . ", '" . $this->db->sanitize((string)$payloadBruto) . "')
            ";
            $this->db->execute($insertSql);
            return;
        }

        $insertSql = "
            INSERT INTO radares_relatorios_sono
                (utilizador_id, dispositivo_id, tipo_relatorio, data_relatorio, completo, pontuacao, payload_bruto)
            VALUES
                (" . $utilizadorId . ", " . $deviceId . ", 'monthly', '" . $this->db->sanitize($latestDate) . "', " . $completoInt . ", " . $score . ", '" . $this->db->sanitize((string)$payloadBruto) . "')
        ";
        $this->db->execute($insertSql);
    }

    private function findMonthlyRowIdsByDeviceAndMonth(int $deviceId, string $month, string $startDate, string $endDate): array
    {
        $rows = $this->db->getAll(
            "SELECT id
             FROM radares_relatorios_sono
             WHERE dispositivo_id = " . (int)$deviceId . "
               AND tipo_relatorio = 'monthly'
               AND (
                   mes_relatorio = '" . $this->db->sanitize($month) . "'
                   OR (
                       (mes_relatorio IS NULL OR mes_relatorio = '')
                       AND data_relatorio >= '" . $this->db->sanitize($startDate) . "'
                       AND data_relatorio <= '" . $this->db->sanitize($endDate) . "'
                   )
               )
             ORDER BY id DESC"
        );

        $ids = [];
        foreach ($rows as $row) {
            $ids[] = (int)$row['id'];
        }

        return $ids;
    }

    private function deleteMonthlyDuplicateRows(array $rowIds): void
    {
        if (count($rowIds) <= 1) {
            return;
        }

        $duplicateIds = array_slice($rowIds, 1);
        $duplicateIds = array_values(array_filter(array_map('intval', $duplicateIds), static function ($id) {
            return $id > 0;
        }));

        if (!$duplicateIds) {
            return;
        }

        $this->db->execute(
            "DELETE FROM radares_relatorios_sono
             WHERE id IN (" . implode(',', $duplicateIds) . ")"
        );
    }

    private function buildMonthDateRange(string $month): array
    {
        $monthDate = DateTimeImmutable::createFromFormat('!Y-m', $month);
        if (!$monthDate) {
            throw new InvalidArgumentException('Invalid month format. Expected Y-m.');
        }

        return [
            $monthDate->format('Y-m-01'),
            $monthDate->format('Y-m-t'),
        ];
    }

    private function isMesRelatorioWritable(): bool
    {
        if ($this->mesRelatorioWritable !== null) {
            return $this->mesRelatorioWritable;
        }

        $column = $this->db->getRow(
            "SHOW COLUMNS FROM radares_relatorios_sono LIKE 'mes_relatorio'"
        );
        $extra = strtolower((string)($column['Extra'] ?? $column['extra'] ?? ''));

        $this->mesRelatorioWritable = strpos($extra, 'generated') === false;
        return $this->mesRelatorioWritable;
    }

    private function buildReportWhereClause(array $filters): string
    {
        $allowedFilters = ['device_id', 'report_type', 'report_date', 'start_date', 'end_date'];
        $clauses = [];

        foreach ($filters as $key => $value) {
            if (!in_array($key, $allowedFilters, true)) {
                throw new InvalidArgumentException('Unsupported sleep report filter: ' . $key);
            }

            if ($value === null || $value === '') {
                continue;
            }

            switch ($key) {
                case 'device_id':
                    $clauses[] = 'dispositivo_id = ' . (int)$value;
                    break;
                case 'report_type':
                    $clauses[] = "tipo_relatorio = '" . $this->db->sanitize((string)$value) . "'";
                    break;
                case 'report_date':
                    $clauses[] = "data_relatorio = '" . $this->db->sanitize((string)$value) . "'";
                    break;
                case 'start_date':
                    $clauses[] = "data_relatorio >= '" . $this->db->sanitize((string)$value) . "'";
                    break;
                case 'end_date':
                    $clauses[] = "data_relatorio <= '" . $this->db->sanitize((string)$value) . "'";
                    break;
            }
        }

        return $clauses ? ' WHERE ' . implode(' AND ', $clauses) : '';
    }
}
