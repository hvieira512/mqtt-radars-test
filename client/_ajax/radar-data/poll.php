<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../../includes/db.class.php';
    require_once __DIR__ . '/../../repositories/EventRepository.php';
    require_once __DIR__ . '/../../repositories/PositionRepository.php';
    require_once __DIR__ . '/../../repositories/VitalsRepository.php';
    require_once __DIR__ . '/../../repositories/DetectionRepository.php';
    require_once __DIR__ . '/../../repositories/MonitoringRepository.php';

    $eventTypeMap = [
        'position' => 1,
        'vitals' => 3,
    ];
    $eventNameMap = array_flip($eventTypeMap);
    $pollEventTypeIds = array_values($eventTypeMap);

    $last_id = isset($_GET['after_id']) ? (int)$_GET['after_id'] : 0;
    $last_detection_id = isset($_GET['after_detection_id']) ? (int)$_GET['after_detection_id'] : 0;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $limit = min($limit, 100);
    $is_first_poll = ($last_id === 0 && $last_detection_id === 0);
    $include_online = isset($_GET['include_online'])
        ? ((int)$_GET['include_online'] === 1)
        : $is_first_poll;

    $eventRepository = new EventRepository($db);
    $positionRepository = new PositionRepository($db);
    $vitalsRepository = new VitalsRepository($db);
    $detectionRepository = new DetectionRepository($db);
    $monitoringRepository = new MonitoringRepository($db);

    $onlineDevices = [];
    $onlineDeviceMap = [];
    if ($is_first_poll || $include_online) {
        $onlineDevices = $monitoringRepository->listOnlineDeviceUidsCached(180, 60);
        $onlineDeviceMap = array_fill_keys($onlineDevices, true);
    }

    $latest_event_id = $eventRepository->getLatestEventId();
    $latest_detection_id = $detectionRepository->getLatestDetectionId();

    if ($last_id === 0) {
        $last_id = max(0, $latest_event_id - 50);
    } else {
        $last_id = min($last_id, $latest_event_id);
    }
    if ($last_detection_id === 0) {
        $last_detection_id = max(0, $latest_detection_id - 50);
    } else {
        $last_detection_id = min($last_detection_id, $latest_detection_id);
    }

    $start_after_detection_id = $last_detection_id;

    $items = [];
    $alarms = [];
    $positions = [];
    $max_id = $last_id;
    $max_detection_id = $last_detection_id;

    $events = $eventRepository->listEventsAfterId($last_id, $limit, $pollEventTypeIds);
    $eventIdsByType = [
        'position' => [],
        'vitals' => [],
    ];
    $eventTypes = [];

    foreach ($events as $event) {
        $type = $eventNameMap[(int)$event['tipo_evento_id']] ?? 'unknown';

        $eventId = (int)$event['event_id'];
        $max_id = max($max_id, $eventId);
        $eventTypes[$eventId] = $type;
        if (isset($eventIdsByType[$type])) {
            $eventIdsByType[$type][] = $eventId;
        }
    }
    $positionsByEvent = $eventIdsByType['position']
        ? $positionRepository->findByEventIds($eventIdsByType['position'])
        : [];
    $vitalsByEvent = $eventIdsByType['vitals']
        ? $vitalsRepository->findByEventIds($eventIdsByType['vitals'])
        : [];

    $payloadsByType = [
        'vitals' => $vitalsByEvent,
    ];

    foreach ($events as $event) {
        $eventId = (int)$event['event_id'];
        $type = $eventTypes[$eventId] ?? 'unknown';
        $payload = [];

        if ($type === 'position') {
            if ($is_first_poll && !isset($onlineDeviceMap[$event['device_code']])) {
                continue;
            }
            $payload = ['people' => $positionsByEvent[$eventId] ?? []];
        } elseif (isset($payloadsByType[$type])) {
            $payload = $payloadsByType[$type][$eventId] ?? [];
        }

        $items[] = [
            'event_id' => $eventId,
            'device_code' => $event['device_code'],
            'device_id' => (int)$event['device_id'],
            'type' => $type,
            'created_at' => $event['created_at'],
            'payload' => $payload
        ];
    }

    if ($is_first_poll || $latest_detection_id > $last_detection_id) {
        $alarms = $detectionRepository->listOpenFallConfirmed(100);
    }

    foreach ($alarms as $alarm) {
        $max_detection_id = max($max_detection_id, (int)$alarm['detection_id']);
    }

    if ($is_first_poll) {
        $positions = $positionRepository->getLatestPositionsByDevice();
        if (!empty($positions)) {
            $positions = array_intersect_key($positions, $onlineDeviceMap);
        }
    }

    $next_event_id = $max_id;
    if (count($events) < $limit) {
        $next_event_id = max($next_event_id, $latest_event_id);
    }
    $next_detection_id = max($last_detection_id, $latest_detection_id, $max_detection_id);

    $fallsCount = null;
    if ($is_first_poll || $latest_detection_id > $start_after_detection_id) {
        $currentMonth = date('Y-m-01 00:00:00');
        $fallsCount = $detectionRepository->countFallConfirmedSince($currentMonth);
    }

    $response = [
        'items' => $items,
        'alarms' => $alarms,
        'positions' => $positions,
        'next_after_id' => $next_event_id,
        'next_after_detection_id' => $next_detection_id,
        'count' => count($items) + count($alarms),
        'latest_event_id' => $latest_event_id,
        'latest_detection_id' => $latest_detection_id,
        'current_month_falls' => $fallsCount,
    ];

    if ($is_first_poll || $include_online) {
        $response['online_devices'] = $onlineDevices;
    }

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
