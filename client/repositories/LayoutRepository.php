<?php

class LayoutRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function expireLayout(int $layoutId): void
    {
        $result = $this->db->autoExecute('radares_layouts', [
            'valido_ate' => ['NOW()', 'raw'],
        ], 'UPDATE', 'id = ' . (int)$layoutId);

        if (!$result) {
            throw new RuntimeException('Failed to expire layout');
        }
    }

    public function insertLayout(int $deviceId, ?string $rectangle, ?string $declareArea, ?string $declareAreaName): int
    {
        $result = $this->db->autoExecute('radares_layouts', [
            'dispositivo_id' => $deviceId,
            'rectangle' => $rectangle ?? 'NULL',
            'declare_area' => $declareArea ?? 'NULL',
            'declare_area_name' => $declareAreaName ?? 'NULL',
        ], 'INSERT');

        if (!$result) {
            throw new RuntimeException('Failed to insert layout');
        }

        return (int)$this->db->getLastInsertedId();
    }

    public function findCurrentByDeviceId(int $deviceId): ?array
    {
        $layout = $this->db->getRow("
            SELECT id, rectangle, declare_area, declare_area_name, valido_de, valido_ate
            FROM radares_layouts
            WHERE dispositivo_id = " . (int)$deviceId . "
              AND valido_ate IS NULL
            ORDER BY valido_de DESC
            LIMIT 1
        ");

        return $layout ? $this->normalizeLayoutRow($layout) : null;
    }

    public function findCurrentByDeviceUids(array $uids): array
    {
        $uids = array_values(array_unique(array_filter(array_map(function ($uid) {
            return trim((string)$uid);
        }, $uids), function ($uid) {
            return $uid !== '';
        })));

        if (!$uids) {
            return [];
        }

        $quotedUids = array_map(function ($uid) {
            return "'" . $this->db->sanitize($uid) . "'";
        }, $uids);

        $rows = $this->db->getAll("
            SELECT r.uid, l.id, l.rectangle, l.declare_area, l.declare_area_name, l.valido_de, l.valido_ate
            FROM radares r
            INNER JOIN radares_layouts l ON l.dispositivo_id = r.id
            WHERE r.uid IN (" . implode(',', $quotedUids) . ")
              AND l.valido_ate IS NULL
              AND l.id = (
                  SELECT l2.id
                  FROM radares_layouts l2
                  WHERE l2.dispositivo_id = r.id
                    AND l2.valido_ate IS NULL
                  ORDER BY l2.valido_de DESC
                  LIMIT 1
              )
            ORDER BY r.uid ASC
        ");

        $layouts = [];
        foreach ($rows as $row) {
            $layout = $this->normalizeLayoutRow($row);
            $layouts[(string)$row['uid']] = [
                'rectangle' => $layout['rectangle'],
                'declare_area' => $layout['declare_area'],
                'declare_area_name' => $layout['declare_area_name'],
                'valido_de' => $layout['valido_de'],
                'valido_ate' => $layout['valido_ate'],
                'match_mode' => 'current',
            ];
        }

        return $layouts;
    }

    public function findLatestByDeviceId(int $deviceId): ?array
    {
        $layout = $this->db->getRow("
            SELECT id, rectangle, declare_area, declare_area_name, valido_de, valido_ate
            FROM radares_layouts
            WHERE dispositivo_id = " . (int)$deviceId . "
            ORDER BY id DESC
            LIMIT 1
        ");

        return $layout ? $this->normalizeLayoutRow($layout) : null;
    }

    public function findDeclareAreaNameByDeviceUid(string $uid): ?string
    {
        $declareAreaName = $this->db->getOne("
            SELECT l.declare_area_name
            FROM radares_layouts l
            JOIN radares r ON l.dispositivo_id = r.id
            WHERE r.uid = '" . $this->db->sanitize($uid) . "'
        ");

        return $declareAreaName ? (string)$declareAreaName : null;
    }

    public function resolveByTimestamp(int $deviceId, string $timestamp): ?array
    {
        $safeTimestamp = $this->db->sanitize($timestamp);

        $layout = $this->db->getRow("
            SELECT id, rectangle, declare_area, declare_area_name, valido_de, valido_ate
            FROM radares_layouts
            WHERE dispositivo_id = " . (int)$deviceId . "
              AND valido_de <= '$safeTimestamp'
              AND (valido_ate IS NULL OR valido_ate > '$safeTimestamp')
            ORDER BY valido_de DESC
            LIMIT 1
        ");

        if ($layout) {
            return [
                'layout' => $this->normalizeLayoutRow($layout),
                'match_mode' => 'exact_timestamp',
            ];
        }

        $layout = $this->findNextKnownByDeviceId($deviceId, $timestamp);
        if ($layout) {
            return [
                'layout' => $layout,
                'match_mode' => 'fallback_next_known',
            ];
        }

        $layout = $this->findLatestKnownByDeviceId($deviceId);
        if ($layout) {
            return [
                'layout' => $layout,
                'match_mode' => 'fallback_latest_known',
            ];
        }

        return null;
    }

    public function resolveByRange(int $deviceId, string $rangeStart, string $rangeEnd): array
    {
        $safeRangeStart = $this->db->sanitize($rangeStart);
        $safeRangeEnd = $this->db->sanitize($rangeEnd);

        $rows = $this->db->getAll("
            SELECT id, rectangle, declare_area, declare_area_name, valido_de, valido_ate
            FROM radares_layouts
            WHERE dispositivo_id = " . (int)$deviceId . "
              AND valido_de <= '$safeRangeEnd'
              AND (valido_ate IS NULL OR valido_ate > '$safeRangeStart')
            ORDER BY valido_de ASC
        ");

        $layouts = [];
        foreach ($rows as $row) {
            $layouts[] = $this->normalizeLayoutRow($row);
        }

        if ($layouts) {
            return [
                'layouts' => $layouts,
                'match_mode' => 'range',
            ];
        }

        $fallback = $this->findNextKnownByDeviceId($deviceId, $rangeStart);
        if ($fallback) {
            return [
                'layouts' => [$fallback],
                'match_mode' => 'fallback_next_known',
            ];
        }

        $fallback = $this->findLatestKnownByDeviceId($deviceId);

        return [
            'layouts' => $fallback ? [$fallback] : [],
            'match_mode' => $fallback ? 'fallback_latest_known' : 'range',
        ];
    }

    private function findNextKnownByDeviceId(int $deviceId, string $timestamp): ?array
    {
        $safeTimestamp = $this->db->sanitize($timestamp);

        $layout = $this->db->getRow("
            SELECT id, rectangle, declare_area, declare_area_name, valido_de, valido_ate
            FROM radares_layouts
            WHERE dispositivo_id = " . (int)$deviceId . "
              AND valido_de > '$safeTimestamp'
            ORDER BY valido_de ASC
            LIMIT 1
        ");

        return $layout ? $this->normalizeLayoutRow($layout) : null;
    }

    private function findLatestKnownByDeviceId(int $deviceId): ?array
    {
        $layout = $this->db->getRow("
            SELECT id, rectangle, declare_area, declare_area_name, valido_de, valido_ate
            FROM radares_layouts
            WHERE dispositivo_id = " . (int)$deviceId . "
            ORDER BY valido_de DESC
            LIMIT 1
        ");

        return $layout ? $this->normalizeLayoutRow($layout) : null;
    }

    private function normalizeLayoutRow(array $row): array
    {
        return [
            'id' => isset($row['id']) ? (int)$row['id'] : null,
            'rectangle' => $row['rectangle'],
            'declare_area' => $row['declare_area'],
            'declare_area_name' => $row['declare_area_name']
                ? json_decode($row['declare_area_name'], true)
                : null,
            'declare_area_name_raw' => $row['declare_area_name'] ?? null,
            'valido_de' => $row['valido_de'] ?? null,
            'valido_ate' => $row['valido_ate'] ?? null,
        ];
    }
}
