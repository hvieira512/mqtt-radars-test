<?php
require_once __DIR__ . '/includes/db.class.php';

// Simplified device query using only tables that exist in our test schema
$devices = $db->getAll("
    SELECT r.id, r.uid, COALESCE(q.nomeQuarto, CONCAT('Room ', r.id)) as room_name,
           COALESCE(re.wc, 0) as is_wc
    FROM radares r
    LEFT JOIN radares_esquema re ON re.id_radar = r.id
    LEFT JOIN quartos q ON q.id = re.id_quarto
    ORDER BY r.uid ASC
");
$totalDevices = count($devices);
?>
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Stress Test Dashboard - Radar Monitorização</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <style>
        :root { --colunas-dashboard: 6; }
        body { background: #f2f3f8; font-family: system-ui, -apple-system, sans-serif; }
        .kpi-card {
            flex: 1 1 calc(20% - 0.75rem);
            min-width: 180px;
            background: #fff;
            border: 1px solid #ebedf2;
            border-radius: 0.5rem;
            padding: 1rem 1.25rem;
            transition: box-shadow 0.2s;
        }
        .kpi-card:hover { box-shadow: 0 0.25rem 0.85rem rgba(82,63,105,0.08); }
        .kpi-icon { font-size: 2.5rem; color: #9ea4bb; }
        .kpi-value { font-size: 1.3rem; font-weight: 600; color: #3f4254; }
        .kpi-label { font-size: 0.85rem; color: #74788d; }
        .kpi-success .kpi-icon { color: #28a745; }
        .kpi-warning .kpi-icon { color: #ffc107; }
        .kpi-info .kpi-icon { color: #17a2b8; }
        .kpi-primary .kpi-icon { color: #0891b2; }
        .kpi-danger .kpi-icon { color: #dc3545; }

        .device-card {
            background: #fff;
            border: 1px solid #ebedf2;
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            transition: all 0.2s;
        }
        .device-card .device-uid { font-size: 0.82rem; font-weight: 600; color: #3f4254; }
        .device-card .device-room { font-size: 0.75rem; color: #74788d; }
        .device-card .device-status {
            display: inline-block;
            width: 10px; height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .device-card .device-status.online { background: #28a745; box-shadow: 0 0 6px rgba(40,167,69,0.5); }
        .device-card .device-status.offline { background: #dc3545; }
        .device-card .device-events { font-size: 0.75rem; color: #6c757d; }

        .device-grid {
            display: grid;
            grid-template-columns: repeat(var(--colunas-dashboard), 1fr);
            gap: 0.5rem;
        }
        @media (max-width: 1400px) { .device-grid { grid-template-columns: repeat(6, 1fr); } }
        @media (max-width: 992px) { .device-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 576px) { .device-grid { grid-template-columns: repeat(2, 1fr); } }

        .event-badge {
            display: inline-block;
            padding: 0.15rem 0.4rem;
            border-radius: 0.25rem;
            font-size: 0.7rem;
            font-weight: 600;
        }
        .event-badge.position { background: #d1ecf1; color: #0c5460; }
        .event-badge.vitals { background: #fff3cd; color: #856404; }

        #event-stream {
            max-height: 400px;
            overflow-y: auto;
            font-size: 0.8rem;
        }
        #event-stream .event-row {
            padding: 0.2rem 0.5rem;
            border-bottom: 1px solid #f0f0f0;
        }
        #event-stream .event-row:nth-child(odd) { background: #fafafa; }

        .section-title {
            font-size: 1rem;
            font-weight: 600;
            color: #3f4254;
            margin: 1.5rem 0 0.75rem;
        }

        .config-panel {
            background: #fff;
            border: 1px solid #ebedf2;
            border-radius: 0.5rem;
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="container-fluid py-3">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
                <h4 class="mb-0"><i class="fas fa-satellite-dish me-2 text-primary"></i> Monitorização Radar — Stress Test</h4>
                <small class="text-muted"><?= date('Y-m-d H:i:s') ?> · <?= $totalDevices ?> dispositivos</small>
            </div>
            <div class="d-flex gap-2 align-items-center">
                <span class="badge bg-secondary" id="poll-status">Parado</span>
                <button class="btn btn-sm btn-success" id="btn-start"><i class="fas fa-play me-1"></i>Iniciar</button>
                <button class="btn btn-sm btn-danger" id="btn-stop" disabled><i class="fas fa-stop me-1"></i>Parar</button>
            </div>
        </div>

        <!-- KPI Cards -->
        <div class="d-flex flex-wrap gap-2 mb-3">
            <div class="kpi-card">
                <div class="d-flex align-items-center gap-3">
                    <i class="fas fa-microchip kpi-icon kpi-primary"></i>
                    <div>
                        <div class="kpi-value" id="kpi-total-devices"><?= $totalDevices ?></div>
                        <div class="kpi-label">Total Dispositivos</div>
                    </div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="d-flex align-items-center gap-3">
                    <i class="fas fa-wifi kpi-icon kpi-success"></i>
                    <div>
                        <div class="kpi-value" id="kpi-online">0</div>
                        <div class="kpi-label">Online (180s)</div>
                    </div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="d-flex align-items-center gap-3">
                    <i class="fas fa-chart-line kpi-icon kpi-info"></i>
                    <div>
                        <div class="kpi-value" id="kpi-events-total">0</div>
                        <div class="kpi-label">Eventos Totais</div>
                    </div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="d-flex align-items-center gap-3">
                    <i class="fas fa-tachometer-alt kpi-icon kpi-warning"></i>
                    <div>
                        <div class="kpi-value" id="kpi-events-rate">0</div>
                        <div class="kpi-label">Eventos/s</div>
                    </div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="d-flex align-items-center gap-3">
                    <i class="fas fa-database kpi-icon kpi-danger"></i>
                    <div>
                        <div class="kpi-value" id="kpi-redis-queue">?</div>
                        <div class="kpi-label">Redis Queue</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Config Panel -->
        <div class="config-panel">
            <div class="d-flex gap-3 align-items-center flex-wrap">
                <div>
                    <label class="form-label small mb-0 me-2">Poll (ms):</label>
                    <select id="poll-interval" class="form-select form-select-sm d-inline-block w-auto">
                        <option value="500">500</option>
                        <option value="1000" selected>1000</option>
                        <option value="2000">2000</option>
                        <option value="5000">5000</option>
                    </select>
                </div>
                <div>
                    <label class="form-label small mb-0 me-2">Mostrar:</label>
                    <select id="show-type" class="form-select form-select-sm d-inline-block w-auto">
                        <option value="all">Todos</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                    </select>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="show-stream" checked>
                    <label class="form-check-label small" for="show-stream">Stream</label>
                </div>
                <span class="badge bg-primary" id="poll-latency">—</span>
                <span class="badge bg-info" id="latest-event-id">ID: 0</span>
            </div>
        </div>

        <!-- Device grid + event stream -->
        <div class="row">
            <div class="col-12 col-xl-9">
                <div class="section-title"><i class="fas fa-th-large me-1"></i> Dispositivos</div>
                <div id="device-grid" class="device-grid">
                    <?php foreach ($devices as $d): ?>
                    <div class="device-card" data-uid="<?= htmlspecialchars($d['uid']) ?>">
                        <div class="d-flex align-items-center gap-2">
                            <span class="device-status offline" id="status-<?= htmlspecialchars($d['uid']) ?>"></span>
                            <div class="flex-grow-1 min-width-0" style="min-width:0">
                                <div class="device-uid text-truncate" title="<?= htmlspecialchars($d['uid']) ?>">
                                    <?= htmlspecialchars($d['uid']) ?>
                                </div>
                                <div class="device-room text-truncate">
                                    <i class="fas fa-door-open me-1" style="font-size:0.65rem"></i>
                                    <?= htmlspecialchars($d['room_name']) ?>
                                </div>
                            </div>
                            <span class="device-events" id="evt-<?= htmlspecialchars($d['uid']) ?>">0</span>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <div class="col-12 col-xl-3">
                <div class="section-title"><i class="fas fa-stream me-1"></i> Eventos <small class="text-muted" id="stream-count">(0)</small></div>
                <div id="event-stream" class="border rounded bg-white p-1" style="min-height:100px">
                    <div class="text-muted text-center py-4" id="stream-placeholder">Clique "Iniciar" para ver eventos...</div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script>
    const POLL_URL = '/modulos/radares/_ajax/radar-data/poll.php';

    let pollTimer = null;
    let afterId = 0;
    let afterDetectionId = 0;
    let isPolling = false;
    let eventsTotal = 0;
    let eventsRate = 0;
    let rateSamples = [];
    let deviceEvents = {};
    let onlineDevices = new Set();

    function updateDeviceStatus(uid, isOnline) {
        var dot = document.getElementById('status-' + uid);
        if (!dot) return;
        dot.className = 'device-status ' + (isOnline ? 'online' : 'offline');
        var card = dot.closest('.device-card');
        if (card) card.style.opacity = isOnline ? '1' : '0.55';
    }

    function addStreamItem(type, uid, timestamp) {
        var ts = timestamp ? timestamp.substring(0, 19) : new Date().toLocaleTimeString();
        var cls = type === 'position' ? 'position' : 'vitals';
        var icon = type === 'position' ? 'fa-arrows' : 'fa-heart-pulse';
        var row = $(
            '<div class="event-row d-flex align-items-center gap-2">' +
            '  <span class="event-badge ' + cls + '"><i class="fas ' + icon + '"></i> ' + type + '</span>' +
            '  <code class="small flex-grow-1">' + $('<span>').text(uid).html() + '</code>' +
            '  <small class="text-muted text-nowrap">' + ts + '</small>' +
            '</div>'
        );
        $('#stream-placeholder').hide();
        $('#event-stream').append(row);
        $('#event-stream')[0].scrollTop = $('#event-stream')[0].scrollHeight;
        var rows = $('#event-stream').children('.event-row');
        while (rows.length > 500) { rows.first().remove(); rows = $('#event-stream').children('.event-row'); }
    }

    function processPollData(data) {
        if (!data) return;
        if (data.next_after_id && data.next_after_id > afterId) afterId = data.next_after_id;
        if (data.next_after_detection_id && data.next_after_detection_id > afterDetectionId)
            afterDetectionId = data.next_after_detection_id;

        // Online devices
        if (data.online_devices) {
            var currentOnline = {};
            for (var i = 0; i < data.online_devices.length; i++) {
                currentOnline[data.online_devices[i]] = true;
            }
            for (var uid in currentOnline) {
                if (!onlineDevices.has(uid)) updateDeviceStatus(uid, true);
            }
            for (var uid of onlineDevices) {
                if (!currentOnline[uid]) updateDeviceStatus(uid, false);
            }
            onlineDevices = new Set(data.online_devices);
            $('#kpi-online').text(onlineDevices.size);
        }

        // Items
        var showStream = $('#show-stream').is(':checked');
        if (data.items) {
            for (var i = 0; i < data.items.length; i++) {
                var item = data.items[i];
                if (!item.device_code) continue;
                eventsTotal++;
                deviceEvents[item.device_code] = (deviceEvents[item.device_code] || 0) + 1;
                var el = document.getElementById('evt-' + item.device_code);
                if (el) el.textContent = deviceEvents[item.device_code];
                if (showStream) addStreamItem(item.type, item.device_code, item.created_at);
            }
            $('#kpi-events-total').text(eventsTotal);
        }

        if (data.latest_event_id) {
            $('#latest-event-id').text('ID: ' + data.latest_event_id);
        }
        $('#stream-count').text('(' + $('#event-stream').children('.event-row').length + ')');
    }

    function doPoll() {
        if (isPolling) return;
        isPolling = true;
        var startTime = performance.now();
        $.ajax({
            url: POLL_URL,
            method: 'GET',
            data: { after_id: afterId, after_detection_id: afterDetectionId, limit: 100 },
            dataType: 'json',
            success: function(data) {
                $('#poll-latency').text(Math.round(performance.now() - startTime) + 'ms');
                processPollData(data);
            },
            error: function() { $('#poll-latency').text('ERR'); },
            complete: function() { isPolling = false; }
        });
    }

    function startPoll() {
        if (pollTimer) return;
        pollDelay = parseInt($('#poll-interval').val(), 10);
        $('#poll-status').text('Activo').removeClass('bg-secondary bg-danger').addClass('bg-success');
        $('#btn-start').prop('disabled', true);
        $('#btn-stop').prop('disabled', false);
        doPoll();
        pollTimer = setInterval(doPoll, pollDelay);
    }

    function stopPoll() {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        $('#poll-status').text('Parado').removeClass('bg-success bg-danger').addClass('bg-secondary');
        $('#btn-start').prop('disabled', false);
        $('#btn-stop').prop('disabled', true);
        isPolling = false;
    }

    // Redis queue and stats polling
    setInterval(function() {
        if (pollTimer) {
            $.ajax({
                url: '/modulos/radares/_ajax/radar-data/stats.php',
                method: 'GET',
                dataType: 'json',
                success: function(data) {
                    if (data && data.redis_queue !== undefined) {
                        var q = data.redis_queue;
                        $('#kpi-redis-queue').text(q < 0 ? 'N/A' : q.toLocaleString());
                    }
                    if (data && data.db_events !== undefined && !pollTimer) {
                        $('#kpi-events-total').text(data.db_events);
                    }
                }
            });
        }
    }, 2000);

    // Events rate calc
    setInterval(function() {
        if (pollTimer) {
            var now = Date.now();
            rateSamples.push({ time: now, count: eventsTotal });
            var cutoff = now - 3000;
            rateSamples = rateSamples.filter(function(s) { return s.time >= cutoff; });
            if (rateSamples.length >= 2) {
                var first = rateSamples[0];
                var last = rateSamples[rateSamples.length - 1];
                var dt = (last.time - first.time) / 1000;
                if (dt > 0) {
                    eventsRate = Math.round((last.count - first.count) / dt);
                    $('#kpi-events-rate').text(eventsRate);
                }
            }
        } else { rateSamples = []; }
    }, 1000);

    // Filter devices
    $('#show-type').on('change', function() {
        var filter = $(this).val();
        $('.device-card').each(function() {
            var $card = $(this);
            var isOnline = $card.find('.device-status').hasClass('online');
            if (filter === 'all') $card.show();
            else if (filter === 'online') $card.toggle(isOnline);
            else if (filter === 'offline') $card.toggle(!isOnline);
        });
    });

    $('#btn-start').on('click', startPoll);
    $('#btn-stop').on('click', stopPoll);

    // Initial stats (when stopped, just show DB event count)
    $.ajax({
        url: '/modulos/radares/_ajax/radar-data/stats.php',
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            if (data && data.db_events !== undefined) $('#kpi-events-total').text(data.db_events);
        }
    });
    </script>
</body>
</html>
