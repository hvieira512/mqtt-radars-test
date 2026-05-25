<div class="modal fade pl-0" id="fallReplayModal" tabindex="-1" role="dialog" aria-labelledby="fallReplayModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-fullscreen-md-down" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title" id="fallReplayModalLabel">Reprodução de queda confirmada</h5>
                    <small id="fall-replay-modal-subtitle" class="text-muted d-block">Selecione um alarme de queda para reproduzir.</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
                <div class="card shadow-sm mb-3">
                    <div class="card-header d-flex flex-wrap align-items-center justify-content-between">
                        <span class="font-weight-bold">Monitorização de trajetos</span>
                        <span id="fall-replay-current-time" class="badge badge-light text-muted">
                            <i class="fa fa-play-circle mr-1"></i> A reproduzir: --:--:--
                        </span>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <div id="fall-replay-current-people" class="mb-2"></div>
                        <div id="fall-replay-map" class="flex-grow-1 w-100 bg-white" style="min-height: 500px;"></div>
                        <?php radar_region_legend($i18n); ?>
                    </div>
                </div>

                <div class="card shadow-sm">
                    <div class="card-body">
                        <div class="d-flex flex-wrap align-items-end mb-3">
                            <div class="btn-toolbar mr-3 mb-3 flex-shrink-0" role="toolbar" aria-label="Controlos de reprodução">
                                <div class="btn-group" role="group" aria-label="Controlo principal">
                                    <button id="fall-replay-step-prev" type="button" class="btn btn-outline-secondary" title="Segmento anterior">
                                        <i class="fa fa-step-backward pr-0"></i>
                                        <span class="sr-only">Segmento anterior</span>
                                    </button>
                                    <button id="fall-replay-toggle" type="button" class="btn btn-primary text-white" title="Reproduzir">
                                        <i class="fa fa-play pr-0"></i>
                                        <span class="sr-only">Reproduzir</span>
                                    </button>
                                    <button id="fall-replay-step-next" type="button" class="btn btn-outline-secondary" title="Segmento seguinte">
                                        <i class="fa fa-step-forward pr-0"></i>
                                        <span class="sr-only">Segmento seguinte</span>
                                    </button>
                                </div>
                            </div>

                            <div class="form-group mb-3">
                                <label for="fall-replay-speed" class="small text-muted mb-1">Velocidade</label>
                                <select id="fall-replay-speed" class="form-control h-100" style="min-width: 120px;">
                                    <option>0.5x</option>
                                    <option selected>1x</option>
                                    <option>2x</option>
                                    <option>4x</option>
                                </select>
                            </div>
                        </div>

                        <div class="small text-muted mb-2">A linha temporal destaca as categorias do replay. Ao passar ou arrastar, é mostrada a pré-visualização do instante selecionado.</div>
                        <div id="fall-replay-timeline-wrapper" class="position-relative">
                            <div id="fall-replay-timeline-preview-time" class="badge badge-dark d-none position-absolute"></div>
                            <div id="fall-replay-timeline-preview-card" class="d-none position-absolute"></div>
                            <div id="fall-replay-timeline-sections" class="position-absolute w-100"></div>
                            <input id="fall-replay-timeline" type="range" class="custom-range mb-0 position-relative" min="0" max="100" step="any" value="0">
                        </div>
                        <div class="d-flex justify-content-between text-muted small">
                            <span id="fall-replay-timeline-start">--:--</span>
                            <span id="fall-replay-timeline-current">--:--:--</span>
                            <span id="fall-replay-timeline-end">--:--</span>
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
