<?php

class EventRepository
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function createEvent(int $deviceId, int $eventTypeId): int
    {
        $ids = $this->createEvents([['device_id' => $deviceId, 'event_type_id' => $eventTypeId]]);
        return $ids[0];
    }

    public function createEvents(array $events): array
    {
        if (!$events) {
            return [];
        }

        $values = [];
        foreach ($events as $ev) {
            $values[] = '(' . (int)$ev['device_id'] . ', ' . (int)$ev['event_type_id'] . ')';
        }

        $result = $this->db->execute(
            "INSERT INTO radares_eventos (dispositivo_id, tipo_evento_id)
             VALUES " . implode(',', $values)
        );

        if ($result === false) {
            throw new RuntimeException('Failed to create radar events.');
        }

        $firstId = $this->db->getLastInsertedId();
        $ids = [];
        for ($i = 0; $i < count($events); $i++) {
            $ids[] = $firstId + $i;
        }

        return $ids;
    }

    public function getLatestEventId(): int
    {
        return (int)$this->db->getOne("SELECT MAX(id) FROM radares_eventos");
    }

    public function listEventsAfterId(int $afterId, int $limit, ?array $eventTypeIds = null): array
    {
        $afterId = (int)$afterId;
        $limit = (int)$limit;
        $typeCondition = '';

        if ($eventTypeIds !== null) {
            $eventTypeIds = array_values(array_unique(array_filter(array_map('intval', $eventTypeIds))));
            if (!$eventTypeIds) {
                return [];
            }

            $typeCondition = " AND e.tipo_evento_id IN (" . implode(',', $eventTypeIds) . ")";
        }

        return $this->db->getAll("
            SELECT
                e.id as event_id,
                e.dispositivo_id as device_id,
                e.recebido_em as created_at,
                d.uid as device_code,
                e.tipo_evento_id
            FROM radares_eventos e
            JOIN radares d ON d.id = e.dispositivo_id
            WHERE e.id > $afterId
            $typeCondition
            ORDER BY e.id ASC
            LIMIT $limit
        ");
    }
}
