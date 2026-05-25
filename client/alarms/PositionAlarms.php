<?php

require_once __DIR__ . '/AlarmEvaluatorInterface.php';

class PositionAlarms implements AlarmEvaluatorInterface
{
    public function evaluate(array $parsed): array
    {
        $alarms = [];
        $people = $parsed['people'] ?? [];
        $deviceCode = $parsed['device_code'] ?? null;

        foreach ($people as $person) {
            $personIndex = $person['person_index'] ?? 0;
            $posture = $person['posture_state'] ?? '';
            $lastEvent = $person['last_event'] ?? '';
            $regionId = $person['region_id'] ?? null;

            $alarmsMap = [
                'Fall Confirmation' => ['fall_confirmed', 'perigo', "Queda confirmada da pessoa {person}"],
                // 'Confirmed Sitting on Ground' => ['sitting_confirmed', 'perigo', "Pessoa {person} sentada no chão"],
            ];

            if (isset($alarmsMap[$posture])) {
                [$type, $level, $message] = $alarmsMap[$posture];
                $alarms[] = $this->makeAlarm($type, $level, $personIndex, $regionId, $deviceCode, str_replace('{person}', $personIndex + 1, $message));
            }

            $eventsMap = [
                'Enter Room' => ['room_entry', "Pessoa {person} entrou na sala"],
                'Leave Room' => ['room_exit', "Pessoa {person} saiu da sala"],
                'Enter Area' => ['area_entry', "Pessoa {person} entrou na região"],
                'Leave Area' => ['area_exit', "Pessoa {person} saiu da região"],
            ];

            if (isset($eventsMap[$lastEvent])) {
                [$type, $message] = $eventsMap[$lastEvent];
                $alarms[] = $this->makeEvent($type, $personIndex, $regionId, $deviceCode, str_replace('{person}', $personIndex + 1, $message));
            }
        }

        return $alarms;
    }

    private function makeAlarm(string $type, string $level, int $personIndex, ?int $regionId, ?string $deviceCode, ?string $message): array
    {
        return $this->makeEntry('alarm', $type, $level, $personIndex, $regionId, $deviceCode, $message);
    }

    private function makeEvent(string $type, int $personIndex, ?int $regionId, ?string $deviceCode, ?string $message): array
    {
        return $this->makeEntry('event', $type, 'info', $personIndex, $regionId, $deviceCode, $message);
    }

    private function makeEntry(string $category, string $type, string $level, int $personIndex, ?int $regionId, ?string $deviceCode, ?string $message): array
    {
        $entry = [
            'category' => $category,
            'alarm_type' => $type,
            'level' => $level,
            'source' => 'position',
            'person_index' => $personIndex,
            'region_id' => $regionId,
            'device_code' => $deviceCode,
        ];
        if ($message !== null) $entry['message'] = $message;
        return $entry;
    }
}
