<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/db.class.php';
require_once __DIR__ . '/../../repositories/DetectionRepository.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$deviceCode = $_GET['device_code'] ?? null;

if (!$deviceCode) {
    echo json_encode(['error' => 'device_code is required']);
    exit;
}

$categoria = $_GET['categoria'] ?? 'alarm';
$estado = $_GET['estado'] ?? 'all';

$draw = isset($_GET['draw']) ? (int)$_GET['draw'] : 1;
$start = isset($_GET['start']) ? (int)$_GET['start'] : 0;
$length = isset($_GET['length']) ? (int)$_GET['length'] : 20;
if ($length > 100) $length = 100;
if ($length < 1) $length = 1;

$columnMap = $categoria === 'alarm'
    ? [
        0 => 'd.criado_em',
        1 => 'd.tipo',
        2 => 'd.regiao_id',
        6 => 'd.mensagem',
    ]
    : [
        0 => 'd.criado_em',
        1 => 'd.tipo',
        2 => 'd.regiao_id',
        3 => 'd.mensagem',
    ];

$globalSearch = isset($_GET['search']['value']) ? trim($_GET['search']['value']) : '';

$columnSearches = [];
if (isset($_GET['columns']) && is_array($_GET['columns'])) {
    foreach ($_GET['columns'] as $idx => $col) {
        if (isset($col['search']['value']) && trim($col['search']['value']) !== '') {
            $columnSearches[$idx] = trim($col['search']['value']);
        }
    }
}

$orderColumn = 'd.criado_em';
$orderDir = 'DESC';
if (isset($_GET['order']) && is_array($_GET['order']) && isset($_GET['order'][0])) {
    $orderIdx = (int)$_GET['order'][0]['column'];
    $orderDirRaw = strtoupper($_GET['order'][0]['dir']);
    if (in_array($orderDirRaw, ['ASC', 'DESC'])) {
        $orderDir = $orderDirRaw;
    }
    if (isset($columnMap[$orderIdx])) {
        $orderColumn = $columnMap[$orderIdx];
    }
}

try {
    $detectionRepository = new DetectionRepository($db);

    $tableResult = $detectionRepository->searchDeviceTable([
        'device_code' => $deviceCode,
        'categoria' => $categoria,
        'estado' => $estado,
        'data_inicio' => $_GET['data_inicio'] ?? null,
        'data_fim' => $_GET['data_fim'] ?? null,
        'global_search' => $globalSearch,
        'column_searches' => $columnSearches,
        'column_map' => $columnMap,
        'order_column' => $orderColumn,
        'order_dir' => $orderDir,
        'length' => $length,
        'start' => $start,
        'area_name_map' => [],
    ]);

    $data = [];
    foreach ($tableResult['rows'] as $row) {
        $item = [
            'id' => (int)$row['id'],
            'tipo' => $row['tipo'],
            'regiao_id' => $row['regiao_id'] !== null ? (int)$row['regiao_id'] : null,
            'regiao_nome' => $row['regiao_nome'] ?? null,
            'mensagem' => $row['mensagem'],
            'criado_em' => $row['criado_em'],
        ];
        if ($categoria === 'alarm') {
            $item['intervencao_inicio'] = $row['intervencao_inicio'] ?? null;
            $item['intervencao_fim'] = $row['intervencao_fim'] ?? null;
        }
        $data[] = $item;
    }

    echo json_encode([
        'draw' => $draw,
        'recordsTotal' => $tableResult['recordsFiltered'],
        'recordsFiltered' => $tableResult['recordsFiltered'],
        'data' => $data,
    ]);

} catch (Throwable $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'draw' => $draw,
        'recordsTotal' => 0,
        'recordsFiltered' => 0,
        'data' => [],
    ]);
}
