<?php

require_once __DIR__ . '/../includes/db.class.php';
require_once __DIR__ . '/../services/SleepReportService.php';

function sleepReportJson(array $payload, int $statusCode = 200, int $flags = 0): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($payload, $flags);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sleepReportJson(['error' => 'Method not allowed'], 405);
}

$period = isset($_GET['period']) ? trim((string)$_GET['period']) : 'daily';
$view = isset($_GET['view']) ? trim((string)$_GET['view']) : 'report';
$uid = isset($_GET['uid']) ? trim((string)$_GET['uid']) : '';
$date = isset($_GET['date']) ? trim((string)$_GET['date']) : '';
$month = isset($_GET['month']) ? trim((string)$_GET['month']) : '';
$debug = isset($_GET['debug']) && (string)$_GET['debug'] === '1';

if (!in_array($period, ['daily', 'monthly'], true)) {
    sleepReportJson(['error' => 'Unsupported sleep report period', 'period' => $period], 422);
}

$service = new SleepReportService($db);

try {
    switch ($period) {
        case 'monthly':
            switch ($view) {
                case 'report':
                    sleepReportJson($service->generateMonthly($uid, $month, $date), 200, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                case 'stored':
                    sleepReportJson($service->getStoredMonthly($uid, $month), 200, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                default:
                    sleepReportJson(['error' => 'Unsupported monthly sleep report view', 'view' => $view], 404);
            }

        case 'daily':
            switch ($view) {
                case 'report':
                    $payload = $service->generateDaily($uid, $date, $debug);
                    sleepReportJson($payload, 200, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                case 'stored':
                    sleepReportJson($service->getStoredDaily($uid, $date), 200, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                case 'calendar':
                    sleepReportJson($service->getDailyCalendar($uid, $date), 200, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                default:
                    sleepReportJson(['error' => 'Unsupported sleep report view', 'view' => $view], 404);
            }
    }
} catch (InvalidArgumentException $e) {
    sleepReportJson(['error' => $e->getMessage()], 400);
} catch (OutOfBoundsException $e) {
    sleepReportJson(['error' => $e->getMessage()], 404);
} catch (InvalidSleepReportException $e) {
    sleepReportJson([
        'error' => true,
        'code' => 'invalid_sleep_report',
        'message' => $e->getMessage(),
        'validation' => $e->getValidation(),
    ], 422, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    sleepReportJson([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ], 500);
}
