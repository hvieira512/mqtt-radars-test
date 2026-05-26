<?php
header('Content-Type: text/html; charset=utf-8');

require_once __DIR__ . '/../../includes/db.class.php';
require_once __DIR__ . '/../../helpers.php';
require_once __DIR__ . '/../../repositories/MonitoringRepository.php';
require_once __DIR__ . '/../../includes/room-card-renderer.php';

$i18n = [
    'quarto' => 'Quarto',
    'queda' => 'Queda',
    'pessoas' => 'Pessoas',
    'wc' => 'WC',
];

$groupIndex = (int)($_GET['group'] ?? 0);
$offset = (int)($_GET['offset'] ?? 0);
$limit = (int)($_GET['limit'] ?? 20);
$limit = max(1, min($limit, 50));

if ($offset < 0) { $offset = 0; }

$cacheTtl = (int)(getenv('ROOMS_HTML_CACHE_TTL') ?: 60);
$cacheFile = null;
if ($cacheTtl > 0) {
    $cacheKeyParts = [
        $_SERVER['HTTP_HOST'] ?? 'cli',
        $db->database ?? '',
        (string)$groupIndex,
        (string)$offset,
        (string)$limit,
    ];
    $cacheFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . 'radar_rooms_html_' . md5(implode('|', $cacheKeyParts)) . '.html';

    if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
        readfile($cacheFile);
        exit;
    }
}

$monitoringRepository = new MonitoringRepository($db);
$dashboard = $monitoringRepository->getDashboardData();

if (!isset($dashboard['groups'][$groupIndex])) { exit; }

$group = $dashboard['groups'][$groupIndex];
$rooms = array_slice($group['rooms'], $offset, $limit);

ob_start();
foreach ($rooms as $room) {
    renderMonitoringRoomCard($room, $i18n);
}
$html = ob_get_clean();

if ($cacheFile !== null) {
    @file_put_contents($cacheFile, $html, LOCK_EX);
}

echo $html;
