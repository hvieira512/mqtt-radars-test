<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../../includes/db.class.php';
    require_once __DIR__ . '/../../repositories/EventRepository.php';

    $eventRepo = new EventRepository($db);
    $latestEventId = $eventRepo->getLatestEventId();

    // Redis queue depth
    $redisQueue = null;
    $redisHost = getenv('REDIS_HOST') ?: '127.0.0.1';
    $redisPort = (int)(getenv('REDIS_PORT') ?: '6380');
    $redisKey = getenv('REDIS_QUEUE_KEY') ?: 'radar:events:queue';

    try {
        if (class_exists('Redis')) {
            $redis = new Redis();
            $redis->connect($redisHost, $redisPort, 1);
            $redisQueue = $redis->lLen($redisKey);
            $redis->close();
        } else {
            $redisQueue = -2;
        }
    } catch (Exception $e) {
        $redisQueue = -1;
    }

    echo json_encode([
        'redis_queue' => $redisQueue,
        'db_events' => $latestEventId,
        'timestamp' => date('Y-m-d H:i:s'),
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
