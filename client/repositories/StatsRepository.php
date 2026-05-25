<?php

class StatsRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function insertMinuteStats(int $eventId, array $data): void
    {
        $result = $this->db->execute(
            "INSERT INTO radares_estatisticas_minuto
                (evento_id, versao, contagem_pessoas, distancia_caminhada, tempo_caminhada, tempo_meditacao, tempo_na_cama, tempo_em_pe, tempo_multiplayer, respiracao_ativa)
             VALUES (
                " . (int)$eventId . ",
                " . (int)$data['version'] . ",
                " . (int)$data['people'] . ",
                " . (int)$data['walking_distance'] . ",
                " . (int)$data['walking_time'] . ",
                " . (int)$data['meditation_time'] . ",
                " . (int)$data['in_bed_time'] . ",
                " . (int)$data['standing_time'] . ",
                " . (int)$data['multiplayer_time'] . ",
                " . (!empty($data['breathing_active']) ? 1 : 0) . "
             )"
        );

        if ($result === false) {
            throw new RuntimeException('Failed to insert radar minute stats.');
        }
    }

    public function insertSleepStats(int $eventId, array $data): void
    {
        $result = $this->db->execute(
            "INSERT INTO radares_estatisticas_sono
                (evento_id, respiracao_tempo_real, ritmo_cardiaco_tempo_real, media_respiracao_min, media_ritmo_cardiaco_min, estado_respiracao, estado_ritmo_cardiaco, estado_sinais_vitais, estado_sono)
             VALUES (
                " . (int)$eventId . ",
                " . (int)$data['real_time_breathing'] . ",
                " . (int)$data['real_time_heart_rate'] . ",
                " . (int)$data['avg_breathing_per_minute'] . ",
                " . (int)$data['avg_heart_rate_per_minute'] . ",
                '" . $this->db->sanitize((string)$data['breathing_status_per_minute']) . "',
                '" . $this->db->sanitize((string)$data['heart_rate_status_per_minute']) . "',
                '" . $this->db->sanitize((string)$data['vital_signs_status']) . "',
                '" . $this->db->sanitize((string)$data['sleep_state_status']) . "'
             )"
        );

        if ($result === false) {
            throw new RuntimeException('Failed to insert radar sleep stats.');
        }
    }

    public function findMinuteStatsByEventId(int $eventId): ?array
    {
        $row = $this->db->getRow(
            "SELECT evento_id, contagem_pessoas, versao
             FROM radares_estatisticas_minuto
             WHERE evento_id = " . $eventId
        );

        if (!$row) {
            return null;
        }

        return [
            'people' => (int)$row['contagem_pessoas'],
            'version' => (int)$row['versao'],
        ];
    }

    public function findMinuteStatsByEventIds(array $eventIds): array
    {
        $eventIds = array_values(array_unique(array_filter(array_map('intval', $eventIds))));
        if (!$eventIds) {
            return [];
        }

        $rows = $this->db->getAll(
            "SELECT evento_id, contagem_pessoas, versao
             FROM radares_estatisticas_minuto
             WHERE evento_id IN (" . implode(',', $eventIds) . ")"
        );

        $statsByEvent = [];
        foreach ($rows as $row) {
            $statsByEvent[(int)$row['evento_id']] = [
                'people' => (int)$row['contagem_pessoas'],
                'version' => (int)$row['versao'],
            ];
        }

        return $statsByEvent;
    }

    public function findSleepStatsByEventId(int $eventId): ?array
    {
        $row = $this->db->getRow(
            "SELECT evento_id, respiracao_tempo_real, ritmo_cardiaco_tempo_real, media_respiracao_min, media_ritmo_cardiaco_min
             FROM radares_estatisticas_sono
             WHERE evento_id = " . $eventId
        );

        if (!$row) {
            return null;
        }

        return [
            'real_time_breathing' => (int)$row['respiracao_tempo_real'],
            'real_time_heart_rate' => (int)$row['ritmo_cardiaco_tempo_real'],
            'avg_breathing_per_minute' => (int)$row['media_respiracao_min'],
            'avg_heart_rate_per_minute' => (int)$row['media_ritmo_cardiaco_min'],
        ];
    }

    public function findSleepStatsByEventIds(array $eventIds): array
    {
        $eventIds = array_values(array_unique(array_filter(array_map('intval', $eventIds))));
        if (!$eventIds) {
            return [];
        }

        $rows = $this->db->getAll(
            "SELECT evento_id, respiracao_tempo_real, ritmo_cardiaco_tempo_real, media_respiracao_min, media_ritmo_cardiaco_min
             FROM radares_estatisticas_sono
             WHERE evento_id IN (" . implode(',', $eventIds) . ")"
        );

        $statsByEvent = [];
        foreach ($rows as $row) {
            $statsByEvent[(int)$row['evento_id']] = [
                'real_time_breathing' => (int)$row['respiracao_tempo_real'],
                'real_time_heart_rate' => (int)$row['ritmo_cardiaco_tempo_real'],
                'avg_breathing_per_minute' => (int)$row['media_respiracao_min'],
                'avg_heart_rate_per_minute' => (int)$row['media_ritmo_cardiaco_min'],
            ];
        }

        return $statsByEvent;
    }
}
