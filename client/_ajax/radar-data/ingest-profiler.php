<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../../../../includes/db.class.php';
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
    echo json_encode($payload, JSON_PRETTY_PRINT);
    exit;
}

function getRadarMessageType(array $payload): ?string
{
    $supportedTypes = ['position', 'heartbreath', 'posstatics', 'hbstatics'];
    $presentTypes = [];
    foreach ($supportedTypes as $type) {
        if (!empty($payload[$type])) $presentTypes[] = $type;
    }
    return count($presentTypes) === 1 ? $presentTypes[0] : null;
}

function sendFallAlarmNotification(int $detectionId, string $roomName): void
{
    require_once __DIR__ . '/../../../../includes/google/fcm.php';
    require_once __DIR__ . '/../../../../includes/resources.php';
    if (!function_exists('sendAlarmNotification')) {
        throw new RuntimeException('sendAlarmNotification function is not available.');
    }
    sendAlarmNotification($detectionId, $roomName);
}

function beginRadarTransaction($db, bool &$transactionStarted): void
{
    if ($transactionStarted) return;
    $db->execute('START TRANSACTION');
    $transactionStarted = true;
}

$profile = ['_start' => microtime(true)];
function pt(string $label): void
{
    global $profile;
    $profile[$label] = microtime(true);
}
function pd(string $from, string $to): float
{
    global $profile;
    return round(($profile[$to] - $profile[$from]) * 1000, 2);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondJson(['error' => 'Method not allowed'], 405);
}

pt('input_read');
$input = file_get_contents('php://input');
$data = json_decode($input, true);
pt('parsed_input');

if (!$data || !is_array($data)) {
    respondJson(['error' => 'Invalid JSON', 'debug' => substr($input, 0, 200)], 400);
}

$payload = $data['payload'] ?? [];
$deviceCode = $payload['deviceCode'] ?? null;

if (!$deviceCode) {
    respondJson(['error' => 'No deviceCode'], 422);
}

$messageType = getRadarMessageType($payload);
if ($messageType === null) {
    respondJson([
        'error' => 'Expected exactly one radar payload type',
        'supported_types' => ['position', 'heartbreath', 'posstatics', 'hbstatics'],
    ], 422);
}

$transactionStarted = false;

try {
    $deviceRepo = new DeviceRepository($db);
    $eventRepo = new EventRepository($db);
    $deviceId = $deviceRepo->getDeviceId($deviceCode);
    pt('device_lookup');

    $allAlarms = [];
    $eventId = null;

    switch ($messageType) {
        case 'position':
            $parser = new PositionParser();
            $parsed = $parser->parse($payload['position'], $deviceCode);
            pt('parser');

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
                pt('prev_postures');

                beginRadarTransaction($db, $transactionStarted);
                $eventId = $eventRepo->createEvent($deviceId, 1);
                pt('event_insert');
                $positionRepo->insertPosition($eventId, $parsed['people']);
                pt('position_insert');
                $positionRepo->upsertCurrentPositions($deviceId, $eventId, $parsed['people']);
                pt('estado_upsert');

                $allAlarms = AlarmEngine::evaluate($parsed);
                pt('alarm_evaluate');

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
            pt('parser');

            if ($parsed) {
                $vitalsRepo = new VitalsRepository($db);
                beginRadarTransaction($db, $transactionStarted);
                $eventId = $eventRepo->createEvent($deviceId, 3);
                pt('event_insert');
                $vitalsRepo->insertVitals($eventId, $parsed);
                pt('vitals_insert');
                $allAlarms = AlarmEngine::evaluate($parsed);
                pt('alarm_evaluate');
            }
            break;

        case 'posstatics':
            $parser = new PosStaticsParser();
            $parsed = $parser->parse($payload['posstatics'], $deviceCode);
            pt('parser');

            if ($parsed) {
                $statsRepo = new StatsRepository($db);
                beginRadarTransaction($db, $transactionStarted);
                $eventId = $eventRepo->createEvent($deviceId, 2);
                pt('event_insert');
                $statsRepo->insertMinuteStats($eventId, $parsed);
                pt('stats_insert');
            }
            break;

        case 'hbstatics':
            $parser = new HbStaticsParser();
            $parsed = $parser->parse($payload['hbstatics'], $deviceCode);
            pt('parser');

            if ($parsed) {
                $statsRepo = new StatsRepository($db);
                beginRadarTransaction($db, $transactionStarted);
                $eventId = $eventRepo->createEvent($deviceId, 4);
                pt('event_insert');
                $statsRepo->insertSleepStats($eventId, $parsed);
                pt('stats_insert');
            }
            break;
    }

    if ($eventId === null) {
        respondJson([
            'error' => 'Invalid payload for message type',
            'message_type' => $messageType,
        ], 422);
    }

    $insertedAlarms = 0;
    $skippedAlarms = 0;
    $alarmsCount = 0;
    $eventsCount = 0;
    $fallConfirmedRoomName = null;
    $detectionRepo = null;
    $pendingFallNotifications = [];

    foreach ($allAlarms as $alarm) {
        if (($alarm['category'] ?? '') === 'alarm') $alarmsCount++;
        elseif (($alarm['category'] ?? '') === 'event') $eventsCount++;

        $alarmType = $alarm['alarm_type'];
        if ($alarmType === 'fall_confirmed') {
            $personIdx = $alarm['person_index'] ?? null;
            if ($personIdx !== null && ($alarm['_prev_posture'] ?? '') === 'Fall Confirmation') {
                $skippedAlarms++;
                continue;
            }
            if ($fallConfirmedRoomName === null) {
                $fallConfirmedRoomName = $deviceRepo->getFallConfirmedRoomNameIfEligible($deviceId);
            }
            if ($fallConfirmedRoomName === '') {
                $skippedAlarms++;
                continue;
            }
        }

        if ($detectionRepo === null) {
            $detectionRepo = new DetectionRepository($db);
        }
        $detectionId = $detectionRepo->insertDetection([
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
        $insertedAlarms++;

        if ($alarmType === 'fall_confirmed') {
            $pendingFallNotifications[] = [$detectionId, $fallConfirmedRoomName];
        }
    }
    pt('detection_inserts');

    $db->execute('COMMIT');
    pt('commit');
    $transactionStarted = false;

    foreach ($pendingFallNotifications as [$detectionId, $roomName]) {
        sendFallAlarmNotification($detectionId, $roomName);
    }
    pt('notifications');

    // Build timing profile
    $timings = [];
    $labels = ['input_read', 'parsed_input', 'device_lookup', 'parser',
                'event_insert', 'alarm_evaluate', 'detection_inserts', 'commit', 'notifications'];
    if ($messageType === 'position') {
        $labels = ['input_read', 'parsed_input', 'device_lookup', 'parser',
                    'prev_postures', 'event_insert', 'position_insert', 'estado_upsert',
                    'alarm_evaluate', 'detection_inserts', 'commit', 'notifications'];
    }
    if ($messageType === 'heartbreath') {
        $labels = ['input_read', 'parsed_input', 'device_lookup', 'parser',
                    'event_insert', 'vitals_insert', 'alarm_evaluate',
                    'detection_inserts', 'commit', 'notifications'];
    }
    if (in_array($messageType, ['posstatics', 'hbstatics'], true)) {
        $labels = ['input_read', 'parsed_input', 'device_lookup', 'parser',
                    'event_insert', 'stats_insert', 'commit'];
    }

    $prev = '_start';
    foreach ($labels as $l) {
        if (isset($profile[$l])) {
            $timings[$l] = pd($prev, $l);
            $prev = $l;
        } else {
            $timings[$l] = -1;
        }
    }
    $timings['total'] = pd('_start', 'commit');
    $timings['total_with_notifications'] = round((microtime(true) - $profile['_start']) * 1000, 2);

    respondJson([
        'status' => 'ok',
        'device' => $deviceCode,
        'device_id' => $deviceId,
        'message_type' => $messageType,
        'event_id' => $eventId,
        'received_at' => date('Y-m-d H:i:s'),
        'alarms_count' => $alarmsCount,
        'events_count' => $eventsCount,
        'inserted_alarms' => (int)$insertedAlarms,
        'skipped_alarms' => (int)$skippedAlarms,
        '_profile' => $timings,
    ]);

} catch (Exception $e) {
    if ($transactionStarted) {
        try { $db->execute('ROLLBACK'); } catch (Exception $_) {}
    }
    $elapsed = round((microtime(true) - $profile['_start']) * 1000, 2);
    respondJson([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        '_profile_elapsed_ms' => $elapsed,
    ], 500);
}
