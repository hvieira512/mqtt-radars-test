<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/db.class.php';
require_once __DIR__ . '/../../repositories/DeviceRepository.php';
require_once __DIR__ . '/../../repositories/PlaybackRepository.php';

$uid = $_GET['uid'] ?? null;
$start = $_GET['start'] ?? null;
$end = $_GET['end'] ?? null;

if (!$uid || !$start || !$end) {
    echo json_encode(['error' => 'Missing uid, start or end parameter']);
    exit;
}

$dateTimePattern = '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/';
if (!preg_match($dateTimePattern, $start) || !preg_match($dateTimePattern, $end)) {
    echo json_encode(['error' => 'Invalid datetime format']);
    exit;
}

$deviceRepository = new DeviceRepository($db);
$playbackRepository = new PlaybackRepository($db);

$deviceId = $deviceRepository->findIdByUid((string)$uid);
if ($deviceId === null) {
    echo json_encode(['error' => 'Device not found']);
    exit;
}

$playbackData = $playbackRepository->getPlaybackData($deviceId, (string)$start, (string)$end);

echo json_encode([
    'uid' => $uid,
    'start' => $start,
    'end' => $end,
    'positions' => $playbackData['positions'],
    'vitals' => $playbackData['vitals'],
    'detections' => $playbackData['detections'],
]);
