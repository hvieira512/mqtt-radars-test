<?php
header('Content-Type: text/html; charset=utf-8');

require_once __DIR__ . '/../../includes/db.class.php';
require_once __DIR__ . '/../../helpers.php';
require_once __DIR__ . '/../../repositories/MonitoringRepository.php';
require_once __DIR__ . '/../../includes/room-card-renderer.php';

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
    'ferias' => 'Férias',
    'dados_diarios' => 'Dados Diários',
    'total' => 'Total',
];

$groupIndex = (int)($_GET['group'] ?? 0);
$offset = (int)($_GET['offset'] ?? 0);
$limit = (int)($_GET['limit'] ?? 20);
$limit = max(1, min($limit, 50));

if ($offset < 0) { $offset = 0; }

$monitoringRepository = new MonitoringRepository($db);
$dashboard = $monitoringRepository->getDashboardData();

if (!isset($dashboard['groups'][$groupIndex])) { exit; }

$group = $dashboard['groups'][$groupIndex];
$rooms = array_slice($group['rooms'], $offset, $limit);

foreach ($rooms as $room) {
    renderMonitoringRoomCard($room, $i18n);
}
