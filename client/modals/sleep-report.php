<?php
require_once __DIR__ . '/../helpers.php';

$complianceText = htmlspecialchars($i18n['conformidade']);
$nonComplianceText = htmlspecialchars($i18n['nao_conformidade']);
$normalText = htmlspecialchars($i18n['normal']);
$vezesText = $i18n['vezes'];
$monthlyChartTitle = function ($typeKey, $topicKey) use ($i18n) {
    return strtr($i18n['mensal_titulo_grafico'], [
        '{tipo}' => $i18n[$typeKey],
        '{topico}' => $i18n[$topicKey],
    ]);
};

$generalKPIs = [
    ['label' => $i18n['duracao_de_sono'], 'value' => '0', 'unit' => 'h', 'meta' => '<span class="text-success"><i class="fa fa-check"></i> ' . $complianceText . '</span>', 'metaId' => 'sleep-duration-meta', 'icon' => 'fa-clock', 'color' => 'success', 'id' => 'general-sleep-duration', 'statId' => 'general-sleep-duration-value', 'tooltip' => $i18n['tooltip_duracao_sono']],
    ['label' => $i18n['saidas_da_cama'], 'value' => '0', 'unit' => $vezesText, 'meta' => '<span class="text-success"><i class="fa fa-check"></i> ' . $complianceText . '</span>', 'metaId' => 'leave-bed-meta', 'icon' => 'fa-bed', 'color' => 'danger', 'id' => 'leave-bed', 'statId' => 'leave-bed-value', 'tooltip' => $i18n['tooltip_saidas_cama']],
    ['label' => $i18n['percentagem_de_sono_profundo'], 'value' => '0', 'unit' => '%', 'meta' => '<span class="text-danger"><i class="fa fa-times"></i> ' . $nonComplianceText . '</span>', 'metaId' => 'deep-sleep-percentage-meta', 'icon' => 'fa-brain', 'color' => 'danger', 'id' => 'deep-sleep-percentage', 'statId' => 'deep-sleep-percentage-value', 'tooltip' => $i18n['tooltip_sono_profundo']],
    ['label' => $i18n['ahi'], 'value' => '0', 'unit' => '', 'meta' => '<span class="text-success"><i class="fa fa-check"></i> ' . $complianceText . '</span>', 'metaId' => 'ahi-meta', 'icon' => ' fa-lungs', 'color' => 'success', 'id' => 'ahi', 'statId' => 'ahi-value', 'tooltip' => $i18n['tooltip_ahi']],
    ['label' => $i18n['frequencia_respiratoria_media'], 'value' => '0', 'unit' => 'BPM', 'meta' => '<span class="text-success"><i class="fa fa-check"></i> ' . $normalText . '</span>', 'metaId' => 'sleep-breath-rate-meta', 'icon' => 'fa-lungs', 'color' => 'success', 'id' => 'breath-rate', 'statId' => 'sleep-breath-rate-value'],
    ['label' => $i18n['frequencia_cardiaca_media'], 'value' => '0', 'unit' => 'BPM', 'meta' => '<span class="text-success"><i class="fa fa-heart"></i> ' . $normalText . '</span>', 'metaId' => 'sleep-heart-rate-meta', 'icon' => 'fa-heart', 'color' => 'success', 'id' => 'heart-rate', 'statId' => 'sleep-heart-rate-value'],
];

$sleepKPIs = [
    ['label' => $i18n['sono_profundo'], 'value' => '0', 'unit' => 'h', 'meta' => '<span class="text-muted small">(9%)</span>', 'metaId' => 'deep-sleep-meta', 'icon' => 'fa-brain', 'color' => 'info', 'id' => 'deep-sleep', 'statId' => 'deep-sleep-value'],
    ['label' => $i18n['sono_leve'], 'value' => '0', 'unit' => 'h', 'meta' => '<span class="text-muted small">(53%)</span>', 'metaId' => 'light-sleep-meta', 'icon' => 'fa-moon', 'color' => 'primary', 'id' => 'light-sleep', 'statId' => 'light-sleep-value'],
    ['label' => $i18n['rem'], 'value' => '0', 'unit' => 'h', 'meta' => '<span class="text-muted small">(38%)</span>', 'metaId' => 'rem-sleep-meta', 'icon' => 'fa-eye', 'color' => 'warning', 'id' => 'rem-sleep', 'statId' => 'rem-sleep-value'],
    ['label' => $i18n['duracao_de_sono'], 'value' => '0', 'unit' => 'h', 'icon' => 'fa-clock', 'color' => 'success', 'id' => 'sleep-duration', 'statId' => 'sleep-duration-value'],
    ['label' => $i18n['acordado'], 'value' => '0', 'unit' => 'h', 'icon' => 'fa-sun', 'color' => 'warning', 'id' => 'awake-time', 'statId' => 'awake-time-value'],
    ['label' => $i18n['saidas_da_cama'], 'value' => '0', 'unit' => $vezesText, 'icon' => 'fa-walking', 'color' => 'success', 'id' => 'number-of-bed-exits', 'statId' => 'number-of-bed-exits-value'],
];

$heartRateKPIs = [
    ['label' => $i18n['frequencia_cardiaca_maxima'], 'value' => '0', 'unit' => 'BPM', 'icon' => 'fa-arrow-up', 'color' => 'danger', 'id' => 'max-heart-rate', 'statId' => 'max-heart-rate-value'],
    ['label' => $i18n['frequencia_cardiaca_minima'], 'value' => '0', 'unit' => 'BPM', 'icon' => 'fa-arrow-down', 'color' => 'primary', 'id' => 'min-heart-rate', 'statId' => 'min-heart-rate-value'],
    ['label' => $i18n['frequencia_cardiaca_media'], 'value' => '0', 'unit' => 'BPM', 'icon' => 'fa-heartbeat', 'color' => 'success', 'id' => 'avg-heart-rate', 'statId' => 'avg-heart-rate-value'],
    ['label' => $i18n['sinais_vitais_fracos'], 'value' => '0', 'unit' => $vezesText, 'icon' => 'fa-circle', 'color' => 'warning', 'id' => 'weak-vital-signs', 'statId' => 'weak-vital-signs-value'],
    ['label' => $i18n['policardia'], 'value' => '0', 'unit' => $vezesText, 'icon' => 'fa-triangle fa-rotate-180', 'color' => 'danger', 'id' => 'polycardia', 'statId' => 'polycardia-value'],
    ['label' => $i18n['bradicardia'], 'value' => '0', 'unit' => $vezesText, 'icon' => 'fa-square', 'color' => 'warning', 'id' => 'bradycardia', 'statId' => 'bradycardia-value'],
];

$breatheKPIs = [
    ['label' => $i18n['frequencia_respiratoria_maxima'], 'value' => '0', 'unit' => 'BPM', 'icon' => 'fa-arrow-up', 'color' => 'danger', 'id' => 'max-breath-rate', 'statId' => 'max-breath-rate-value'],
    ['label' => $i18n['frequencia_respiratoria_minima'], 'value' => '0', 'unit' => 'BPM', 'icon' => 'fa-arrow-down', 'color' => 'primary', 'id' => 'min-breath-rate', 'statId' => 'min-breath-rate-value'],
    ['label' => $i18n['frequencia_respiratoria_media'], 'value' => '0', 'unit' => 'BPM', 'icon' => 'fa-lungs', 'color' => 'success', 'id' => 'avg-breath-rate', 'statId' => 'avg-breath-rate-value'],
    ['label' => $i18n['apneia'], 'value' => '0', 'unit' => $vezesText, 'icon' => 'fa-circle', 'color' => 'warning', 'id' => 'apnea', 'statId' => 'apnea-value'],
    ['label' => $i18n['taquipneia'], 'value' => '0', 'unit' => $vezesText, 'icon' => 'fa-triangle fa-rotate-180', 'color' => 'danger', 'id' => 'tachypnea', 'statId' => 'tachypnea-value'],
    ['label' => $i18n['bradipneia'], 'value' => '0', 'unit' => $vezesText, 'icon' => 'fa-square', 'color' => 'warning', 'id' => 'bradypnea', 'statId' => 'bradypnea-value'],
];

$daytimeActivityKPIs = [
    ['label' => $i18n['quarto_interior_exterior'], 'value' => '0', 'unit' => $vezesText, 'icon' => 'fa-door-open', 'color' => 'primary', 'id' => 'in-out-room', 'statId' => 'in-out-room-value'],
    ['label' => $i18n['passos_a_caminhar'], 'value' => '0', 'unit' => $vezesText, 'icon' => 'fa-shoe-prints', 'color' => 'primary', 'id' => 'walking-steps', 'statId' => 'walking-steps-value'],
    ['label' => $i18n['velocidade_de_marcha'], 'value' => '0', 'unit' => 'm/min', 'icon' => 'fa-tachometer-alt-fast', 'color' => 'primary', 'id' => 'walking-speed', 'statId' => 'walking-speed-value'],
];

$suggestionCards = [
    ['title' => $i18n['sono'], 'label' => $i18n['sono'], 'icon' => 'fa-brain', 'color' => 'info', 'contentId' => 'sleep-analysis-content'],
    ['title' => $i18n['respiracao'], 'label' => $i18n['respiracao'], 'icon' => 'fa-lungs', 'color' => 'success', 'contentId' => 'breath-analysis-content'],
];

$monthlySleepReportSections = [
    [
        'id' => 'sleep-condition',
        'key' => 'sleepCondition',
        'title' => $i18n['sono'],
        'icon' => 'fa fa-moon',
        'charts' => [
            ['id' => 'sleep-duration-statistics', 'title' => $monthlyChartTitle('estatisticas', 'topico_duracao_sono')],
            ['id' => 'sleep-duration-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_duracao_sono')],
            ['id' => 'sleep-efficiency-statistics', 'title' => $monthlyChartTitle('estatisticas', 'topico_eficiencia_sono')],
            ['id' => 'sleep-efficiency-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_eficiencia_sono')],
            ['id' => 'deep-sleep-percentage-statistics', 'title' => $monthlyChartTitle('estatisticas', 'topico_percentagem_sono_profundo')],
            ['id' => 'deep-sleep-percentage-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_percentagem_sono_profundo')],
        ],
    ],
    [
        'id' => 'breathing-rate-condition',
        'key' => 'breathingRateCondition',
        'title' => $i18n['frequencia_respiratoria'],
        'icon' => 'fa fa-lungs',
        'charts' => [
            ['id' => 'ahi-statistics', 'title' => $monthlyChartTitle('estatisticas', 'topico_ahi')],
            ['id' => 'ahi-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_ahi')],
            ['id' => 'breath-rate-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_frequencia_respiratoria')],
        ],
    ],
    [
        'id' => 'heart-rate-condition',
        'key' => 'heartRateCondition',
        'title' => $i18n['frequencia_cardiaca'],
        'icon' => 'fa fa-heartbeat',
        'charts' => [
            ['id' => 'heart-rate-anomaly-statistics', 'title' => $monthlyChartTitle('estatisticas', 'topico_anomalias_frequencia_cardiaca')],
            ['id' => 'heart-rate-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_frequencia_cardiaca')],
        ],
    ],
    [
        'id' => 'body-movement-condition',
        'key' => 'bodyMovementCondition',
        'title' => $i18n['movimento_corporal'],
        'icon' => 'fa fa-walking',
        'charts' => [
            ['id' => 'body-movement-index-statistics', 'title' => $monthlyChartTitle('estatisticas', 'topico_indice_movimento_corporal')],
            ['id' => 'body-movement-index-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_indice_movimento_corporal')],
        ],
    ],
    [
        'id' => 'getting-out-of-bed-at-night',
        'key' => 'gettingOutOfBedAtNight',
        'title' => $i18n['saidas_da_cama'],
        'icon' => 'fa fa-bed',
        'charts' => [
            ['id' => 'bed-exit-count-statistics', 'title' => $monthlyChartTitle('estatisticas', 'topico_numero_saidas_cama')],
            ['id' => 'bed-exit-frequency-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_frequencia_saidas_cama')],
            ['id' => 'bed-exit-duration-statistics', 'title' => $monthlyChartTitle('estatisticas', 'topico_duracao_saidas_cama')],
            ['id' => 'bed-exit-times-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_horarios_saidas_cama')],
        ],
    ],
    [
        'id' => 'daily-routine',
        'key' => 'dailyRoutine',
        'title' => $i18n['rotina_diaria'],
        'icon' => 'fa fa-calendar-check',
        'charts' => [
            ['id' => 'sleep-latency-statistics', 'title' => $monthlyChartTitle('estatisticas', 'topico_tempo_adormecer')],
            ['id' => 'sleep-latency-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_tempo_adormecer')],
            ['id' => 'daily-routine-times-distribution', 'title' => $monthlyChartTitle('distribuicao', 'topico_horarios_rotina_diaria')],
        ],
    ],
    [
        'id' => 'activity-status',
        'key' => 'activityStatus',
        'title' => $i18n['atividade_diurna'],
        'icon' => 'fa fa-shoe-prints',
        'charts' => [
            ['id' => 'room-in-out-statistics', 'title' => $i18n['entrada_saida_sala']],
            ['id' => 'indoor-duration', 'title' => $i18n['duracao_no_interior']],
            ['id' => 'walking-steps', 'title' => $i18n['passos_a_caminhar']],
            ['id' => 'walking-speed', 'title' => $i18n['velocidade_de_marcha']],
        ],
    ],
];

function render_component_list($dataArray, $componentName)
{
    foreach ($dataArray as $item) {
        echo '<div class="col">';
        component($componentName, $item);
        echo '</div>';
    }
}

function render_monthly_sleep_chart_card($chart)
{
    global $i18n;
    $chartId = 'monthly-' . $chart['id'] . '-chart';
    $messageId = 'monthly-' . $chart['id'] . '-message';
?>
    <div class="col">
        <div class="bg-white border rounded shadow-sm">
            <div class="border-bottom font-weight-bold px-3 py-2 d-flex align-items-center justify-content-between">
                <span><?= htmlspecialchars($chart['title']) ?></span>
                <button type="button" id="<?= htmlspecialchars($messageId) ?>" class="btn btn-sm btn-icon btn-info rounded-circle monthly-sleep-chart-message ml-2" style="--size: 2rem; width: var(--size); height: var(--size);" data-toggle="tooltip" data-bs-toggle="tooltip" data-placement="left" data-bs-placement="left" title="<?= htmlspecialchars($i18n['sem_dados_para_apresentar']) ?>" data-impact="neutral" aria-label="<?= htmlspecialchars($i18n['informacao_do_grafico']) ?>">
                    <i class="fa fa-info text-white"></i>
                </button>
            </div>
            <div class="p-3">
                <div id="<?= htmlspecialchars($chartId) ?>" class="monthly-sleep-chart w-100" style="height: 300px;"></div>
            </div>
        </div>
    </div>
<?php
}

function render_monthly_sleep_accordion($sections)
{
    global $i18n;
?>
    <div class="accordion accordion-solid accordion-panel accordion-toggle-plus" id="monthlySleepReportAccordion">
        <?php foreach ($sections as $section) {
            $headingId = 'monthly-heading-' . $section['id'];
            $collapseId = 'monthly-collapse-' . $section['id'];
            $sectionMessageId = 'monthly-' . $section['id'] . '-section-message';
        ?>
            <div class="card border">
                <div class="card-header" id="<?= htmlspecialchars($headingId) ?>">
                    <div class="card-title" data-toggle="collapse" data-bs-toggle="collapse" data-target="#<?= htmlspecialchars($collapseId) ?>" data-bs-target="#<?= htmlspecialchars($collapseId) ?>" aria-expanded="true" aria-controls="<?= htmlspecialchars($collapseId) ?>">
                        <i class="<?= htmlspecialchars($section['icon']) ?>"></i> <?= htmlspecialchars($section['title']) ?>
                    </div>
                </div>
                <div id="<?= htmlspecialchars($collapseId) ?>" class="collapse show" aria-labelledby="<?= htmlspecialchars($headingId) ?>">
                    <div class="card-body p-3 border-0">
                        <div class="card-grid card-grid-2">
                            <?php foreach ($section['charts'] as $chart) {
                                render_monthly_sleep_chart_card($chart);
                            } ?>
                        </div>
                        <div id="<?= htmlspecialchars($sectionMessageId) ?>" class="alert mb-0 mt-3 monthly-sleep-section-message" role="alert" data-impact="neutral">
                            <div class="alert-icon">
                                <i class="fa fa-info-circle text-info"></i>
                            </div>
                            <div class="alert-text monthly-sleep-section-message-text">
                                <?= htmlspecialchars($i18n['sem_dados_para_apresentar']) ?>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        <?php } ?>
    </div>
<?php } ?>

<div class="modal fade pl-0" id="sleepReportModal" tabindex="-1" aria-labelledby="sleepReportModal" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-fullscreen-xl-down">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="sleepReportModalLabel"><?= htmlspecialchars($i18n['relatorio_de_sono']) ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= htmlspecialchars($i18n['fechar']) ?>"></button>
            </div>

            <div class="modal-body">
                <div class="container-xxl">

                    <div class="d-flex justify-content-between align-items-center flex-wrap mb-3">
                        <ul class="nav nav-pills mb-2 mb-md-0" id="sleepReportPeriodTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <a class="nav-link active" id="sleep-report-daily-tab" data-toggle="tab" data-bs-toggle="tab" href="#sleep-report-daily-pane" role="tab" aria-controls="sleep-report-daily-pane" aria-selected="true">
                                    <i class="fa fa-calendar-day mr-1"></i> <?= htmlspecialchars($i18n['diario']) ?>
                                </a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link" id="sleep-report-monthly-tab" data-toggle="tab" data-bs-toggle="tab" href="#sleep-report-monthly-pane" role="tab" aria-controls="sleep-report-monthly-pane" aria-selected="false">
                                    <i class="fa fa-calendar-alt mr-1"></i> <?= htmlspecialchars($i18n['mensal']) ?>
                                </a>
                            </li>
                        </ul>

                        <div class="sleep-report-period-picker mb-2 mb-md-0" data-sleep-report-period-picker="daily">
                            <div class="input-group w-auto">
                                <input type="text" id="pick-date-field" class="form-control" placeholder="<?= htmlspecialchars($i18n['selecione_uma_data']) ?>">
                                <div class="input-group-append">
                                    <span class="input-group-text">
                                        <i class="la la-calendar"></i>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="sleep-report-period-picker d-none mb-2 mb-md-0" data-sleep-report-period-picker="monthly">
                            <div class="input-group w-auto">
                                <input type="text" id="monthly-sleep-report-month-field" class="form-control">
                                <div class="input-group-append">
                                    <span class="input-group-text">
                                        <i class="la la-calendar"></i>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="sleep-report-daily-pane" role="tabpanel" aria-labelledby="sleep-report-daily-tab">
                            <div id="no-data-state" class="d-none card bg-light text-center py-5">
                                <div class="d-flex flex-column align-items-center gap-3">
                                    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-muted opacity-50">
                                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                                        <path d="m3.3 7 8.7 5 8.7-5" />
                                        <path d="M12 22V12" />
                                    </svg>
                                    <div>
                                        <h4 class="fw-bold text-dark"><?= htmlspecialchars($i18n['dados_nao_encontrados']) ?></h4>
                                        <p class="text-muted"><?= htmlspecialchars($i18n['nao_existem_registos']) ?></p>
                                    </div>
                                </div>
                            </div>

                            <div id="report-content-wrapper">
                                <div class="d-flex flex-column gap-3 bg-light p-3 shadow-sm">

                                    <div class="row">
                                        <div class="col-12 col-lg-4">
                                            <div id="health-score-pie" class="card shadow-sm w-100 h-100" style="min-height: 325px;"></div>
                                        </div>
                                        <div class="col-12 col-lg-8">
                                            <div id="kpis-stats" class="card-grid card-grid-2 card-grid-fill">
                                                <?php render_component_list($generalKPIs, 'kpi-card'); ?>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card">
                                        <div class="card-header font-weight-bold"><?= htmlspecialchars($i18n['informacoes_de_sono']) ?></div>
                                        <div class="card-body">
                                            <div id="timeline-sleep-chart" class="w-100" style="height: 100px;"></div>
                                            <div id="sleep-chart" class="w-100 py-3" style="height: 250px;"></div>
                                            <div class="card-grid card-grid-3 mt-3">
                                                <?php render_component_list($sleepKPIs, 'kpi-card'); ?>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card">
                                        <div class="card-header font-weight-bold"><?= htmlspecialchars($i18n['respiracao']) ?></div>
                                        <div class="card-body">
                                            <div id="breathe-chart" class="w-100 pb-3" style="height: 250px;"></div>
                                            <div class="card-grid card-grid-3 mt-3">
                                                <?php render_component_list($breatheKPIs, 'kpi-card'); ?>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card">
                                        <div class="card-header font-weight-bold"><?= htmlspecialchars($i18n['frequencia_cardiaca']) ?></div>
                                        <div class="card-body">
                                            <div id="heart-rate-chart" class="w-100 mb-3" style="height: 250px;"></div>
                                            <div class="card-grid card-grid-3 mt-3">
                                                <?php render_component_list($heartRateKPIs, 'kpi-card'); ?>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card">
                                        <div class="card-header font-weight-bold"><?= htmlspecialchars($i18n['atividade_diurna']) ?></div>
                                        <div class="card-body card-grid card-grid-2">
                                            <div class="col">
                                                <div id="daytime-activity-chart" class="w-100 h-100 mb-3" style="min-height: 350px;"></div>
                                            </div>
                                            <div class="col">
                                                <div class="row row-cols-1 h-100 align-items-center">
                                                    <?php render_component_list($daytimeActivityKPIs, 'kpi-card'); ?>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card">
                                        <div class="card-header font-weight-bold"><?= htmlspecialchars($i18n['sugestoes']) ?></div>
                                        <div class="card-body card-grid card-grid-2">
                                            <?php render_component_list($suggestionCards, 'suggestion-card'); ?>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="sleep-report-monthly-pane" role="tabpanel" aria-labelledby="sleep-report-monthly-tab">
                            <div id="monthly-sleep-report-no-data-state" class="d-none card bg-light text-center py-5">
                                <div>
                                    <h4 class="fw-bold text-dark"><?= htmlspecialchars($i18n['dados_nao_encontrados']) ?></h4>
                                    <p class="text-muted mb-0"><?= htmlspecialchars($i18n['nao_existem_registos']) ?></p>
                                </div>
                            </div>

                            <div id="monthly-sleep-report-content-wrapper" class="bg-light p-3 shadow-sm">
                                <?php render_monthly_sleep_accordion($monthlySleepReportSections); ?>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal" data-bs-dismiss="modal"><?= htmlspecialchars($i18n['fechar']) ?></button>
            </div>
        </div>
    </div>
</div>
