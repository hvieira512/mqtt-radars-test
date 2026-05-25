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

function extractDeviceCodes(array $messages): array
{
    $codes = [];
    foreach ($messages as $msg) {
        $payload = $msg['payload'] ?? [];
        $deviceCode = trim((string)($payload['deviceCode'] ?? ''));
        if ($deviceCode === '') {
            continue;
        }
        $codes[$deviceCode] = true;
    }

    return array_keys($codes);
}

function buildBatchContext($db, array $messages): array
{
    $deviceRepo = new DeviceRepository($db);

    $deviceCodes = extractDeviceCodes($messages);
    $deviceIdsByCode = $deviceRepo->getDeviceIdsByUids($deviceCodes);
    $fallRoomByDeviceId = $deviceRepo->getFallConfirmedRoomNamesByDeviceIds(array_values($deviceIdsByCode));

    return [
        'deviceRepo' => $deviceRepo,
        'eventRepo' => new EventRepository($db),
        'positionRepo' => new PositionRepository($db),
        'vitalsRepo' => new VitalsRepository($db),
        'detectionRepo' => new DetectionRepository($db),
        'deviceIdsByCode' => $deviceIdsByCode,
        'fallRoomByDeviceId' => $fallRoomByDeviceId,
    ];
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

// ═════════════════════════════════════════════════════════════
// Phase 0: Build shared batch context (2 DB reads)
//   - deviceCodes → deviceIds (bulk)
//   - fall-eligible room names (bulk)
// ═════════════════════════════════════════════════════════════

$context = buildBatchContext($db, $messages);
/** @var DeviceRepository $deviceRepo */
$deviceRepo = $context['deviceRepo'];
/** @var EventRepository $eventRepo */
$eventRepo = $context['eventRepo'];
/** @var PositionRepository $positionRepo */
$positionRepo = $context['positionRepo'];
/** @var VitalsRepository $vitalsRepo */
$vitalsRepo = $context['vitalsRepo'];
/** @var DetectionRepository $detectionRepo */
$detectionRepo = $context['detectionRepo'];
$deviceIdsByCode = &$context['deviceIdsByCode'];
$fallRoomByDeviceId = &$context['fallRoomByDeviceId'];

// ═════════════════════════════════════════════════════════════
// Phase 1: Classify messages, resolve device codes
//   - Determine message type (position / heartbreath / static)
//   - Resolve deviceCode → deviceId (cache + fallback DB lookup)
//   - Skip posstatics/hbstatics (no event created)
// ═════════════════════════════════════════════════════════════

$events = [];
$errors = [];
$skippedStatic = [];

foreach ($messages as $i => $msg) {
    $payload = $msg['payload'] ?? [];
    $deviceCode = trim((string)($payload['deviceCode'] ?? ''));

    if ($deviceCode === '') {
        $errors[$i] = ['index' => $i, 'status' => 'error', 'message' => 'No deviceCode'];
        continue;
    }

    $messageType = getRadarMessageType($payload);
    if ($messageType === null) {
        $errors[$i] = ['index' => $i, 'status' => 'error', 'message' => 'Invalid payload type'];
        continue;
    }

    // posstatics / hbstatics: no event created, skip silently
    if ($messageType === 'posstatics' || $messageType === 'hbstatics') {
        $skippedStatic[$i] = ['status' => 'ok', 'device' => $deviceCode, 'message_type' => $messageType];
        continue;
    }

    $deviceId = $deviceIdsByCode[$deviceCode] ?? null;
    if ($deviceId === null) {
        $deviceId = $deviceRepo->getDeviceId($deviceCode);
        $deviceIdsByCode[$deviceCode] = $deviceId;
    }
    if (!$deviceId) {
        $errors[$i] = ['index' => $i, 'status' => 'error', 'message' => 'Unknown device', 'device' => $deviceCode];
        continue;
    }

    $eventTypeId = $messageType === 'position' ? 1 : 3;
    $events[] = [
        'index' => $i,
        'device_id' => $deviceId,
        'device_code' => $deviceCode,
        'message_type' => $messageType,
        'event_type_id' => $eventTypeId,
        'payload' => $payload,
    ];
}

$hasErrors = !empty($errors);

if ($hasErrors) {
    respondJson([
        'batch' => true,
        'status' => 'error',
        'message' => 'Batch rolled back because at least one message failed',
        'total' => count($messages),
        'results' => $errors,
    ], 422);
}

// If only statics (no events to create), commit empty batch
if (!$events) {
    respondJson([
        'batch' => true,
        'status' => 'ok',
        'total' => count($messages),
        'results' => array_values($skippedStatic),
    ]);
}

// ═════════════════════════════════════════════════════════════
// Phase 2: Batch-create all events — 1 INSERT, N event IDs
//   MySQL AUTO_INCREMENT guarantees sequential IDs within a
//   multi-row INSERT under innodb_autoinc_lock_mode=1.
//   LAST_INSERT_ID() returns the first ID; subsequent IDs
//   are first + offset.
// ═════════════════════════════════════════════════════════════

$eventData = array_map(fn($ev) => [
    'device_id' => $ev['device_id'],
    'event_type_id' => $ev['event_type_id'],
], $events);

$eventIds = $eventRepo->createEvents($eventData);

foreach ($events as $offset => &$ev) {
    $ev['event_id'] = $eventIds[$offset];
}
unset($ev);

// ═════════════════════════════════════════════════════════════
// Phase 3: Parse + evaluate alarms + collect DB rows
//   All CPU work — no DB writes until Phase 4.
// ═════════════════════════════════════════════════════════════

$allPositionRows = [];
$allUpsertRows = [];
$allVitalsRows = [];
$allDetectionRows = [];
$devicesWithFallCandidates = [];

foreach ($events as &$ev) {
    if ($ev['message_type'] === 'position') {
        $parser = new PositionParser();
        $parsed = $parser->parse($ev['payload']['position'], $ev['device_code']);
        if (!$parsed) {
            respondJson([
                'batch' => true,
                'status' => 'error',
                'message' => "Failed to parse position payload for {$ev['device_code']}",
                'total' => count($messages),
            ], 422);
        }

        // Build position rows (one per person per event)
        foreach ($parsed['people'] as $p) {
            $allPositionRows[] = [
                'event_id' => $ev['event_id'],
                'person_index' => (int)$p['person_index'],
                'x_position_dm' => (int)$p['x_position_dm'],
                'y_position_dm' => (int)$p['y_position_dm'],
                'z_position_cm' => (int)$p['z_position_cm'],
                'time_left_s' => (int)$p['time_left_s'],
                'posture_state' => $p['posture_state'] ?? '',
                'last_event' => $p['last_event'] ?? '',
                'region_id' => (int)($p['region_id'] ?? 0),
            ];
            $allUpsertRows[] = [
                'device_id' => $ev['device_id'],
                'person_index' => (int)$p['person_index'],
                'event_id' => $ev['event_id'],
                'x_position_dm' => (int)$p['x_position_dm'],
                'y_position_dm' => (int)$p['y_position_dm'],
                'z_position_cm' => (int)$p['z_position_cm'],
                'time_left_s' => (int)$p['time_left_s'],
                'posture_state' => $p['posture_state'] ?? '',
                'last_event' => $p['last_event'] ?? '',
                'region_id' => (int)($p['region_id'] ?? 0),
            ];
        }

        // Collect fall candidates for dedup query
        $fallPersonIndexes = [];
        foreach ($parsed['people'] as $p) {
            if (($p['posture_state'] ?? '') === 'Fall Confirmation') {
                $fallPersonIndexes[] = (int)$p['person_index'];
            }
        }
        if ($fallPersonIndexes) {
            $did = $ev['device_id'];
            if (!isset($devicesWithFallCandidates[$did])) {
                $devicesWithFallCandidates[$did] = [];
            }
            $devicesWithFallCandidates[$did] = array_merge(
                $devicesWithFallCandidates[$did],
                $fallPersonIndexes
            );
        }

        $ev['_parsed'] = $parsed;
    } elseif ($ev['message_type'] === 'heartbreath') {
        $parser = new HeartBreathParser();
        $parsed = $parser->parse($ev['payload']['heartbreath'], $ev['device_code']);
        if (!$parsed) {
            respondJson([
                'batch' => true,
                'status' => 'error',
                'message' => "Failed to parse heartbreath payload for {$ev['device_code']}",
                'total' => count($messages),
            ], 422);
        }

        $allVitalsRows[] = [
            'event_id' => $ev['event_id'],
            'breathing' => (int)$parsed['breathing'],
            'heart_rate' => (int)$parsed['heart_rate'],
            'sleep_state' => (string)$parsed['sleep_state'],
        ];

        $ev['_parsed'] = $parsed;
    }
}
unset($ev);

// ─── Fall dedup: query current postures for devices with fall candidates ───
$prevPosturesByDevice = [];
foreach ($devicesWithFallCandidates as $did => $personIndexes) {
    $personIndexes = array_values(array_unique(array_map('intval', $personIndexes)));
    $prevPosturesByDevice[$did] = $positionRepo->getLatestPosturesByPersonIndexes($did, $personIndexes);
}

// ─── Evaluate alarms per event, detect dedup, build detection rows ───
foreach ($events as &$ev) {
    if (!isset($ev['_parsed'])) {
        continue;
    }

    $alarmStart = microtime(true);
    $allAlarms = AlarmEngine::evaluate($ev['_parsed']);
    $alarmDuration = microtime(true) - $alarmStart;
    if ($alarmDuration > 0.005) {
        error_log("AlarmEngine[{$ev['message_type']}] {$ev['device_code']} took " . round($alarmDuration * 1000, 2) . "ms");
    }

    // For position events: attach prev posture to fall_confirmed alarms
    if ($ev['message_type'] === 'position') {
        foreach ($allAlarms as $idx => $alarm) {
            if (($alarm['alarm_type'] ?? '') === 'fall_confirmed') {
                $personIdx = $alarm['person_index'] ?? 0;
                $did = $ev['device_id'];
                $allAlarms[$idx]['_prev_posture'] = $prevPosturesByDevice[$did][$personIdx] ?? '';
            }
        }
    }

    $fallConfirmedRoomName = null;

    foreach ($allAlarms as $alarm) {
        if (($alarm['category'] ?? '') !== 'alarm') {
            continue;
        }

        $alarmType = $alarm['alarm_type'];

        if ($alarmType === 'fall_confirmed') {
            $personIdx = $alarm['person_index'] ?? null;
            if ($personIdx !== null && ($alarm['_prev_posture'] ?? '') === 'Fall Confirmation') {
                continue;
            }
            if ($fallConfirmedRoomName === null) {
                $did = $ev['device_id'];
                if (array_key_exists($did, $fallRoomByDeviceId)) {
                    $fallConfirmedRoomName = (string)$fallRoomByDeviceId[$did];
                } else {
                    $fallConfirmedRoomName = $deviceRepo->getFallConfirmedRoomNameIfEligible($did);
                    $fallRoomByDeviceId[$did] = $fallConfirmedRoomName;
                }
            }
            if ($fallConfirmedRoomName === '') {
                continue;
            }
        }

        $allDetectionRows[] = [
            'event_id' => $ev['event_id'],
            'device_id' => $ev['device_id'],
            'category' => $alarm['category'],
            'type' => $alarmType,
            'level' => $alarm['level'],
            'source' => $alarm['source'],
            'person_index' => $alarm['person_index'] ?? null,
            'region_id' => $alarm['region_id'] ?? null,
            'message' => $alarm['message'] ?? '',
        ];
    }
}
unset($ev);

// ═════════════════════════════════════════════════════════════
// Phase 4: Batch INSERT all data — 5 queries total
//   (was ~550 queries for batch of 200)
// ═════════════════════════════════════════════════════════════

$db->execute('START TRANSACTION');

try {
    if ($allPositionRows) {
        $positionRepo->insertPositions($allPositionRows);
        $positionRepo->upsertCurrentPositionsBatch($allUpsertRows);
    }
    if ($allVitalsRows) {
        $vitalsRepo->insertVitalsBatch($allVitalsRows);
    }
    if ($allDetectionRows) {
        $detectionRepo->insertDetections($allDetectionRows);
    }

    // Phase 4.5: Update last event time per device
    $deviceTimestamps = [];
    foreach ($events as $ev) {
        $did = $ev['device_id'];
        if (!isset($deviceTimestamps[$did])) {
            $deviceTimestamps[$did] = date('Y-m-d H:i:s');
        }
    }
    if ($deviceTimestamps) {
        $parts = [];
        foreach ($deviceTimestamps as $did => $ts) {
            $did = (int)$did;
            $ts_q = $db->sanitize($ts);
            $parts[] = "($did, '$ts_q')";
        }
        $db->execute("INSERT INTO radares_ultimo_evento (dispositivo_id, ultimo_recebido_em) VALUES "
            . implode(',', $parts)
            . " ON DUPLICATE KEY UPDATE ultimo_recebido_em = VALUES(ultimo_recebido_em)");
    }

    $db->execute('COMMIT');
} catch (Exception $e) {
    $db->execute('ROLLBACK');
    respondJson([
        'batch' => true,
        'status' => 'error',
        'message' => $e->getMessage(),
    ], 500);
}

// ═════════════════════════════════════════════════════════════
// Phase 5: Build response in original message order
// ═════════════════════════════════════════════════════════════

$results = [];
foreach ($events as $ev) {
    $results[$ev['index']] = [
        'status' => 'ok',
        'device' => $ev['device_code'],
        'message_type' => $ev['message_type'],
        'event_id' => $ev['event_id'],
    ];
}
foreach ($skippedStatic as $i => $r) {
    $results[$i] = $r;
}

// Ensure sequential array
$finalResults = [];
for ($i = 0; $i < count($messages); $i++) {
    $finalResults[] = $results[$i] ?? ['status' => 'error', 'message' => 'Unknown'];
}

respondJson([
    'batch' => true,
    'status' => 'ok',
    'total' => count($finalResults),
    'results' => $finalResults,
]);
