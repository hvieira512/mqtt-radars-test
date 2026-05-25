<?php

class MonitoringRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getDashboardData(): array
    {
        return [
            'config' => $this->getDashboardConfig(),
            'groups' => $this->getRoomGroups(),
        ];
    }

    public function listOnlineDeviceUids(int $seconds = 180): array
    {
        $rows = $this->db->getAll("
            SELECT DISTINCT r.uid
            FROM radares_esquema resq
            INNER JOIN radares r ON r.id = resq.id_radar
            WHERE EXISTS (
                SELECT 1
                FROM radares_eventos re
                WHERE re.dispositivo_id = r.id
                  AND re.recebido_em >= DATE_SUB(NOW(), INTERVAL " . (int)$seconds . " SECOND)
                LIMIT 1
            )
        ");

        $devices = [];
        foreach ($rows as $row) {
            $devices[] = $row['uid'];
        }

        return $devices;
    }

    public function listOnlineDeviceUidsCached(int $seconds = 180, int $ttlSeconds = 60): array
    {
        $cacheKeyParts = [
            $_SERVER['HTTP_HOST'] ?? 'cli',
            isset($this->db->database) ? (string)$this->db->database : '',
            (string)$seconds,
        ];
        $cacheFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
            . DIRECTORY_SEPARATOR
            . 'radar_online_devices_' . md5(implode('|', $cacheKeyParts)) . '.json';

        if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $ttlSeconds) {
            $cached = json_decode((string)file_get_contents($cacheFile), true);
            if (is_array($cached)) {
                return array_values(array_filter($cached, 'is_string'));
            }
        }

        $devices = $this->listOnlineDeviceUids($seconds);
        @file_put_contents($cacheFile, json_encode($devices), LOCK_EX);

        return $devices;
    }

    private function getDashboardConfig(): array
    {
        $config = $this->db->getRow("SELECT colunas_dashboard_radares, touch_app_nfc_alertas_radares FROM configs_ucc");
        $columns = (int)($config['colunas_dashboard_radares'] ?? 0);
        if ($columns <= 0) {
            $columns = 8;
        }

        return [
            'columns' => $columns,
            'canSilenceFallAlarms' => (int)($config['touch_app_nfc_alertas_radares'] ?? 0) !== 1,
        ];
    }

    private function getRoomGroups(): array
    {
        $groups = [];
        $roomsById = [];

        foreach ($this->fetchRooms() as $room) {
            $groupKey = (int)$room['typologyId'] . ':' . ($room['floorId'] === null ? '' : (int)$room['floorId']);
            if (!isset($groups[$groupKey])) {
                $groups[$groupKey] = [
                    'labelHtml' => $room['floorName'] !== ''
                        ? $room['floorName'] . ' <small>(' . $room['typologyAbbreviation'] . ')</small>'
                        : $room['typologyAbbreviation'],
                    'typologyId' => $room['typologyId'],
                    'floorId' => $room['floorId'],
                    'rooms' => [],
                ];
            }

            $roomData = [
                'id' => $room['id'],
                'name' => $room['name'],
                'floorName' => $room['floorName'],
                'roomRadars' => [],
                'wcRadars' => [],
                'bedRadarsByBedId' => [],
                'beds' => [],
                'hasWc' => false,
            ];
            $groups[$groupKey]['rooms'][] = $roomData;
            $roomIndex = count($groups[$groupKey]['rooms']) - 1;
            $roomsById[$room['id']] = [$groupKey, $roomIndex];
        }

        foreach ($this->fetchRoomRadars() as $radar) {
            $roomId = (int)$radar['roomId'];
            if (!isset($roomsById[$roomId])) {
                continue;
            }

            [$groupKey, $roomIndex] = $roomsById[$roomId];
            $radarData = [
                'uid' => $radar['uid'],
                'wc' => $radar['wc'],
                'bedId' => $radar['bedId'],
            ];

            if ($radarData['wc'] === 1) {
                $groups[$groupKey]['rooms'][$roomIndex]['wcRadars'][] = $radarData;
                continue;
            }

            if ($radarData['bedId'] > 0) {
                $groups[$groupKey]['rooms'][$roomIndex]['bedRadarsByBedId'][$radarData['bedId']][] = $radarData;
                continue;
            }

            $groups[$groupKey]['rooms'][$roomIndex]['roomRadars'][] = $radarData;
        }

        foreach ($this->fetchRoomWcFlags() as $roomId) {
            if (!isset($roomsById[$roomId])) {
                continue;
            }

            [$groupKey, $roomIndex] = $roomsById[$roomId];
            $groups[$groupKey]['rooms'][$roomIndex]['hasWc'] = true;
        }

        $seenBedIds = [];
        foreach ($this->fetchOccupiedBeds() as $bed) {
            $roomId = (int)$bed['roomId'];
            if (!isset($roomsById[$roomId])) {
                continue;
            }

            $bedId = (int)$bed['id'];
            if (isset($seenBedIds[$bedId])) {
                continue;
            }
            $seenBedIds[$bedId] = true;

            [$groupKey, $roomIndex] = $roomsById[$roomId];
            $groups[$groupKey]['rooms'][$roomIndex]['beds'][] = $bed;
        }

        return array_values(array_filter($groups, function ($group) {
            return !empty($group['rooms']);
        }));
    }

    private function fetchRooms(): array
    {
        $rows = $this->db->getAll("
            SELECT
                q.id AS room_id,
                q.nomeQuarto AS room_name,
                ct.id AS typology_id,
                ct.abreviatura AS typology_abbreviation,
                ctp.id AS floor_id,
                ctp.nome AS floor_name
            FROM radares_esquema re
            INNER JOIN quartos q ON q.id = re.id_quarto
            INNER JOIN configs_tipologias ct ON ct.id = q.tipologia
            LEFT JOIN configs_tipologia_pisos ctp ON ctp.id = q.id_piso
            GROUP BY q.id
            ORDER BY ct.id ASC, ctp.id ASC, q.nomeQuarto ASC
        ");

        $rooms = [];
        foreach ($rows as $row) {
            $rooms[] = [
                'id' => (int)$row['room_id'],
                'name' => trim((string)$row['room_name']),
                'typologyId' => (int)$row['typology_id'],
                'typologyAbbreviation' => trim((string)$row['typology_abbreviation']),
                'floorId' => $row['floor_id'] !== null ? (int)$row['floor_id'] : null,
                'floorName' => trim((string)($row['floor_name'] ?? '')),
            ];
        }

        return $rooms;
    }

    private function fetchRoomRadars(): array
    {
        $rows = $this->db->getAll("
            SELECT re.id_quarto, r.uid, re.wc, re.id_cama
            FROM radares_esquema re
            INNER JOIN radares r ON r.id = re.id_radar
        ");

        $radars = [];
        foreach ($rows as $row) {
            $radars[] = [
                'roomId' => (int)$row['id_quarto'],
                'uid' => trim((string)$row['uid']),
                'wc' => (int)$row['wc'],
                'bedId' => isset($row['id_cama']) ? (int)$row['id_cama'] : 0,
            ];
        }

        return $radars;
    }

    private function fetchRoomWcFlags(): array
    {
        $rows = $this->db->getAll("
            SELECT DISTINCT id_quarto
            FROM radares_esquema
            WHERE wc = 1
        ");

        $roomIds = [];
        foreach ($rows as $row) {
            $roomIds[] = (int)$row['id_quarto'];
        }

        return $roomIds;
    }

    private function fetchOccupiedBeds(): array
    {
        $rows = $this->db->getAll("
            SELECT
                camas.id,
                camas.id_quarto,
                camas.descricao AS nomeCama,
                utentes.nomeSerTratado,
                utentes.imagem,
                utentes.rotacao_imagem
            FROM camas
            INNER JOIN quartos ON quartos.id = camas.id_quarto
            LEFT JOIN utentes ON utentes.estado IN (
                SELECT ua.id
                FROM utentes_admissao ua
                WHERE ua.quarto = quartos.id
                  AND ua.cama = camas.id
                  AND ua.data_arquivado IS NULL
            )
            WHERE EXISTS (
                SELECT 1
                FROM radares_esquema re_room
                WHERE re_room.id_quarto = quartos.id
                  AND re_room.id_cama IS NULL
                  AND re_room.wc = 0
            )
            OR camas.id IN (
                SELECT re_bed.id_cama
                FROM radares_esquema re_bed
                WHERE re_bed.id_cama IS NOT NULL
                  AND re_bed.id_cama > 0
            )
            ORDER BY quartos.id ASC, camas.id ASC
        ");

        $beds = [];
        foreach ($rows as $row) {
            $patientName = trim((string)($row['nomeSerTratado'] ?? ''));
            $hasPatient = $patientName !== '';
            $displayName = $patientName;
            if (!$hasPatient) {
                $displayName = trim((string)$row['nomeCama']);
            }

            $image = trim((string)($row['imagem'] ?? ''));
            $imagePath = '/assets/media/icons/svg/General/User.svg';
            if ($image !== '' && $image !== 'default.png') {
                if (preg_match('/^https?:\/\//i', $image) || str_starts_with($image, '/')) {
                    $imagePath = $image;
                }
            }

            $beds[] = [
                'id' => (int)$row['id'],
                'roomId' => (int)$row['id_quarto'],
                'name' => $displayName,
                'hasPatient' => $hasPatient,
                'imagePath' => $imagePath,
            ];
        }

        return $beds;
    }
}
