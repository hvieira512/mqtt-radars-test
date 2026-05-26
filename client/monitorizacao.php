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

require_once __DIR__ . '/includes/room-card-renderer.php';

$BATCH_SIZE = 20;

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

                        <?php foreach ($monitoringDashboard['groups'] as $gi => $group) { ?>
                            <div class="row">
                                <div class="col-12">
                                    <h4 class="fw-bold mt-3 mb-2"><?= $group['labelHtml'] ?></h4>
                                </div>
                            </div>

                            <div class="d-flex flex-wrap w-100 align-items-center mb-3 room-group" data-group="<?= $gi ?>" style="gap: 0.75rem;">
                                <?php
                                $initialRooms = array_slice($group['rooms'], 0, $BATCH_SIZE);
                                foreach ($initialRooms as $room) renderMonitoringRoomCard($room, $i18n);
                                ?>
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
    <script src="/_js/custom.1.js"></script>

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

    <?php modal('radar', array('i18n' => $i18n)); ?>
    <?php modal('fall-replay', array('i18n' => $i18n)); ?>
    <?php modal('sleep-report', array('i18n' => $i18n)); ?>

    <script src="/_js/radar-all.js"></script>

    <script>
    (function() {
        var BATCH_SIZE = <?= $BATCH_SIZE ?>;
        var ROOMS_URL = '/modulos/radares/_ajax/radar-data/rooms-html.php';
        var groups = document.querySelectorAll('.room-group');

        function loadBatch(groupIndex, offset) {
            fetch(ROOMS_URL + '?group=' + groupIndex + '&offset=' + offset + '&limit=' + BATCH_SIZE)
                .then(function(r) { return r.text(); })
                .then(function(html) {
                    if (!html || html.trim() === '') return;
                    var container = document.querySelector('.room-group[data-group="' + groupIndex + '"]');
                    if (!container) return;
                    container.insertAdjacentHTML('beforeend', html);
                    var count = (html.match(/item-radar/g) || []).length;
                    if (count > 0) {
                        setTimeout(function() { loadBatch(groupIndex, offset + count); }, 5);
                    }
                })
                .catch(function() {});
        }

        function startLoading() {
            groups.forEach(function(g) {
                var gi = parseInt(g.getAttribute('data-group'), 10);
                setTimeout(function() { loadBatch(gi, BATCH_SIZE); }, 10);
            });
        }

        if (document.readyState === 'complete') {
            startLoading();
        } else {
            window.addEventListener('load', startLoading);
        }
    })();
    </script>

</body>

<!-- end::Body -->

</html>
