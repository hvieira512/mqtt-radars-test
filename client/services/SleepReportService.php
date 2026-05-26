<?php

require_once __DIR__ . '/DailySleepReportBuilder.php';
require_once __DIR__ . '/../repositories/DeviceRepository.php';
require_once __DIR__ . '/../repositories/SleepReportRepository.php';

class SleepReportService
{
    private $db;
    private $deviceRepository;
    private $sleepReportRepository;
    private $dailyReportBuilder;

    public function __construct($db)
    {
        $this->db = $db;
        $this->deviceRepository = new DeviceRepository($db);
        $this->sleepReportRepository = new SleepReportRepository($db);
        $this->dailyReportBuilder = new DailySleepReportBuilder($db);
    }

    public function generateDaily(string $uid, string $date, bool $debug): array
    {
        $deviceId = $this->resolveDeviceId($uid);
        $normalizedDate = $this->normalizeDate($date);

        $payload = $this->dailyReportBuilder->build(
            $deviceId,
            $uid,
            $normalizedDate,
            $debug
        );

        $utilizadorId = $this->deviceRepository->findActivePatientIdByDeviceId($deviceId);
        if ($utilizadorId !== null) {
            $this->sleepReportRepository->insertOrUpdateReport($utilizadorId, $deviceId, $normalizedDate, $payload);
        }

        return $payload;
    }

    public function getStoredDaily(string $uid, string $date): array
    {
        $deviceId = $this->resolveDeviceId($uid);
        $normalizedDate = $this->normalizeDate($date);

        $row = $this->sleepReportRepository->findByDeviceAndDate($deviceId, $normalizedDate);

        if (!$row || trim((string)($row['payload_bruto'] ?? '')) === '') {
            return [
                'found' => false,
                'source' => 'db',
            ];
        }

        return [
            'found' => true,
            'source' => 'db',
            'data' => $this->decodeStoredPayload($row, 'Stored sleep report payload is not valid JSON'),
        ];
    }

    public function getDailyCalendar(string $uid, string $date): array
    {
        $deviceId = $this->resolveDeviceId($uid);
        $normalizedDate = $this->normalizeDate($date);

        $monthDate = new DateTimeImmutable($normalizedDate);
        $monthStart = $monthDate->modify('first day of this month')->format('Y-m-d');
        $monthEnd = $monthDate->modify('last day of this month')->format('Y-m-d');

        return $this->sleepReportRepository->listDatesByDeviceAndRange($deviceId, $monthStart, $monthEnd);
    }

    public function getStoredMonthly(string $uid, string $month): array
    {
        $deviceId = $this->resolveDeviceId($uid);

        $normalizedMonth = $this->normalizeMonth($month);
        $row = $this->sleepReportRepository->findMonthlyByDeviceAndMonth($deviceId, $normalizedMonth);

        if (!$row || trim((string)($row['payload_bruto'] ?? '')) === '') {
            return [
                'found' => false,
                'source' => 'db',
            ];
        }

        return [
            'found' => true,
            'source' => 'db',
            'data' => $this->decodeStoredPayload($row, 'Stored monthly report payload is not valid JSON'),
            'completo' => (bool)$row['completo'],
        ];
    }

    public function syncMonthlyReport(int $deviceId, ?string $month = null): void
    {
        if ($month === null) {
            $month = (new DateTimeImmutable('now'))->format('Y-m');
        }

        $monthDate = $this->parseMonth($month);
        if (!$monthDate) {
            return;
        }
        $month = $monthDate->format('Y-m');

        $monthStart = $monthDate->modify('first day of this month');
        $monthEnd = $monthDate->modify('last day of this month');
        $today = new DateTimeImmutable('today');

        if ($monthEnd < $today) {
            $effectiveEnd = $monthEnd;
            $isComplete = true;
        } elseif ($monthStart > $today) {
            return;
        } else {
            $effectiveEnd = $today;
            $isComplete = false;
        }

        $storedRows = $this->sleepReportRepository->listPayloadsByDeviceAndRange(
            $deviceId,
            $monthStart->format('Y-m-d'),
            $effectiveEnd->format('Y-m-d')
        );

        if (!$storedRows) {
            return;
        }

        $monthlyData = $this->buildMonthlyRowsFromStoredPayloads(
            $deviceId,
            $storedRows
        );

        if (!$monthlyData['rows']) {
            return;
        }

        $expectedDates = $this->buildMonthlyDateCategories($monthStart, $effectiveEnd);
        $report = [
            'report' => [
                'type' => 'monthly',
                'month' => $month,
                'monthStart' => $monthStart->format('Y-m-d'),
                'monthEnd' => $monthEnd->format('Y-m-d'),
                'effectiveEnd' => $effectiveEnd->format('Y-m-d'),
                'isComplete' => $isComplete,
                'generatedAt' => formatDateTimeAsLocalIso(new DateTimeImmutable('now')),
                'source' => 'stored_daily_payloads',
                'dates' => array_column($monthlyData['rows'], 'date'),
                'expectedDates' => $expectedDates,
                'availableDates' => array_column($monthlyData['rows'], 'date'),
                'missingDates' => [],
                'invalidDates' => $monthlyData['invalidDates'],
                'enrichedDates' => $monthlyData['enrichedDates'],
                'expectedDays' => count($expectedDates),
                'availableDays' => count($monthlyData['rows']),
            ],
            'device' => [
                'uid' => '',
                'id' => $deviceId,
                'name' => '',
            ],
            'sections' => $this->buildMonthlySections($monthlyData['rows'], $expectedDates),
        ];

        $utilizadorId = $this->deviceRepository->findActivePatientIdByDeviceId($deviceId);
        if ($utilizadorId !== null) {
            $latestDate = max(array_column($monthlyData['rows'], 'date'));
            $this->sleepReportRepository->insertOrUpdateMonthlyReport(
                $utilizadorId,
                $deviceId,
                $month,
                $latestDate,
                $report,
                $isComplete
            );
        }
    }

    private function normalizeMonth(string $month): string
    {
        $monthDate = $this->parseMonth($month);

        return $monthDate
            ? $monthDate->format('Y-m')
            : (new DateTimeImmutable('first day of this month'))->format('Y-m');
    }

    public function generateMonthly(string $uid, string $month, string $fallbackDate): array
    {
        $deviceId = $this->resolveDeviceId($uid);

        $range = $this->resolveMonthlyReportRange($month, $fallbackDate);
        $monthStr = $range['monthStart']->format('Y-m');

        $storedMonthly = $this->sleepReportRepository->findMonthlyByDeviceAndMonth($deviceId, $monthStr);
        if ($storedMonthly && trim((string)($storedMonthly['payload_bruto'] ?? '')) !== '') {
            $payload = json_decode((string)$storedMonthly['payload_bruto'], true);
            if (is_array($payload)) {
                $payload['report']['source'] = 'db';
                $payload['report']['generatedAt'] = formatDateTimeAsLocalIso(new DateTimeImmutable('now'));
                return $payload;
            }
        }

        $dataEnd = $range['effectiveEnd'] ?: $range['monthEnd'];
        $expectedDates = $dataEnd
            ? $this->buildMonthlyDateCategories($range['monthStart'], $dataEnd)
            : [];
        $storedRows = $dataEnd
            ? $this->sleepReportRepository->listPayloadsByDeviceAndRange(
                $deviceId,
                $range['monthStart']->format('Y-m-d'),
                $dataEnd->format('Y-m-d')
            )
            : [];
        $monthlyData = $this->buildMonthlyRowsFromStoredPayloads(
            $deviceId,
            $storedRows
        );
        $availableDates = array_column($monthlyData['rows'], 'date');
        $missingDates = array_values(array_diff($expectedDates, $availableDates, $monthlyData['invalidDates']));

        $report = [
            'report' => [
                'type' => 'monthly',
                'month' => $range['month'],
                'monthStart' => $range['monthStart']->format('Y-m-d'),
                'monthEnd' => $range['monthEnd']->format('Y-m-d'),
                'effectiveEnd' => $range['effectiveEnd'] ? $range['effectiveEnd']->format('Y-m-d') : null,
                'isComplete' => $range['isComplete'],
                'generatedAt' => formatDateTimeAsLocalIso(new DateTimeImmutable('now')),
                'source' => 'stored_daily_payloads',
                'dates' => $availableDates,
                'expectedDates' => $expectedDates,
                'availableDates' => $availableDates,
                'missingDates' => $missingDates,
                'invalidDates' => $monthlyData['invalidDates'],
                'enrichedDates' => $monthlyData['enrichedDates'],
                'expectedDays' => count($expectedDates),
                'availableDays' => count($availableDates),
            ],
            'device' => [
                'uid' => $uid,
                'id' => $deviceId,
                'name' => '',
            ],
            'sections' => $this->buildMonthlySections($monthlyData['rows'], $expectedDates),
        ];

        $utilizadorId = $this->deviceRepository->findActivePatientIdByDeviceId($deviceId);
        if ($utilizadorId !== null && $availableDates) {
            $latestDate = max($availableDates);
            $this->sleepReportRepository->insertOrUpdateMonthlyReport(
                $utilizadorId,
                $deviceId,
                $monthStr,
                $latestDate,
                $report,
                (bool)$range['isComplete']
            );
        }

        return $report;
    }

    private function resolveDeviceId(string $uid): int
    {
        $uid = trim($uid);
        if ($uid === '') {
            throw new InvalidArgumentException('Missing uid');
        }

        $deviceId = $this->deviceRepository->findIdByUid($uid);
        if ($deviceId === null) {
            throw new OutOfBoundsException('Device not found');
        }

        return $deviceId;
    }

    private function normalizeDate(string $date): string
    {
        $normalizedDate = $this->dailyReportBuilder->normalizeDate(trim($date));
        if ($normalizedDate === null) {
            throw new InvalidArgumentException('Invalid date. Expected YYYY-MM-DD');
        }

        return $normalizedDate;
    }

    private function decodeStoredPayload(array $row, string $errorMessage): array
    {
        $payload = json_decode((string)$row['payload_bruto'], true);
        if (!is_array($payload)) {
            throw new RuntimeException($errorMessage);
        }

        return $payload;
    }

    private function resolveMonthlyReportRange(string $month, string $fallbackDate): array
    {
        $reportMonth = $this->parseMonth($month);

        if (!$reportMonth) {
            $candidate = DateTimeImmutable::createFromFormat('!Y-m-d', trim($fallbackDate));
            if ($this->dateWasParsedCleanly($candidate)) {
                $reportMonth = $candidate->modify('first day of this month');
            }
        }

        if (!$reportMonth) {
            $reportMonth = new DateTimeImmutable('first day of this month');
        }

        $monthStart = $reportMonth->modify('first day of this month');
        $monthEnd = $reportMonth->modify('last day of this month');
        $today = new DateTimeImmutable('today');

        if ($monthEnd < $today) {
            $effectiveEnd = $monthEnd;
            $isComplete = true;
        } elseif ($monthStart > $today) {
            $effectiveEnd = null;
            $isComplete = false;
        } else {
            $effectiveEnd = $today;
            $isComplete = false;
        }

        return [
            'month' => $monthStart->format('Y-m'),
            'monthStart' => $monthStart,
            'monthEnd' => $monthEnd,
            'effectiveEnd' => $effectiveEnd,
            'isComplete' => $isComplete,
        ];
    }

    private function parseMonth(string $month): ?DateTimeImmutable
    {
        $month = trim($month);
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            return null;
        }

        $candidate = DateTimeImmutable::createFromFormat('!Y-m-d', $month . '-01');

        return $this->dateWasParsedCleanly($candidate)
            ? $candidate->modify('first day of this month')
            : null;
    }

    private function dateWasParsedCleanly($date): bool
    {
        $errors = DateTimeImmutable::getLastErrors();

        return $date instanceof DateTimeImmutable
            && (!$errors || ((int)$errors['warning_count'] === 0 && (int)$errors['error_count'] === 0));
    }

    private function buildMonthlyDateCategories(DateTimeImmutable $start, DateTimeImmutable $end): array
    {
        $dates = [];
        $cursor = $start;

        while ($cursor <= $end) {
            $dates[] = $cursor->format('Y-m-d');
            $cursor = $cursor->modify('+1 day');
        }

        return $dates;
    }

    private function buildMonthlyRowsFromStoredPayloads(int $deviceId, array $storedRows): array
    {
        $rows = [];
        $invalidDates = [];
        $enrichedDates = [];

        foreach ($storedRows as $storedRow) {
            $date = (string)($storedRow['data_relatorio'] ?? '');
            $payload = json_decode((string)($storedRow['payload_bruto'] ?? ''), true);
            if ($date === '' || !is_array($payload)) {
                if ($date !== '') {
                    $invalidDates[] = $date;
                }
                continue;
            }

            $row = $this->normalizeMonthlyDailyPayload($date, $payload);
            $enriched = $this->enrichMonthlyDailyRow($deviceId, $row);
            if (!empty($enriched['enriched'])) {
                $enrichedDates[] = $date;
            }
            unset($enriched['enriched']);
            $rows[] = $enriched;
        }

        usort($rows, function ($a, $b) {
            return strcmp((string)$a['date'], (string)$b['date']);
        });

        return [
            'rows' => $rows,
            'invalidDates' => array_values(array_unique($invalidDates)),
            'enrichedDates' => array_values(array_unique($enrichedDates)),
        ];
    }

    private function normalizeMonthlyDailyPayload(string $date, array $payload): array
    {
        $summary = is_array($payload['summary'] ?? null) ? $payload['summary'] : [];
        $session = is_array($payload['session'] ?? null) ? $payload['session'] : [];
        $stages = is_array($payload['stages'] ?? null) ? $payload['stages'] : [];
        $charts = is_array($payload['charts'] ?? null) ? $payload['charts'] : [];
        $activity = is_array($payload['activity'] ?? null) ? $payload['activity'] : [];

        $sleepDurationMinutes = $this->monthlyNumber($summary['sleepDurationMinutes'] ?? null);
        $sleepDurationHours = $sleepDurationMinutes !== null ? round($sleepDurationMinutes / 60, 1) : null;
        $breathSamples = $this->filterMonthlySamples($charts['breathingRate']['values'] ?? [], 4, 40);
        $heartSamples = $this->filterMonthlySamples($charts['heartRate']['values'] ?? [], 30, 220);

        $bedExitDurationMinutes = 0.0;
        $bedExitPoints = [];
        foreach ($this->monthlyArray($session['intervals'] ?? []) as $interval) {
            if (($interval['category'] ?? null) !== 'out_of_bed') {
                continue;
            }
            $duration = $this->minutesBetweenIso($interval['start'] ?? null, $interval['end'] ?? null);
            if ($duration !== null) {
                $bedExitDurationMinutes += $duration;
            }
            $point = $this->buildMonthlyTimePoint($date, $interval['start'] ?? null, 'Bed exit');
            if ($point) {
                $bedExitPoints[] = $point;
            }
        }

        $routinePoints = [];
        $routineMap = [
            'Go to bed' => $session['bedTime']['start'] ?? null,
            'Fall asleep' => $session['sleep']['start'] ?? null,
            'Wake up' => $session['sleep']['end'] ?? null,
            'Get up' => $session['bedTime']['end'] ?? null,
        ];
        foreach ($routineMap as $group => $timestamp) {
            $point = $this->buildMonthlyTimePoint($date, $timestamp, $group);
            if ($point) {
                $routinePoints[] = $point;
            }
        }

        return [
            'date' => $date,
            'sleepDurationHours' => $sleepDurationHours,
            'sleepEfficiencyPercent' => $this->monthlyNumber($summary['sleepEfficiencyPercent'] ?? null),
            'deepSleepPercent' => $this->monthlyNumber($stages['totals']['deep']['percent'] ?? null),
            'ahi' => $this->monthlyNumber($summary['ahi'] ?? null),
            'breathRateSamples' => $breathSamples,
            'heartRateSamples' => $heartSamples,
            'heartRateAnomalyCount' => $heartSamples ? $this->countMonthlyHeartAnomalyRuns($heartSamples) : null,
            'bodyMovementIndex' => $this->monthlyNumber($summary['motionCount'] ?? null),
            'bedExitCount' => $this->monthlyNumber($summary['leaveBedCount'] ?? null),
            'bedExitDurationMinutes' => $bedExitDurationMinutes > 0 ? round($bedExitDurationMinutes, 1) : 0,
            'bedExitTimesPoints' => $bedExitPoints,
            'sleepLatencyMinutes' => $this->monthlyNumber($session['sleep']['latencyMinutes'] ?? null),
            'routinePoints' => $routinePoints,
            'roomInOut' => $this->monthlyNumber($activity['roomEntries'] ?? null),
            'indoorStillMinutes' => $this->secondsToMinutes($activity['durations']['staticSeconds'] ?? null),
            'indoorWalkingMinutes' => $this->secondsToMinutes($activity['durations']['walkingSeconds'] ?? null),
            'indoorOtherMinutes' => $this->secondsToMinutes($activity['durations']['otherSeconds'] ?? null),
            'walkingSteps' => $this->monthlyNumber($activity['steps'] ?? null),
            'walkingSpeed' => $this->monthlyNumber($activity['speedMetersPerMinute'] ?? null),
            'enriched' => false,
        ];
    }

    private function enrichMonthlyDailyRow(int $deviceId, array $row): array
    {
        $windows = $this->buildMonthlyDailyWindows((string)$row['date']);

        // Monthly reports are built primarily from stored daily payloads. These
        // fallbacks keep older or partially generated payloads useful without
        // forcing an expensive full daily-report rebuild for every date.
        if (!$row['breathRateSamples'] || !$row['heartRateSamples']) {
            $vitalsRows = fetchVitalsRows($this->db, $deviceId, $windows['sleepStart'], $windows['sleepEnd']);
            $breathSamples = [];
            $heartSamples = [];
            foreach ($vitalsRows as $vitalsRow) {
                $breathSamples[] = $vitalsRow['taxa_respiracao'] ?? null;
                $heartSamples[] = $vitalsRow['ritmo_cardiaco'] ?? null;
            }
            if (!$row['breathRateSamples']) {
                $row['breathRateSamples'] = $this->filterMonthlySamples($breathSamples, 4, 40);
            }
            if (!$row['heartRateSamples']) {
                $row['heartRateSamples'] = $this->filterMonthlySamples($heartSamples, 30, 220);
                $row['heartRateAnomalyCount'] = $row['heartRateSamples']
                    ? $this->countMonthlyHeartAnomalyRuns($row['heartRateSamples'])
                    : null;
            }
            if ($vitalsRows) {
                $row['enriched'] = true;
            }
        }

        if ($row['bodyMovementIndex'] === null) {
            $positionRows = fetchPositionRows($this->db, $deviceId, $windows['sleepStart'], $windows['sleepEnd']);
            if ($positionRows) {
                $row['bodyMovementIndex'] = calculateMotionCount($positionRows, []);
                $row['enriched'] = true;
            }
        }

        $needsRawActivity = (
            $row['roomInOut'] === null ||
            $row['walkingSteps'] === null ||
            $row['walkingSpeed'] === null ||
            $row['indoorStillMinutes'] === null ||
            $row['indoorWalkingMinutes'] === null ||
            $row['indoorOtherMinutes'] === null
        );
        if ($needsRawActivity) {
            $minuteStatsRows = fetchMinuteStatsRows($this->db, $deviceId, $windows['dayStart'], $windows['dayEnd']);
            $detectionRows = fetchDetectionRows($this->db, $deviceId, $windows['dayStart'], $windows['sleepEnd']);
            $dayDetectionRows = filterRowsByTimestamp($detectionRows, 'criado_em', $windows['dayStart'], $windows['dayEnd']);
            if ($minuteStatsRows || $dayDetectionRows) {
                $activity = buildActivityPayloadV1(
                    buildUserActivity($minuteStatsRows, $dayDetectionRows, $windows['dayStart'], $windows['dayEnd']),
                    $windows['dayStart'],
                    $windows['dayEnd']
                );
                if ($row['roomInOut'] === null) {
                    $row['roomInOut'] = $this->monthlyNumber($activity['roomEntries'] ?? null);
                }
                $row['walkingSteps'] = $row['walkingSteps'] ?? $this->monthlyNumber($activity['steps'] ?? null);
                $row['walkingSpeed'] = $row['walkingSpeed'] ?? $this->monthlyNumber($activity['speedMetersPerMinute'] ?? null);
                $row['indoorStillMinutes'] = $row['indoorStillMinutes'] ?? $this->secondsToMinutes($activity['durations']['staticSeconds'] ?? null);
                $row['indoorWalkingMinutes'] = $row['indoorWalkingMinutes'] ?? $this->secondsToMinutes($activity['durations']['walkingSeconds'] ?? null);
                $row['indoorOtherMinutes'] = $row['indoorOtherMinutes'] ?? $this->secondsToMinutes($activity['durations']['otherSeconds'] ?? null);
                $row['enriched'] = true;
            }
        }

        return $row;
    }

    private function buildMonthlySections(array $rows, array $expectedDates): array
    {
        $messages = $this->buildMonthlyMessages($rows);

        return [
            'sleepCondition' => $this->monthlySection('sleepCondition', [
                'sleepDurationStatistics' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'sleepDurationHours', $expectedDates)),
                'sleepDurationDistribution' => $this->monthlyDistributionFromValues($this->monthlyValues($rows, 'sleepDurationHours'), $this->buildHourBins(0, 10)),
                'sleepEfficiencyStatistics' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'sleepEfficiencyPercent', $expectedDates)),
                'sleepEfficiencyDistribution' => $this->monthlyDistributionFromValues($this->monthlyValues($rows, 'sleepEfficiencyPercent'), $this->buildPercentBins(10)),
                'deepSleepPercentageStatistics' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'deepSleepPercent', $expectedDates)),
                'deepSleepPercentageDistribution' => $this->monthlyDistributionFromValues($this->monthlyValues($rows, 'deepSleepPercent'), $this->buildPercentBins(10)),
            ], $messages['charts'], $messages['sections']['sleepCondition']),
            'breathingRateCondition' => $this->monthlySection('breathingRateCondition', [
                'ahiStatistics' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'ahi', $expectedDates)),
                'ahiDistribution' => $this->monthlyDistributionFromValues($this->monthlyValues($rows, 'ahi'), ['0-5', '5-10', '10-15', '15-20', '20-25', '25-30']),
                'breathRateDistribution' => $this->monthlyDistributionFromValues($this->monthlyFlattenSamples($rows, 'breathRateSamples'), $this->buildNumberBins(6, 36, 2, ' bpm')),
            ], $messages['charts'], $messages['sections']['breathingRateCondition']),
            'heartRateCondition' => $this->monthlySection('heartRateCondition', [
                'heartRateAnomalyStatistics' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'heartRateAnomalyCount', $expectedDates)),
                'heartRateDistribution' => $this->monthlyDistributionFromValues($this->monthlyFlattenSamples($rows, 'heartRateSamples'), $this->buildNumberBins(45, 120, 5, ' bpm')),
            ], $messages['charts'], $messages['sections']['heartRateCondition']),
            'bodyMovementCondition' => $this->monthlySection('bodyMovementCondition', [
                'bodyMovementIndexStatistics' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'bodyMovementIndex', $expectedDates)),
                'bodyMovementIndexDistribution' => $this->monthlyDistributionFromValues($this->monthlyValues($rows, 'bodyMovementIndex'), $this->buildNumberBins(0, 100, 5, '')),
            ], $messages['charts'], $messages['sections']['bodyMovementCondition']),
            'gettingOutOfBedAtNight' => $this->monthlySection('gettingOutOfBedAtNight', [
                'bedExitCountStatistics' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'bedExitCount', $expectedDates)),
                'bedExitFrequencyDistribution' => $this->monthlyCategoryDistributionFromValues($this->monthlyValues($rows, 'bedExitCount'), ['0', '1', '2', '3', '4', '5+']),
                'bedExitDurationStatistics' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'bedExitDurationMinutes', $expectedDates)),
                'bedExitTimesDistribution' => $this->monthlyPointsChart($this->monthlyCollectPoints($rows, 'bedExitTimesPoints')),
            ], $messages['charts'], $messages['sections']['gettingOutOfBedAtNight']),
            'dailyRoutine' => $this->monthlySection('dailyRoutine', [
                'sleepLatencyStatistics' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'sleepLatencyMinutes', $expectedDates)),
                'sleepLatencyDistribution' => $this->monthlyDistributionFromValues($this->monthlyValues($rows, 'sleepLatencyMinutes'), $this->buildNumberBins(0, 180, 10, ' min')),
                'dailyRoutineTimesDistribution' => $this->monthlyPointsChart($this->monthlyCollectPoints($rows, 'routinePoints')),
            ], $messages['charts'], $messages['sections']['dailyRoutine']),
            'activityStatus' => $this->monthlySection('activityStatus', [
                'roomInOutStatistics' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'roomInOut', $expectedDates)),
                'indoorDuration' => $this->monthlyStackedValuesChart([
                    ['name' => 'Still time', 'data' => $this->monthlyColumnValues($rows, 'indoorStillMinutes', $expectedDates)],
                    ['name' => 'Walking time', 'data' => $this->monthlyColumnValues($rows, 'indoorWalkingMinutes', $expectedDates)],
                    ['name' => 'Other', 'data' => $this->monthlyColumnValues($rows, 'indoorOtherMinutes', $expectedDates)],
                ]),
                'walkingSteps' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'walkingSteps', $expectedDates)),
                'walkingSpeed' => $this->monthlyDailyValuesChart($this->monthlyColumnValues($rows, 'walkingSpeed', $expectedDates)),
            ], $messages['charts'], $messages['sections']['activityStatus']),
        ];
    }

    private function buildMonthlyDailyWindows(string $date): array
    {
        $reportDay = new DateTimeImmutable($date);
        $sleepStart = $reportDay->modify('-1 day')->setTime(20, 0, 0);
        $sleepEnd = $reportDay->setTime(8, 0, 0);
        $dayStart = $reportDay->modify('-1 day')->setTime(8, 0, 0);
        $dayEnd = $reportDay->modify('-1 day')->setTime(20, 0, 0);

        return [
            'sleepStart' => $sleepStart,
            'sleepEnd' => $sleepEnd,
            'dayStart' => $dayStart,
            'dayEnd' => $dayEnd,
        ];
    }

    private function monthlyArray($value): array
    {
        return is_array($value) ? $value : [];
    }

    private function monthlyNumber($value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_int($value) && !is_float($value) && !is_numeric($value)) {
            return null;
        }

        $number = (float)$value;
        return is_finite($number) ? $number : null;
    }

    private function secondsToMinutes($value): ?float
    {
        $seconds = $this->monthlyNumber($value);
        return $seconds === null ? null : round($seconds / 60, 1);
    }

    private function filterMonthlySamples($values, int $min, int $max): array
    {
        $samples = [];
        foreach ($this->monthlyArray($values) as $value) {
            $number = $this->monthlyNumber($value);
            if ($number !== null && $number >= $min && $number <= $max) {
                $samples[] = $number;
            }
        }

        return $samples;
    }

    private function countMonthlyHeartAnomalyRuns(array $samples): int
    {
        $runs = 0;
        $inRun = false;

        foreach ($samples as $sample) {
            $isAnomaly = $sample < 50 || $sample > 90;
            if ($isAnomaly && !$inRun) {
                $runs++;
                $inRun = true;
                continue;
            }
            if (!$isAnomaly) {
                $inRun = false;
            }
        }

        return $runs;
    }

    private function minutesBetweenIso($start, $end): ?float
    {
        if (!$start || !$end) {
            return null;
        }

        try {
            $startTime = new DateTimeImmutable((string)$start);
            $endTime = new DateTimeImmutable((string)$end);
        } catch (Throwable $e) {
            return null;
        }

        $seconds = $endTime->getTimestamp() - $startTime->getTimestamp();
        return $seconds > 0 ? round($seconds / 60, 1) : null;
    }

    private function buildMonthlyTimePoint(string $date, $timestamp, string $group): ?array
    {
        $x = $this->sleepWindowTimeToAxisValue($timestamp);
        if ($x === null) {
            return null;
        }

        return [
            'category' => $date,
            'x' => $x,
            'value' => 1,
            'timeLabel' => $this->formatSleepWindowTime($x),
            'group' => $group,
        ];
    }

    private function sleepWindowTimeToAxisValue($timestamp): ?float
    {
        if (!$timestamp) {
            return null;
        }

        try {
            $dateTime = new DateTimeImmutable((string)$timestamp);
        } catch (Throwable $e) {
            return null;
        }

        $hour = (int)$dateTime->format('G');
        $minute = (int)$dateTime->format('i');
        $value = $hour + ($minute / 60);
        if ($hour < 12) {
            $value += 24;
        }

        return ($value >= 20 && $value <= 32) ? round($value, 2) : null;
    }

    private function monthlyColumnValues(array $rows, string $key, array $dates = []): array
    {
        if (!$dates) {
            return array_map(function ($row) use ($key) {
                return $this->monthlyNumber($row[$key] ?? null);
            }, $rows);
        }

        $rowsByDate = [];
        foreach ($rows as $row) {
            $date = (string)($row['date'] ?? '');
            if ($date !== '') {
                $rowsByDate[$date] = $row;
            }
        }

        return array_map(function ($date) use ($rowsByDate, $key) {
            return isset($rowsByDate[$date])
                ? $this->monthlyNumber($rowsByDate[$date][$key] ?? null)
                : null;
        }, $dates);
    }

    private function monthlyValues(array $rows, string $key): array
    {
        $values = [];
        foreach ($rows as $row) {
            $number = $this->monthlyNumber($row[$key] ?? null);
            if ($number !== null) {
                $values[] = $number;
            }
        }

        return $values;
    }

    private function monthlyFlattenSamples(array $rows, string $key): array
    {
        $values = [];
        foreach ($rows as $row) {
            foreach ($this->monthlyArray($row[$key] ?? []) as $value) {
                $number = $this->monthlyNumber($value);
                if ($number !== null) {
                    $values[] = $number;
                }
            }
        }

        return $values;
    }

    private function monthlyCollectPoints(array $rows, string $key): array
    {
        $points = [];
        foreach ($rows as $row) {
            foreach ($this->monthlyArray($row[$key] ?? []) as $point) {
                $points[] = $point;
            }
        }

        return $points;
    }

    private function monthlyDailyValuesChart(array $values): array
    {
        return [
            'datesRef' => 'report.expectedDates',
            'values' => array_values($values),
        ];
    }

    private function monthlyStackedValuesChart(array $series): array
    {
        return [
            'datesRef' => 'report.expectedDates',
            'series' => array_values($series),
        ];
    }

    private function monthlyPointsChart(array $points): array
    {
        return [
            'datesRef' => 'report.expectedDates',
            'points' => array_values($points),
        ];
    }

    private function monthlyDistributionFromValues(array $values, array $labels): array
    {
        if (!$values) {
            return ['data' => []];
        }

        $counts = array_fill_keys($labels, 0);
        foreach ($values as $value) {
            $label = $this->findMonthlyIntervalLabel((float)$value, $labels);
            if ($label !== null) {
                $counts[$label]++;
            }
        }

        return $this->monthlyDistributionRowsFromCounts($counts, count($values));
    }

    private function monthlyCategoryDistributionFromValues(array $values, array $labels): array
    {
        if (!$values) {
            return ['data' => []];
        }

        $counts = array_fill_keys($labels, 0);
        foreach ($values as $value) {
            $label = (string)(int)$value;
            if (!isset($counts[$label])) {
                $label = ((int)$value >= 5 && isset($counts['5+'])) ? '5+' : null;
            }
            if ($label !== null) {
                $counts[$label]++;
            }
        }

        return $this->monthlyDistributionRowsFromCounts($counts, count($values));
    }

    private function monthlyDistributionRowsFromCounts(array $counts, int $total): array
    {
        $data = [];
        foreach ($counts as $label => $count) {
            $data[] = [
                'category' => (string)$label,
                'value' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
            ];
        }

        return ['data' => $data];
    }

    private function findMonthlyIntervalLabel(float $value, array $labels): ?string
    {
        $first = null;
        $last = null;

        foreach ($labels as $label) {
            $interval = $this->parseMonthlyIntervalLabel((string)$label);
            if (!$interval) {
                continue;
            }
            $first = $first ?? ['label' => (string)$label, 'start' => $interval['start']];
            $last = ['label' => (string)$label, 'end' => $interval['end']];
            if ($value >= $interval['start'] && $value < $interval['end']) {
                return (string)$label;
            }
        }

        if ($first && $value < $first['start']) {
            return $first['label'];
        }
        if ($last && $value >= $last['end']) {
            return $last['label'];
        }

        return null;
    }

    private function parseMonthlyIntervalLabel(string $label): ?array
    {
        $normalized = trim(str_replace(['–', '—'], '-', $label));
        if (!preg_match('/^(-?\d+(?:\.\d+)?)\s*[^-\d]*-\s*(-?\d+(?:\.\d+)?)/', $normalized, $matches)) {
            return null;
        }

        return [
            'start' => (float)$matches[1],
            'end' => (float)$matches[2],
        ];
    }

    private function buildMonthlyMessages(array $rows): array
    {
        global $i18n;

        $charts = [
            'sleepDurationStatistics' => $this->messageSleepDuration($rows),
            'sleepDurationDistribution' => $this->messageSleepDuration($rows),
            'sleepEfficiencyStatistics' => $this->messageSleepEfficiency($rows),
            'sleepEfficiencyDistribution' => $this->messageSleepEfficiency($rows),
            'deepSleepPercentageStatistics' => $this->messageDeepSleep($rows),
            'deepSleepPercentageDistribution' => $this->messageDeepSleep($rows),
            'ahiStatistics' => $this->messageAhi($rows),
            'ahiDistribution' => $this->messageAhi($rows),
            'breathRateDistribution' => $this->messageBreathRate($rows),
            'heartRateAnomalyStatistics' => $this->messageHeartAnomaly($rows),
            'heartRateDistribution' => $this->messageHeartRate($rows),
            'bodyMovementIndexStatistics' => $this->messageBodyMovement($rows),
            'bodyMovementIndexDistribution' => $this->messageBodyMovement($rows),
            'bedExitCountStatistics' => $this->messageBedExits($rows),
            'bedExitFrequencyDistribution' => $this->messageBedExits($rows),
            'bedExitDurationStatistics' => $this->messageBedExitDuration($rows),
            'bedExitTimesDistribution' => $this->messageBedExitTimes($rows),
            'sleepLatencyStatistics' => $this->messageSleepLatency($rows),
            'sleepLatencyDistribution' => $this->messageSleepLatency($rows),
            'dailyRoutineTimesDistribution' => $this->messageDailyRoutine($rows),
            'roomInOutStatistics' => $this->messageRoomInOut($rows),
            'indoorDuration' => $this->messageIndoorDuration($rows),
            'walkingSteps' => $this->messageWalkingSteps($rows),
            'walkingSpeed' => $this->messageWalkingSpeed($rows),
        ];

        return [
            'charts' => $charts,
            'sections' => [
                'sleepCondition' => $this->sectionMessage($i18n['sono'], [$charts['sleepDurationStatistics'], $charts['sleepEfficiencyStatistics'], $charts['deepSleepPercentageStatistics']]),
                'breathingRateCondition' => $this->sectionMessage($i18n['respiracao'], [$charts['ahiStatistics'], $charts['breathRateDistribution']]),
                'heartRateCondition' => $this->sectionMessage($i18n['frequencia_cardiaca'], [$charts['heartRateAnomalyStatistics'], $charts['heartRateDistribution']]),
                'bodyMovementCondition' => $this->sectionMessage($i18n['movimento_corporal'], [$charts['bodyMovementIndexStatistics']]),
                'gettingOutOfBedAtNight' => $this->sectionMessage($i18n['saidas_da_cama'], [$charts['bedExitCountStatistics'], $charts['bedExitDurationStatistics'], $charts['bedExitTimesDistribution']]),
                'dailyRoutine' => $this->sectionMessage($i18n['rotina_diaria'], [$charts['sleepLatencyStatistics'], $charts['dailyRoutineTimesDistribution']]),
                'activityStatus' => $this->sectionMessage($i18n['atividade_diurna'], [$charts['roomInOutStatistics'], $charts['indoorDuration'], $charts['walkingSteps'], $charts['walkingSpeed']]),
            ],
        ];
    }

    private function sectionMessage(string $title, array $messages): array
    {
        global $i18n;

        foreach ($messages as $message) {
            if (($message['impact'] ?? 'neutral') === 'negative') {
                return $this->monthlyMessage($this->formatSectionMessage($title, (string)$message['text']), 'negative');
            }
        }
        foreach ($messages as $message) {
            if (($message['impact'] ?? 'neutral') === 'neutral') {
                return $this->monthlyMessage($this->formatSectionMessage($title, (string)$message['text']), 'neutral');
            }
        }

        return $this->monthlyMessage($this->formatSectionMessage($title, $i18n['relatorio_sono_mensal_indicadores_intervalo_esperado']), 'positive');
    }

    private function formatSectionMessage(string $title, string $message): string
    {
        $title = trim($title);
        $message = trim($message);

        if ($title === '') {
            return $message;
        }

        if ($message === '') {
            return $title;
        }

        return $title . ': ' . $message;
    }

    private function messageSleepDuration(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'sleepDurationHours');
        if (!$values) return $this->monthlyNoDataMessage();
        $avg = $this->monthlyAverage($values);
        $shortPercent = $this->monthlyPercentWhere($values, fn($value) => $value < 7);
        $durationValue = strtr($i18n['relatorio_sono_mensal_duracao_media_valor'], [
            '{avg}' => $this->formatDecimal($avg, 1),
        ]);
        if ($avg < 7 || $shortPercent >= 50) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $durationValue,
                strtr($i18n['relatorio_sono_mensal_duracao_noites_abaixo_7h'], [
                    '{shortPercent}' => $this->formatDecimal($shortPercent, 0),
                ]),
            ])), 'negative');
        }
        if ($this->monthlyRange($values) > 2) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $durationValue,
                $i18n['relatorio_sono_mensal_duracao_variacao'],
            ])), 'neutral');
        }
        return $this->monthlyMessage(implode(' ', array_filter([
            $durationValue,
            $i18n['relatorio_sono_mensal_duracao_favoravel'],
        ])), 'positive');
    }

    private function messageSleepEfficiency(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'sleepEfficiencyPercent');
        if (!$values) return $this->monthlyNoDataMessage();
        $avg = $this->monthlyAverage($values);
        $efficiencyValue = strtr($i18n['relatorio_sono_mensal_eficiencia_valor'], [
            '{avg}' => $this->formatDecimal($avg, 0),
        ]);
        if ($avg >= 85) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $efficiencyValue,
                $i18n['relatorio_sono_eficiencia_bom_aproveitamento'],
            ])), 'positive');
        }
        if ($avg < 75) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $efficiencyValue,
                $i18n['relatorio_sono_resultado_abaixo_desejavel'],
            ])), 'negative');
        }
        return $this->monthlyMessage(implode(' ', array_filter([
            $efficiencyValue,
            $i18n['relatorio_sono_eficiencia_estabilizar_rotina'],
        ])), 'neutral');
    }

    private function messageDeepSleep(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'deepSleepPercent');
        if (!$values) return $this->monthlyNoDataMessage();
        $avg = $this->monthlyAverage($values);
        $deepSleepValue = strtr($i18n['relatorio_sono_mensal_sono_profundo_valor'], [
            '{avg}' => $this->formatDecimal($avg, 0),
        ]);
        if ($avg < 15) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $deepSleepValue,
                $i18n['relatorio_sono_sono_profundo_recuperacao_baixa'],
            ])), 'negative');
        }
        return $this->monthlyMessage(implode(' ', array_filter([
            $deepSleepValue,
            $i18n['relatorio_sono_mensal_sono_profundo_reparador'],
        ])), 'positive');
    }

    private function messageAhi(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'ahi');
        if (!$values) return $this->monthlyNoDataMessage();
        $avg = $this->monthlyAverage($values);
        $ahiValue = strtr($i18n['relatorio_sono_mensal_ahi_valor'], [
            '{avg}' => $this->formatDecimal($avg, 1),
        ]);
        if ($avg >= 15) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $ahiValue,
                $i18n['relatorio_sono_mensal_ahi_eventos_relevantes'],
            ])), 'negative');
        }
        if ($avg >= 5) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $ahiValue,
                $i18n['relatorio_sono_mensal_ahi_algumas_noites'],
            ])), 'neutral');
        }
        return $this->monthlyMessage(implode(' ', array_filter([
            $ahiValue,
            $i18n['relatorio_sono_mensal_ahi_sem_padrao'],
        ])), 'positive');
    }

    private function messageBreathRate(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyFlattenSamples($rows, 'breathRateSamples');
        if (!$values) return $this->monthlyNoDataMessage();
        $normal = $this->monthlyPercentWhere($values, fn($value) => $value >= 8 && $value <= 24);
        $message = strtr($i18n['relatorio_sono_mensal_medicoes_respiratorias_normais'], [
            '{normalPercent}' => $this->formatDecimal($normal, 0),
        ]);
        return $this->monthlyMessage($message, $normal >= 80 ? 'positive' : 'negative');
    }

    private function messageHeartAnomaly(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'heartRateAnomalyCount');
        if (!$values) return $this->monthlyNoDataMessage();
        $daysWithAnomaly = $this->monthlyPercentWhere($values, fn($value) => $value > 0);
        $anomalyValue = strtr($i18n['relatorio_sono_mensal_anomalias_cardiacas_valor'], [
            '{daysWithAnomaly}' => $this->formatDecimal($daysWithAnomaly, 0),
        ]);
        if ($daysWithAnomaly > 30) {
            return $this->monthlyMessage($anomalyValue, 'negative');
        }
        if ($daysWithAnomaly > 0) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $anomalyValue,
                $i18n['relatorio_sono_mensal_anomalias_cardiacas_pontuais'],
            ])), 'neutral');
        }
        return $this->monthlyMessage($i18n['relatorio_sono_mensal_anomalias_cardiacas_nenhuma'], 'positive');
    }

    private function messageHeartRate(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyFlattenSamples($rows, 'heartRateSamples');
        if (!$values) return $this->monthlyNoDataMessage();
        $normal = $this->monthlyPercentWhere($values, fn($value) => $value >= 50 && $value <= 90);
        $message = strtr($i18n['relatorio_sono_mensal_medicoes_cardiacas_normais'], [
            '{normalPercent}' => $this->formatDecimal($normal, 0),
        ]);
        if ($normal >= 80) {
            return $this->monthlyMessage($message, 'positive');
        }
        return $this->monthlyMessage(implode(' ', array_filter([
            $i18n['relatorio_sono_mensal_frequencia_cardiaca_dispersao'],
            $message,
        ])), 'negative');
    }

    private function messageBodyMovement(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'bodyMovementIndex');
        if (!$values) return $this->monthlyNoDataMessage();
        $avg = $this->monthlyAverage($values);
        $movementValue = strtr($i18n['relatorio_sono_mensal_movimento_corporal_valor'], [
            '{avg}' => $this->formatDecimal($avg, 0),
        ]);
        if ($avg > 150) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $movementValue,
                $i18n['relatorio_sono_resultado_padrao_elevado'],
            ])), 'negative');
        }
        if ($avg > 80) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $movementValue,
                $i18n['relatorio_sono_resultado_alguma_variacao'],
            ])), 'neutral');
        }
        return $this->monthlyMessage(implode(' ', array_filter([
            $movementValue,
            $i18n['relatorio_sono_resultado_padrao_estavel'],
        ])), 'positive');
    }

    private function messageBedExits(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'bedExitCount');
        if (!$values) return $this->monthlyNoDataMessage();
        $avg = $this->monthlyAverage($values);
        $bedExitValue = strtr($i18n['relatorio_sono_mensal_saidas_cama_valor'], [
            '{avg}' => $this->formatDecimal($avg, 1),
        ]);
        if ($avg >= 3) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $bedExitValue,
                $i18n['relatorio_sono_resultado_padrao_elevado'],
            ])), 'negative');
        }
        if ($avg > 1) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $bedExitValue,
                $i18n['relatorio_sono_resultado_algumas_interrupcoes'],
            ])), 'neutral');
        }
        return $this->monthlyMessage($i18n['relatorio_sono_mensal_saidas_cama_baixa'], 'positive');
    }

    private function messageBedExitDuration(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'bedExitDurationMinutes');
        if (!$values) return $this->monthlyNoDataMessage();
        $avg = $this->monthlyAverage($values);
        return $this->monthlyMessage(strtr($i18n['relatorio_sono_mensal_duracao_saidas_cama_valor'], [
            '{avg}' => $this->formatDecimal($avg, 1),
        ]), $avg > 20 ? 'negative' : 'positive');
    }

    private function messageBedExitTimes(array $rows): array
    {
        global $i18n;

        $points = $this->monthlyCollectPoints($rows, 'bedExitTimesPoints');
        if (!$points) return $this->monthlyNoDataMessage();
        $key = count($points) === 1
            ? 'relatorio_sono_mensal_horarios_saidas_cama_um'
            : 'relatorio_sono_mensal_horarios_saidas_cama_varios';
        return $this->monthlyMessage(strtr($i18n[$key], [
            '{count}' => count($points),
        ]), 'neutral');
    }

    private function messageSleepLatency(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'sleepLatencyMinutes');
        if (!$values) return $this->monthlyNoDataMessage();
        $avg = $this->monthlyAverage($values);
        $latencyValue = strtr($i18n['relatorio_sono_mensal_latencia_valor'], [
            '{avg}' => $this->formatDecimal($avg, 0),
        ]);
        if ($avg > 60) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $latencyValue,
                $i18n['relatorio_sono_resultado_acima_esperado'],
            ])), 'negative');
        }
        if ($avg > 30) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $latencyValue,
                $i18n['relatorio_sono_mensal_latencia_iniciar_sono'],
            ])), 'neutral');
        }
        return $this->monthlyMessage(implode(' ', array_filter([
            $latencyValue,
            $i18n['relatorio_sono_mensal_latencia_favoravel'],
        ])), 'positive');
    }

    private function messageDailyRoutine(array $rows): array
    {
        global $i18n;

        $points = $this->monthlyCollectPoints($rows, 'routinePoints');
        if (!$points) return $this->monthlyNoDataMessage();
        return $this->monthlyMessage($i18n['relatorio_sono_mensal_rotina_diaria'], 'neutral');
    }

    private function messageRoomInOut(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'roomInOut');
        if (!$values) return $this->monthlyNoDataMessage();
        return $this->monthlyMessage(strtr($i18n['relatorio_sono_mensal_entradas_saidas_quarto'], [
            '{avg}' => $this->formatDecimal($this->monthlyAverage($values), 1),
        ]), 'neutral');
    }

    private function messageIndoorDuration(array $rows): array
    {
        global $i18n;

        $walking = $this->monthlyValues($rows, 'indoorWalkingMinutes');
        $still = $this->monthlyValues($rows, 'indoorStillMinutes');
        if (!$walking && !$still) return $this->monthlyNoDataMessage();
        return $this->monthlyMessage($i18n['relatorio_sono_mensal_duracao_interior'], 'neutral');
    }

    private function messageWalkingSteps(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'walkingSteps');
        if (!$values) return $this->monthlyNoDataMessage();
        $avg = $this->monthlyAverage($values);
        $stepsValue = strtr($i18n['relatorio_sono_mensal_passos_valor'], [
            '{avg}' => $this->formatDecimal($avg, 0),
        ]);
        if ($avg < 50) {
            return $this->monthlyMessage(implode(' ', array_filter([
                $i18n['relatorio_sono_mensal_passos_baixa'],
                $stepsValue,
            ])), 'negative');
        }
        return $this->monthlyMessage($stepsValue, 'neutral');
    }

    private function messageWalkingSpeed(array $rows): array
    {
        global $i18n;

        $values = $this->monthlyValues($rows, 'walkingSpeed');
        if (!$values) return $this->monthlyNoDataMessage();
        return $this->monthlyMessage(strtr($i18n['relatorio_sono_mensal_velocidade_caminhada_valor'], [
            '{avg}' => $this->formatDecimal($this->monthlyAverage($values), 1),
        ]), 'neutral');
    }

    private function monthlyNoDataMessage(): array
    {
        global $i18n;

        return $this->monthlyMessage($i18n['sem_dados_para_apresentar'], 'neutral');
    }

    private function monthlyAverage(array $values): float
    {
        return $values ? array_sum($values) / count($values) : 0.0;
    }

    private function monthlyRange(array $values): float
    {
        return $values ? max($values) - min($values) : 0.0;
    }

    private function monthlyPercentWhere(array $values, callable $predicate): float
    {
        if (!$values) {
            return 0.0;
        }

        $count = 0;
        foreach ($values as $value) {
            if ($predicate($value)) {
                $count++;
            }
        }

        return ($count / count($values)) * 100;
    }

    private function formatDecimal(float $value, int $precision): string
    {
        return number_format($value, $precision, ',', '');
    }

    private function monthlySectionMetadata(string $sectionKey): array
    {
        $metadata = [
            'sleepCondition' => [
                'title' => 'Sono',
                'icon' => 'fa fa-moon',
                'message' => 'Resumo mensal dos indicadores principais da qualidade e duração do sono.',
                'impact' => 'neutral',
            ],
            'breathingRateCondition' => [
                'title' => 'Frequência respiratória',
                'icon' => 'fa fa-lungs',
                'message' => 'Resumo mensal dos indicadores respiratórios durante o sono.',
                'impact' => 'positive',
            ],
            'heartRateCondition' => [
                'title' => 'Frequência cardíaca',
                'icon' => 'fa fa-heartbeat',
                'message' => 'Resumo mensal da frequência cardíaca e das anomalias detetadas.',
                'impact' => 'positive',
            ],
            'bodyMovementCondition' => [
                'title' => 'Movimento corporal',
                'icon' => 'fa fa-walking',
                'message' => 'Resumo mensal dos padrões de movimento corporal durante a noite.',
                'impact' => 'neutral',
            ],
            'gettingOutOfBedAtNight' => [
                'title' => 'Saídas da cama',
                'icon' => 'fa fa-bed',
                'message' => 'Resumo mensal da frequência, duração e horários das saídas da cama.',
                'impact' => 'positive',
            ],
            'dailyRoutine' => [
                'title' => 'Rotina diária',
                'icon' => 'fa fa-calendar-check',
                'message' => 'Resumo mensal da latência do sono e dos horários da rotina diária.',
                'impact' => 'negative',
            ],
            'activityStatus' => [
                'title' => 'Atividade diurna',
                'icon' => 'fa fa-shoe-prints',
                'message' => 'Resumo mensal da atividade diurna observada pelo radar.',
                'impact' => 'neutral',
            ],
        ];

        return $metadata[$sectionKey] ?? [
            'title' => $sectionKey,
            'icon' => 'fa fa-chart-bar',
            'message' => 'Resumo mensal da secção.',
            'impact' => 'neutral',
        ];
    }

    private function monthlyChartMetadata(string $chartKey): array
    {
        $metadata = [
            'sleepDurationStatistics' => ['type' => 'category-column', 'title' => 'Estatísticas da duração do sono'],
            'sleepDurationDistribution' => ['type' => 'interval-column', 'title' => 'Distribuição da duração do sono'],
            'sleepEfficiencyStatistics' => ['type' => 'category-column', 'title' => 'Estatísticas da eficiência do sono'],
            'sleepEfficiencyDistribution' => ['type' => 'interval-column', 'title' => 'Distribuição da eficiência do sono'],
            'deepSleepPercentageStatistics' => ['type' => 'category-column', 'title' => 'Estatísticas da percentagem de sono profundo'],
            'deepSleepPercentageDistribution' => ['type' => 'interval-column', 'title' => 'Distribuição da percentagem de sono profundo'],
            'ahiStatistics' => ['type' => 'category-column', 'title' => 'Estatísticas do AHI (Apnea-Hypopnea Index)'],
            'ahiDistribution' => ['type' => 'interval-column', 'title' => 'Distribuição do AHI (Apnea-Hypopnea Index)'],
            'breathRateDistribution' => ['type' => 'interval-column', 'title' => 'Distribuição da frequência respiratória'],
            'heartRateAnomalyStatistics' => ['type' => 'category-column', 'title' => 'Estatísticas de anomalias na frequência cardíaca'],
            'heartRateDistribution' => ['type' => 'interval-column', 'title' => 'Distribuição da frequência cardíaca'],
            'bodyMovementIndexStatistics' => ['type' => 'category-column', 'title' => 'Estatísticas do índice de movimento corporal'],
            'bodyMovementIndexDistribution' => ['type' => 'interval-column', 'title' => 'Distribuição do índice de movimento corporal'],
            'bedExitCountStatistics' => ['type' => 'category-column', 'title' => 'Estatísticas do número de saídas da cama'],
            'bedExitFrequencyDistribution' => ['type' => 'category-column', 'title' => 'Distribuição da frequência de saídas da cama'],
            'bedExitDurationStatistics' => ['type' => 'category-column', 'title' => 'Estatísticas da duração das saídas da cama'],
            'bedExitTimesDistribution' => ['type' => 'bubble-timeline', 'title' => 'Distribuição dos horários das saídas da cama'],
            'sleepLatencyStatistics' => ['type' => 'category-column', 'title' => 'Estatísticas do tempo para adormecer'],
            'sleepLatencyDistribution' => ['type' => 'interval-column', 'title' => 'Distribuição do tempo para adormecer'],
            'dailyRoutineTimesDistribution' => ['type' => 'bubble-timeline', 'title' => 'Distribuição dos horários da rotina diária'],
            'roomInOutStatistics' => ['type' => 'category-column', 'title' => 'Entrada/saída da sala'],
            'indoorDuration' => ['type' => 'stacked-column', 'title' => 'Duração no interior'],
            'walkingSteps' => ['type' => 'category-column', 'title' => 'Passos caminhados'],
            'walkingSpeed' => ['type' => 'category-column', 'title' => 'Velocidade de caminhada'],
        ];

        return $metadata[$chartKey] ?? [
            'type' => 'unknown',
            'title' => $chartKey,
        ];
    }

    private function monthlyMessage(string $text, string $impact = 'neutral'): array
    {
        if (!in_array($impact, ['positive', 'negative', 'neutral'], true)) {
            $impact = 'neutral';
        }

        return ['text' => $text, 'impact' => $impact];
    }

    private function monthlySection(string $sectionKey, array $charts, array $messages, ?array $sectionMessage = null): array
    {
        global $i18n;

        $sectionMetadata = $this->monthlySectionMetadata($sectionKey);
        $structuredCharts = [];

        foreach ($charts as $chartKey => $data) {
            $chartMetadata = $this->monthlyChartMetadata((string)$chartKey);
            $structuredCharts[$chartKey] = [
                'type' => $chartMetadata['type'],
                'title' => $chartMetadata['title'],
                'message' => $messages[$chartKey] ?? $this->monthlyMessage($i18n['sem_dados_para_apresentar'], 'neutral'),
                'data' => $data,
            ];
        }

        return [
            'title' => $sectionMetadata['title'],
            'icon' => $sectionMetadata['icon'],
            'message' => $sectionMessage ?: $this->monthlyMessage($sectionMetadata['message'], $sectionMetadata['impact']),
            'charts' => $structuredCharts,
        ];
    }

    private function formatSleepWindowTime(float $value): string
    {
        $hour = (int)floor($value);
        $minute = (int)round(($value - $hour) * 60);

        if ($minute >= 60) {
            $hour++;
            $minute -= 60;
        }

        return sprintf('%02d:%02d', $hour % 24, $minute);
    }

    private function buildHourBins(int $startHour, int $endHour): array
    {
        $bins = [];
        for ($hour = $startHour; $hour < $endHour; $hour++) {
            $bins[] = $hour . 'h-' . ($hour + 1) . 'h';
        }

        return $bins;
    }

    private function buildPercentBins(int $step): array
    {
        $bins = [];
        for ($value = 0; $value < 100; $value += $step) {
            $bins[] = $value . '-' . ($value + $step) . '%';
        }

        return $bins;
    }

    private function buildNumberBins(int $start, int $end, int $step, string $suffix): array
    {
        $bins = [];
        for ($value = $start; $value < $end; $value += $step) {
            $bins[] = $value . '-' . ($value + $step) . $suffix;
        }

        return $bins;
    }

}
