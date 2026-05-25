<?php
header('Content-Type: application/json');

$uid = isset($_GET['uid']) ? trim((string)$_GET['uid']) : '';
if ($uid === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing uid parameter']);
    exit;
}

// In this stress-test setup there is no upstream layout source to sync from.
// Keep the endpoint available so frontend flow matches production behavior.
echo json_encode([
    'ok' => true,
    'synced' => false,
    'uid' => $uid,
    'message' => 'Layout sync is not configured in this environment',
]);
