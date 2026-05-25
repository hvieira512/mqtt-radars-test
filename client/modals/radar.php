<?php
$renderRadarVitalCard = function (array $options) use ($i18n) {
    $prefix = $options['prefix'];
    $chartId = $options['chart_id'];
    $color = $options['color'];
    $icon = $options['icon'];
    $label = $options['label'];
    $unit = $options['unit'];
?>
    <div class="vital-card bg-white rounded p-2 shadow-sm">
        <div class="d-flex align-items-center justify-content-between mb-3">
            <div class="d-flex align-items-center">
                <div class="bg-<?= htmlspecialchars($color) ?> text-white rounded-circle p-2 d-flex align-items-center justify-content-center me-2" style="--size: 2.5rem; min-width: var(--size); min-height: var(--size);">
                    <i class="fa <?= htmlspecialchars($icon) ?>"></i>
                </div>
                <span class="text-muted small font-weight-medium"><?= htmlspecialchars($label) ?></span>
            </div>
            <div class="d-flex align-items-center">
                <span id="<?= htmlspecialchars($prefix) ?>-value" class="h5 mb-0 mr-1 text-<?= htmlspecialchars($color) ?>">--</span>
                <span class="text-muted small me-2"><?= htmlspecialchars($unit) ?></span>
                <div id="<?= htmlspecialchars($prefix) ?>-trend">
                    <i class="fa fa-minus text-muted"></i>
                </div>
            </div>
        </div>
        <div id="<?= htmlspecialchars($chartId) ?>" class="w-100" style="height: 250px;"></div>
        <div class="d-flex justify-content-between text-muted small mt-2">
            <span><?= htmlspecialchars($i18n['min']) ?>: <span id="<?= htmlspecialchars($prefix) ?>-min">--</span></span>
            <span><?= htmlspecialchars($i18n['media']) ?>: <span id="<?= htmlspecialchars($prefix) ?>-avg">--</span></span>
            <span><?= htmlspecialchars($i18n['max']) ?>: <span id="<?= htmlspecialchars($prefix) ?>-max">--</span></span>
        </div>
    </div>
<?php
};

$renderRadarVitalCards = function (string $idPrefix = '') use ($i18n, $renderRadarVitalCard) {
    $prefix = $idPrefix ? $idPrefix . '-' : '';
    $chartPrefix = $idPrefix ? $idPrefix . '-chart' : 'chart';

    $renderRadarVitalCard([
        'prefix' => $prefix . 'heart-rate',
        'chart_id' => $chartPrefix . '-heart-rate',
        'color' => 'danger',
        'icon' => 'fa-heart',
        'label' => $i18n['frequencia_cardiaca'],
        'unit' => 'BPM',
    ]);

    $renderRadarVitalCard([
        'prefix' => $prefix . 'breath-rate',
        'chart_id' => $chartPrefix . '-breath-rate',
        'color' => 'primary',
        'icon' => 'fa-lungs',
        'label' => $i18n['frequencia_respiratoria'],
        'unit' => 'RPM',
    ]);
};
?>

<div class="modal fade pl-0" id="radarModal" tabindex="-1" role="dialog" aria-labelledby="radarModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl modal-fullscreen-xl-down">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="radarModalLabel"><?= htmlspecialchars($i18n['detalhes_do_radar']) ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= htmlspecialchars($i18n['fechar']) ?>"></button>
            </div>
            <div class="modal-body">
                <ul class="nav nav-pills mb-3" id="radarModeTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" id="radar-live-tab" data-toggle="tab" data-bs-toggle="tab" href="#radar-live-pane" role="tab" aria-controls="radar-live-pane" aria-selected="true">
                            <i class="fa fa-circle text-success mr-1"></i> Online
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="radar-playback-tab" data-toggle="tab" data-bs-toggle="tab" href="#radar-playback-pane" role="tab" aria-controls="radar-playback-pane" aria-selected="false">
                            <i class="fa fa-play-circle mr-1"></i> Reprodução
                        </a>
                    </li>
                </ul>

                <div class="tab-content">
                    <div class="tab-pane fade show active" id="radar-live-pane" role="tabpanel" aria-labelledby="radar-live-tab">
                        <div class="row mb-3">
                            <div class="col-12 col-xl-8 mb-3 mb-xl-0">
                                <div id="liveRadarMap" class="card shadow-sm h-100">
                                    <div class="card-header d-flex align-items-center justify-content-between">
                                        <span class="font-weight-bold"><?= htmlspecialchars($i18n['monitorizacao_de_trajetos']) ?></span>
                                        <button id="refresh-live-layout-btn" type="button" class="btn btn-sm btn-outline-primary" aria-label="Sincronizar layout" title="Sincronizar layout">
                                            <i class="fa fa-sync-alt mr-1"></i> Sincronizar
                                        </button>
                                    </div>
                                    <div class="card-body d-flex flex-column gap-2">
                                        <div id="current-people"></div>
                                        <div id="radar-map" class="flex-grow-1 w-100" style="min-height: 250px;"></div>
                                        <?php radar_region_legend($i18n); ?>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12 col-xl-4">
                                <div class="card shadow-sm h-100">
                                    <div class="card-header d-flex align-items-center justify-content-between">
                                        <span class="font-weight-bold"><?= htmlspecialchars($i18n['sinais_vitais']) ?></span>
                                        <button id="sleep-report-btn" type="button" class="btn btn-sm btn-outline-primary" data-toggle="modal" data-bs-toggle="modal" data-target="#sleepReportModal" data-bs-target="#sleepReportModal">
                                            <i class="fa fa-moon mr-1"></i> <?= htmlspecialchars($i18n['relatorio']) ?>
                                        </button>
                                    </div>
                                    <div id="liveRadarInfo" class="card-body d-flex flex-column gap-3">

                                        <div id="sleep-state-container" class="text-center py-3 rounded">
                                            <div id="sleep-state" class="d-flex align-items-center justify-content-center text-white">
                                                <i class="fa fa-moon fa-2x mr-3"></i>
                                                <div>
                                                    <div class="h4 mb-0" id="sleep-state-label"></div>
                                                    <small id="sleep-state-subtitle"><?= htmlspecialchars($i18n['estado_do_sono']) ?></small>
                                                </div>
                                            </div>
                                        </div>

                                        <?php $renderRadarVitalCards(); ?>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="radar-playback-pane" role="tabpanel" aria-labelledby="radar-playback-tab">
                        <div class="row mb-3">
                            <div class="col-12 col-xl-8 mb-3 mb-xl-0">
                                <div class="card shadow-sm h-100">
                                    <div class="card-header d-flex flex-wrap align-items-center justify-content-between">
                                        <span class="font-weight-bold">Monitorização de trajetos</span>
                                        <span id="playback-current-time" class="badge badge-light text-muted">
                                            <i class="fa fa-play-circle mr-1"></i> A reproduzir: --:--:--
                                        </span>
                                    </div>
                                    <div class="card-body d-flex flex-column gap-2">
                                        <div id="playback-current-people"></div>
                                        <div id="playback-map" class="flex-grow-1 w-100 bg-white" style="min-height: 250px;"></div>
                                        <?php radar_region_legend($i18n); ?>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12 col-xl-4">
                                <div class="card shadow-sm h-100">
                                    <div class="card-header font-weight-bold">Sinais vitais</div>
                                    <div id="playbackRadarInfo" class="card-body d-flex flex-column gap-3">
                                        <div id="playback-sleep-state-container" class="text-center py-3 rounded">
                                            <div id="playback-sleep-state" class="d-flex align-items-center justify-content-center text-white">
                                                <i class="fa fa-moon fa-2x mr-3"></i>
                                                <div>
                                                    <div class="h4 mb-0" id="playback-sleep-state-label"></div>
                                                    <small id="playback-sleep-state-subtitle"><?= htmlspecialchars($i18n['estado_do_sono']) ?></small>
                                                </div>
                                            </div>
                                        </div>

                                        <?php $renderRadarVitalCards('playback'); ?>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card shadow-sm mb-3">
                            <div class="card-body">
                                <div class="d-flex flex-wrap align-items-end mb-3">
                                    <div class="btn-toolbar mr-3 mb-3 flex-shrink-0" role="toolbar" aria-label="Controlos de reprodução">
                                        <div class="btn-group" role="group" aria-label="Controlo principal">
                                            <button id="playback-step-prev" type="button" class="btn btn-outline-secondary" title="Segmento anterior">
                                                <i class="fa fa-step-backward pr-0"></i>
                                                <span class="sr-only">Segmento anterior</span>
                                            </button>
                                            <button id="playback-toggle" type="button" class="btn btn-primary text-white" title="Reproduzir">
                                                <i class="fa fa-play pr-0"></i>
                                                <span class="sr-only">Reproduzir</span>
                                            </button>
                                            <button id="playback-step-next" type="button" class="btn btn-outline-secondary" title="Segmento seguinte">
                                                <i class="fa fa-step-forward pr-0"></i>
                                                <span class="sr-only">Segmento seguinte</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="d-flex flex-wrap align-items-end flex-grow-1">
                                        <div class="form-group mb-3 mr-3">
                                            <label for="playback-date" class="small text-muted mb-1">Data</label>
                                            <div class="input-group" style="min-width: 220px;">
                                                <input type="text" id="playback-date" class="form-control" placeholder="Selecione uma data" autocomplete="off">
                                                <div class="input-group-append">
                                                    <span class="input-group-text">
                                                        <i class="la la-calendar"></i>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="form-group mb-3 mr-3 flex-grow-1">
                                            <label for="playback-time-range" class="small text-muted mb-1">Intervalo horário</label>
                                            <div id="playback-time-range" class="input-group">
                                                <input type="text" id="playback-start" class="form-control playback-timepicker" value="00:00" placeholder="HH:mm" inputmode="numeric" autocomplete="off">
                                                <div class="input-group-append">
                                                    <span class="input-group-text border-right-0">
                                                        <i class="la la-clock-o"></i>
                                                    </span>
                                                </div>
                                                <input type="text" id="playback-end" class="form-control playback-timepicker" value="23:59" placeholder="HH:mm" inputmode="numeric" autocomplete="off">
                                            </div>
                                        </div>
                                        <div class="form-group mb-3">
                                            <label for="playback-speed" class="small text-muted mb-1">Velocidade</label>
                                            <select id="playback-speed" class="form-control h-100" style="min-width: 120px;">
                                                <option>0.5x</option>
                                                <option selected>1x</option>
                                                <option>2x</option>
                                                <option>4x</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="mt-3">
                                    <div class="small text-muted mb-2">A linha temporal destaca as categorias do replay. Ao passar ou arrastar, é mostrada a pré-visualização do instante selecionado.</div>
                                    <div id="playback-timeline-wrapper" class="position-relative">
                                        <div id="playback-timeline-preview-time" class="badge badge-dark d-none position-absolute"></div>
                                        <div id="playback-timeline-preview-card" class="d-none position-absolute"></div>
                                        <div id="playback-timeline-sections" class="position-absolute w-100"></div>
                                        <input id="playback-timeline" type="range" class="custom-range mb-0 position-relative" min="0" max="100" step="any" value="0">
                                    </div>
                                    <div class="d-flex justify-content-between text-muted small">
                                        <span id="playback-timeline-start">12:00</span>
                                        <span id="playback-timeline-current">12:15:30</span>
                                        <span id="playback-timeline-end">12:30</span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                <div id="liveRadarEvents" class="card shadow-sm">
                    <div class="card-header font-weight-bold"><?= htmlspecialchars($i18n['eventos']) ?></div>
                    <div class="card-body">
                        <ul class="nav nav-pills nav-sombreado flex-column flex-sm-row gap-3" id="deviceTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <a class="nav-link active" id="alarms-tab" data-toggle="tab" data-bs-toggle="tab" href="#alarms" role="tab">
                                    <?= htmlspecialchars($i18n['alarmes']) ?>
                                </a>
                            </li>
                            <li class="nav-item" role="presentation">
                                <a class="nav-link" id="events-tab" data-toggle="tab" data-bs-toggle="tab" href="#events" role="tab">
                                    <?= htmlspecialchars($i18n['eventos']) ?>
                                </a>
                            </li>
                        </ul>

                        <div class="tab-content mt-3">
                            <div class="tab-pane fade show active" id="alarms">
                                <table id="alarms-grid" class="table table-striped table-bordered table-hover table-check"></table>
                            </div>
                            <div class="tab-pane fade" id="events">
                                <table id="events-grid" class="table table-striped table-bordered table-hover table-check"></table>
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
