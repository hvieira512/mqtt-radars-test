<?php

class DeviceRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function findIdByUid(string $uid): ?int
    {
        $uid = trim($uid);
        if ($uid === '') {
            return null;
        }

        $cacheKey = $this->cacheKey('device-id', $uid);
        $cachedId = $this->cacheGet($cacheKey);
        if ($cachedId !== null && (int)$cachedId > 0) {
            return (int)$cachedId;
        }

        $deviceId = $this->db->getOne(
            "SELECT id FROM radares WHERE uid = '" . $this->db->sanitize($uid) . "' LIMIT 1"
        );

        if ($deviceId === null) {
            return null;
        }

        $deviceId = (int)$deviceId;
        $this->cacheSet($cacheKey, $deviceId, 86400);

        return $deviceId;
    }

    public function getDeviceId(string $uid): int
    {
        $existingId = $this->findIdByUid($uid);
        if ($existingId !== null) {
            return $existingId;
        }

        $result = $this->db->autoExecute('radares', [
            'uid' => trim($uid),
        ], 'INSERT');

        $deviceId = (int)$this->db->getLastInsertedId();
        if ($result === false || $deviceId <= 0) {
            $existingId = $this->findIdByUid($uid);
            if ($existingId !== null) {
                return $existingId;
            }

            throw new RuntimeException('Failed to create radar device.');
        }

        $this->cacheSet($this->cacheKey('device-id', $uid), $deviceId, 86400);

        return $deviceId;
    }

    public function getAllDevices(): array
    {
        return $this->db->getAll("SELECT id, uid, criado_em FROM radares");
    }

    public function findActiveDeviceByUid(string $uid): ?array
    {
        $uid = trim($uid);
        if ($uid === '') {
            return null;
        }

        $device = $this->db->getRow("
            SELECT DISTINCT r.id, r.uid
            FROM radares r
            INNER JOIN radares_esquema re ON re.id_radar = r.id
            WHERE r.uid = '" . $this->db->sanitize($uid) . "'
            LIMIT 1
        ");

        return $device ?: null;
    }

    public function listActiveDevices(): array
    {
        return $this->db->getAll("
            SELECT DISTINCT r.id, r.uid
            FROM radares r
            INNER JOIN radares_esquema re ON re.id_radar = r.id
        ");
    }

    public function findActivePatientIdByDeviceId(int $deviceId): ?int
    {
        $patientId = $this->db->getOne("
            SELECT utentes.estado
            FROM radares_esquema
            INNER JOIN utentes_admissao ON utentes_admissao.quarto = radares_esquema.id_quarto
            INNER JOIN utentes ON utentes.estado = utentes_admissao.id
            WHERE radares_esquema.id_radar = " . (int)$deviceId . "
              AND utentes_admissao.data_arquivado IS NULL
            LIMIT 1
        ");

        return $patientId !== null ? (int)$patientId : null;
    }

    public function getRoomNameByDeviceId(int $deviceId): string
    {
        $sql = "SELECT q.nomeQuarto
                FROM radares r
                INNER JOIN radares_esquema re ON re.id_radar = r.id
                INNER JOIN quartos q ON q.id = re.id_quarto
                WHERE r.id = %d
                LIMIT 1";

        return trim((string)$this->db->getOne(sprintf($sql, $deviceId)));
    }

    public function getFallConfirmedRoomNameIfEligible(int $deviceId): string
    {
        $cacheKey = $this->cacheKey('fall-room', (string)$deviceId);
        $cachedRoomName = $this->cacheGet($cacheKey);
        if ($cachedRoomName !== null) {
            return (string)$cachedRoomName;
        }

        $sql = "SELECT q.nomeQuarto
                FROM radares_esquema re
                INNER JOIN quartos q ON q.id = re.id_quarto
                WHERE re.id_radar = %d
                  AND (
                      re.wc = 1
                      OR EXISTS (
                          SELECT 1
                          FROM radares_esquema re_room
                          WHERE re_room.id_quarto = re.id_quarto
                            AND re_room.id_cama IS NULL
                            AND re_room.wc = 0
                      )
                      OR (re.id_cama IS NOT NULL AND re.id_cama > 0)
                  )
                LIMIT 1";

        $roomName = trim((string)$this->db->getOne(sprintf($sql, $deviceId)));
        $this->cacheSet($cacheKey, $roomName, 60);

        return $roomName;
    }

    private function cacheKey(string $prefix, string $value): string
    {
        $database = isset($this->db->database) ? (string)$this->db->database : '';

        return 'radar:' . $prefix . ':' . md5($database . '|' . $value);
    }

    private function cacheGet(string $key)
    {
        if (!function_exists('apcu_fetch')) {
            return null;
        }

        $success = false;
        $value = apcu_fetch($key, $success);

        return $success ? $value : null;
    }

    private function cacheSet(string $key, $value, int $ttl): void
    {
        if (!function_exists('apcu_store')) {
            return;
        }

        apcu_store($key, $value, $ttl);
    }
}
