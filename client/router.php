<?php
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

$base = __DIR__;

// Production URL -> local file mapping
$routes = [
    '/modulos/radares/_ajax/radar-data/poll.php'           => '/_ajax/radar-data/poll.php',
    '/modulos/radares/_ajax/radar-data/ingest.php'          => '/_ajax/radar-data/ingest.php',
    '/modulos/radares/_ajax/radar-data/ingest-profiler.php' => '/_ajax/radar-data/ingest-profiler.php',
    '/modulos/radares/_ajax/radar-data/stats.php'           => '/_ajax/radar-data/stats.php',
    '/modulos/radares/_ajax/layouts/current.php'            => '/_ajax/layouts/current.php',
    '/modulos/radares/_ajax/layouts/read.php'               => '/_ajax/layouts/read.php',
    '/modulos/radares/_ajax/layouts/sync.php'               => '/_ajax/layouts/sync.php',
    '/modulos/radares/_ajax/detections/device-table.php'    => '/_ajax/detections/device-table.php',
    '/modulos/radares/_ajax/detections/resolve.php'         => '/_ajax/detections/resolve.php',
];

// Direct match
if (isset($routes[$path])) {
    require $base . $routes[$path];
    return true;
}

// Fallback: try to match by suffix (for backward compat with old router)
$suffixMap = [
    'radar-data-ingest.php'          => '/_ajax/radar-data/ingest.php',
    'radar-data-ingest-profiler.php' => '/_ajax/radar-data/ingest-profiler.php',
    'radar-data/poll.php'            => '/_ajax/radar-data/poll.php',
    'radar-data/stats.php'           => '/_ajax/radar-data/stats.php',
    'layouts/current.php'            => '/_ajax/layouts/current.php',
    'layouts/read.php'               => '/_ajax/layouts/read.php',
    'layouts/sync.php'               => '/_ajax/layouts/sync.php',
    'detections/device-table.php'    => '/_ajax/detections/device-table.php',
];

foreach ($suffixMap as $suffix => $target) {
    if (str_ends_with($path, $suffix)) {
        require $base . $target;
        return true;
    }
}

// Backward compatibility for legacy imports to /_js/utils.js
if ($path === '/_js/utils.js') {
    $file = $base . '/_js/utils.js';
    if (file_exists($file)) {
        header('Content-Type: application/javascript');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        require $file;
        return true;
    }
}

return false;
