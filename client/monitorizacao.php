<?php
require_once __DIR__ . '/includes/db.class.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/repositories/MonitoringRepository.php';

$i18n = [
    'pessoas' => 'Pessoas',
    'monitorizadas' => 'Monitorizadas',
    'camas' => 'Camas',
    'ocupadas' => 'Ocupadas',
    'vazias' => 'Vazias',
    'na_casa_de_banho' => 'Na Casa de Banho',
    'alertas' => 'Alertas',
    'quedas_em' => 'Quedas em',
    'quarto' => 'Quarto',
    'queda' => 'Queda',
    'wc' => 'WC',
    'porta' => 'Porta',
    'cama_de_monitorizacao' => 'Cama de Monitorização',
    'regiao_de_alarme' => 'Região de Alarme',
    'interferencia' => 'Interferência',
    'outras_regioes' => 'Outras Regiões',
    'fechar' => 'Fechar',
    'sinais_vitais' => 'Sinais Vitais',
    'relatorio' => 'Relatório',
    'estado_do_sono' => 'Estado do Sono',
    'eventos' => 'Eventos',
    'alarmes' => 'Alarmes',
    'min' => 'Mín',
    'media' => 'Média',
    'max' => 'Máx',
    'frequencia_cardiaca' => 'Frequência Cardíaca',
    'frequencia_respiratoria' => 'Frequência Respiratória',
    'detalhes_do_radar' => 'Detalhes do Radar',
    'monitorizacao_de_trajetos' => 'Monitorização de Trajetos',
    'conformidade' => 'Conformidade',
    'nao_conformidade' => 'Não Conformidade',
    'normal' => 'Normal',
    'vezes' => 'vezes',
    'duracao_de_sono' => 'Duração de Sono',
    'saidas_da_cama' => 'Saídas da Cama',
    'percentagem_de_sono_profundo' => '% de Sono Profundo',
    'ahi' => 'AHI',
    'frequencia_respiratoria_media' => 'Freq. Respiratória Média',
    'frequencia_cardiaca_media' => 'Freq. Cardíaca Média',
    'sono_profundo' => 'Sono Profundo',
    'sono_leve' => 'Sono Leve',
    'rem' => 'REM',
    'acordado' => 'Acordado',
    'frequencia_cardiaca_maxima' => 'Freq. Cardíaca Máxima',
    'frequencia_cardiaca_minima' => 'Freq. Cardíaca Mínima',
    'sinais_vitais_fracos' => 'Sinais Vitais Fracos',
    'policardia' => 'Policardia',
    'bradicardia' => 'Bradicardia',
    'frequencia_respiratoria_maxima' => 'Freq. Respiratória Máxima',
    'frequencia_respiratoria_minima' => 'Freq. Respiratória Mínima',
    'apneia' => 'Apneia',
    'taquipneia' => 'Taquipneia',
    'bradipneia' => 'Bradipneia',
    'quarto_interior_exterior' => 'Entradas/Saídas do Quarto',
    'passos_a_caminhar' => 'Passos a Caminhar',
    'velocidade_de_marcha' => 'Velocidade de Marcha',
    'sono' => 'Sono',
    'respiracao' => 'Respiração',
    'mensal_titulo_grafico' => '{tipo} - {topico}',
    'movimento_corporal' => 'Movimento Corporal',
    'rotina_diaria' => 'Rotina Diária',
    'atividade_diurna' => 'Atividade Diurna',
    'entrada_saida_sala' => 'Entradas/Saídas da Sala',
    'duracao_no_interior' => 'Duração no Interior',
    'relatorio_de_sono' => 'Relatório de Sono',
    'diario' => 'Diário',
    'mensal' => 'Mensal',
    'selecione_uma_data' => 'Selecione uma data',
    'dados_nao_encontrados' => 'Dados não encontrados',
    'nao_existem_registos' => 'Não existem registos para apresentar.',
    'informacoes_de_sono' => 'Informações de Sono',
    'sugestoes' => 'Sugestões',
    'sem_dados_para_apresentar' => 'Sem dados para apresentar',
    'informacao_do_grafico' => 'Informação do Gráfico',
    'tooltip_duracao_sono' => 'Duração total de sono nas últimas 24h',
    'tooltip_saidas_cama' => 'Número de saídas da cama nas últimas 24h',
    'tooltip_sono_profundo' => 'Percentagem de sono profundo nas últimas 24h',
    'tooltip_ahi' => 'Índice de Apneia-Hipopneia (AHI) nas últimas 24h',
    'estatisticas' => 'Estatísticas',
    'topico_duracao_sono' => 'Duração de Sono',
    'distribuicao' => 'Distribuição',
    'topico_frequencia_cardiaca' => 'Frequência Cardíaca',
    'topico_frequencia_respiratoria' => 'Frequência Respiratória',
    'topico_saidas_cama' => 'Saídas da Cama',
    'topico_movimento_corporal' => 'Movimento Corporal',
    'topico_sono_profundo' => 'Sono Profundo',
    'topico_eficiencia_sono' => 'Eficiência de Sono',
    'topico_percentagem_sono_profundo' => 'Percentagem de Sono Profundo',
    'topico_ahi' => 'Índice de Apneia-Hipopneia',
    'topico_anomalias_frequencia_cardiaca' => 'Anomalias de Frequência Cardíaca',
    'topico_indice_movimento_corporal' => 'Índice de Movimento Corporal',
    'topico_numero_saidas_cama' => 'Número de Saídas da Cama',
    'topico_frequencia_saidas_cama' => 'Frequência de Saídas da Cama',
    'topico_duracao_saidas_cama' => 'Duração de Saídas da Cama',
    'topico_horarios_saidas_cama' => 'Horários de Saídas da Cama',
    'topico_tempo_adormecer' => 'Tempo para Adormecer',
    'topico_horarios_rotina_diaria' => 'Horários de Rotina Diária',
    'conformidade' => 'Conformidade',
    'nao_conformidade' => 'Não conformidade',
    'normal' => 'Normal',
    'vezes' => 'vezes',
    'mensal_titulo_grafico' => 'Gráfico {tipo} - {topico}',
    'duracao_de_sono' => 'Duração de Sono',
    'saidas_da_cama' => 'Saídas da Cama',
    'percentagem_de_sono_profundo' => '% Sono Profundo',
    'ahi' => 'AHI',
    'frequencia_respiratoria_media' => 'Freq. Respiratória Média',
    'frequencia_cardiaca_media' => 'Freq. Cardíaca Média',
    'sono_profundo' => 'Sono Profundo',
    'sono_leve' => 'Sono Leve',
    'rem' => 'REM',
    'acordado' => 'Acordado',
    'frequencia_cardiaca_maxima' => 'FC Máxima',
    'frequencia_cardiaca_minima' => 'FC Mínima',
    'frequencia_respiratoria_maxima' => 'FR Máxima',
    'frequencia_respiratoria_minima' => 'FR Mínima',
    'sinais_vitais_fracos' => 'Sinais Vitais Fracos',
    'policardia' => 'Policardia',
    'bradicardia' => 'Bradicardia',
    'apneia' => 'Apneia',
    'taquipneia' => 'Taquipneia',
    'bradipneia' => 'Bradipneia',
    'quarto_interior_exterior' => 'Interior/Exterior',
    'passos_a_caminhar' => 'Passos a Caminhar',
    'velocidade_de_marcha' => 'Velocidade de Marcha',
    'sono' => 'Sono',
    'respiracao' => 'Respiração',
    'frequencia_respiratoria' => 'Frequência Respiratória',
    'frequencia_cardiaca' => 'Frequência Cardíaca',
    'movimento_corporal' => 'Movimento Corporal',
    'rotina_diaria' => 'Rotina Diária',
    'atividade_diurna' => 'Atividade Diurna',
    'entrada_saida_sala' => 'Entrada/Saída da Sala',
    'duracao_no_interior' => 'Duração no Interior',
    'relatorio_de_sono' => 'Relatório de Sono',
    'fechar' => 'Fechar',
    'diario' => 'Diário',
    'mensal' => 'Mensal',
    'selecione_uma_data' => 'Selecione uma data',
    'dados_nao_encontrados' => 'Dados não encontrados',
    'nao_existem_registos' => 'Não existem registos',
    'informacoes_de_sono' => 'Informações de Sono',
    'sugestoes' => 'Sugestões',
    'sem_dados_para_apresentar' => 'Sem dados para apresentar',
    'alarmes' => 'Alarmes',
    'eventos' => 'Eventos',
    'sinais_vitais' => 'Sinais Vitais',
    'estado_do_sono' => 'Estado do Sono',
    'relatorio' => 'Relatório',
    'min' => 'Min',
    'max' => 'Máx',
    'media' => 'Média',
    'detalhes_do_radar' => 'Detalhes do Radar',
    'monitorizacao_de_trajetos' => 'Monitorização de Trajetos',
];

$monitoringRepository = new MonitoringRepository($db);
$monitoringDashboard = $monitoringRepository->getDashboardData();
$displaye = ['stylecss' => sprintf("--colunas-dashboard-radares: %d", (int)$monitoringDashboard['config']['columns'])];
$canSilenceFallAlarms = (bool)$monitoringDashboard['config']['canSilenceFallAlarms'];

$monitoringCaseCards = [
    [
        'iconId' => 'icone-pessoas-monitorizadas',
        'iconClass' => 'fas fa-users',
        'indicatorId' => 'indicador-pessoas-monitorizadas',
        'indicatorText' => '0 ' . strtolower($i18n["pessoas"]),
        'labelHtml' => $i18n["monitorizadas"],
    ],
    [
        'iconId' => 'icone-camas-ocupadas',
        'iconClass' => 'fas fa-bed',
        'indicatorId' => 'indicador-camas-ocupadas',
        'indicatorText' => '0 ' . strtolower($i18n["camas"]),
        'labelHtml' => $i18n["ocupadas"],
    ],
    [
        'iconId' => 'icone-camas-vazias',
        'iconClass' => 'fas fa-bed',
        'indicatorId' => 'indicador-camas-vazias',
        'indicatorText' => '0 ' . strtolower($i18n["camas"]),
        'labelHtml' => $i18n["vazias"],
    ],
    [
        'iconId' => 'icone-pessoas-wc',
        'iconClass' => 'fas fa-toilet',
        'indicatorId' => 'indicador-pessoas-wc',
        'indicatorText' => '0 ' . strtolower($i18n["pessoas"]),
        'labelHtml' => $i18n["na_casa_de_banho"],
    ],
    [
        'iconId' => 'icone-alertas-queda-mes',
        'iconClass' => 'fas fa-exclamation-triangle',
        'indicatorId' => 'indicador-alertas-queda-mes',
        'indicatorText' => '0 ' . strtolower($i18n["alertas"]),
        'labelHtml' => $i18n["quedas_em"] . ' <span id="indicador-mes-atual">-</span>',
    ],
];

function renderMonitoringCaseCard(array $card)
{ ?>
    <div class="cartao-caso">
        <div class="card h-100">
            <div class="card-body">
                <div class="container-dashboard gap-4">
                    <i id="<?= htmlspecialchars($card['iconId']) ?>" class="<?= htmlspecialchars($card['iconClass']) ?> icone-tipo-caso icone-inativo"></i>
                    <div>
                        <div class="numero-casos">
                            <strong id="<?= htmlspecialchars($card['indicatorId']) ?>"><?= htmlspecialchars($card['indicatorText']) ?></strong>
                        </div>
                        <div class="nome-tipo-casos"><?= $card['labelHtml'] ?></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
<?php  }

function renderMonitoringRadarButton(array $radar, string $roomName, array $i18n): string
{
    $radarUid = trim((string)$radar['uid']);
    $quarto = !empty($i18n["quarto"]) ? $i18n["quarto"] : "Quarto";

    return sprintf(
        '<button
            type="button"
            class="btn btn-sm btn-icon btn-icon-md radar-link-button rounded-circle bg-danger text-white border-0"
            style="--size: 2rem; max-width: var(--size); max-height: var(--size);"
            data-toggle="modal" data-bs-toggle="modal" data-target="#radarModal" data-bs-target="#radarModal" data-id="%1$s" data-wc="%2$d" data-name="%3$s">
                <i class="fas fa-wifi estado-dispositivo text-white"></i>
        </button>',
        htmlspecialchars($radarUid, ENT_QUOTES, 'UTF-8'),
        (int)$radar['wc'],
        htmlspecialchars($quarto . " " . $roomName . ' (' . $radarUid . ')', ENT_QUOTES, 'UTF-8')
    );
}

function renderMonitoringFallAlert(array $i18n): void
{ ?>
    <div class="item-alerta flex-fill text-center d-none">
        <h6><?= $i18n['queda'] ?></h6>
        <svg style="height: 50px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path fill="#fd397a" d="M288 64C305.7 64 320 78.3 320 96L320 101.4C320 156.6 296.3 208.4 256.1 244.5L319 320L408 320C423.1 320 437.3 327.1 446.4 339.2L489.6 396.8C500.2 410.9 497.3 431 483.2 441.6C469.1 452.2 449 449.3 438.4 435.2L400 384L295.2 384L408.8 523.8C419.9 537.5 417.9 557.7 404.1 568.8C390.3 579.9 370.2 577.9 359.1 564.1L169.4 330.6C163.3 345.6 160 361.9 160 378.6L160 448C160 465.7 145.7 480 128 480C110.3 480 96 465.7 96 448L96 378.6C96 311.2 131.4 248.7 189.2 214L193.8 211.2C232.4 188 256 146.4 256 101.4L256 96C256 78.3 270.3 64 288 64zM48 152C48 121.1 73.1 96 104 96C134.9 96 160 121.1 160 152C160 182.9 134.9 208 104 208C73.1 208 48 182.9 48 152zM424 144.1C424 157.4 413.3 168.1 400 168.1C386.7 168.1 376 157.4 376 144.1L376 96.1C376 82.8 386.7 72.1 400 72.1C413.3 72.1 424 82.8 424 96.1L424 144.1zM528 296.1C514.7 296.1 504 285.4 504 272.1C504 258.8 514.7 248.1 528 248.1L576 248.1C589.3 248.1 600 258.8 600 272.1C600 285.4 589.3 296.1 576 296.1L528 296.1zM473.5 198.6C464.1 189.2 464.1 174 473.5 164.7L507.4 130.8C516.8 121.4 532 121.4 541.3 130.8C550.6 140.2 550.7 155.4 541.3 164.7L507.4 198.6C498 208 482.8 208 473.5 198.6z" />
        </svg>
    </div>
<?php }

function renderMonitoringBedItem(array $bed, array $bedRadarButtons, bool $hideIdentity): void
{
    $bedNameHtml = htmlspecialchars($bed['name'], ENT_QUOTES, 'UTF-8');
    $bedButtonsHtml = implode('', $bedRadarButtons[(int)$bed['id']] ?? []);
?>
        <div class="item-cama flex-fill text-center" data-cama="<?= (int)$bed['id'] ?>">
            <?php if (!$hideIdentity || $bedButtonsHtml !== '') { ?>
                <div class="item-cama-utente gap-2">
                    <?php if (!$hideIdentity) { ?>
                        <div class="item-cama-utente__pic">
                            <img src="<?= htmlspecialchars($bed['imagePath'], ENT_QUOTES, 'UTF-8') ?>" class="item-cama-avatar" alt="<?= $bedNameHtml ?>">
                        </div>
                        <div class="item-cama-utente__details">
                            <span class="item-cama-utente__nome"><?= $bedNameHtml ?></span>
                        </div>
                    <?php } ?>
                    <?php if ($bedButtonsHtml !== '') { ?>
                        <div class="item-cama-radares">
                            <?= $bedButtonsHtml ?>
                        </div>
                    <?php } ?>
                </div>
            <?php } ?>
            <i class="fas fa-bed estado-na-cama"></i>
        </div>
<?php }

function renderMonitoringRoomCard(array $room, array $i18n): void
{
    $roomName = trim((string)$room['name']);
    $floorName = trim((string)$room['floorName']);
    $roomRadarButtons = array_map(function ($radar) use ($roomName, $i18n) {
        return renderMonitoringRadarButton($radar, $roomName, $i18n);
    }, $room['roomRadars']);
    $wcRadarButtons = array_map(function ($radar) use ($roomName, $i18n) {
        return renderMonitoringRadarButton($radar, $roomName, $i18n);
    }, $room['wcRadars']);
    $bedRadarButtons = [];
    foreach ($room['bedRadarsByBedId'] as $bedId => $radars) {
        $bedRadarButtons[(int)$bedId] = array_map(function ($radar) use ($roomName, $i18n) {
            return renderMonitoringRadarButton($radar, $roomName, $i18n);
        }, $radars);
    }
?>
    <div class="item-radar radar" data-quarto="<?= (int)$room['id'] ?>" data-quarto-nome="<?= htmlspecialchars($roomName, ENT_QUOTES, 'UTF-8') ?>" data-piso="<?= htmlspecialchars($floorName, ENT_QUOTES, 'UTF-8') ?>">
        <div class="card h-100">
            <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
                <h5 class="mb-0 text-truncate">
                    <?= $i18n["quarto"] ?>: <?= htmlspecialchars($roomName, ENT_QUOTES, 'UTF-8') ?>
                </h5>
                <div class="d-flex align-items-center ms-2">
                    <?php if (!empty($roomRadarButtons)) { ?>
                        <div class="d-inline-flex gap-1">
                            <?= implode('', $roomRadarButtons) ?>
                        </div>
                    <?php } ?>
                </div>
            </div>

            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center w-100">
                    <div class="flex-fill text-center me-2">
                            <div class="radar-icon-info d-flex justify-content-between align-items-center mb-2 container-camas">
                                <?php renderMonitoringFallAlert($i18n); ?>
                                <?php
                                foreach ($room['beds'] as $bed) {
                                    $hideIdentity = empty($bed['hasPatient']);
                                    renderMonitoringBedItem($bed, $bedRadarButtons, $hideIdentity);
                                }
                                ?>
                            </div>
                        <div class="radar-descricao-info">
                            <?= $i18n['pessoas'] ?>: <span class="numero-pessoas-camas">0</span>
                        </div>
                    </div>

                    <?php if (!empty($room['hasWc'])) { ?>
                        <div class="flex-fill text-center ms-2">
                            <div class="radar-icon-info mb-2 container-wc">
                                <?php renderMonitoringFallAlert($i18n); ?>
                                <div class="item-wc flex-fill text-center">
                                    <div class="item-wc-header">
                                        <h6 class="mb-0"><?= $i18n["wc"] ?></h6>
                                        <?php if (!empty($wcRadarButtons)) { ?>
                                            <div class="item-wc-radares">
                                                <?= implode('', $wcRadarButtons) ?>
                                            </div>
                                        <?php } ?>
                                    </div>
                                    <i class="fas fa-toilet"></i>
                                </div>
                            </div>
                            <div class="radar-descricao-info">
                                <?= $i18n['pessoas'] ?>: <span class="numero-pessoas-wc">0</span>
                            </div>
                        </div>
                    <?php } ?>
                </div>
            </div>
        </div>
    </div>
<?php }

?>
<!DOCTYPE html>
<html lang="pt">

<!-- begin::Head -->

<head>
    <base href="">
    <meta charset="utf-8" />
    <title>Stress Test — Radar Monitorização</title>
    <meta name="description" content="">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <link href="/_css/custom.1.css" rel="stylesheet" />
    <link rel="icon" href="data:," />
</head>

<!-- end::Head -->

<!-- begin::Body -->

<body class="bg-light" permissoes="<?= $displaye['stylecss'] ?>" data-touch-app-nfc-alertas-radares="<?= $canSilenceFallAlarms ? 1 : 0 ?>">

    <div class="container-fluid py-3">
                        <div class="linha-cartoes-casos mb-4">
                            <?php foreach ($monitoringCaseCards as $card) renderMonitoringCaseCard($card); ?>
                        </div>

                        <?php foreach ($monitoringDashboard['groups'] as $group) { ?>
                            <div class="row">
                                <div class="col-12">
                                    <h4 class="fw-bold mt-3 mb-2"><?= $group['labelHtml'] ?></h4>
                                </div>
                            </div>

                            <div class="d-flex flex-wrap w-100 align-items-center mb-3" style="gap: 0.75rem;">
                                <?php foreach ($group['rooms'] as $room) renderMonitoringRoomCard($room, $i18n); ?>
                            </div>
                        <?php } ?>

                        <!-- Modal -->
                        <div class="modal fade" id="detalhe-modal-ajax" tabindex="-1" role="dialog" aria-hidden="true"></div>
                    </div>

    <!-- end:: Page -->

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
    <script src="/assets/plugins/custom/datatables/i18n/pt.json" type="application/json"></script>
    <script src="/_js/custom.js"></script>

    <!-- AM Charts 5 -->
    <script src="https://cdn.amcharts.com/lib/5/index.js"></script>
    <script src="https://cdn.amcharts.com/lib/5/xy.js"></script>
    <script src="https://cdn.amcharts.com/lib/5/percent.js"></script>
    <script src="https://cdn.amcharts.com/lib/5/themes/Animated.js"></script>

    <!-- Konva -->
    <script src="https://unpkg.com/konva@9/konva.min.js"></script>

    <script>
        // Hardcoded translations for JS (normally provided by resources.php)
        var translations = {
            i18n: {
                "pessoas": "Pessoas",
                "pessoa": "pessoa",
                "camas": "Camas",
                "cama": "cama",
                "alertas": "Alertas",
                "alerta": "alerta",
                "data_e_hora": "Data e Hora",
                "tipo_de_evento": "Tipo de Evento",
                "detalhes": "Detalhes",
                "tipo_de_alarme": "Tipo de Alarme",
                "regiao_de_alarme": "Região de Alarme",
                "inicio_tratamento": "Início do Tratamento",
                "fim_tratamento": "Fim do Tratamento",
                "duracao_tratamento": "Duração do Tratamento",
                "marcar_alarme_resolvido": "Marcar alarme como resolvido?",
                "silenciar_alarme": "Silenciar alarme?",
                "monitorizadas": "Monitorizadas",
                "ocupadas": "Ocupadas",
                "vazias": "Vazias",
                "quarto": "Quarto",
                "porta": "Porta",
                "cama_de_monitorizacao": "Cama de Monitorização",
                "interferencia": "Interferência",
                "outras_regioes": "Outras Regiões",
                "alarmes": "Alarmes",
                "eventos": "Eventos",
                "sinais_vitais": "Sinais Vitais",
                "wc": "WC",
                "relatorio": "Relatório",
                "min": "Min",
                "max": "Máx",
                "media": "Média",
                "detalhes_do_radar": "Detalhes do Radar",
                "monitorizacao_de_trajetos": "Monitorização de Trajetos",
                "informacao_do_grafico": "Informação do Gráfico",
                "sem_dados_para_apresentar": "Sem dados para apresentar",
                "sono_profundo": "Sono Profundo",
                "sono_leve": "Sono Leve",
                "rem": "REM",
                "acordado": "Acordado",
                "duracao_de_sono": "Duração de Sono",
                "saidas_da_cama": "Saídas da Cama",
                "percentagem_de_sono_profundo": "% Sono Profundo",
                "ahi": "AHI",
                "frequencia_respiratoria_media": "Freq. Respiratória Média",
                "frequencia_cardiaca_media": "Freq. Cardíaca Média",
                "frequencia_cardiaca_maxima": "FC Máxima",
                "frequencia_cardiaca_minima": "FC Mínima",
                "frequencia_respiratoria_maxima": "FR Máxima",
                "frequencia_respiratoria_minima": "FR Mínima",
                "sinais_vitais_fracos": "Sinais Vitais Fracos",
                "policardia": "Policardia",
                "bradicardia": "Bradicardia",
                "apneia": "Apneia",
                "taquipneia": "Taquipneia",
                "bradipneia": "Bradipneia",
                "passos_a_caminhar": "Passos a Caminhar",
                "velocidade_de_marcha": "Velocidade de Marcha",
                "quarto_interior_exterior": "Interior/Exterior",
                "entrada_saida_sala": "Entrada/Saída da Sala",
                "duracao_no_interior": "Duração no Interior",
                "mapa_nao_disponivel": "Mapa não disponível",
                "configure_layout_monitorizacao": "Configure o layout de monitorização",
                "radar": "Radar",
                "pessoa_label": "Pessoa",
                "ferias": "Férias",
                "dados_diarios": "Dados Diários",
                "total": "Total",
                "conformidade": "Conformidade",
                "nao_conformidade": "Não conformidade",
                "normal": "Normal",
                "fechar": "Fechar",
                "confirmar": "Confirmar",
                "cancelar": "Cancelar",
                "sim": "Sim",
                "nao": "Não",
                "carregando": "Carregando...",
                "sem_dados": "Sem dados",
                "nao_aplicavel": "N/A",
                "todos": "Todos",
                "pesquisar": "Pesquisar",
                "limpar": "Limpar",
                "atualizar": "Atualizar",
                "efeito_atrasado": "Efeito Atrasado"
            }
        };
</script>
<script>
        $('#detalhe-modal-ajax').on('hidden.bs.modal', function() {
            if (typeof alerta_sair_browser === 'function') {
                alerta_sair_browser(false);
            }
        });
    </script>

    <script type="module">
        import { init } from "/_js/radar/main.js";
        init();
    </script>

    <?php modal('radar', array('i18n' => $i18n)); ?>
    <?php modal('fall-replay', array('i18n' => $i18n)); ?>
    <?php modal('sleep-report', array('i18n' => $i18n)); ?>

</body>

<!-- end::Body -->

</html>
