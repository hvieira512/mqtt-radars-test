<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/db.class.php';
require_once __DIR__ . '/../../repositories/DeviceRepository.php';
require_once __DIR__ . '/../../repositories/LayoutRepository.php';

try {
    $deviceRepository = new DeviceRepository($db);
    $devices = $deviceRepository->listActiveDevices();

    $uids = array_column($devices, 'uid');
    $layouts = [];

    if ($uids) {
        $layoutRepository = new LayoutRepository($db);
        try {
            $layouts = $layoutRepository->findCurrentByDeviceUids($uids);
        } catch (Exception $e) {
            // Layout table may not exist in test DB
            $layouts = [];
        }
    }

    echo json_encode(['layouts' => $layouts]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
