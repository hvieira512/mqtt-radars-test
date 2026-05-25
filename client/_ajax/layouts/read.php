<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/db.class.php';
require_once __DIR__ . '/../../repositories/LayoutRepository.php';

$uid = isset($_GET['uid']) ? trim($_GET['uid']) : '';

if (!$uid) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing uid parameter']);
    exit;
}

try {
    $layoutRepository = new LayoutRepository($db);
    $layout = $layoutRepository->findCurrentByDeviceUids([$uid]);

    if (!empty($layout[$uid])) {
        echo json_encode($layout[$uid]);
    } else {
        echo json_encode(['error' => 'No layout found']);
    }
} catch (Throwable $e) {
    echo json_encode(['error' => 'No layout found']);
}
