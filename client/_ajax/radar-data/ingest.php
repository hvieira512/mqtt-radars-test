<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/db.class.php';
require_once __DIR__ . '/../../parsers/index.php';
require_once __DIR__ . '/../../repositories/DeviceRepository.php';
require_once __DIR__ . '/../../repositories/EventRepository.php';
require_once __DIR__ . '/../../repositories/DetectionRepository.php';
require_once __DIR__ . '/../../repositories/PositionRepository.php';
require_once __DIR__ . '/../../repositories/VitalsRepository.php';
require_once __DIR__ . '/../../repositories/StatsRepository.php';
require_once __DIR__ . '/../../alarms/index.php';

function respondJson(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function getRadarMessageType(array $payload): ?string
{
    $supportedTypes = ['position', 'heartbreath', 'posstatics', 'hbstatics'];
    $presentTypes = [];
    foreach ($supportedTypes as $type) {
        if (!empty($payload[$type])) {
            $presentTypes[] = $type;
        }
    }
    return count($presentTypes) === 1 ? $presentTypes[0] : null;
}

function sendFallAlarmNotification(int $detectionId, string $roomName): void
{
}

function processSingleMessage($db, array $msg, bool $manageOwnTransaction = true): array
{
    $deviceRepo = new DeviceRepository($db);
    $eventRepo = new EventRepository($db);

    $payload = $msg['payload'] ?? [];
    $deviceCode = $payload['deviceCode'] ?? null;

    if (!$deviceCode) {
        return ['status' => 'error', 'message' => 'No deviceCode'];
    }

    $messageType = getRadarMessageType($payload);
    if ($messageType === null) {
        return ['status' => 'error', 'message' => 'Invalid payload type'];
    }

    $transactionStarted = false;
    $allAlarms = [];
    $eventId = null;

    try {
        $deviceId = $deviceRepo->getDeviceId($deviceCode);

        switch ($messageType) {
            case 'position':
                $parser = new PositionParser();
                $parsed = $parser->parse($payload['position'], $deviceCode);
                if ($parsed) {
                    $positionRepo = new PositionRepository($db);
                    $fallPersonIndexes = [];
                    foreach ($parsed['people'] as $person) {
                        if (($person['posture_state'] ?? '') === 'Fall Confirmation') {
                            $fallPersonIndexes[] = $person['person_index'];
                        }
                    }
                    $prevPostures = $fallPersonIndexes
                        ? $positionRepo->getLatestPosturesByPersonIndexes($deviceId, $fallPersonIndexes)
                        : [];

                    if ($manageOwnTransaction && !$transactionStarted) {
                        $db->execute('START TRANSACTION');
                        $transactionStarted = true;
                    }
                    $eventId = $eventRepo->createEvent($deviceId, 1);
                    $positionRepo->insertPosition($eventId, $parsed['people']);
                    $positionRepo->upsertCurrentPositions($deviceId, $eventId, $parsed['people']);

                    $allAlarms = AlarmEngine::evaluate($parsed);

                    foreach ($allAlarms as $idx => $alarm) {
                        if (($alarm['alarm_type'] ?? '') === 'fall_confirmed') {
                            $personIdx = $alarm['person_index'] ?? 0;
                            $allAlarms[$idx]['_prev_posture'] = $prevPostures[$personIdx] ?? '';
                        }
                    }
                }
                break;

            case 'heartbreath':
                $parser = new HeartBreathParser();
                $parsed = $parser->parse($payload['heartbreath'], $deviceCode);
                if ($parsed) {
                    $vitalsRepo = new VitalsRepository($db);
                    if ($manageOwnTransaction && !$transactionStarted) {
                        $db->execute('START TRANSACTION');
                        $transactionStarted = true;
                    }
                    $eventId = $eventRepo->createEvent($deviceId, 3);
                    $vitalsRepo->insertVitals($eventId, $parsed);
                    $allAlarms = AlarmEngine::evaluate($parsed);
                }
                break;

            case 'posstatics':
            case 'hbstatics':
                break;
        }

        if ($eventId === null) {
            return ['status' => 'error', 'message' => 'No event created', 'device' => $deviceCode];
        }

        $detectionRepo = null;
        $fallConfirmedRoomName = null;

        foreach ($allAlarms as $alarm) {
            if (($alarm['category'] ?? '') !== 'alarm') continue;

            $alarmType = $alarm['alarm_type'];

            if ($alarmType === 'fall_confirmed') {
                $personIdx = $alarm['person_index'] ?? null;
                if ($personIdx !== null && ($alarm['_prev_posture'] ?? '') === 'Fall Confirmation') {
                    continue;
                }
                if ($fallConfirmedRoomName === null) {
                    $fallConfirmedRoomName = $deviceRepo->getFallConfirmedRoomNameIfEligible($deviceId);
                }
                if ($fallConfirmedRoomName === '') {
                    continue;
                }
            }

            if ($detectionRepo === null) {
                $detectionRepo = new DetectionRepository($db);
            }

            $detectionRepo->insertDetection([
                'event_id' => $eventId,
                'device_id' => $deviceId,
                'category' => $alarm['category'],
                'type' => $alarmType,
                'level' => $alarm['level'],
                'source' => $alarm['source'],
                'person_index' => $alarm['person_index'] ?? null,
                'region_id' => $alarm['region_id'] ?? null,
                'message' => $alarm['message'] ?? '',
            ]);
        }

        if ($manageOwnTransaction && $transactionStarted) {
            $db->execute('COMMIT');
        }

        return ['status' => 'ok', 'device' => $deviceCode, 'message_type' => $messageType, 'event_id' => $eventId];
    } catch (Exception $e) {
        if ($manageOwnTransaction && $transactionStarted) {
            try { $db->execute('ROLLBACK'); } catch (Exception $_) {}
        }
        return ['status' => 'error', 'message' => $e->getMessage(), 'device' => $deviceCode];
    }
}

// ─── Main ─────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondJson(['error' => 'Method not allowed'], 405);
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !is_array($data)) {
    respondJson(['error' => 'Invalid JSON'], 400);
}

// === BATCH MODE ===
$messages = $data['messages'] ?? null;
if (empty($data['batch']) || !is_array($messages)) {
    respondJson([
        'error' => 'Batch mode required',
        'message' => 'Expected payload format: {"batch": true, "messages": [...]}',
    ], 422);
}

if (empty($messages)) {
    respondJson(['error' => 'Empty batch'], 422);
}

$db->execute('START TRANSACTION');
$results = [];
$hasErrors = false;

try {
    foreach ($messages as $msg) {
        $result = processSingleMessage($db, $msg, false);
        if (($result['status'] ?? 'error') !== 'ok') {
            $hasErrors = true;
        }
        $results[] = $result;
    }

    if ($hasErrors) {
        $db->execute('ROLLBACK');
        respondJson([
            'batch' => true,
            'status' => 'error',
            'message' => 'Batch rolled back because at least one message failed',
            'total' => count($results),
            'results' => $results,
        ], 422);
    }

    $db->execute('COMMIT');
    respondJson([
        'batch' => true,
        'status' => 'ok',
        'total' => count($results),
        'results' => $results,
    ]);
} catch (Exception $e) {
    $db->execute('ROLLBACK');
    respondJson([
        'batch' => true,
        'status' => 'error',
        'message' => $e->getMessage(),
        'processed' => $results,
    ], 500);
}
