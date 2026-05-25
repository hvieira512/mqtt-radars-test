<?php

class VitalsRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function insertVitals(int $eventId, array $data): void
    {
        $result = $this->db->execute(
            "INSERT INTO radares_sinais_vitais (evento_id, taxa_respiracao, ritmo_cardiaco, estado_sono)
             VALUES (
                " . (int)$eventId . ",
                " . (int)$data['breathing'] . ",
                " . (int)$data['heart_rate'] . ",
                '" . $this->db->sanitize((string)$data['sleep_state']) . "'
             )"
        );

        if ($result === false) {
            throw new RuntimeException('Failed to insert radar vitals.');
        }
    }

    public function findByEventId(int $eventId): ?array
    {
        $row = $this->db->getRow(
            "SELECT evento_id, taxa_respiracao, ritmo_cardiaco, estado_sono
             FROM radares_sinais_vitais
             WHERE evento_id = " . $eventId
        );

        if (!$row) {
            return null;
        }

        return [
            'breathing' => (int)$row['taxa_respiracao'],
            'heart_rate' => (int)$row['ritmo_cardiaco'],
            'sleep_state' => $row['estado_sono'],
        ];
    }

    public function findByEventIds(array $eventIds): array
    {
        $eventIds = array_values(array_unique(array_filter(array_map('intval', $eventIds))));
        if (!$eventIds) {
            return [];
        }

        $rows = $this->db->getAll(
            "SELECT evento_id, taxa_respiracao, ritmo_cardiaco, estado_sono
             FROM radares_sinais_vitais
             WHERE evento_id IN (" . implode(',', $eventIds) . ")"
        );

        $vitalsByEvent = [];
        foreach ($rows as $row) {
            $vitalsByEvent[(int)$row['evento_id']] = [
                'breathing' => (int)$row['taxa_respiracao'],
                'heart_rate' => (int)$row['ritmo_cardiaco'],
                'sleep_state' => $row['estado_sono'],
            ];
        }

        return $vitalsByEvent;
    }
}
