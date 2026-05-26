<?php

require_once __DIR__ . '/../repositories/LayoutRepository.php';

class InvalidSleepReportException extends RuntimeException
{
    /** @var array<string, mixed> */
    private $validation;

    public function __construct(array $validation, string $message = 'Sleep report is invalid')
    {
        parent::__construct($message);
        $this->validation = $validation;
    }

    public function getValidation(): array
    {
        return $this->validation;
    }
}

class DailySleepReportBuilder
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function build(int $deviceId, string $uid, string $reportDate, bool $debug = false): array
    {
        return buildDailySleepReportPayload($this->db, $deviceId, $uid, $reportDate, $debug);
    }

    public function normalizeDate(string $date): ?string
    {
        return normalizeDailySleepReportDate($date);
    }
}

function normalizeDailySleepReportDate(string $date): ?string
{
    if ($date === '') {
        return null;
    }

    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) === 1) {
        $dateTime = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        $errors = DateTimeImmutable::getLastErrors();

        return $dateTime instanceof DateTimeImmutable
            && (!$errors || ((int)$errors['warning_count'] === 0 && (int)$errors['error_count'] === 0))
            ? $dateTime->format('Y-m-d')
            : null;
    }

    $timestamp = strtotime($date);
    if ($timestamp === false) {
        return null;
    }

    return date('Y-m-d', $timestamp);
}

function buildDailySleepReportPayload(
    $db,
    int $deviceId,
    string $uid,
    string $reportDate,
    bool $debug = false
): array
{
    $reportDay = new DateTimeImmutable($reportDate);
    assertSleepReportReadyForGeneration($reportDay);

    $sleepWindowStartLocal = $reportDay->modify('-1 day')->setTime(20, 0, 0);
    $sleepWindowEndLocal = $reportDay->setTime(8, 0, 0);
    $dayWindowStartLocal = $reportDay->modify('-1 day')->setTime(8, 0, 0);
    $dayWindowEndLocal = $reportDay->modify('-1 day')->setTime(20, 0, 0);

    $sleepWindowStart = $sleepWindowStartLocal;
    $sleepWindowEnd = $sleepWindowEndLocal;
    $dayWindowStart = $dayWindowStartLocal;
    $dayWindowEnd = $dayWindowEndLocal;

    $layout = fetchLatestRadarLayout($db, $deviceId);
    $bedRegionConfig = parseBedRegionConfig($layout['declare_area'] ?? '');
    $bedRegionIds = $bedRegionConfig['all_ids'];

    $sleepStatsRows = fetchSleepStatsRows($db, $deviceId, $sleepWindowStart, $sleepWindowEnd);
    $vitalsRows = fetchVitalsRows($db, $deviceId, $sleepWindowStart, $sleepWindowEnd);
    $positionRows = fetchPositionRows($db, $deviceId, $sleepWindowStart, $sleepWindowEnd);
    $minuteStatsRows = fetchMinuteStatsRows($db, $deviceId, $dayWindowStart, $dayWindowEnd);
    $detectionRows = fetchDetectionRows($db, $deviceId, $dayWindowStart, $sleepWindowEnd);

    $hasSleepStats = !empty($sleepStatsRows);
    $hasVitals = !empty($vitalsRows);
    $insufficientData = (!$hasSleepStats && !$hasVitals);

    if ($insufficientData) {
        throw new InvalidSleepReportException(
            buildInvalidSleepReportValidation(
                [
                    buildInvalidSleepReportReason(
                        'insufficient_source_data',
                        'Não existem estatísticas de sono nem sinais vitais suficientes para gerar o relatório.'
                    ),
                ],
                'Insufficient sleep data for the requested period.'
            ),
            'Insufficient sleep data for the requested period.'
        );
    }

    $sleepDetectionRows = filterRowsByTimestamp($detectionRows, 'criado_em', $sleepWindowStart, $sleepWindowEnd);
    $dayDetectionRows = filterRowsByTimestamp($detectionRows, 'criado_em', $dayWindowStart, $dayWindowEnd);

    $samples = buildSampleSeries($sleepStatsRows, $vitalsRows);
    $positionTracking = buildPositionTimeline($positionRows, $bedRegionConfig);
    $positionTimeline = $positionTracking['timeline'];
    $samples = addPositionTransitionSamples($samples, $positionTimeline);
    $samples = applyInBedStateToSamples($samples, $positionTimeline);
    $samples = applyRemHeuristic($samples);
    $displaySamples = buildDisplaySleepSamples($samples, $sleepWindowEnd);

    $series = buildReportSeries($samples, $sleepWindowEnd);
    $displaySeries = buildReportSeries($displaySamples, $sleepWindowEnd);
    $sleepSegments = buildSleepSegments(
        $displaySamples,
        $sleepWindowEnd,
        $displaySeries['get_bed_timestamp'] ?? null
    );
    $sessionIntervals = buildSleepSessionIntervals($displaySamples, $sleepWindowEnd);
    $normalizedLeaveBedCount = countLeaveBedIntervals($sessionIntervals);
    $vitals = buildVitalsPayload($samples);
    $ahi = calculateAhi($samples, $sleepDetectionRows, $series['sleep_total_minutes']);
    $alarmEvents = buildAlarmEvents($samples, $sleepDetectionRows);
    $userActivity = buildUserActivity($minuteStatsRows, $dayDetectionRows, $dayWindowStart, $dayWindowEnd);
    $motionCount = calculateMotionCount($positionRows, $displaySamples);
    $fallCount = countDetectionsByType($sleepDetectionRows, 'fall_confirmed', $sleepWindowStart, $sleepWindowEnd);
    $fallScore = min($fallCount, 5);

    $reportedLatencyMinutes = calculateReportedLatencyMinutes($series);
    $sleepEfficiency = calculateSleepEfficiency($series['sleep_total_minutes'], $series['on_bed_minutes']);
    $sleepQuality = calculateSleepQuality($sleepEfficiency, $displaySeries['deep_sleep_ratio'], $normalizedLeaveBedCount);
    $score = calculateOverallScore($sleepEfficiency, $ahi, $series['sleep_total_minutes'], $displaySeries['deep_sleep_ratio'], $normalizedLeaveBedCount);
    $scoreLabel = getScoreLabel($score);
    $evaluation = buildEvaluation(
        $displaySeries,
        $ahi,
        $sleepEfficiency,
        $normalizedLeaveBedCount,
        isset($vitals['breath']['avg']) ? (int)$vitals['breath']['avg'] : null
    );

    $payload = buildSleepReportPayloadV1(
        $deviceId,
        $uid,
        $reportDay,
        $sleepWindowStartLocal,
        $sleepWindowEndLocal,
        $dayWindowStartLocal,
        $dayWindowEndLocal,
        $series,
        $displaySeries,
        $sessionIntervals,
        $normalizedLeaveBedCount,
        $samples,
        $sleepSegments,
        $vitals,
        $alarmEvents,
        $userActivity,
        $evaluation,
        $ahi,
        $sleepQuality,
        $score,
        $scoreLabel,
        $fallScore,
        $motionCount
    );

    $validation = validateLocalSleepReportPayloadV1($payload);
    if (($validation['status'] ?? 'valid') !== 'valid') {
        throw new InvalidSleepReportException(
            $validation,
            (string)($validation['message'] ?? 'Sleep report is invalid')
        );
    }

    if ($debug) {
        $payload['_debug'] = [
            'device_id' => $deviceId,
            'uid' => $uid,
            'report_date' => $reportDay->format('Y-m-d'),
            'window_start' => $sleepWindowStart->format('Y-m-d H:i:s'),
            'window_end' => $sleepWindowEnd->format('Y-m-d H:i:s'),
            'layout' => [
                'found' => !empty($layout),
                'has_declare_area' => !empty($layout['declare_area']),
                'bed_region_ids' => array_values($bedRegionIds),
                'bed_region_count' => count($bedRegionIds),
                'monitoring_bed_region_ids' => array_values($bedRegionConfig['monitoring_ids']),
                'monitoring_bed_region_count' => count($bedRegionConfig['monitoring_ids']),
                'tracking_mode' => $positionTracking['tracking_mode'] ?? 'unknown',
                'tracked_person_index' => $positionTracking['tracked_person_index'],
            ],
            'row_counts' => [
                'radares_estatisticas_sono' => count($sleepStatsRows),
                'radares_sinais_vitais' => count($vitalsRows),
                'radares_posicao_pessoas' => count($positionRows),
                'radares_estatisticas_minuto' => count($minuteStatsRows),
                'radares_detecoes' => count($detectionRows),
                'sleep_window_detections' => count($sleepDetectionRows),
                'day_window_detections' => count($dayDetectionRows),
                'position_timeline_points' => count($positionTimeline),
                'merged_samples' => count($samples),
                'display_samples' => count($displaySamples),
                'statistical_segments' => count($sleepSegments),
                'alarm_events' => count($alarmEvents),
            ],
            'data_ranges' => [
                'radares_estatisticas_sono' => describeRowRange($sleepStatsRows, 'timestamp'),
                'radares_sinais_vitais' => describeRowRange($vitalsRows, 'timestamp'),
                'radares_posicao_pessoas' => describeRowRange($positionRows, 'timestamp'),
                'radares_estatisticas_minuto' => describeRowRange($minuteStatsRows, 'timestamp'),
                'radares_detecoes' => describeRowRange($detectionRows, 'criado_em'),
                'sleep_window_detections' => describeRowRange($sleepDetectionRows, 'criado_em'),
                'day_window_detections' => describeRowRange($dayDetectionRows, 'criado_em'),
                'merged_samples' => describeRowRange($samples, 'timestamp'),
                'display_samples' => describeRowRange($displaySamples, 'timestamp'),
            ],
            'sample_previews' => [
                'sleep_stats_first' => previewRows($sleepStatsRows, [
                    'timestamp',
                    'respiracao_tempo_real',
                    'ritmo_cardiaco_tempo_real',
                    'media_respiracao_min',
                    'media_ritmo_cardiaco_min',
                    'estado_respiracao',
                    'estado_ritmo_cardiaco',
                    'estado_sinais_vitais',
                    'estado_sono',
                ], 5, false),
                'sleep_stats_last' => previewRows($sleepStatsRows, [
                    'timestamp',
                    'respiracao_tempo_real',
                    'ritmo_cardiaco_tempo_real',
                    'media_respiracao_min',
                    'media_ritmo_cardiaco_min',
                    'estado_respiracao',
                    'estado_ritmo_cardiaco',
                    'estado_sinais_vitais',
                    'estado_sono',
                ], 5, true),
                'vitals_first' => previewRows($vitalsRows, [
                    'timestamp',
                    'taxa_respiracao',
                    'ritmo_cardiaco',
                    'estado_sono',
                ], 5, false),
                'vitals_last' => previewRows($vitalsRows, [
                    'timestamp',
                    'taxa_respiracao',
                    'ritmo_cardiaco',
                    'estado_sono',
                ], 5, true),
                'positions_first' => previewRows($positionRows, [
                    'timestamp',
                    'indice_pessoa',
                    'estado_postura',
                    'ultimo_evento',
                    'regiao_id',
                ], 5, false),
                'positions_last' => previewRows($positionRows, [
                    'timestamp',
                    'indice_pessoa',
                    'estado_postura',
                    'ultimo_evento',
                    'regiao_id',
                ], 5, true),
                'minute_stats_first' => previewRows($minuteStatsRows, [
                    'timestamp',
                    'distancia_caminhada',
                    'tempo_caminhada',
                    'tempo_meditacao',
                    'tempo_na_cama',
                    'tempo_em_pe',
                    'tempo_multiplayer',
                ], 5, false),
                'minute_stats_last' => previewRows($minuteStatsRows, [
                    'timestamp',
                    'distancia_caminhada',
                    'tempo_caminhada',
                    'tempo_meditacao',
                    'tempo_na_cama',
                    'tempo_em_pe',
                    'tempo_multiplayer',
                ], 5, true),
                'detections_first' => previewRows($detectionRows, [
                    'criado_em',
                    'tipo',
                    'categoria',
                    'regiao_id',
                    'indice_pessoa',
                ], 5, false),
                'detections_last' => previewRows($detectionRows, [
                    'criado_em',
                    'tipo',
                    'categoria',
                    'regiao_id',
                    'indice_pessoa',
                ], 5, true),
                'merged_samples_first' => previewRows($samples, [
                    'timestamp',
                    'source',
                    'breathing',
                    'heart_rate',
                    'sleep_state',
                    'breathing_status',
                    'heart_status',
                    'vital_status',
                    'in_bed',
                    'status',
                ], 5, false),
                'merged_samples_last' => previewRows($samples, [
                    'timestamp',
                    'source',
                    'breathing',
                    'heart_rate',
                    'sleep_state',
                    'breathing_status',
                    'heart_status',
                    'vital_status',
                    'in_bed',
                    'status',
                ], 5, true),
                'display_samples_first' => previewRows($displaySamples, [
                    'timestamp',
                    'source',
                    'sleep_state',
                    'in_bed',
                    'status',
                ], 5, false),
                'display_samples_last' => previewRows($displaySamples, [
                    'timestamp',
                    'source',
                    'sleep_state',
                    'in_bed',
                    'status',
                ], 5, true),
            ],
            'focus_windows' => buildSleepDebugFocusWindows(
                $sleepSegments,
                $sessionIntervals,
                $sleepStatsRows,
                $positionRows,
                $samples,
                $displaySamples
            ),
            'status_counts' => [
                'sleep_state' => countValuesByKey($samples, 'sleep_state'),
                'breathing_status' => countValuesByKey($samples, 'breathing_status'),
                'heart_status' => countValuesByKey($samples, 'heart_status'),
                'vital_status' => countValuesByKey($samples, 'vital_status'),
                'in_bed' => countBooleanByKey($samples, 'in_bed'),
                'timeline_status' => countValuesByKey($samples, 'status'),
                'display_timeline_status' => countValuesByKey($displaySamples, 'status'),
                'detection_type' => countValuesByKey($detectionRows, 'tipo'),
            ],
            'derived_metrics' => [
                'sleep_total_minutes' => $series['sleep_total_minutes'],
                'on_bed_minutes' => $series['on_bed_minutes'],
                'deep_sleep_ratio' => $displaySeries['deep_sleep_ratio'],
                'leave_bed_count' => $normalizedLeaveBedCount,
                'leave_bed_count_raw' => $series['leave_bed_count'],
                'reported_latency_minutes' => $reportedLatencyMinutes,
                'fall_count_sleep_window' => $fallCount,
                'motion_count' => $motionCount,
                'ahi' => $ahi,
                'sleep_efficiency' => $sleepEfficiency,
                'sleep_quality' => $sleepQuality,
                'score' => $score,
                'score_label' => $scoreLabel,
                'breath_series_length' => count($payload['charts']['breathingRate']['values']),
                'heart_series_length' => count($payload['charts']['heartRate']['values']),
                'timestamps_length' => count($payload['charts']['timestamps']),
            ],
            'field_sources' => [
                'charts.timestamps' => 'stable',
                'charts.breathingRate' => 'stable',
                'charts.heartRate' => 'stable',
                'summary.sleepDurationMinutes' => 'stable',
                'summary.timeInBedMinutes' => 'stable',
                'summary.sleepEfficiencyPercent' => 'stable',
                'summary.leaveBedCount' => 'mixed',
                'session.bedTime' => 'mixed',
                'session.sleep' => 'stable',
                'session.intervals' => 'mixed',
                'stages.totals' => 'mixed',
                'stages.segments' => 'mixed',
                'sleepStates.deep_light_awake' => 'stable',
                'sleepStates.out_of_bed' => 'stable',
                'sleepStates.rem' => 'heuristic',
                'summary.ahi' => 'mixed',
                'summary.overallScore' => 'heuristic',
                'summary.overallScoreLabel' => 'heuristic',
                'summary.sleepQualityScore' => 'heuristic',
                'evaluation' => 'heuristic',
                'activity' => 'mixed',
                'events' => 'heuristic',
                'summary.fallScore' => 'heuristic',
                'summary.motionCount' => 'heuristic',
            ],
            'metric_classes' => [
                'calculable' => [
                    'charts.timestamps',
                    'charts.breathingRate',
                    'charts.heartRate',
                    'summary.sleepDurationMinutes',
                    'summary.timeInBedMinutes',
                    'summary.sleepEfficiencyPercent',
                    'session.sleep',
                    'sleepStates.deep_light_awake',
                    'sleepStates.out_of_bed',
                ],
                'mixed' => [
                    'summary.leaveBedCount',
                    'session.bedTime',
                    'session.intervals',
                    'stages.totals',
                    'stages.segments',
                    'summary.ahi',
                    'activity',
                ],
                'heuristic' => [
                    'summary.overallScore',
                    'summary.overallScoreLabel',
                    'summary.sleepQualityScore',
                    'evaluation',
                    'events',
                    'summary.fallScore',
                    'summary.motionCount',
                    'sleepStates.rem',
                ],
            ],
            'segmentation_sources' => [
                'deep_sleep' => 'estado_sono',
                'light_sleep' => 'estado_sono',
                'awake' => 'estado_sono',
                'out_of_bed' => 'radares_posicao_pessoas + layout/regioes/postura',
                'rem' => 'heuristic_from_vitals_and_sleep_pattern',
            ],
        ];
    }

    return $payload;
}

function assertSleepReportReadyForGeneration(DateTimeImmutable $reportDay): void
{
    $now = new DateTimeImmutable('now');
    $reportDate = $reportDay->format('Y-m-d');

    if ($reportDate !== $now->format('Y-m-d')) {
        return;
    }

    if ((int)$now->format('G') >= 8) {
        return;
    }

    throw new InvalidSleepReportException(
        buildInvalidSleepReportValidation(
            [
                buildInvalidSleepReportReason(
                    'report_not_ready_yet',
                    'O relatório ainda não está pronto para ser gerado para esta data.'
                ),
            ],
            'Sleep report is not ready to be generated yet.'
        ),
        'Sleep report is not ready to be generated yet.'
    );
}

function validateLocalSleepReportPayloadV1(array $payload): array
{
    $summary = $payload['summary'] ?? [];
    $session = $payload['session'] ?? [];
    $stages = $payload['stages'] ?? [];
    $charts = $payload['charts'] ?? [];

    $reasons = [];

    if ((int)($summary['sleepDurationMinutes'] ?? 0) <= 0) {
        $reasons[] = buildInvalidSleepReportReason(
            'sleep_duration_missing',
            'A duração total do sono é zero ou inexistente.'
        );
    }

    if ((int)($summary['timeInBedMinutes'] ?? 0) <= 0) {
        $reasons[] = buildInvalidSleepReportReason(
            'time_in_bed_missing',
            'O tempo passado na cama é zero ou inexistente.'
        );
    }

    if (empty($session['bedTime']['start']) && empty($session['sleep']['start'])) {
        $reasons[] = buildInvalidSleepReportReason(
            'missing_session_boundaries',
            'O relatório não conseguiu identificar o início da permanência na cama nem o início do sono.'
        );
    }

    $validBreathingSamples = countRenderableChartValues($charts['breathingRate']['values'] ?? []);
    $validHeartSamples = countRenderableChartValues($charts['heartRate']['values'] ?? []);
    if ($validBreathingSamples === 0 && $validHeartSamples === 0) {
        $reasons[] = buildInvalidSleepReportReason(
            'usable_vitals_missing',
            'Não existem sinais vitais utilizáveis na janela do sono.'
        );
    }

    if (allSleepReportStagesAreOutOfBed($stages['segments'] ?? [])) {
        $reasons[] = buildInvalidSleepReportReason(
            'all_out_of_bed',
            'A noite foi classificada integralmente como fora da cama ou sem sono utilizável.'
        );
    }

    if (!$reasons) {
        return [
            'status' => 'valid',
            'reasons' => [],
        ];
    }

    return buildInvalidSleepReportValidation(
        $reasons,
        'Sleep report is invalid for the requested date.'
    );
}

function buildInvalidSleepReportValidation(array $reasons, string $message): array
{
    return [
        'status' => 'invalid',
        'message' => $message,
        'reasons' => array_values($reasons),
    ];
}

function buildInvalidSleepReportReason(string $code, string $message): array
{
    return [
        'code' => $code,
        'message' => $message,
    ];
}

function countRenderableChartValues(array $values): int
{
    $count = 0;

    foreach ($values as $value) {
        if ($value !== null) {
            $count++;
        }
    }

    return $count;
}

function allSleepReportStagesAreOutOfBed(array $segments): bool
{
    if (!$segments) {
        return false;
    }

    foreach ($segments as $segment) {
        if (($segment['stage'] ?? null) !== 'out_of_bed') {
            return false;
        }
    }

    return true;
}

function buildSleepReportPayloadV1(
    int $deviceId,
    string $uid,
    DateTimeImmutable $reportDay,
    DateTimeImmutable $sleepWindowStartLocal,
    DateTimeImmutable $sleepWindowEndLocal,
    DateTimeImmutable $dayWindowStartLocal,
    DateTimeImmutable $dayWindowEndLocal,
    array $series,
    array $displaySeries,
    array $sessionIntervals,
    int $normalizedLeaveBedCount,
    array $samples,
    array $sleepSegments,
    array $vitals,
    array $alarmEvents,
    array $userActivity,
    array $evaluation,
    float $ahi,
    int $sleepQuality,
    int $score,
    string $scoreLabel,
    int $fallScore,
    int $motionCount
): array {
    $generatedAt = new DateTimeImmutable('now');
    $rawLatencyMinutes = calculateRawLatencyMinutes($series);
    $sleepTotalMinutes = (int)($series['sleep_total_minutes'] ?? 0);
    $timeInBedMinutes = (int)($series['on_bed_minutes'] ?? 0);

    return [
        'report' => [
            'version' => '1.0',
            'type' => 'sleep',
            'date' => $reportDay->format('Y-m-d'),
            'generatedAt' => formatDateTimeAsLocalIso($generatedAt),
        ],
        'device' => [
            'uid' => $uid,
            'id' => $deviceId,
        ],
        'window' => [
            'start' => formatDateTimeAsLocalIso($sleepWindowStartLocal),
            'end' => formatDateTimeAsLocalIso($sleepWindowEndLocal),
        ],
        'summary' => [
            'sleepDurationMinutes' => $sleepTotalMinutes,
            'timeInBedMinutes' => $timeInBedMinutes,
            'sleepEfficiencyPercent' => calculateSleepEfficiency($sleepTotalMinutes, $timeInBedMinutes),
            'ahi' => round($ahi, 2),
            'sleepQualityScore' => $sleepQuality,
            'overallScore' => $score,
            'overallScoreLabel' => $scoreLabel,
            'fallScore' => $fallScore,
            'leaveBedCount' => $normalizedLeaveBedCount,
            'motionCount' => $motionCount,
        ],
        'session' => buildSleepSessionPayload(
            $series,
            $sleepWindowEndLocal,
            $sleepTotalMinutes,
            $timeInBedMinutes,
            $rawLatencyMinutes,
            $normalizedLeaveBedCount,
            buildSleepSessionIntervalsPayload($sessionIntervals)
        ),
        'stages' => [
            'totals' => buildStageTotalsPayload($displaySeries),
            'segments' => buildSleepStageSegmentsPayload($sleepSegments),
        ],
        'charts' => buildChartsPayloadV1($samples, $vitals),
        'events' => buildEventsPayloadV1($alarmEvents),
        'activity' => buildActivityPayloadV1($userActivity, $dayWindowStartLocal, $dayWindowEndLocal),
        'evaluation' => buildEvaluationPayloadV1($evaluation),
    ];
}

function buildSleepSessionPayload(
    array $series,
    DateTimeImmutable $sleepWindowEndLocal,
    int $sleepTotalMinutes,
    int $timeInBedMinutes,
    int $latencyMinutes,
    int $leaveBedCount,
    array $intervals
): array {
    $bedEnd = resolveSessionEndPayload(
        $series['last_in_bed_timestamp'] ?? null,
        $sleepWindowEndLocal,
        !empty($series['get_bed_timestamp'])
    );
    $sleepEnd = resolveSessionEndPayload(
        $series['sleep_end_timestamp'] ?? null,
        $sleepWindowEndLocal,
        !empty($series['sleep_start_timestamp'])
    );

    return [
        'bedTime' => [
            'start' => formatTimestampAsLocalIso($series['get_bed_timestamp'] ?? null),
            'end' => $bedEnd['timestamp'],
            'durationMinutes' => $timeInBedMinutes,
            'leaveCount' => $leaveBedCount,
            'crossedWindowEnd' => $bedEnd['crossedWindowEnd'],
        ],
        'sleep' => [
            'start' => formatTimestampAsLocalIso($series['sleep_start_timestamp'] ?? null),
            'end' => $sleepEnd['timestamp'],
            'durationMinutes' => $sleepTotalMinutes,
            'latencyMinutes' => $latencyMinutes,
            'efficiencyPercent' => calculateSleepEfficiency($sleepTotalMinutes, $timeInBedMinutes),
            'crossedWindowEnd' => $sleepEnd['crossedWindowEnd'],
        ],
        'intervals' => $intervals,
    ];
}

function resolveSessionEndPayload(
    ?string $timestamp,
    DateTimeImmutable $windowEndLocal,
    bool $fallbackToWindowEnd
): array {
    if ($timestamp === null || $timestamp === '') {
        return [
            'timestamp' => $fallbackToWindowEnd ? formatDateTimeAsLocalIso($windowEndLocal) : null,
            'crossedWindowEnd' => $fallbackToWindowEnd,
        ];
    }

    $localTimestamp = parseLocalTimestamp($timestamp);
    if ($localTimestamp === null) {
        return [
            'timestamp' => $fallbackToWindowEnd ? formatDateTimeAsLocalIso($windowEndLocal) : null,
            'crossedWindowEnd' => $fallbackToWindowEnd,
        ];
    }

    if ($localTimestamp->getTimestamp() >= $windowEndLocal->modify('-60 seconds')->getTimestamp()) {
        return [
            'timestamp' => formatDateTimeAsLocalIso($windowEndLocal),
            'crossedWindowEnd' => true,
        ];
    }

    return [
        'timestamp' => formatDateTimeAsLocalIso($localTimestamp),
        'crossedWindowEnd' => false,
    ];
}

function buildStageTotalsPayload(array $displaySeries): array
{
    $durations = $displaySeries['status_durations'] ?? [];
    $sleepTotal = max(1, (int)($displaySeries['sleep_total_minutes'] ?? 0));

    return [
        'deep' => buildStageTotalRow((int)($durations[0] ?? 0), $sleepTotal),
        'light' => buildStageTotalRow((int)($durations[1] ?? 0), $sleepTotal),
        'awake' => buildStageTotalRow((int)($durations[2] ?? 0), $sleepTotal),
        'outOfBed' => buildStageTotalRow((int)($durations[3] ?? 0), $sleepTotal),
        'rem' => buildStageTotalRow((int)($durations[7] ?? 0), $sleepTotal),
    ];
}

function buildStageTotalRow(int $minutes, int $ratioBase): array
{
    return [
        'minutes' => $minutes,
        'percent' => $ratioBase > 0 ? (int)round(($minutes / $ratioBase) * 100) : 0,
    ];
}

function buildSleepStageSegmentsPayload(array $sleepSegments): array
{
    $segments = [];
    foreach ($sleepSegments as $segment) {
        $statusCode = (int)($segment['status'] ?? 2);
        $segments[] = [
            'start' => formatTimestampAsLocalIso($segment['startTime'] ?? null),
            'end' => formatTimestampAsLocalIso($segment['endTime'] ?? null),
            'stage' => mapStageCodeToKey($statusCode),
            'code' => $statusCode,
        ];
    }

    return $segments;
}

function buildSleepSessionIntervalsPayload(array $intervals): array
{
    $payload = [];

    foreach ($intervals as $interval) {
        $payload[] = [
            'start' => formatTimestampAsLocalIso($interval['startTime'] ?? null),
            'end' => formatTimestampAsLocalIso($interval['endTime'] ?? null),
            'category' => (string)($interval['category'] ?? 'just_in_bed'),
        ];
    }

    return $payload;
}

function countLeaveBedIntervals(array $intervals): int
{
    $count = 0;

    foreach ($intervals as $interval) {
        if (($interval['category'] ?? null) === 'out_of_bed') {
            $count++;
        }
    }

    return $count;
}

function buildSleepSessionIntervals(array $samples, DateTimeImmutable $sleepWindowEnd): array
{
    if (!$samples) {
        return [];
    }

    $runs = collectSleepSessionStateRuns($samples, $sleepWindowEnd);
    if (!$runs) {
        return [];
    }

    $firstRelevant = null;
    $lastRelevant = null;

    foreach ($runs as $index => $run) {
        if (($run['state'] ?? 'out_of_bed') === 'out_of_bed') {
            if ($firstRelevant !== null && $index === ($lastRelevant + 1)) {
                $lastRelevant = $index;
            }
            continue;
        }

        if ($firstRelevant === null) {
            $firstRelevant = $index;
        }

        $lastRelevant = $index;
    }

    if ($firstRelevant === null || $lastRelevant === null) {
        return [];
    }

    $selectedRuns = array_slice($runs, $firstRelevant, $lastRelevant - $firstRelevant + 1);
    $intervals = [];

    foreach ($selectedRuns as $index => $run) {
        $category = classifySleepSessionRunCategory(
            (string)($selectedRuns[$index - 1]['state'] ?? ''),
            (string)($run['state'] ?? 'out_of_bed'),
            (string)($selectedRuns[$index + 1]['state'] ?? '')
        );

        $intervals[] = [
            'startTime' => $run['start_timestamp'],
            'endTime' => $run['end_timestamp'],
            'category' => $category,
        ];
    }

    return mergeSleepSessionIntervals($intervals);
}

function collectSleepSessionStateRuns(array $samples, DateTimeImmutable $sleepWindowEnd): array
{
    if (!$samples) {
        return [];
    }

    $runs = [];
    $startIndex = 0;
    $currentState = deriveSleepSessionState($samples[0]);

    for ($i = 1, $count = count($samples); $i < $count; $i++) {
        $state = deriveSleepSessionState($samples[$i]);
        if ($state === $currentState) {
            continue;
        }

        $run = buildSampleRun($samples, $startIndex, $i - 1, 0, $sleepWindowEnd);
        $run['state'] = $currentState;
        $runs[] = $run;

        $startIndex = $i;
        $currentState = $state;
    }

    $run = buildSampleRun($samples, $startIndex, count($samples) - 1, 0, $sleepWindowEnd);
    $run['state'] = $currentState;
    $runs[] = $run;

    return $runs;
}

function deriveSleepSessionState(array $sample): string
{
    $status = (int)($sample['status'] ?? 2);

    if ($status === 3) {
        return 'out_of_bed';
    }

    if (in_array($status, [0, 1, 7], true)) {
        return 'sleeping';
    }

    return 'awake_in_bed';
}

function classifySleepSessionRunCategory(string $previousState, string $state, string $nextState): string
{
    if ($state === 'sleeping') {
        return 'sleeping';
    }

    if ($state === 'out_of_bed') {
        return 'out_of_bed';
    }

    if ($nextState === 'sleeping') {
        return 'sleep_latency';
    }

    return 'just_in_bed';
}

function mergeSleepSessionIntervals(array $intervals): array
{
    if (!$intervals) {
        return [];
    }

    $merged = [];

    foreach ($intervals as $interval) {
        if (!$merged) {
            $merged[] = $interval;
            continue;
        }

        $lastIndex = count($merged) - 1;
        $lastInterval = $merged[$lastIndex];

        if (
            ($lastInterval['category'] ?? '') === ($interval['category'] ?? '') &&
            ($lastInterval['endTime'] ?? null) === ($interval['startTime'] ?? null)
        ) {
            $merged[$lastIndex]['endTime'] = $interval['endTime'] ?? $lastInterval['endTime'];
            continue;
        }

        $merged[] = $interval;
    }

    return $merged;
}

function buildChartsPayloadV1(array $samples, array $vitals): array
{
    $timestamps = [];
    $breathingValues = [];
    $heartValues = [];

    foreach ($samples as $sample) {
        $timestamps[] = formatTimestampAsLocalIso($sample['timestamp'] ?? null);
        $breathingValues[] = normalizeChartValue($sample['breathing'] ?? null);
        $heartValues[] = normalizeChartValue($sample['heart_rate'] ?? null);
    }

    return [
        'timestamps' => $timestamps,
        'breathingRate' => [
            'unit' => 'breaths_per_minute',
            'min' => $vitals['breath']['min'] ?? null,
            'avg' => $vitals['breath']['avg'] ?? null,
            'max' => $vitals['breath']['max'] ?? null,
            'label' => $vitals['breath']['avgLabel'] ?? null,
            'values' => $breathingValues,
        ],
        'heartRate' => [
            'unit' => 'beats_per_minute',
            'min' => $vitals['heart']['min'] ?? null,
            'avg' => $vitals['heart']['avg'] ?? null,
            'max' => $vitals['heart']['max'] ?? null,
            'label' => $vitals['heart']['avgLabel'] ?? null,
            'values' => $heartValues,
        ],
    ];
}

function buildEventsPayloadV1(array $alarmEvents): array
{
    $respiratory = [];
    $falls = [];

    foreach ($alarmEvents as $event) {
        $row = [
            'timestamp' => formatTimestampAsLocalIso($event['ts'] ?? null),
            'type' => mapAlarmEventType((int)($event['eventType'] ?? 0)),
            'code' => (int)($event['eventType'] ?? 0),
        ];

        if ($row['code'] === 31) {
            $falls[] = $row;
        } else {
            $respiratory[] = $row;
        }
    }

    return [
        'respiratory' => $respiratory,
        'falls' => $falls,
    ];
}

function buildActivityPayloadV1(array $userActivity, DateTimeImmutable $dayWindowStartLocal, DateTimeImmutable $dayWindowEndLocal): array
{
    return [
        'window' => [
            'start' => formatDateTimeAsLocalIso($dayWindowStartLocal),
            'end' => formatDateTimeAsLocalIso($dayWindowEndLocal),
        ],
        'roomEntries' => (int)($userActivity['entryRoomCount'] ?? 0),
        'steps' => (int)($userActivity['stepNumber'] ?? 0),
        'speedMetersPerMinute' => (float)($userActivity['speed'] ?? 0),
        'durations' => [
            'inRoomSeconds' => parseClockDurationToSeconds($userActivity['inRoomDuration'] ?? null),
            'walkingSeconds' => parseClockDurationToSeconds($userActivity['walkDuration'] ?? null),
            'staticSeconds' => parseClockDurationToSeconds($userActivity['staticDuration'] ?? null),
            'otherSeconds' => parseClockDurationToSeconds($userActivity['otherDuration'] ?? null),
        ],
        'percentages' => [
            'walking' => (int)($userActivity['walkDurationRatio'] ?? 0),
            'static' => (int)($userActivity['staticDurationRatio'] ?? 0),
            'other' => (int)($userActivity['otherDurationRatio'] ?? 0),
        ],
        'source' => 'mixed',
    ];
}

function buildEvaluationPayloadV1(array $evaluation): array
{
    return [
        'deepSleep' => $evaluation['sleepDeepRatioEvaluation'] ?? '',
        'leaveBed' => $evaluation['sleepLeaveBedEvaluation'] ?? '',
        'sleepStart' => $evaluation['sleepStartTimeEvaluation'] ?? '',
        'duration' => $evaluation['sleepDurationEvaluation'] ?? '',
        'ahi' => $evaluation['ahiUnqualifiedEvaluation'] ?? '',
        'sleepAnalysis' => $evaluation['sleepAnalysisEvaluation'] ?? [],
        'breathingAnalysis' => $evaluation['sleepAHIEvaluation'] ?? [],
        'notes' => $evaluation['unqualifiedEvaluation'] ?? '',
    ];
}

function parseLocalTimestamp(?string $timestamp): ?DateTimeImmutable
{
    if ($timestamp === null || $timestamp === '') {
        return null;
    }

    try {
        return new DateTimeImmutable($timestamp);
    } catch (Throwable $e) {
        return null;
    }
}

function formatDateTimeAsLocalIso(DateTimeImmutable $dateTime): string
{
    return $dateTime->format('Y-m-d\TH:i:s');
}

function formatTimestampAsLocalIso(?string $timestamp): ?string
{
    $dateTime = parseLocalTimestamp($timestamp);
    return $dateTime ? formatDateTimeAsLocalIso($dateTime) : null;
}

function normalizeChartValue($value): ?int
{
    if ($value === null) {
        return null;
    }

    $number = (int)$value;
    return $number < 0 ? null : $number;
}

function mapStageCodeToKey(int $statusCode): string
{
    $map = [
        0 => 'deep',
        1 => 'light',
        2 => 'awake',
        3 => 'out_of_bed',
        7 => 'rem',
    ];

    return $map[$statusCode] ?? 'unknown';
}

function mapAlarmEventType(int $eventType): string
{
    $map = [
        11 => 'breathing_high',
        12 => 'breathing_low',
        13 => 'apnea',
        31 => 'fall_detected',
    ];

    return $map[$eventType] ?? 'unknown';
}

function parseClockDurationToSeconds(?string $duration): int
{
    if (!is_string($duration) || $duration === '') {
        return 0;
    }

    $parts = explode(':', $duration);
    if (count($parts) !== 3) {
        return 0;
    }

    return (max(0, (int)$parts[0]) * 3600)
        + (max(0, (int)$parts[1]) * 60)
        + max(0, (int)$parts[2]);
}

function calculateRawLatencyMinutes(array $series): int
{
    $getBedTimestamp = $series['get_bed_timestamp'] ?? null;
    $sleepStartTimestamp = $series['sleep_start_timestamp'] ?? null;
    if (!$getBedTimestamp || !$sleepStartTimestamp) {
        return 0;
    }

    return max(0, (int)round((strtotime($sleepStartTimestamp) - strtotime($getBedTimestamp)) / 60));
}

function fetchLatestRadarLayout($db, int $deviceId): array
{
    $layoutRepository = new LayoutRepository($db);
    return $layoutRepository->findLatestByDeviceId($deviceId) ?: [];
}

function parseBedRegionIds(string $declareArea): array
{
    $config = parseBedRegionConfig($declareArea);
    return $config['all_ids'];
}

function parseBedRegionConfig(string $declareArea): array
{
    $all = [];
    $monitoring = [];
    $standard = [];

    if ($declareArea !== '') {
        $areas = explode('},', $declareArea);
        foreach ($areas as $area) {
            $clean = trim(str_replace(['{', '}'], '', $area));
            if ($clean === '') {
                continue;
            }

            $parts = array_map('trim', explode(',', $clean));
            if (count($parts) < 2) {
                continue;
            }

            $regionId = (int)$parts[0];
            $typeId = (int)$parts[1];

            if ($typeId === 5) {
                $monitoring[$regionId] = true;
                $all[$regionId] = true;
                continue;
            }

            if ($typeId === 2) {
                $standard[$regionId] = true;
                $all[$regionId] = true;
            }
        }
    }

    return [
        'all_ids' => array_keys($all),
        'monitoring_ids' => array_keys($monitoring),
        'standard_ids' => array_keys($standard),
    ];
}

function fetchSleepStatsRows($db, int $deviceId, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $sql = "
        SELECT
            e.id AS event_id,
            e.recebido_em AS timestamp,
            s.respiracao_tempo_real,
            s.ritmo_cardiaco_tempo_real,
            s.media_respiracao_min,
            s.media_ritmo_cardiaco_min,
            s.estado_respiracao,
            s.estado_ritmo_cardiaco,
            s.estado_sinais_vitais,
            s.estado_sono
        FROM radares_eventos e
        INNER JOIN radares_estatisticas_sono s ON s.evento_id = e.id
        WHERE e.dispositivo_id = " . (int)$deviceId . "
          AND e.tipo_evento_id = 4
          AND e.recebido_em BETWEEN '" . $db->sanitize($start->format('Y-m-d H:i:s')) . "'
                              AND '" . $db->sanitize($end->format('Y-m-d H:i:s')) . "'
        ORDER BY e.recebido_em ASC, e.id ASC
    ";

    return fetchAllRows($db, $sql);
}

function fetchVitalsRows($db, int $deviceId, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $sql = "
        SELECT
            e.id AS event_id,
            e.recebido_em AS timestamp,
            v.taxa_respiracao,
            v.ritmo_cardiaco,
            v.estado_sono
        FROM radares_eventos e
        INNER JOIN radares_sinais_vitais v ON v.evento_id = e.id
        WHERE e.dispositivo_id = " . (int)$deviceId . "
          AND e.tipo_evento_id = 3
          AND e.recebido_em BETWEEN '" . $db->sanitize($start->format('Y-m-d H:i:s')) . "'
                              AND '" . $db->sanitize($end->format('Y-m-d H:i:s')) . "'
        ORDER BY e.recebido_em ASC, e.id ASC
    ";

    return fetchAllRows($db, $sql);
}

function fetchPositionRows($db, int $deviceId, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $sql = "
        SELECT
            e.id AS event_id,
            e.recebido_em AS timestamp,
            p.indice_pessoa,
            p.estado_postura,
            p.ultimo_evento,
            p.regiao_id
        FROM radares_eventos e
        INNER JOIN radares_posicao_pessoas p ON p.evento_id = e.id
        WHERE e.dispositivo_id = " . (int)$deviceId . "
          AND e.tipo_evento_id = 1
          AND e.recebido_em BETWEEN '" . $db->sanitize($start->format('Y-m-d H:i:s')) . "'
                              AND '" . $db->sanitize($end->format('Y-m-d H:i:s')) . "'
        ORDER BY e.recebido_em ASC, e.id ASC, p.indice_pessoa ASC
    ";

    return fetchAllRows($db, $sql);
}

function fetchMinuteStatsRows($db, int $deviceId, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $sql = "
        SELECT
            e.id AS event_id,
            e.recebido_em AS timestamp,
            m.distancia_caminhada,
            m.tempo_caminhada,
            m.tempo_meditacao,
            m.tempo_na_cama,
            m.tempo_em_pe,
            m.tempo_multiplayer,
            m.contagem_pessoas,
            m.respiracao_ativa
        FROM radares_eventos e
        INNER JOIN radares_estatisticas_minuto m ON m.evento_id = e.id
        WHERE e.dispositivo_id = " . (int)$deviceId . "
          AND e.tipo_evento_id = 2
          AND e.recebido_em BETWEEN '" . $db->sanitize($start->format('Y-m-d H:i:s')) . "'
                              AND '" . $db->sanitize($end->format('Y-m-d H:i:s')) . "'
        ORDER BY e.recebido_em ASC, e.id ASC
    ";

    return fetchAllRows($db, $sql);
}

function fetchDetectionRows($db, int $deviceId, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $sql = "
        SELECT
            id,
            tipo,
            categoria,
            criado_em,
            regiao_id,
            indice_pessoa,
            mensagem
        FROM radares_detecoes
        WHERE dispositivo_id = " . (int)$deviceId . "
          AND criado_em BETWEEN '" . $db->sanitize($start->format('Y-m-d H:i:s')) . "'
                           AND '" . $db->sanitize($end->format('Y-m-d H:i:s')) . "'
        ORDER BY criado_em ASC, id ASC
    ";

    return fetchAllRows($db, $sql);
}

function fetchAllRows($db, string $sql): array
{
    $result = $db->execute($sql);
    $rows = [];
    while ($row = $db->fetchRow($result)) {
        $rows[] = $row;
    }

    return $rows;
}

function describeRowRange(array $rows, string $field): array
{
    if (!$rows) {
        return [
            'count' => 0,
            'first' => null,
            'last' => null,
        ];
    }

    $first = $rows[0][$field] ?? null;
    $last = $rows[count($rows) - 1][$field] ?? null;

    return [
        'count' => count($rows),
        'first' => $first,
        'last' => $last,
    ];
}

function previewRows(array $rows, array $fields, int $limit = 5, bool $fromEnd = false): array
{
    if (!$rows) {
        return [];
    }

    $slice = $fromEnd ? array_slice($rows, -$limit) : array_slice($rows, 0, $limit);
    $preview = [];

    foreach ($slice as $row) {
        $item = [];
        foreach ($fields as $field) {
            $item[$field] = $row[$field] ?? null;
        }
        $preview[] = $item;
    }

    return $preview;
}

function selectRowsByFields(array $rows, array $fields): array
{
    $selected = [];

    foreach ($rows as $row) {
        $item = [];
        foreach ($fields as $field) {
            $item[$field] = $row[$field] ?? null;
        }
        $selected[] = $item;
    }

    return $selected;
}

function filterRowsByTimeWindow(array $rows, string $field, string $start, string $end): array
{
    $startTimestamp = strtotime($start);
    $endTimestamp = strtotime($end);
    if ($startTimestamp === false || $endTimestamp === false) {
        return [];
    }

    $filtered = [];
    foreach ($rows as $row) {
        $timestamp = strtotime((string)($row[$field] ?? ''));
        if ($timestamp === false) {
            continue;
        }

        if ($timestamp >= $startTimestamp && $timestamp < $endTimestamp) {
            $filtered[] = $row;
        }
    }

    return $filtered;
}

function summarizePositionRows(array $rows): array
{
    $counts = [];

    foreach ($rows as $row) {
        $key = implode('|', [
            (string)($row['indice_pessoa'] ?? ''),
            (string)($row['estado_postura'] ?? ''),
            (string)($row['regiao_id'] ?? ''),
        ]);
        $counts[$key] = ($counts[$key] ?? 0) + 1;
    }

    arsort($counts);

    return array_slice($counts, 0, 12, true);
}

function buildSleepDebugFocusWindows(
    array $sleepSegments,
    array $sessionIntervals,
    array $sleepStatsRows,
    array $positionRows,
    array $samples,
    array $displaySamples
): array {
    $windows = [];

    foreach ($sleepSegments as $segment) {
        $status = (int)($segment['status'] ?? 2);
        if (!in_array($status, [2, 3], true)) {
            continue;
        }

        $windows[] = [
            'source' => 'stage_segment',
            'label' => mapStageCodeToKey($status),
            'code' => $status,
            'start_db' => (string)($segment['startTime'] ?? ''),
            'end_db' => (string)($segment['endTime'] ?? ''),
        ];
    }

    foreach ($sessionIntervals as $interval) {
        $category = (string)($interval['category'] ?? '');
        if (!in_array($category, ['sleep_latency', 'just_in_bed', 'out_of_bed'], true)) {
            continue;
        }

        $windows[] = [
            'source' => 'session_interval',
            'label' => $category,
            'code' => null,
            'start_db' => (string)($interval['startTime'] ?? ''),
            'end_db' => (string)($interval['endTime'] ?? ''),
        ];
    }

    $focus = [];
    foreach ($windows as $window) {
        $start = $window['start_db'];
        $end = $window['end_db'];
        if ($start === '' || $end === '') {
            continue;
        }

        $sleepStatsWindow = filterRowsByTimeWindow($sleepStatsRows, 'timestamp', $start, $end);
        $positionWindow = filterRowsByTimeWindow($positionRows, 'timestamp', $start, $end);
        $samplesWindow = filterRowsByTimeWindow($samples, 'timestamp', $start, $end);
        $displayWindow = filterRowsByTimeWindow($displaySamples, 'timestamp', $start, $end);

        $focus[] = [
            'source' => $window['source'],
            'label' => $window['label'],
            'code' => $window['code'],
            'db' => [
                'start' => $start,
                'end' => $end,
            ],
            'report' => [
                'start' => formatTimestampAsLocalIso($start),
                'end' => formatTimestampAsLocalIso($end),
            ],
            'row_counts' => [
                'sleep_stats' => count($sleepStatsWindow),
                'positions' => count($positionWindow),
                'merged_samples' => count($samplesWindow),
                'display_samples' => count($displayWindow),
            ],
            'sleep_stats_rows' => selectRowsByFields($sleepStatsWindow, [
                'timestamp',
                'estado_sono',
                'estado_respiracao',
                'estado_ritmo_cardiaco',
                'estado_sinais_vitais',
                'respiracao_tempo_real',
                'ritmo_cardiaco_tempo_real',
            ]),
            'merged_samples' => selectRowsByFields($samplesWindow, [
                'timestamp',
                'source',
                'sleep_state',
                'in_bed',
                'status',
                'breathing',
                'heart_rate',
            ]),
            'display_samples' => selectRowsByFields($displayWindow, [
                'timestamp',
                'source',
                'sleep_state',
                'in_bed',
                'status',
                'breathing',
                'heart_rate',
            ]),
            'position_summary' => summarizePositionRows($positionWindow),
            'positions_first' => previewRows($positionWindow, [
                'timestamp',
                'indice_pessoa',
                'estado_postura',
                'ultimo_evento',
                'regiao_id',
            ], 10, false),
            'positions_last' => previewRows($positionWindow, [
                'timestamp',
                'indice_pessoa',
                'estado_postura',
                'ultimo_evento',
                'regiao_id',
            ], 10, true),
        ];
    }

    return $focus;
}

function countValuesByKey(array $rows, string $key): array
{
    $counts = [];
    foreach ($rows as $row) {
        $value = $row[$key] ?? null;
        if (is_bool($value)) {
            $value = $value ? 'true' : 'false';
        } elseif ($value === null || $value === '') {
            $value = 'null';
        } else {
            $value = (string)$value;
        }

        if (!isset($counts[$value])) {
            $counts[$value] = 0;
        }
        $counts[$value]++;
    }

    ksort($counts);

    return $counts;
}

function countBooleanByKey(array $rows, string $key): array
{
    $counts = [
        'true' => 0,
        'false' => 0,
    ];

    foreach ($rows as $row) {
        $value = !empty($row[$key]);
        $counts[$value ? 'true' : 'false']++;
    }

    return $counts;
}

function filterRowsByTimestamp(array $rows, string $field, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $filtered = [];
    foreach ($rows as $row) {
        $timestamp = isset($row[$field]) ? strtotime($row[$field]) : false;
        if ($timestamp === false) {
            continue;
        }
        if ($timestamp < $start->getTimestamp() || $timestamp > $end->getTimestamp()) {
            continue;
        }
        $filtered[] = $row;
    }

    return $filtered;
}

function buildSampleSeries(array $sleepStatsRows, array $vitalsRows): array
{
    if ($sleepStatsRows) {
        return buildSleepStatsSampleSeries($sleepStatsRows);
    }

    return buildFallbackVitalsSampleSeries($vitalsRows);
}

function buildSleepStatsSampleSeries(array $sleepStatsRows): array
{
    $samples = [];

    foreach ($sleepStatsRows as $row) {
        $timestamp = $row['timestamp'];
        $breathing = (int)$row['media_respiracao_min'];
        $heartRate = (int)$row['media_ritmo_cardiaco_min'];

        if ($breathing <= 0 && (int)$row['respiracao_tempo_real'] > 0) {
            $breathing = (int)$row['respiracao_tempo_real'];
        }

        if ($heartRate <= 0 && (int)$row['ritmo_cardiaco_tempo_real'] > 0) {
            $heartRate = (int)$row['ritmo_cardiaco_tempo_real'];
        }

        $samples[$timestamp] = [
            'timestamp' => $timestamp,
            'breathing' => sanitizeBreathingValue($breathing),
            'heart_rate' => sanitizeHeartRateValue($heartRate),
            'sleep_state' => normalizeSleepState($row['estado_sono'] ?? ''),
            'breathing_status' => normalizeBreathingStatus($row['estado_respiracao'] ?? ''),
            'heart_status' => normalizeHeartStatus($row['estado_ritmo_cardiaco'] ?? ''),
            'vital_status' => normalizeVitalStatus($row['estado_sinais_vitais'] ?? ''),
            'source' => 'radares_estatisticas_sono',
            'in_bed' => false,
            'status' => 2,
        ];
    }

    ksort($samples);

    return array_values($samples);
}

function buildFallbackVitalsSampleSeries(array $vitalsRows): array
{
    $samples = [];
    $grouped = [];

    foreach ($vitalsRows as $row) {
        $minuteBucket = date('Y-m-d H:i:00', strtotime($row['timestamp']));
        $grouped[$minuteBucket][] = $row;
    }

    foreach ($grouped as $timestamp => $rows) {
        $breathingValues = [];
        $heartValues = [];
        $sleepStates = [];

        foreach ($rows as $row) {
            $breathing = sanitizeBreathingValue((int)$row['taxa_respiracao']);
            $heartRate = sanitizeHeartRateValue((int)$row['ritmo_cardiaco']);
            if ($breathing > 0) {
                $breathingValues[] = $breathing;
            }
            if ($heartRate > 0) {
                $heartValues[] = $heartRate;
            }
            $sleepStates[] = normalizeSleepState($row['estado_sono'] ?? '');
        }

        $samples[$timestamp] = [
            'timestamp' => $timestamp,
            'breathing' => $breathingValues ? (int)round(array_sum($breathingValues) / count($breathingValues)) : -1,
            'heart_rate' => $heartValues ? (int)round(array_sum($heartValues) / count($heartValues)) : -1,
            'sleep_state' => getMostCommonValue($sleepStates, 'Undefined'),
            'breathing_status' => 'Normal',
            'heart_status' => 'Normal',
            'vital_status' => 'Normal',
            'source' => 'radares_sinais_vitais_fallback',
            'in_bed' => false,
            'status' => 2,
        ];
    }

    ksort($samples);

    return array_values($samples);
}

function normalizeSleepState(string $state): string
{
    $map = [
        'Light Sleep' => 'Light Sleep',
        'Deep Sleep' => 'Deep Sleep',
        'Awake' => 'Awake',
        'Undefined' => 'Undefined',
    ];

    return $map[$state] ?? 'Undefined';
}

function normalizeBreathingStatus(string $state): string
{
    $map = [
        'Hypopnea' => 'Hypopnea',
        'Hyperpnea' => 'Hyperpnea',
        'Apnea' => 'Apnea',
        'Low' => 'Low',
        'High' => 'High',
    ];

    return $map[$state] ?? 'Normal';
}

function normalizeHeartStatus(string $state): string
{
    $map = [
        'Low' => 'Low',
        'High' => 'High',
    ];

    return $map[$state] ?? 'Normal';
}

function normalizeVitalStatus(string $state): string
{
    return $state === 'Weak' ? 'Weak' : 'Normal';
}

function buildPositionTimeline(array $positionRows, array $bedRegionConfig): array
{
    $timeline = [];
    $grouped = [];
    $monitoringRegionIds = array_values($bedRegionConfig['monitoring_ids'] ?? []);
    $allBedRegionIds = array_values($bedRegionConfig['all_ids'] ?? []);
    $trackingRegionIds = $monitoringRegionIds ?: $allBedRegionIds;
    $trackingMode = $monitoringRegionIds ? 'tracked_monitoring_bed_person' : 'tracked_bed_person';

    foreach ($positionRows as $row) {
        $grouped[$row['timestamp']][] = $row;
    }

    ksort($grouped);

    $trackedPersonIndex = detectTrackedSleepPersonIndex($grouped, $trackingRegionIds);

    foreach ($grouped as $timestamp => $rows) {
        $timeline[] = [
            'timestamp' => $timestamp,
            'in_bed' => isTrackedPersonInBed($rows, $trackedPersonIndex, $trackingRegionIds),
        ];
    }

    return [
        'timeline' => $timeline,
        'tracked_person_index' => $trackedPersonIndex,
        'tracking_mode' => $trackedPersonIndex !== null ? $trackingMode : 'fallback_any_bed_person',
    ];
}

function detectTrackedSleepPersonIndex(array $groupedRows, array $trackingRegionIds): ?int
{
    foreach ($groupedRows as $rows) {
        $candidate = detectTrackedSleepPersonIndexFromRows($rows, $trackingRegionIds);
        if ($candidate !== null) {
            return $candidate;
        }
    }

    return null;
}

function detectTrackedSleepPersonIndexFromRows(array $rows, array $trackingRegionIds): ?int
{
    $counts = [];
    $hasTrackingRegions = !empty($trackingRegionIds);

    foreach ($rows as $row) {
        if (!isBedPosture((string)($row['estado_postura'] ?? ''))) {
            continue;
        }

        $regionId = isset($row['regiao_id']) ? (int)$row['regiao_id'] : 0;
        if ($hasTrackingRegions && !in_array($regionId, $trackingRegionIds, true)) {
            continue;
        }

        if (!isset($row['indice_pessoa']) || $row['indice_pessoa'] === '') {
            continue;
        }

        $personIndex = (int)$row['indice_pessoa'];
        $counts[$personIndex] = ($counts[$personIndex] ?? 0) + 1;
    }

    if (!$counts) {
        return null;
    }

    arsort($counts);

    return (int)array_key_first($counts);
}

function isTrackedPersonInBed(array $rows, ?int $trackedPersonIndex, array $trackingRegionIds): bool
{
    $hasTrackingRegions = !empty($trackingRegionIds);

    foreach ($rows as $row) {
        if ($trackedPersonIndex !== null && (int)($row['indice_pessoa'] ?? -1) !== $trackedPersonIndex) {
            continue;
        }

        if (!isBedPosture((string)($row['estado_postura'] ?? ''))) {
            continue;
        }

        $regionId = isset($row['regiao_id']) ? (int)$row['regiao_id'] : 0;
        if ($hasTrackingRegions && !in_array($regionId, $trackingRegionIds, true)) {
            continue;
        }

        return true;
    }

    return false;
}

function isBedPosture(string $posture): bool
{
    static $bedPostures = [
        'Lying Down' => true,
        'Sitting Up Bed' => true,
        'Suspected Sitting Up Bed' => true,
        'Confirmed Sitting Up Bed' => true,
        'In Bed' => true,
        'Squatting' => true,
    ];

    return isset($bedPostures[$posture]);
}

function addPositionTransitionSamples(array $samples, array $positionTimeline): array
{
    if (!$samples || !$positionTimeline) {
        return $samples;
    }

    $firstSampleTime = strtotime($samples[0]['timestamp'] ?? '');
    $lastSampleTime = strtotime($samples[count($samples) - 1]['timestamp'] ?? '');
    if ($firstSampleTime === false || $lastSampleTime === false) {
        return $samples;
    }

    $samplesByTimestamp = [];
    foreach ($samples as $sample) {
        $timestamp = (string)($sample['timestamp'] ?? '');
        if ($timestamp !== '') {
            $samplesByTimestamp[$timestamp] = $sample;
        }
    }

    $sampleIndex = 0;
    $lastKnownSample = $samples[0];
    $previousInBed = null;
    $hasOpenInsertedOutOfBedTransition = false;
    $sampleCount = count($samples);

    foreach ($positionTimeline as $point) {
        $timestamp = (string)($point['timestamp'] ?? '');
        $transitionTime = strtotime($timestamp);
        if ($timestamp === '' || $transitionTime === false) {
            continue;
        }

        while (
            $sampleIndex < $sampleCount &&
            strtotime($samples[$sampleIndex]['timestamp'] ?? '') !== false &&
            strtotime($samples[$sampleIndex]['timestamp']) < $transitionTime
        ) {
            $lastKnownSample = $samples[$sampleIndex];
            $sampleIndex++;
        }

        $currentInBed = !empty($point['in_bed']);
        if ($previousInBed === null) {
            $previousInBed = $currentInBed;
            continue;
        }

        if ($currentInBed === $previousInBed) {
            continue;
        }

        $previousInBed = $currentInBed;
        if ($transitionTime < $firstSampleTime || $transitionTime > $lastSampleTime) {
            continue;
        }

        if (!$currentInBed && !isSleepLikeSample($lastKnownSample)) {
            $hasOpenInsertedOutOfBedTransition = false;
            continue;
        }

        if ($currentInBed && !$hasOpenInsertedOutOfBedTransition) {
            continue;
        }

        if (!$currentInBed) {
            $hasOpenInsertedOutOfBedTransition = true;
        } else {
            $hasOpenInsertedOutOfBedTransition = false;
        }

        if (isset($samplesByTimestamp[$timestamp])) {
            continue;
        }

        $transitionSample = $lastKnownSample;
        $transitionSample['timestamp'] = $timestamp;
        $transitionSample['source'] = trim((string)($transitionSample['source'] ?? '')) !== ''
            ? $transitionSample['source'] . '+position_transition'
            : 'position_transition';
        $transitionSample['position_transition'] = true;

        $samplesByTimestamp[$timestamp] = $transitionSample;
    }

    ksort($samplesByTimestamp);

    return array_values($samplesByTimestamp);
}

function isSleepLikeSample(array $sample): bool
{
    return in_array((string)($sample['sleep_state'] ?? ''), ['Deep Sleep', 'Light Sleep'], true);
}

function applyInBedStateToSamples(array $samples, array $positionTimeline): array
{
    $positionIndex = 0;
    $currentInBed = count($positionTimeline) === 0;
    $positionCount = count($positionTimeline);

    foreach ($samples as $idx => $sample) {
        while (
            $positionIndex < $positionCount &&
            strtotime($positionTimeline[$positionIndex]['timestamp']) <= strtotime($sample['timestamp'])
        ) {
            $currentInBed = $positionTimeline[$positionIndex]['in_bed'];
            $positionIndex++;
        }

        $samples[$idx]['in_bed'] = $currentInBed;
        $samples[$idx]['status'] = deriveBaseSleepStatus($sample['sleep_state'], $currentInBed);
    }

    return $samples;
}

function deriveBaseSleepStatus(string $sleepState, bool $inBed): int
{
    if (!$inBed) {
        return 3;
    }

    if ($sleepState === 'Deep Sleep') {
        return 0;
    }

    if ($sleepState === 'Light Sleep') {
        return 1;
    }

    return 2;
}

function applyRemHeuristic(array $samples): array
{
    $sleepSeconds = 0;
    $candidateScores = array_fill(0, count($samples), 0);
    $sleepSecondsByIndex = array_fill(0, count($samples), 0);

    foreach ($samples as $idx => $sample) {
        $durationSeconds = getSampleDurationSeconds($samples, $idx, null);
        if (in_array($sample['status'], [0, 1, 7], true)) {
            $sleepSeconds += $durationSeconds;
        }

        $sleepSecondsByIndex[$idx] = $sleepSeconds;

        if ($sample['status'] !== 1 || $sleepSeconds < 4500) {
            continue;
        }

        $candidateScore = calculateRemCandidateScore($samples, $idx, $sleepSeconds);
        if ($candidateScore > 0) {
            $candidateScores[$idx] = $candidateScore;
        }
    }

    $episodes = buildRemEpisodes($samples, $candidateScores, $sleepSecondsByIndex);
    foreach ($episodes as $episode) {
        applyStatusToSampleRange(
            $samples,
            (int)$episode['start_index'],
            (int)$episode['end_index'],
            7
        );
    }

    return $samples;
}

function calculateRemCandidateScore(array $samples, int $index, int $sleepSeconds): int
{
    $sample = $samples[$index] ?? null;
    if (!$sample || (int)($sample['status'] ?? 2) !== 1) {
        return 0;
    }

    $heartRate = (int)($sample['heart_rate'] ?? 0);
    $breathing = (int)($sample['breathing'] ?? 0);
    if ($heartRate <= 0 || $breathing <= 0) {
        return 0;
    }

    $score = 0;
    $hrDelta = localSeriesDelta($samples, $index, 'heart_rate');
    $brDelta = localSeriesDelta($samples, $index, 'breathing');
    $hrRecent = rollingSeriesStats($samples, $index, 'heart_rate', 8 * 60);
    $brRecent = rollingSeriesStats($samples, $index, 'breathing', 8 * 60);
    $hrBaseline = rollingSeriesStats($samples, $index, 'heart_rate', 20 * 60, 8 * 60);
    $brBaseline = rollingSeriesStats($samples, $index, 'breathing', 20 * 60, 8 * 60);

    if ($hrDelta >= 2) {
        $score++;
    }
    if ($brDelta >= 2) {
        $score++;
    }
    if ($hrRecent['range'] >= 4) {
        $score++;
    }
    if ($brRecent['range'] >= 4) {
        $score++;
    }
    if ($hrRecent['stddev'] >= 1.5 && $hrRecent['stddev'] >= ($hrBaseline['stddev'] * 1.35)) {
        $score++;
    }
    if ($brRecent['stddev'] >= 1.5 && $brRecent['stddev'] >= ($brBaseline['stddev'] * 1.35)) {
        $score++;
    }
    if ($hrRecent['stddev'] >= 2.0 && $brRecent['stddev'] >= 2.0) {
        $score++;
    }
    if ($sleepSeconds >= 3 * 3600) {
        $score++;
    }
    if ($sleepSeconds >= 5 * 3600) {
        $score++;
    }

    return $score >= 2 ? $score : 0;
}

function rollingSeriesStats(
    array $samples,
    int $index,
    string $field,
    int $windowSeconds,
    int $endOffsetSeconds = 0
): array
{
    $endTimestamp = strtotime($samples[$index]['timestamp'] ?? '');
    if ($endTimestamp === false) {
        return ['range' => 0, 'stddev' => 0.0];
    }

    $windowEnd = $endTimestamp - $endOffsetSeconds;
    $startTimestamp = $windowEnd - $windowSeconds;
    $values = [];

    for ($i = $index; $i >= 0; $i--) {
        $timestamp = strtotime($samples[$i]['timestamp'] ?? '');
        if ($timestamp === false || $timestamp < $startTimestamp) {
            break;
        }
        if ($timestamp > $windowEnd) {
            continue;
        }

        $value = (int)($samples[$i][$field] ?? 0);
        if ($value <= 0) {
            continue;
        }

        $values[] = $value;
    }

    if (!$values) {
        return ['range' => 0, 'stddev' => 0.0];
    }

    $min = min($values);
    $max = max($values);
    $mean = array_sum($values) / count($values);
    $variance = 0.0;

    foreach ($values as $value) {
        $variance += ($value - $mean) ** 2;
    }

    return [
        'range' => $max - $min,
        'stddev' => sqrt($variance / max(1, count($values))),
    ];
}

function buildRemEpisodes(array $samples, array $candidateScores, array $sleepSecondsByIndex): array
{
    $episodes = [];
    $runStart = null;

    for ($index = 0, $count = count($samples); $index < $count; $index++) {
        $isLightSleep = (int)($samples[$index]['status'] ?? 2) === 1;

        if ($isLightSleep && $runStart === null) {
            $runStart = $index;
            continue;
        }

        if ($isLightSleep) {
            continue;
        }

        if ($runStart !== null) {
            $episodes = array_merge(
                $episodes,
                extractRemEpisodesFromLightRun(
                    $samples,
                    $candidateScores,
                    $sleepSecondsByIndex,
                    $runStart,
                    $index - 1
                )
            );
            $runStart = null;
        }
    }

    if ($runStart !== null) {
        $episodes = array_merge(
            $episodes,
            extractRemEpisodesFromLightRun(
                $samples,
                $candidateScores,
                $sleepSecondsByIndex,
                $runStart,
                count($samples) - 1
            )
        );
    }

    return $episodes;
}

function extractRemEpisodesFromLightRun(
    array $samples,
    array $candidateScores,
    array $sleepSecondsByIndex,
    int $runStart,
    int $runEnd
): array {
    $episodes = [];
    $index = $runStart;
    $nextAllowedStart = $runStart;

    while ($index <= $runEnd) {
        if (
            $index < $nextAllowedStart ||
            !isRemEpisodeAnchor($candidateScores, $sleepSecondsByIndex, $index, $runStart, $runEnd)
        ) {
            $index++;
            continue;
        }

        $episode = expandRemEpisodeFromPeak(
            $samples,
            $candidateScores,
            $sleepSecondsByIndex,
            $index,
            $runStart,
            $runEnd
        );

        if ($episode !== null) {
            $episodes[] = $episode;
            $nextAllowedStart = $episode['end_index'] + 8;
            $index = $episode['end_index'] + 1;
            continue;
        }

        $index++;
    }

    return $episodes;
}

function isRemEpisodeAnchor(
    array $candidateScores,
    array $sleepSecondsByIndex,
    int $index,
    int $runStart,
    int $runEnd
): bool {
    $score = (int)($candidateScores[$index] ?? 0);
    if ($score <= 0) {
        return false;
    }

    $openThreshold = (int)remOpenThreshold((int)($sleepSecondsByIndex[$index] ?? 0));
    if ($score < $openThreshold) {
        return false;
    }

    $previous = $index > $runStart ? (int)($candidateScores[$index - 1] ?? 0) : 0;
    $next = $index < $runEnd ? (int)($candidateScores[$index + 1] ?? 0) : 0;

    return $score >= $previous && $score >= $next;
}

function expandRemEpisodeFromPeak(
    array $samples,
    array $candidateScores,
    array $sleepSecondsByIndex,
    int $peakIndex,
    int $runStart,
    int $runEnd
): ?array {
    $startIndex = $peakIndex;
    $endIndex = $peakIndex;
    $sustainThreshold = remSustainThreshold((int)($sleepSecondsByIndex[$peakIndex] ?? 0));
    $peakScore = (int)($candidateScores[$peakIndex] ?? 0);
    $consecutiveWeak = 0;

    for ($i = $peakIndex - 1; $i >= $runStart; $i--) {
        $score = (int)($candidateScores[$i] ?? 0);
        if ($score >= $sustainThreshold || hasNearbyRemSupport($candidateScores, $i, $runStart, $runEnd)) {
            $startIndex = $i;
            $consecutiveWeak = 0;
            continue;
        }

        $consecutiveWeak++;
        if ($consecutiveWeak > 1) {
            break;
        }
        $startIndex = $i;
    }

    $consecutiveWeak = 0;
    $maxDurationSeconds = ((int)($sleepSecondsByIndex[$peakIndex] ?? 0) >= 4 * 3600)
        ? 60 * 60
        : 30 * 60;

    for ($i = $peakIndex + 1; $i <= $runEnd; $i++) {
        $score = (int)($candidateScores[$i] ?? 0);
        $currentDuration = sampleEndTimestamp($samples, $i) - strtotime($samples[$startIndex]['timestamp'] ?? '');
        if ($currentDuration > $maxDurationSeconds) {
            break;
        }

        if ($score >= $sustainThreshold || hasNearbyRemSupport($candidateScores, $i, $runStart, $runEnd)) {
            $endIndex = $i;
            $consecutiveWeak = 0;
            continue;
        }

        $consecutiveWeak++;
        if ($consecutiveWeak > 1) {
            break;
        }
        $endIndex = $i;
    }

    return finalizeRemEpisodeCluster(
        $samples,
        $candidateScores,
        $sleepSecondsByIndex,
        $startIndex,
        $endIndex,
        $peakScore
    );
}

function hasNearbyRemSupport(array $candidateScores, int $index, int $runStart, int $runEnd): bool
{
    $support = 0;

    for ($i = max($runStart, $index - 2); $i <= min($runEnd, $index + 2); $i++) {
        if ((int)($candidateScores[$i] ?? 0) >= 3) {
            $support++;
        }
    }

    return $support >= 3;
}

function finalizeRemEpisodeCluster(
    array $samples,
    array $candidateScores,
    array $sleepSecondsByIndex,
    int $startIndex,
    int $endIndex,
    int $peakScore
): ?array {
    $episodeStart = strtotime($samples[$startIndex]['timestamp'] ?? '');
    $episodeEnd = sampleEndTimestamp($samples, $endIndex);
    if ($episodeStart === false || $episodeEnd === false || $episodeEnd <= $episodeStart) {
        return null;
    }

    $episodeDuration = $episodeEnd - $episodeStart;
    $candidateSeconds = 0;
    $candidateScoreSum = 0;
    $candidateCount = 0;
    for ($i = $startIndex; $i <= $endIndex; $i++) {
        $score = (int)($candidateScores[$i] ?? 0);
        if ($score <= 0) {
            continue;
        }
        $candidateSeconds += getSampleDurationSeconds($samples, $i, null);
        $candidateScoreSum += $score;
        $candidateCount++;
    }

    if ($candidateCount === 0) {
        return null;
    }

    $candidateDensity = $episodeDuration > 0 ? ($candidateSeconds / $episodeDuration) : 0;
    $averageScore = $candidateScoreSum / $candidateCount;
    $sleepSecondsAtStart = (int)($sleepSecondsByIndex[$startIndex] ?? 0);
    $isLateNightEpisode = $sleepSecondsAtStart >= 5 * 3600;

    if ($episodeDuration > 65 * 60) {
        return null;
    }

    $isAccepted =
        ($episodeDuration >= 8 * 60 && $candidateDensity >= 0.55 && $averageScore >= 3.5 && $peakScore >= 4) ||
        ($episodeDuration >= 4 * 60 && $candidateDensity >= 0.7 && $averageScore >= 4.0 && $peakScore >= 5) ||
        ($episodeDuration >= 60 && $candidateDensity >= 0.85 && $averageScore >= 5.0 && $peakScore >= 6) ||
        ($isLateNightEpisode && $episodeDuration >= 60 && $candidateDensity >= 0.75 && $averageScore >= 4.5 && $peakScore >= 5);

    if (!$isAccepted) {
        return null;
    }

    return [
        'start_index' => $startIndex,
        'end_index' => $endIndex,
    ];
}

function remOpenThreshold(int $sleepSeconds): int
{
    return $sleepSeconds >= 5 * 3600 ? 5 : 6;
}

function remSustainThreshold(int $sleepSeconds): int
{
    return $sleepSeconds >= 5 * 3600 ? 3 : 4;
}

function sampleEndTimestamp(array $samples, int $index)
{
    $timestamp = strtotime($samples[$index]['timestamp'] ?? '');
    if ($timestamp === false) {
        return false;
    }

    return $timestamp + getSampleDurationSeconds($samples, $index, null);
}

function buildDisplaySleepSamples(array $samples, DateTimeImmutable $sleepWindowEnd): array
{
    if (!$samples) {
        return [];
    }

    $displaySamples = $samples;
    $runs = collectSampleRuns($displaySamples, $sleepWindowEnd);
    $firstSleepRunIndex = null;

    foreach ($runs as $runIndex => $run) {
        if (in_array((int)$run['status'], [0, 1, 7], true)) {
            $firstSleepRunIndex = $runIndex;
            break;
        }
    }

    if ($firstSleepRunIndex === null) {
        return $displaySamples;
    }

    foreach ($runs as $runIndex => $run) {
        $newStatus = (int)$run['status'];
        $durationSeconds = (int)$run['duration_seconds'];
        $previousStatus = isset($runs[$runIndex - 1])
            ? (int)$runs[$runIndex - 1]['status']
            : null;

        if ($newStatus === 0 && $durationSeconds < 270) {
            $newStatus = 1;
        }

        if ($newStatus === 3 && $previousStatus === 2 && $durationSeconds < 300) {
            // Keep display continuity when a leave-bed blip starts from an
            // already-awake state; this should remain visually awake/in-bed.
            $newStatus = 2;
        }

        if (
            $newStatus === 2 &&
            $runIndex > $firstSleepRunIndex &&
            $durationSeconds < 300
        ) {
            // Keep brief awakenings inside a sleep block visually continuous,
            // but never rewrite longer awake-in-bed periods as sleep.
            $newStatus = 1;
        }

        if ($newStatus !== (int)$run['status']) {
            applyStatusToSampleRange($displaySamples, (int)$run['start_index'], (int)$run['end_index'], $newStatus);
        }
    }

    $displaySamples = extendShortOutOfBedRuns($displaySamples, $sleepWindowEnd, 11 * 60);

    return $displaySamples;
}

function collectSampleRuns(array $samples, DateTimeImmutable $sleepWindowEnd): array
{
    if (!$samples) {
        return [];
    }

    $runs = [];
    $startIndex = 0;
    $currentStatus = (int)$samples[0]['status'];

    for ($i = 1, $count = count($samples); $i < $count; $i++) {
        $status = (int)$samples[$i]['status'];
        if ($status === $currentStatus) {
            continue;
        }

        $runs[] = buildSampleRun($samples, $startIndex, $i - 1, $currentStatus, $sleepWindowEnd);
        $startIndex = $i;
        $currentStatus = $status;
    }

    $runs[] = buildSampleRun($samples, $startIndex, count($samples) - 1, $currentStatus, $sleepWindowEnd);

    return $runs;
}

function buildSampleRun(array $samples, int $startIndex, int $endIndex, int $status, DateTimeImmutable $sleepWindowEnd): array
{
    $startTimestamp = $samples[$startIndex]['timestamp'];
    $endTimestamp = $samples[$endIndex]['timestamp'];
    $endSecond = strtotime($endTimestamp);
    if ($endSecond === false) {
        $endSecond = $sleepWindowEnd->getTimestamp();
    } else {
        $endSecond += getSampleDurationSeconds($samples, $endIndex, $sleepWindowEnd);
    }

    return [
        'start_index' => $startIndex,
        'end_index' => $endIndex,
        'status' => $status,
        'start_timestamp' => $startTimestamp,
        'end_timestamp' => date('Y-m-d H:i:s', min($endSecond, $sleepWindowEnd->getTimestamp())),
        'duration_seconds' => max(0, min($endSecond, $sleepWindowEnd->getTimestamp()) - strtotime($startTimestamp)),
    ];
}

function applyStatusToSampleRange(array &$samples, int $startIndex, int $endIndex, int $status): void
{
    for ($i = $startIndex; $i <= $endIndex; $i++) {
        $samples[$i]['status'] = $status;
    }
}

function extendShortOutOfBedRuns(array $samples, DateTimeImmutable $sleepWindowEnd, int $minimumDurationSeconds): array
{
    $runs = collectSampleRuns($samples, $sleepWindowEnd);

    foreach ($runs as $run) {
        if ((int)$run['status'] !== 3 || (int)$run['duration_seconds'] >= $minimumDurationSeconds) {
            continue;
        }

        $missingSeconds = $minimumDurationSeconds - (int)$run['duration_seconds'];
        $startIndex = (int)$run['start_index'];
        $secondsAdded = 0;

        for ($i = $startIndex - 1; $i >= 0; $i--) {
            if (!in_array((int)$samples[$i]['status'], [0, 1, 7], true)) {
                break;
            }

            $durationSeconds = getSampleDurationSeconds($samples, $i, $sleepWindowEnd);
            $samples[$i]['status'] = 3;
            $secondsAdded += $durationSeconds;

            if ($secondsAdded >= $missingSeconds) {
                break;
            }
        }
    }

    return $samples;
}

function localSeriesDelta(array $samples, int $index, string $field): int
{
    $current = (int)$samples[$index][$field];
    if ($current <= 0) {
        return 0;
    }

    for ($i = $index - 1; $i >= 0; $i--) {
        $previous = (int)$samples[$i][$field];
        if ($previous > 0) {
            return abs($current - $previous);
        }
    }

    return 0;
}

function buildReportSeries(array $samples, DateTimeImmutable $sleepWindowEnd): array
{
    $getBed = null;
    $sleepStart = null;
    $sleepEnd = null;
    $lastInBed = null;
    $finalLeaveTimestamp = null;
    $leaveBedTransitions = 0;
    $previousInBed = false;

    $statusDurations = [
        0 => 0,
        1 => 0,
        2 => 0,
        3 => 0,
        7 => 0,
    ];
    $inBedSeconds = 0;

    foreach ($samples as $idx => $sample) {
        $status = (int)$sample['status'];
        $durationSeconds = getSampleDurationSeconds($samples, $idx, $sleepWindowEnd);
        if (!isset($statusDurations[$status])) {
            $statusDurations[$status] = 0;
        }
        $statusDurations[$status] += $durationSeconds;

        if ($sample['in_bed'] && $getBed === null) {
            $getBed = $sample['timestamp'];
        }

        if ($sample['in_bed']) {
            $lastInBed = $sample['timestamp'];
            $inBedSeconds += $durationSeconds;
        }

        if (!$sample['in_bed'] && $previousInBed) {
            $leaveBedTransitions++;
            $finalLeaveTimestamp = $sample['timestamp'];
        }
        $previousInBed = $sample['in_bed'];

        if (in_array($status, [0, 1, 7], true) && $sleepStart === null) {
            $sleepStart = $sample['timestamp'];
        }

        if (in_array($status, [0, 1, 7], true)) {
            $sleepEnd = $sample['timestamp'];
        }
    }

    $statusDurationMinutes = [];
    foreach ($statusDurations as $status => $seconds) {
        $statusDurationMinutes[$status] = secondsToRoundedMinutes($seconds);
    }

    $onBedMinutes = secondsToRoundedMinutes($inBedSeconds);
    $sleepTotalSeconds = $statusDurations[0] + $statusDurations[1] + $statusDurations[7];
    $sleepTotalMinutes = secondsToRoundedMinutes($sleepTotalSeconds);
    $deepSleepRatio = $sleepTotalSeconds > 0 ? (int)round(($statusDurations[0] / $sleepTotalSeconds) * 100) : 0;

    $sleepEndIdx = null;
    if ($sleepEnd !== null) {
        $sleepEndIdx = formatIndexTime($sleepEnd);
        if (strtotime($sleepEnd) >= $sleepWindowEnd->modify('-1 minute')->getTimestamp()) {
            $sleepEndIdx = 'After 08:00';
        }
    }

    $leaveBedIdx = null;
    if ($finalLeaveTimestamp !== null) {
        $leaveBedIdx = formatIndexTime($finalLeaveTimestamp);
    } elseif ($lastInBed !== null) {
        $leaveBedIdx = formatIndexTime($lastInBed);
        if (strtotime($lastInBed) >= $sleepWindowEnd->modify('-1 minute')->getTimestamp()) {
            $leaveBedIdx = 'After 08:00';
        }
    }

    return [
        'get_bed_idx' => $getBed !== null ? formatIndexTime($getBed) : null,
        'get_bed_timestamp' => $getBed,
        'leave_bed_timestamp' => $finalLeaveTimestamp ?: $lastInBed,
        'final_leave_transition_timestamp' => $finalLeaveTimestamp,
        'last_in_bed_timestamp' => $lastInBed,
        'sleep_start_timestamp' => $sleepStart,
        'sleep_end_timestamp' => $sleepEnd,
        'sleep_start_idx' => $sleepStart !== null ? formatIndexTime($sleepStart) : null,
        'sleep_end_idx' => $sleepEndIdx,
        'leave_bed_idx' => $leaveBedIdx,
        'leave_bed_count' => max(0, $leaveBedTransitions),
        'on_bed_minutes' => $onBedMinutes,
        'sleep_total_minutes' => $sleepTotalMinutes,
        'deep_sleep_ratio' => $deepSleepRatio,
        'status_durations' => $statusDurationMinutes,
    ];
}

function buildSleepSegments(
    array $samples,
    DateTimeImmutable $sleepWindowEnd,
    ?string $startBoundary = null,
    ?string $endBoundary = null
): array
{
    if (!$samples) {
        return [];
    }

    $segments = [];
    $segmentStart = $samples[0]['timestamp'];
    $segmentStatus = (int)$samples[0]['status'];

    for ($i = 1, $count = count($samples); $i < $count; $i++) {
        $sample = $samples[$i];
        if ((int)$sample['status'] === $segmentStatus) {
            continue;
        }

        $segments[] = [
            'startTime' => $segmentStart,
            'endTime' => $sample['timestamp'],
            'status' => (string)$segmentStatus,
        ];

        $segmentStart = $sample['timestamp'];
        $segmentStatus = (int)$sample['status'];
    }

    $lastTimestamp = $samples[count($samples) - 1]['timestamp'];
    $segmentEnd = date('Y-m-d H:i:s', min(strtotime($lastTimestamp) + 60, $sleepWindowEnd->getTimestamp()));
    $segments[] = [
        'startTime' => $segmentStart,
        'endTime' => $segmentEnd,
        'status' => (string)$segmentStatus,
    ];

    return clipSleepSegments($segments, $startBoundary, $endBoundary);
}

function clipSleepSegments(array $segments, ?string $startBoundary, ?string $endBoundary): array
{
    $startTime = $startBoundary !== null ? strtotime($startBoundary) : false;
    $endTime = $endBoundary !== null ? strtotime($endBoundary) : false;

    if ($startTime === false && $endTime === false) {
        return $segments;
    }

    $clipped = [];
    foreach ($segments as $segment) {
        $segmentStart = strtotime((string)($segment['startTime'] ?? ''));
        $segmentEnd = strtotime((string)($segment['endTime'] ?? ''));

        if ($segmentStart === false || $segmentEnd === false) {
            continue;
        }

        $nextStart = $startTime !== false ? max($segmentStart, $startTime) : $segmentStart;
        $nextEnd = $endTime !== false ? min($segmentEnd, $endTime) : $segmentEnd;

        if ($nextEnd <= $nextStart) {
            continue;
        }

        $segment['startTime'] = date('Y-m-d H:i:s', $nextStart);
        $segment['endTime'] = date('Y-m-d H:i:s', $nextEnd);
        $clipped[] = $segment;
    }

    return $clipped;
}

function buildSleepIndexCommonList(array $samples, array $series): array
{
    $durations = $series['status_durations'];
    $sleepTotal = max(1, (int)$series['sleep_total_minutes']);
    $latencyMinutes = 0;
    $awakeMinutes = $durations[2];

    if ($series['get_bed_timestamp'] !== null && $series['sleep_start_idx'] !== null) {
        $sleepStartTimestamp = null;
        foreach ($samples as $sample) {
            if (in_array((int)$sample['status'], [0, 1, 7], true)) {
                $sleepStartTimestamp = $sample['timestamp'];
                break;
            }
        }

        if ($sleepStartTimestamp !== null) {
            $latencyMinutes = max(0, (int)round((strtotime($sleepStartTimestamp) - strtotime($series['get_bed_timestamp'])) / 60));
            $awakeMinutes = max(0, $awakeMinutes - $latencyMinutes);
        }
    }

    return [
        buildSleepIndexRow('\u6df1\u7761\u65f6\u957f', $durations[0], 0, $sleepTotal),
        buildSleepIndexRow('\u6d45\u7761\u65f6\u957f', $durations[1], 1, $sleepTotal),
        buildSleepIndexRow('\u591c\u9192\u65f6\u957f', $awakeMinutes, 2, $sleepTotal),
        buildSleepIndexRow('\u591c\u91cc\u79bb\u5e8a\u65f6\u957f', $durations[3], 3, $sleepTotal),
        buildSleepIndexRow('\u5165\u7761\u65f6\u957f', $latencyMinutes, 5, 0),
        buildSleepIndexRow('\u773c\u52a8\u65f6\u957f', $durations[7], 7, $sleepTotal),
    ];
}

function buildSleepIndexRow(string $unicodeName, int $minutes, int $status, int $ratioBase): array
{
    return [
        'name' => decodeUnicodeLabel($unicodeName),
        'value' => formatDurationMinutes($minutes),
        'status' => (string)$status,
        'ratio' => $ratioBase > 0 ? (int)round(($minutes / $ratioBase) * 100) : 0,
        'comment' => null,
    ];
}

function decodeUnicodeLabel(string $value): string
{
    $decoded = json_decode('"' . $value . '"', true);
    return is_string($decoded) ? $decoded : $value;
}

function buildVitalsPayload(array $samples): array
{
    $breathingValues = [];
    $heartValues = [];
    $timestamps = [];

    foreach ($samples as $sample) {
        $timestamps[] = date('H:i:s', strtotime($sample['timestamp']));
        $breathingValues[] = (string)sanitizeBreathingValue((int)$sample['breathing']);
        $heartValues[] = (string)sanitizeHeartRateValue((int)$sample['heart_rate']);
    }

    $validBreathingValues = filterValidBreathingValues($breathingValues);
    $validHeartValues = filterValidHeartValues($heartValues);
    $breathAverage = calculateSeriesAverage($validBreathingValues);
    $heartAverage = calculateSeriesAverage($validHeartValues);

    return [
        'timestamps' => $timestamps,
        'breath' => [
            'min' => calculateSeriesMin($validBreathingValues),
            'avg' => $breathAverage,
            'max' => calculateSeriesMax($validBreathingValues),
            'avgLabel' => classifyBreathAverage($breathAverage),
            'dataList' => $breathingValues,
        ],
        'heart' => [
            'min' => calculateSeriesMin($validHeartValues),
            'avg' => $heartAverage,
            'max' => calculateSeriesMax($validHeartValues),
            'avgLabel' => classifyHeartAverage($heartAverage),
            'dataList' => $heartValues,
        ],
    ];
}

function calculateSeriesMin(array $values)
{
    $numeric = filterValidSeriesValues($values);
    return $numeric ? min($numeric) : null;
}

function calculateSeriesAverage(array $values)
{
    $numeric = filterValidSeriesValues($values);
    if (!$numeric) {
        return null;
    }

    return (int)round(array_sum($numeric) / count($numeric));
}

function calculateSeriesMax(array $values)
{
    $numeric = filterValidSeriesValues($values);
    return $numeric ? max($numeric) : null;
}

function filterValidSeriesValues(array $values): array
{
    $numeric = [];
    foreach ($values as $value) {
        $number = (int)$value;
        if ($number > 0) {
            $numeric[] = $number;
        }
    }

    return $numeric;
}

function sanitizeBreathingValue(int $value): int
{
    return ($value >= 4 && $value <= 40) ? $value : -1;
}

function sanitizeHeartRateValue(int $value): int
{
    return ($value >= 30 && $value <= 110) ? $value : -1;
}

function filterValidBreathingValues(array $values): array
{
    $numeric = [];
    foreach ($values as $value) {
        $number = (int)$value;
        if ($number >= 4 && $number <= 40) {
            $numeric[] = $number;
        }
    }

    return $numeric;
}

function filterValidHeartValues(array $values): array
{
    $numeric = [];
    foreach ($values as $value) {
        $number = (int)$value;
        if ($number >= 30 && $number <= 220) {
            $numeric[] = $number;
        }
    }

    return $numeric;
}

function classifyBreathAverage($value): ?string
{
    if ($value === null) {
        return null;
    }
    if ($value < 8) {
        return 'Low';
    }
    if ($value > 24) {
        return 'High';
    }

    return 'Normal';
}

function classifyHeartAverage($value): ?string
{
    if ($value === null) {
        return null;
    }
    if ($value < 50) {
        return 'Low';
    }
    if ($value > 90) {
        return 'High';
    }

    return 'Normal';
}

function calculateAhi(array $samples, array $detectionRows, int $sleepTotalMinutes): float
{
    if ($sleepTotalMinutes <= 0) {
        return 0.0;
    }

    $events = countRespiratoryEpisodesFromSamples($samples);
    if ($events <= 0) {
        $events = count(buildMergedDetectionAlarmEvents($detectionRows, 'apnea', 13, 1200));
    }

    return $events / ($sleepTotalMinutes / 60);
}

function countRespiratoryEpisodesFromSamples(array $samples): int
{
    $episodes = 0;
    $currentEvent = null;
    $previousTimestamp = null;

    foreach ($samples as $sample) {
        $timestamp = strtotime($sample['timestamp']);
        if ($timestamp === false) {
            continue;
        }

        $isSleepSample = in_array((int)$sample['status'], [0, 1, 7], true);
        $breathingStatus = (string)($sample['breathing_status'] ?? 'Normal');
        $isRespiratoryEvent = $isSleepSample && in_array($breathingStatus, ['Apnea', 'Hypopnea'], true);

        if (!$isRespiratoryEvent) {
            if ($currentEvent !== null) {
                $episodes++;
                $currentEvent = null;
            }
            $previousTimestamp = $timestamp;
            continue;
        }

        if (
            $currentEvent === null
            || $currentEvent['type'] !== $breathingStatus
            || $previousTimestamp === null
            || ($timestamp - $previousTimestamp) > 90
        ) {
            if ($currentEvent !== null) {
                $episodes++;
            }
            $currentEvent = [
                'type' => $breathingStatus,
                'start' => $timestamp,
            ];
        }

        $previousTimestamp = $timestamp;
    }

    if ($currentEvent !== null) {
        $episodes++;
    }

    return $episodes;
}

function buildAlarmEvents(array $samples, array $detectionRows): array
{
    $events = [];
    $events = array_merge(
        $events,
        buildMergedDetectionAlarmEvents($detectionRows, 'breathing_high', 11, 600),
        buildMergedDetectionAlarmEvents($detectionRows, 'breathing_low', 12, 3600),
        buildMergedDetectionAlarmEvents($detectionRows, 'apnea', 13, 1200)
    );

    foreach ($detectionRows as $row) {
        if (($row['tipo'] ?? '') === 'fall_confirmed') {
            $events[] = buildAlarmEventRow($row['criado_em'], 31);
        }
    }

    usort($events, function ($left, $right) {
        return strcmp($left['ts'], $right['ts']);
    });

    return $events;
}

function buildAlarmEventRow(string $timestamp, int $eventType): array
{
    return [
        'ts' => $timestamp,
        'eventType' => $eventType,
        'order' => 'desc',
    ];
}

function buildMergedDetectionAlarmEvents(array $detectionRows, string $type, int $eventType, int $minimumGapSeconds): array
{
    $events = [];
    $lastTimestamp = null;

    foreach ($detectionRows as $row) {
        if (($row['tipo'] ?? '') !== $type) {
            continue;
        }

        $timestamp = strtotime((string)($row['criado_em'] ?? ''));
        if ($timestamp === false) {
            continue;
        }

        if ($lastTimestamp === null || ($timestamp - $lastTimestamp) >= $minimumGapSeconds) {
            $events[] = buildAlarmEventRow(date('Y-m-d H:i:s', $timestamp), $eventType);
            $lastTimestamp = $timestamp;
        }
    }

    return $events;
}

function buildUserActivity(array $minuteStatsRows, array $detectionRows, DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $walkingDistanceCm = 0;
    $walkingSeconds = 0;
    $staticSeconds = 0;
    $walkingActiveRows = 0;
    $strideLengthCm = 67.4;

    foreach ($minuteStatsRows as $row) {
        $distance = max(0, (int)$row['distancia_caminhada']);
        $walkTime = max(0, (int)$row['tempo_caminhada']);
        $meditationTime = max(0, (int)$row['tempo_meditacao']);
        $standingTime = max(0, (int)$row['tempo_em_pe']);

        $walkingDistanceCm += $distance;
        $walkingSeconds += $walkTime;
        $staticSeconds += $standingTime + $meditationTime;

        if ($distance > 0 || $walkTime > 0) {
            $walkingActiveRows++;
        }
    }

    $transitionCount = 0;
    foreach ($detectionRows as $row) {
        if (in_array($row['tipo'], ['room_entry', 'room_exit'], true)) {
            $transitionCount++;
        }
    }

    $observedWindowSeconds = calculateObservedMinuteStatsWindowSeconds($minuteStatsRows);
    $inRoomSeconds = calculateInRoomDurationSeconds($detectionRows, $start, $end);
    if ($observedWindowSeconds > 0 && ($inRoomSeconds <= 0 || $inRoomSeconds > $observedWindowSeconds)) {
        $inRoomSeconds = $observedWindowSeconds;
    }
    if ($inRoomSeconds <= 0) {
        $inRoomSeconds = max(0, $walkingSeconds + $staticSeconds);
    }

    $otherSeconds = max(0, $inRoomSeconds - $walkingSeconds - $staticSeconds);
    $stepNumber = $walkingDistanceCm > 0 ? (int)round($walkingDistanceCm / $strideLengthCm) : 0;
    $speed = $walkingActiveRows > 0 ? $stepNumber / $walkingActiveRows : 0;
    $inRoomMinutes = secondsToRoundedMinutes($inRoomSeconds);

    return [
        'entryRoomCount' => $transitionCount,
        'stepNumber' => $stepNumber,
        'inRoomDuration' => formatClockDurationSeconds($inRoomSeconds),
        'speed' => number_format($speed, 2, '.', ''),
        'walkDuration' => formatClockDurationSeconds($walkingSeconds),
        'walkDurationRatio' => (string)calculateRatio(secondsToRoundedMinutes($walkingSeconds), max(1, $inRoomMinutes)),
        'staticDuration' => formatClockDurationSeconds($staticSeconds),
        'staticDurationRatio' => (string)calculateRatio(secondsToRoundedMinutes($staticSeconds), max(1, $inRoomMinutes)),
        'otherDuration' => formatClockDurationSeconds($otherSeconds),
        'otherDurationRatio' => (string)calculateRatio(secondsToRoundedMinutes($otherSeconds), max(1, $inRoomMinutes)),
    ];
}

function calculateRatio(int $value, int $base): int
{
    if ($base <= 0) {
        return 0;
    }

    return (int)round(($value / $base) * 100);
}

function calculateMotionCount(array $positionRows, array $samples): int
{
    $changes = 0;
    $previousSignature = null;
    $lastChangeTimestamp = null;

    $snapshots = buildPositionSnapshots($positionRows);
    foreach ($snapshots as $snapshot) {
        if ($previousSignature !== null && $previousSignature !== $snapshot['signature']) {
            $timestamp = strtotime($snapshot['timestamp']);
            if ($lastChangeTimestamp === null || ($timestamp - $lastChangeTimestamp) >= 300) {
                $changes++;
                $lastChangeTimestamp = $timestamp;
            }
        }

        $previousSignature = $snapshot['signature'];
    }

    if ($changes === 0) {
        $previousStatus = null;
        foreach ($samples as $sample) {
            if ($previousStatus !== null && $previousStatus !== $sample['status']) {
                $changes++;
            }
            $previousStatus = $sample['status'];
        }
    }

    return $changes;
}

function countDetectionsByType(array $rows, string $type, DateTimeImmutable $start, DateTimeImmutable $end): int
{
    $count = 0;
    foreach ($rows as $row) {
        if (($row['tipo'] ?? '') !== $type) {
            continue;
        }

        $timestamp = strtotime($row['criado_em']);
        if ($timestamp >= $start->getTimestamp() && $timestamp <= $end->getTimestamp()) {
            $count++;
        }
    }

    return $count;
}

function calculateSleepEfficiency(int $sleepTotalMinutes, int $onBedMinutes): int
{
    if ($onBedMinutes <= 0) {
        return 0;
    }

    return (int)round(($sleepTotalMinutes / $onBedMinutes) * 100);
}

function calculateSleepQuality(int $sleepEfficiency, int $deepSleepRatio, int $leaveBedCount): int
{
    return max(0, min(100, $deepSleepRatio));
}

function calculateOverallScore(int $sleepEfficiency, float $ahi, int $sleepTotalMinutes, int $deepSleepRatio, int $leaveBedCount): int
{
    $sleepDurationScore = 0;
    if ($sleepTotalMinutes >= 450 && $sleepTotalMinutes <= 540) {
        $sleepDurationScore = 100;
    } elseif ($sleepTotalMinutes >= 390) {
        $sleepDurationScore = 80;
    } elseif ($sleepTotalMinutes >= 300) {
        $sleepDurationScore = 60;
    } elseif ($sleepTotalMinutes > 0) {
        $sleepDurationScore = 40;
    }

    $ahiScore = 100;
    if ($ahi >= 30) {
        $ahiScore = 20;
    } elseif ($ahi >= 15) {
        $ahiScore = 40;
    } elseif ($ahi >= 5) {
        $ahiScore = 70;
    }

    $leaveBedScore = max(0, 100 - ($leaveBedCount * 15));

    $score = ($sleepEfficiency * 0.35)
        + ($ahiScore * 0.25)
        + ($sleepDurationScore * 0.20)
        + ($deepSleepRatio * 0.10)
        + ($leaveBedScore * 0.10);

    return (int)floor(max(0, min(100, $score)));
}

function getScoreLabel(int $score): string
{
    if ($score >= 95) {
        return 'Excellent';
    }
    if ($score >= 85) {
        return 'Very good';
    }
    if ($score >= 75) {
        return 'Good';
    }
    if ($score >= 65) {
        return 'Average';
    }
    if ($score >= 50) {
        return 'Below average';
    }

    return 'Poor';
}

function buildEvaluation(array $series, float $ahi, int $sleepEfficiency, int $leaveBedCount, ?int $averageBreathingRate = null): array
{
    global $i18n;

    $deepRatioEvaluation = $series['deep_sleep_ratio'] >= 15 ? 'Compliance' : 'No compliance';
    $leaveBedEvaluation = $leaveBedCount <= 1 ? 'Compliance' : 'No compliance';
    $startTimeEvaluation = compareSleepStartTime($series['sleep_start_idx']);
    $durationEvaluation = $series['sleep_total_minutes'] >= 420 ? 'Compliance' : 'No compliance';
    $ahiEvaluation = $ahi < 5 ? 'Compliance' : 'No compliance';

    $ahiLabel = 'Normal';
    if ($ahi >= 30) {
        $ahiLabel = 'Severe';
    } elseif ($ahi >= 15) {
        $ahiLabel = 'Moderate';
    } elseif ($ahi >= 5) {
        $ahiLabel = 'Mild';
    }

    return [
        'sleepDeepRatioEvaluation' => $deepRatioEvaluation,
        'sleepLeaveBedEvaluation' => $leaveBedEvaluation,
        'sleepStartTimeEvaluation' => $startTimeEvaluation,
        'sleepDurationEvaluation' => $durationEvaluation,
        'unqualifiedEvaluation' => $sleepEfficiency >= 85 ? '' : $i18n['relatorio_sono_diario_nota_eficiencia'],
        'ahiUnqualifiedEvaluation' => $ahiEvaluation,
        'ahiAnalysisEvaluation' => '',
        'sleepAHIEvaluation' => buildBreathingAnalysisSuggestions($ahi, $ahiLabel, $averageBreathingRate),
        'sleepAnalysisEvaluation' => buildSleepAnalysisSuggestions($series, $sleepEfficiency, $leaveBedCount),
    ];
}

function compareSleepStartTime($sleepStartIdx): string
{
    if (!$sleepStartIdx || strpos((string)$sleepStartIdx, 'After ') === 0) {
        return 'No compliance';
    }

    return strcmp((string)$sleepStartIdx, '01:00:00') <= 0 ? 'Compliance' : 'No compliance';
}

function buildSleepAnalysisSuggestions(array $series, int $sleepEfficiency, int $leaveBedCount): array
{
    global $i18n;

    $sleepDurationMinutes = (int)($series['sleep_total_minutes'] ?? 0);
    $deepSleepRatio = (int)($series['deep_sleep_ratio'] ?? 0);
    $suggestions = [];
    $durationValue = strtr($i18n['relatorio_sono_diario_duracao_valor'], [
        '{duration}' => formatDurationMinutesPtPt($sleepDurationMinutes),
    ]);

    if ($sleepDurationMinutes < 420) {
        $suggestions[] = implode(' ', array_filter([
            $durationValue,
            $i18n['relatorio_sono_duracao_abaixo_7h'],
            $i18n['relatorio_sono_duracao_antecipar_deitar'],
        ]));
    } elseif ($sleepDurationMinutes <= 540) {
        $suggestions[] = implode(' ', array_filter([
            $durationValue,
            $i18n['relatorio_sono_duracao_recomendada_adulto'],
        ]));
    } else {
        $suggestions[] = implode(' ', array_filter([
            $durationValue,
            $i18n['relatorio_sono_duracao_acompanhar_qualidade'],
        ]));
    }

    $deepSleepValue = strtr($i18n['relatorio_sono_diario_sono_profundo_valor'], [
        '{deepRatio}' => $deepSleepRatio,
    ]);
    if ($deepSleepRatio < 15) {
        $suggestions[] = implode(' ', array_filter([
            $deepSleepValue,
            $i18n['relatorio_sono_sono_profundo_recuperacao_baixa'],
            $i18n['relatorio_sono_sono_profundo_reduzir_estimulos'],
        ]));
    } else {
        $suggestions[] = implode(' ', array_filter([
            $deepSleepValue,
            $i18n['relatorio_sono_diario_sono_profundo_reparador'],
        ]));
    }

    if ($leaveBedCount >= 3) {
        $suggestions[] = implode(' ', array_filter([
            strtr($i18n['relatorio_sono_diario_saidas_cama_varias'], ['{count}' => $leaveBedCount]),
            $i18n['relatorio_sono_saidas_cama_reduzir_interrupcoes'],
        ]));
    } elseif ($leaveBedCount > 0) {
        $bedExitKey = $leaveBedCount === 1
            ? 'relatorio_sono_diario_saidas_cama_uma'
            : 'relatorio_sono_diario_saidas_cama_varias';
        $suggestions[] = implode(' ', array_filter([
            strtr($i18n[$bedExitKey], ['{count}' => $leaveBedCount]),
            $i18n['relatorio_sono_saidas_cama_sono_continuo'],
        ]));
    } else {
        $suggestions[] = implode(' ', array_filter([
            $i18n['relatorio_sono_diario_saidas_cama_nenhuma'],
            $i18n['relatorio_sono_saidas_cama_nenhuma_bom'],
        ]));
    }

    $efficiencyValue = strtr($i18n['relatorio_sono_diario_eficiencia_valor'], [
        '{efficiency}' => $sleepEfficiency,
    ]);
    if ($sleepEfficiency < 85) {
        $suggestions[] = implode(' ', array_filter([
            $efficiencyValue,
            $i18n['relatorio_sono_eficiencia_melhorar_rotina'],
        ]));
    } else {
        $suggestions[] = implode(' ', array_filter([
            $efficiencyValue,
            $i18n['relatorio_sono_eficiencia_bom_aproveitamento'],
        ]));
    }

    return $suggestions;
}

function buildBreathingAnalysisSuggestions(float $ahi, string $ahiLabel, ?int $averageBreathingRate = null): array
{
    global $i18n;

    $classificationKey = [
        'Normal' => 'normal',
        'Mild' => 'Ligeiro',
        'Moderate' => 'Moderado',
        'Severe' => 'grave_normal',
    ][$ahiLabel] ?? 'normal';
    $suggestions = [
        implode(' ', array_filter([
            strtr($i18n['relatorio_sono_diario_ahi_estimado'], [
                '{ahi}' => formatDecimalPtPt($ahi, 1),
            ]),
            trim($i18n['classificacao']) . ': ' . trim($i18n[$classificationKey]) . '.',
        ])),
    ];

    if ($ahi >= 15) {
        $suggestions[] = implode(' ', array_filter([
            $i18n['relatorio_sono_ahi_eventos_relevantes'],
            $i18n['relatorio_sono_ahi_validar_clinicamente'],
        ]));
    } elseif ($ahi >= 5) {
        $suggestions[] = implode(' ', array_filter([
            $i18n['relatorio_sono_ahi_alteracao_ligeira'],
            $i18n['relatorio_sono_ahi_vigiar_sintomas'],
        ]));
    } else {
        $suggestions[] = $i18n['relatorio_sono_diario_ahi_sem_padrao'];
    }

    if ($averageBreathingRate !== null) {
        $breathingRateValue = strtr($i18n['relatorio_sono_diario_frequencia_respiratoria_valor'], [
            '{rate}' => $averageBreathingRate,
        ]);
        if ($averageBreathingRate < 8) {
            $suggestions[] = implode(' ', array_filter([
                $breathingRateValue,
                $i18n['relatorio_sono_frequencia_respiratoria_abaixo'],
                $i18n['relatorio_sono_frequencia_respiratoria_repeticao'],
            ]));
        } elseif ($averageBreathingRate > 24) {
            $suggestions[] = implode(' ', array_filter([
                $breathingRateValue,
                $i18n['relatorio_sono_frequencia_respiratoria_acima'],
                $i18n['relatorio_sono_frequencia_respiratoria_observar_contexto'],
            ]));
        } else {
            $suggestions[] = implode(' ', array_filter([
                $breathingRateValue,
                $i18n['relatorio_sono_frequencia_respiratoria_normal'],
            ]));
        }
    }

    if ($ahi >= 5) {
        $suggestions[] = $i18n['relatorio_sono_respiracao_resultados_recorrentes'];
    }

    return $suggestions;
}

function formatDecimalPtPt(float $value, int $decimals = 1): string
{
    return number_format($value, $decimals, ',', '');
}

function formatDurationMinutesPtPt(int $minutes): string
{
    if ($minutes <= 0) {
        return '0 min';
    }

    $hours = intdiv($minutes, 60);
    $remainingMinutes = $minutes % 60;

    if ($hours > 0 && $remainingMinutes > 0) {
        return $hours . ' h ' . $remainingMinutes . ' min';
    }

    if ($hours > 0) {
        return $hours . ' h';
    }

    return $remainingMinutes . ' min';
}

function formatDurationMinutes(int $minutes): string
{
    if ($minutes <= 0) {
        return '0 Min';
    }

    $hours = intdiv($minutes, 60);
    $remainingMinutes = $minutes % 60;

    if ($hours > 0) {
        return $hours . ' H ' . $remainingMinutes . ' Min';
    }

    return $remainingMinutes . ' Min';
}

function formatClockDurationMinutes(int $minutes): string
{
    $hours = intdiv(max(0, $minutes), 60);
    $mins = max(0, $minutes) % 60;

    return str_pad((string)$hours, 2, '0', STR_PAD_LEFT) . ':' . str_pad((string)$mins, 2, '0', STR_PAD_LEFT) . ':00';
}

function formatClockDurationSeconds(int $seconds): string
{
    $seconds = max(0, $seconds);
    $hours = intdiv($seconds, 3600);
    $minutes = intdiv($seconds % 3600, 60);
    $remainingSeconds = $seconds % 60;

    return str_pad((string)$hours, 2, '0', STR_PAD_LEFT)
        . ':' . str_pad((string)$minutes, 2, '0', STR_PAD_LEFT)
        . ':' . str_pad((string)$remainingSeconds, 2, '0', STR_PAD_LEFT);
}

function secondsToRoundedMinutes(int $seconds): int
{
    if ($seconds <= 0) {
        return 0;
    }

    return (int)round($seconds / 60);
}

function getSampleDurationSeconds(array $samples, int $index, ?DateTimeImmutable $sleepWindowEnd): int
{
    $currentTimestamp = strtotime($samples[$index]['timestamp']);
    if ($currentTimestamp === false) {
        return 0;
    }

    if (isset($samples[$index + 1]['timestamp'])) {
        $nextTimestamp = strtotime($samples[$index + 1]['timestamp']);
        if ($nextTimestamp !== false && $nextTimestamp > $currentTimestamp) {
            return min(300, max(1, $nextTimestamp - $currentTimestamp));
        }
    }

    if ($sleepWindowEnd !== null) {
        return min(300, max(1, $sleepWindowEnd->getTimestamp() - $currentTimestamp));
    }

    return 1;
}

function buildPositionSnapshots(array $positionRows): array
{
    if (!$positionRows) {
        return [];
    }

    $grouped = [];
    foreach ($positionRows as $row) {
        $grouped[$row['timestamp']][] = $row;
    }

    $snapshots = [];
    foreach ($grouped as $timestamp => $rows) {
        usort($rows, function ($left, $right) {
            return ((int)($left['indice_pessoa'] ?? 0)) <=> ((int)($right['indice_pessoa'] ?? 0));
        });

        $parts = [];
        foreach ($rows as $row) {
            $parts[] = implode('|', [
                $row['indice_pessoa'] ?? '',
                $row['estado_postura'] ?? '',
            ]);
        }

        $snapshots[] = [
            'timestamp' => $timestamp,
            'signature' => implode('||', $parts),
        ];
    }

    return $snapshots;
}

function getMostCommonValue(array $values, string $default): string
{
    if (!$values) {
        return $default;
    }

    $counts = [];
    foreach ($values as $value) {
        $key = $value !== '' ? $value : $default;
        if (!isset($counts[$key])) {
            $counts[$key] = 0;
        }
        $counts[$key]++;
    }

    arsort($counts);

    return (string)array_key_first($counts);
}

function calculateInRoomDurationSeconds(array $detectionRows, DateTimeImmutable $start, DateTimeImmutable $end): int
{
    if (!$detectionRows) {
        return 0;
    }

    $inRoom = false;
    $roomStart = null;
    $hasRoomEvents = false;
    $durationSeconds = 0;

    foreach ($detectionRows as $row) {
        $type = (string)($row['tipo'] ?? '');
        $timestamp = isset($row['criado_em']) ? strtotime($row['criado_em']) : false;
        if ($timestamp === false) {
            continue;
        }

        if ($type === 'room_entry') {
            $hasRoomEvents = true;
            if (!$inRoom) {
                $roomStart = $timestamp;
                $inRoom = true;
            }
            continue;
        }

        if ($type === 'room_exit') {
            $hasRoomEvents = true;
            if (!$inRoom) {
                $durationSeconds += max(0, $timestamp - $start->getTimestamp());
                continue;
            }

            $durationSeconds += max(0, $timestamp - (int)$roomStart);
            $roomStart = null;
            $inRoom = false;
        }
    }

    if ($inRoom && $roomStart !== null) {
        $durationSeconds += max(0, $end->getTimestamp() - $roomStart);
    }

    if ($durationSeconds > 0 || $hasRoomEvents) {
        return $durationSeconds;
    }

    $firstTimestamp = strtotime($detectionRows[0]['criado_em'] ?? '') ?: null;
    $lastTimestamp = strtotime($detectionRows[count($detectionRows) - 1]['criado_em'] ?? '') ?: null;
    if ($firstTimestamp === null || $lastTimestamp === null || $lastTimestamp <= $firstTimestamp) {
        return 0;
    }

    return max(0, $lastTimestamp - $firstTimestamp);
}

function calculateObservedMinuteStatsWindowSeconds(array $minuteStatsRows): int
{
    if (!$minuteStatsRows) {
        return 0;
    }

    $countBasedSeconds = count($minuteStatsRows) * 60;
    $firstTimestamp = strtotime($minuteStatsRows[0]['timestamp'] ?? '');
    $lastTimestamp = strtotime($minuteStatsRows[count($minuteStatsRows) - 1]['timestamp'] ?? '');

    if ($firstTimestamp === false || $lastTimestamp === false || $lastTimestamp < $firstTimestamp) {
        return $countBasedSeconds;
    }

    $spanSeconds = ($lastTimestamp - $firstTimestamp) + 60;

    return min($countBasedSeconds, max(60, $spanSeconds));
}

function formatIndexTime(string $timestamp): string
{
    return date('H:i:s', strtotime($timestamp));
}

function calculateReportedLatencyMinutes(array $series): int
{
    $getBedTimestamp = $series['get_bed_timestamp'] ?? null;
    $sleepStartTimestamp = $series['sleep_start_timestamp'] ?? null;
    if (!$getBedTimestamp || !$sleepStartTimestamp) {
        return 0;
    }

    $rawMinutes = max(0, (int)round((strtotime($sleepStartTimestamp) - strtotime($getBedTimestamp)) / 60));

    return min($rawMinutes, 10);
}
