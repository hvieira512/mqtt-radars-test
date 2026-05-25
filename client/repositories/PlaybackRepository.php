<?php

class PlaybackRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getPlaybackData(int $deviceId, string $start, string $end): array
    {
        return [
            'positions' => $this->getPositions($deviceId, $start, $end),
            'vitals' => $this->getVitals($deviceId, $start, $end),
            'detections' => $this->getDetections($deviceId, $start, $end),
        ];
    }

    public function getPositions(int $deviceId, string $start, string $end): array
    {
        $safeStart = $this->db->sanitize($start);
        $safeEnd = $this->db->sanitize($end);

        $rows = $this->db->getAll("
            SELECT
                e.id AS event_id,
                e.recebido_em AS timestamp,
                p.indice_pessoa,
                p.posicao_x_dm,
                p.posicao_y_dm,
                p.posicao_z_cm,
                p.estado_postura,
                p.ultimo_evento,
                p.regiao_id
            FROM radares_eventos e
            INNER JOIN radares_posicao_pessoas p ON p.evento_id = e.id
            WHERE e.dispositivo_id = " . (int)$deviceId . "
              AND e.tipo_evento_id = 1
              AND e.recebido_em BETWEEN '$safeStart' AND '$safeEnd'
            ORDER BY e.recebido_em ASC, e.id ASC, p.indice_pessoa ASC
        ");

        $positions = [];
        foreach ($rows as $row) {
            $positions[] = [
                'event_id' => (int)$row['event_id'],
                'timestamp' => $row['timestamp'],
                'person_index' => (int)$row['indice_pessoa'],
                'x_position_dm' => (int)$row['posicao_x_dm'],
                'y_position_dm' => (int)$row['posicao_y_dm'],
                'z_position_cm' => (int)$row['posicao_z_cm'],
                'posture_state' => $row['estado_postura'],
                'last_event' => $row['ultimo_evento'],
                'region_id' => $row['regiao_id'] !== null ? (int)$row['regiao_id'] : null,
            ];
        }

        return $positions;
    }

    public function getVitals(int $deviceId, string $start, string $end): array
    {
        $vitalsMap = [];

        foreach ($this->getDirectVitals($deviceId, $start, $end) as $row) {
            $vitalsMap[(int)$row['event_id']] = $row;
        }

        foreach ($this->getSleepStatsVitals($deviceId, $start, $end) as $row) {
            $eventId = (int)$row['event_id'];
            if (isset($vitalsMap[$eventId])) {
                continue;
            }

            $vitalsMap[$eventId] = $row;
        }

        $vitals = array_values($vitalsMap);
        usort($vitals, function ($a, $b) {
            if ($a['timestamp'] === $b['timestamp']) {
                return $a['event_id'] <=> $b['event_id'];
            }

            return strcmp($a['timestamp'], $b['timestamp']);
        });

        return $vitals;
    }

    public function getSleepStatsVitals(int $deviceId, string $start, string $end): array
    {
        $safeStart = $this->db->sanitize($start);
        $safeEnd = $this->db->sanitize($end);

        $rows = $this->db->getAll("
            SELECT
                e.id AS event_id,
                e.recebido_em AS timestamp,
                s.respiracao_tempo_real,
                s.ritmo_cardiaco_tempo_real,
                s.media_respiracao_min,
                s.media_ritmo_cardiaco_min,
                s.estado_sono
            FROM radares_eventos e
            INNER JOIN radares_estatisticas_sono s ON s.evento_id = e.id
            WHERE e.dispositivo_id = " . (int)$deviceId . "
              AND e.tipo_evento_id = 4
              AND e.recebido_em BETWEEN '$safeStart' AND '$safeEnd'
            ORDER BY e.recebido_em ASC, e.id ASC
        ");

        $vitals = [];
        foreach ($rows as $row) {
            $breathing = (int)$row['respiracao_tempo_real'];
            $heartRate = (int)$row['ritmo_cardiaco_tempo_real'];

            if ($breathing <= 0 && (int)$row['media_respiracao_min'] > 0) {
                $breathing = (int)$row['media_respiracao_min'];
            }

            if ($heartRate <= 0 && (int)$row['media_ritmo_cardiaco_min'] > 0) {
                $heartRate = (int)$row['media_ritmo_cardiaco_min'];
            }

            if ($breathing <= 0 && $heartRate <= 0) {
                continue;
            }

            $vitals[] = [
                'event_id' => (int)$row['event_id'],
                'timestamp' => $row['timestamp'],
                'breathing' => $breathing,
                'heart_rate' => $heartRate,
                'sleep_state' => $row['estado_sono'],
                'source' => 'radares_estatisticas_sono',
            ];
        }

        return $vitals;
    }

    public function getDetections(int $deviceId, string $start, string $end): array
    {
        $safeStart = $this->db->sanitize($start);
        $safeEnd = $this->db->sanitize($end);

        $rows = $this->db->getAll("
            SELECT
                d.id,
                d.evento_id,
                d.categoria,
                d.tipo,
                d.nivel,
                d.origem,
                d.indice_pessoa,
                d.regiao_id,
                d.mensagem,
                d.criado_em
            FROM radares_detecoes d
            WHERE d.dispositivo_id = " . (int)$deviceId . "
              AND d.criado_em BETWEEN '$safeStart' AND '$safeEnd'
            ORDER BY d.criado_em ASC, d.id ASC
        ");

        $detections = [];
        foreach ($rows as $row) {
            $detections[] = [
                'id' => (int)$row['id'],
                'event_id' => $row['evento_id'] !== null ? (int)$row['evento_id'] : null,
                'timestamp' => $row['criado_em'],
                'category' => $row['categoria'],
                'type' => $row['tipo'],
                'level' => $row['nivel'],
                'source' => $row['origem'],
                'person_index' => $row['indice_pessoa'] !== null ? (int)$row['indice_pessoa'] : null,
                'region_id' => $row['regiao_id'] !== null ? (int)$row['regiao_id'] : null,
                'message' => $row['mensagem'],
            ];
        }

        return $detections;
    }

    private function getDirectVitals(int $deviceId, string $start, string $end): array
    {
        $safeStart = $this->db->sanitize($start);
        $safeEnd = $this->db->sanitize($end);

        $rows = $this->db->getAll("
            SELECT
                e.id AS event_id,
                e.recebido_em AS timestamp,
                v.taxa_respiracao,
                v.ritmo_cardiaco,
                v.estado_sono
            FROM radares_eventos e
            INNER JOIN radares_sinais_vitais v ON v.evento_id = e.id
            WHERE e.dispositivo_id = " . (int)$deviceId . "
              AND e.tipo_evento_id = 3
              AND e.recebido_em BETWEEN '$safeStart' AND '$safeEnd'
            ORDER BY e.recebido_em ASC, e.id ASC
        ");

        $vitals = [];
        foreach ($rows as $row) {
            $vitals[] = [
                'event_id' => (int)$row['event_id'],
                'timestamp' => $row['timestamp'],
                'breathing' => (int)$row['taxa_respiracao'],
                'heart_rate' => (int)$row['ritmo_cardiaco'],
                'sleep_state' => $row['estado_sono'],
                'source' => 'radares_sinais_vitais',
            ];
        }

        return $vitals;
    }
}
