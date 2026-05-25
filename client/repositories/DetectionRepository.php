<?php

class DetectionRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function insertDetection(array $data): int
    {
        $this->insertDetections([$data]);

        return (int)$this->db->getLastInsertedId();
    }

    public function insertDetections(array $detections): void
    {
        if (!$detections) {
            return;
        }

        $values = [];
        foreach ($detections as $d) {
            $eventId = isset($d['event_id']) && $d['event_id'] !== null ? (int)$d['event_id'] : 'NULL';
            $deviceId = isset($d['device_id']) && $d['device_id'] !== null ? (int)$d['device_id'] : 'NULL';
            $personIndex = isset($d['person_index']) && $d['person_index'] !== null ? (int)$d['person_index'] : 'NULL';
            $regionId = isset($d['region_id']) && $d['region_id'] !== null ? (int)$d['region_id'] : 'NULL';

            $values[] = sprintf(
                '(%s, %s, %s, %s, %s, %s, %s, %s, %s)',
                $eventId,
                $deviceId,
                "'" . $this->db->sanitize($this->normalizeCategoryForStorage($d['category'] ?? '')) . "'",
                "'" . $this->db->sanitize((string)($d['type'] ?? '')) . "'",
                "'" . $this->db->sanitize((string)($d['level'] ?? '')) . "'",
                "'" . $this->db->sanitize((string)($d['source'] ?? '')) . "'",
                $personIndex,
                $regionId,
                "'" . $this->db->sanitize((string)($d['message'] ?? '')) . "'"
            );
        }

        $result = $this->db->execute(
            "INSERT INTO radares_detecoes
                (evento_id, dispositivo_id, categoria, tipo, nivel, origem, indice_pessoa, regiao_id, mensagem)
             VALUES " . implode(',', $values)
        );

        if ($result === false) {
            throw new Exception("Failed to insert detections.");
        }
    }

    public function getLatestDetectionId(): int
    {
        return (int)$this->db->getOne("SELECT MAX(id) FROM radares_detecoes");
    }

    public function listOpenFallConfirmed(int $limit = 100): array
    {
        $rows = $this->db->getAll("
            SELECT
                d.id as detection_id,
                d.evento_id,
                d.dispositivo_id,
                d.categoria,
                d.tipo,
                d.nivel,
                d.origem,
                d.indice_pessoa,
                d.regiao_id,
                d.mensagem,
                d.criado_em,
                d.intervencao_inicio,
                d.intervencao_inicio_por,
                d.intervencao_fim,
                d.intervencao_fim_por,
                r.uid as device_code
            FROM radares_detecoes d
            LEFT JOIN radares r ON r.id = d.dispositivo_id
            WHERE d.tipo = 'fall_confirmed'
            AND d.intervencao_inicio IS NULL
            ORDER BY d.id DESC
            LIMIT " . (int)$limit . "
        ");

        $alarms = [];
        foreach ($rows as $alarm) {
            $alarms[] = [
                'detection_id' => (int)$alarm['detection_id'],
                'event_id' => $alarm['evento_id'] ? (int)$alarm['evento_id'] : null,
                'device_code' => $alarm['device_code'],
                'category' => $this->normalizeCategoryForApi((string)$alarm['categoria']),
                'alarm_type' => $alarm['tipo'],
                'level' => $alarm['nivel'],
                'source' => $alarm['origem'],
                'person_index' => $alarm['indice_pessoa'] !== null ? (int)$alarm['indice_pessoa'] : null,
                'region_id' => $alarm['regiao_id'] !== null ? (int)$alarm['regiao_id'] : null,
                'message' => $alarm['mensagem'],
                'created_at' => $alarm['criado_em'],
                'intervencao_inicio' => $alarm['intervencao_inicio'],
                'intervencao_inicio_por' => $alarm['intervencao_inicio_por'] ? (int)$alarm['intervencao_inicio_por'] : null,
                'intervencao_fim' => $alarm['intervencao_fim'],
                'intervencao_fim_por' => $alarm['intervencao_fim_por'] ? (int)$alarm['intervencao_fim_por'] : null,
            ];
        }

        usort($alarms, function($a, $b) {
            return $a['detection_id'] - $b['detection_id'];
        });

        return $alarms;
    }

    public function countFallConfirmedSince(string $dateTime): int
    {
        return (int)$this->db->getOne("
            SELECT COUNT(*)
            FROM radares_detecoes
            WHERE tipo = 'fall_confirmed' AND criado_em >= '" . $this->db->sanitize($dateTime) . "'
        ");
    }

    public function searchDeviceTable(array $params): array
    {
        $deviceCode = (string)$params['device_code'];
        $categoria = (string)$params['categoria'];
        $estado = (string)$params['estado'];
        $dataInicio = $params['data_inicio'];
        $dataFim = $params['data_fim'];
        $globalSearch = (string)$params['global_search'];
        $columnSearches = $params['column_searches'];
        $columnMap = $params['column_map'];
        $orderColumn = (string)$params['order_column'];
        $orderDir = (string)$params['order_dir'];
        $length = (int)$params['length'];
        $start = (int)$params['start'];
        $areaNameMap = $params['area_name_map'];
        $alarmTypes = ['fall_confirmed'];
        $eventTypes = ['room_entry', 'room_exit', 'area_entry', 'area_exit'];

        if (!empty($areaNameMap)) {
            $caseStmt = "CASE d.regiao_id";
            foreach ($areaNameMap as $key => $name) {
                $caseStmt .= " WHEN " . (int)$key . " THEN '" . $this->db->sanitize($name) . "'";
            }
            $caseStmt .= " ELSE NULL END";
        } else {
            $caseStmt = "NULL";
        }

        $conditions = ["d.dispositivo_id = r.id", "r.uid = '" . $this->db->sanitize($deviceCode) . "'"];

        if ($categoria === 'alarm') {
            $conditions[] = "d.tipo IN ('" . implode("', '", $alarmTypes) . "')";
        } elseif ($categoria === 'event') {
            $conditions[] = "d.tipo IN ('" . implode("', '", $eventTypes) . "')";
        }

        if ($estado === 'unresolved') {
            $conditions[] = "d.intervencao_fim IS NULL";
        } elseif ($estado === 'resolved') {
            $conditions[] = "d.intervencao_fim IS NOT NULL";
        }

        if ($dataInicio) {
            $conditions[] = "d.criado_em >= '" . $this->db->sanitize($dataInicio) . " 00:00:00'";
        }
        if ($dataFim) {
            $conditions[] = "d.criado_em <= '" . $this->db->sanitize($dataFim) . " 23:59:59'";
        }

        if ($globalSearch !== '') {
            $terms = preg_split('/\s+/', $globalSearch);
            $globalClauses = [];

            foreach ($terms as $term) {
                $termEscaped = $this->escapeLikeTerm($term);
                $wordClauses = [];
                $wordClauses[] = "d.tipo LIKE '%$termEscaped%' ESCAPE '\\\\'";
                $wordClauses[] = "d.mensagem LIKE '%$termEscaped%' ESCAPE '\\\\'";
                $wordClauses[] = "({$caseStmt}) LIKE '%$termEscaped%' ESCAPE '\\\\'";
                $globalClauses[] = '(' . implode(' OR ', $wordClauses) . ')';
            }

            if (!empty($globalClauses)) {
                $conditions[] = '(' . implode(' AND ', $globalClauses) . ')';
            }
        }

        foreach ($columnSearches as $idx => $search) {
            if (!isset($columnMap[$idx])) continue;

            $terms = preg_split('/\s+/', $search);
            $likeClauses = [];

            foreach ($terms as $term) {
                $termEscaped = $this->escapeLikeTerm($term);
                $likeClauses[] = "{$columnMap[$idx]} LIKE '%$termEscaped%' ESCAPE '\\\\'";
            }

            if (!empty($likeClauses)) {
                $conditions[] = '(' . implode(' AND ', $likeClauses) . ')';
            }
        }

        $whereClause = implode(' AND ', $conditions);
        $interventionSelect = $categoria === 'alarm'
            ? ",
                d.intervencao_inicio,
                d.intervencao_inicio_por,
                d.intervencao_fim,
                d.intervencao_fim_por"
            : "";

        $recordsFiltered = (int)$this->db->getOne("
            SELECT COUNT(*)
            FROM radares_detecoes d
            JOIN radares r ON {$whereClause}
        ");

        $sql = "
            SELECT
                d.id,
                d.tipo,
                d.regiao_id,
                {$caseStmt} as regiao_nome,
                d.mensagem,
                d.criado_em,
                d.indice_pessoa
                {$interventionSelect}
            FROM radares_detecoes d
            JOIN radares r ON {$whereClause}
            ORDER BY {$orderColumn} {$orderDir}
            LIMIT {$length} OFFSET {$start}
        ";

        return [
            'recordsFiltered' => $recordsFiltered,
            'rows' => $this->db->getAll($sql),
        ];
    }

    public function resolveDetection($deviceId, $personIndex, $type): void
    {
        $where = "dispositivo_id = " . (int)$deviceId
            . " AND tipo = '" . $this->db->sanitize($type) . "'"
            . " AND intervencao_fim IS NULL";
        if ($personIndex !== null) {
            $where .= " AND indice_pessoa = " . (int)$personIndex;
        }

        $this->db->autoExecute('radares_detecoes', [
            'intervencao_fim' => ['NOW()', 'raw'],
        ], 'UPDATE', $where);
    }

    public function silenceDetections(array $detectionIds, int $userId): void
    {
        $ids = array_map('intval', $detectionIds);
        if (!$ids) return;

        $idsStr = implode(',', $ids);
        $this->assertCanSilenceDetections($ids);

        $this->db->execute("
            UPDATE radares_detecoes
            SET intervencao_inicio = NOW(),
                intervencao_inicio_por = " . $userId . "
            WHERE id IN ($idsStr)
              AND intervencao_inicio IS NULL
        ");
    }

    public function resolveDetections(array $detectionIds, int $userId): void
    {
        $ids = array_map('intval', $detectionIds);
        if (!$ids) return;

        $idsStr = implode(',', $ids);
        $this->db->execute("
            UPDATE radares_detecoes
            SET intervencao_fim = NOW(),
                intervencao_fim_por = " . $userId . "
            WHERE id IN ($idsStr)
              AND intervencao_inicio IS NOT NULL
              AND intervencao_fim IS NULL
        ");
    }

    private function assertCanSilenceDetections(array $ids): void
    {
        if (!$ids) return;

        $idsStr = implode(',', $ids);
        $canSilenceFallConfirmed = (int)$this->db->getOne("SELECT touch_app_nfc_alertas_radares FROM configs_ucc LIMIT 1") !== 1;

        if ($canSilenceFallConfirmed) {
            return;
        }

        $fallConfirmed = (int)$this->db->getOne("
            SELECT COUNT(*)
            FROM radares_detecoes
            WHERE id IN ($idsStr) AND tipo = 'fall_confirmed'
        ");

        if ($fallConfirmed > 0) {
            throw new Exception('Silencing fall confirmed alarms is disabled', 403);
        }
    }

    private function escapeLikeTerm(string $term): string
    {
        $term = str_replace('\\', '\\\\', $term);
        $term = str_replace(['%', '_'], ['\\%', '\\_'], $term);

        return $this->db->sanitize($term);
    }

    private function normalizeCategoryForStorage(string $category): string
    {
        if ($category === 'alarm') {
            return 'alarme';
        }
        if ($category === 'event') {
            return 'evento';
        }

        return $category;
    }

    private function normalizeCategoryForApi(string $category): string
    {
        if ($category === 'alarme') {
            return 'alarm';
        }
        if ($category === 'evento') {
            return 'event';
        }

        return $category;
    }
}
