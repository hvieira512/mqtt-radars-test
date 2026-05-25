<?php

class PositionRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function insertPosition(int $eventId, array $people): void
    {
        if (!$people) {
            return;
        }

        $values = [];
        foreach ($people as $p) {
            $values[] = sprintf(
                '(%d,%d,%d,%d,%d,%d,%s,%s,%d)',
                $eventId,
                (int)$p['person_index'],
                (int)$p['x_position_dm'],
                (int)$p['y_position_dm'],
                (int)$p['z_position_cm'],
                (int)$p['time_left_s'],
                $this->sqlString($p['posture_state'] ?? ''),
                $this->sqlString($p['last_event'] ?? ''),
                (int)($p['region_id'] ?? 0)
            );
        }

        $result = $this->db->execute(
            "INSERT INTO radares_posicao_pessoas
                (evento_id, indice_pessoa, posicao_x_dm, posicao_y_dm, posicao_z_cm, tempo_restante_seg, estado_postura, ultimo_evento, regiao_id)
             VALUES " . implode(',', $values)
        );

        if ($result === false) {
            throw new RuntimeException('Failed to insert radar positions.');
        }
    }

    public function upsertCurrentPositions(int $deviceId, int $eventId, array $people): void
    {
        if (!$people) {
            return;
        }

        $values = [];
        foreach ($people as $p) {
            $values[] = sprintf(
                '(%d,%d,%d,%d,%d,%d,%d,%s,%s,%d,NOW())',
                $deviceId,
                (int)$p['person_index'],
                $eventId,
                (int)$p['x_position_dm'],
                (int)$p['y_position_dm'],
                (int)$p['z_position_cm'],
                (int)$p['time_left_s'],
                $this->sqlString($p['posture_state'] ?? ''),
                $this->sqlString($p['last_event'] ?? ''),
                (int)($p['region_id'] ?? 0)
            );
        }

        $result = $this->db->execute(
            "INSERT INTO radares_estado_pessoas
                (dispositivo_id, indice_pessoa, evento_id, posicao_x_dm, posicao_y_dm, posicao_z_cm, tempo_restante_seg, estado_postura, ultimo_evento, regiao_id, atualizado_em)
             VALUES " . implode(',', $values) . "
             ON DUPLICATE KEY UPDATE
                evento_id = VALUES(evento_id),
                posicao_x_dm = VALUES(posicao_x_dm),
                posicao_y_dm = VALUES(posicao_y_dm),
                posicao_z_cm = VALUES(posicao_z_cm),
                tempo_restante_seg = VALUES(tempo_restante_seg),
                estado_postura = VALUES(estado_postura),
                ultimo_evento = VALUES(ultimo_evento),
                regiao_id = VALUES(regiao_id),
                atualizado_em = VALUES(atualizado_em)"
        );

        if ($result === false) {
            throw new RuntimeException('Failed to update radar current positions.');
        }
    }

    public function findByEventId(int $eventId): array
    {
        $rows = $this->db->getAll(
            "SELECT evento_id, indice_pessoa, posicao_x_dm, posicao_y_dm, posicao_z_cm, tempo_restante_seg, estado_postura, ultimo_evento, regiao_id
             FROM radares_posicao_pessoas
             WHERE evento_id = " . $eventId
        );

        $people = [];
        foreach ($rows as $pos) {
            $people[] = $this->formatPositionPerson($pos);
        }

        return $people;
    }

    public function findByEventIds(array $eventIds): array
    {
        $eventIds = array_values(array_unique(array_filter(array_map('intval', $eventIds))));
        if (!$eventIds) {
            return [];
        }

        $rows = $this->db->getAll(
            "SELECT evento_id, indice_pessoa, posicao_x_dm, posicao_y_dm, posicao_z_cm, tempo_restante_seg, estado_postura, ultimo_evento, regiao_id
             FROM radares_posicao_pessoas
             WHERE evento_id IN (" . implode(',', $eventIds) . ")
             ORDER BY evento_id ASC, indice_pessoa ASC"
        );

        $positionsByEvent = [];
        foreach ($rows as $pos) {
            $eventId = (int)$pos['evento_id'];
            if (!isset($positionsByEvent[$eventId])) {
                $positionsByEvent[$eventId] = [];
            }
            $positionsByEvent[$eventId][] = $this->formatPositionPerson($pos);
        }

        return $positionsByEvent;
    }

    public function getLatestPositionsByDevice(): array
    {
        $rows = $this->db->getAll("
            SELECT
                d.uid as device_code,
                p.evento_id,
                p.indice_pessoa,
                p.posicao_x_dm,
                p.posicao_y_dm,
                p.posicao_z_cm,
                p.tempo_restante_seg,
                p.estado_postura,
                p.ultimo_evento,
                p.regiao_id
            FROM radares_estado_pessoas p
            JOIN radares d ON d.id = p.dispositivo_id
            ORDER BY d.uid ASC, p.indice_pessoa ASC
        ");

        $positions = [];
        $currentDevice = null;
        $currentPeople = [];

        foreach ($rows as $pos) {
            if ($currentDevice !== $pos['device_code']) {
                if ($currentDevice !== null && !empty($currentPeople)) {
                    $positions[$currentDevice] = ['people' => $currentPeople];
                }
                $currentDevice = $pos['device_code'];
                $currentPeople = [];
            }

            $currentPeople[] = $this->formatPositionPerson($pos);
        }

        if ($currentDevice !== null && !empty($currentPeople)) {
            $positions[$currentDevice] = ['people' => $currentPeople];
        }

        return $positions;
    }

    public function getLatestPosturesByPersonIndexes(int $deviceId, array $personIndexes): array
    {
        $postures = [];
        $personIndexes = array_values(array_unique(array_map('intval', $personIndexes)));
        if (!$personIndexes) {
            return $postures;
        }

        foreach ($personIndexes as $personIndex) {
            $postures[$personIndex] = '';
        }

        $personIndexList = implode(',', $personIndexes);
        $rows = $this->db->getAll(sprintf(
            "SELECT indice_pessoa, estado_postura
             FROM radares_estado_pessoas
             WHERE dispositivo_id = %d
               AND indice_pessoa IN (%s)",
            (int)$deviceId,
            $personIndexList
        ));

        foreach ($rows as $row) {
            $postures[(int)$row['indice_pessoa']] = $row['estado_postura'] ?? '';
        }

        return $postures;
    }

    private function sqlString(string $value): string
    {
        return "'" . $this->db->sanitize($value) . "'";
    }

    private function formatPositionPerson(array $pos): array
    {
        return [
            'person_index' => (int)$pos['indice_pessoa'],
            'x_position_dm' => (int)$pos['posicao_x_dm'],
            'y_position_dm' => (int)$pos['posicao_y_dm'],
            'z_position_cm' => (int)$pos['posicao_z_cm'],
            'time_left_s' => (int)$pos['tempo_restante_seg'],
            'posture_state' => $pos['estado_postura'],
            'last_event' => $pos['ultimo_evento'],
            'region_id' => (int)$pos['regiao_id'],
        ];
    }
}
