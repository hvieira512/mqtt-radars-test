-- ═══════════════════════════════════════════════════════════
-- Seed historical data for 30 days
-- ═══════════════════════════════════════════════════════════

USE radar_test;

-- Helper: numbers table for multiplying rows
CREATE TEMPORARY TABLE IF NOT EXISTS nums (n INT PRIMARY KEY);
INSERT IGNORE INTO nums VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),
(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),
(21),(22),(23),(24),(25),(26),(27),(28),(29),(30);

-- ─── Phase 1: Events ───────────────────────────────────────
-- Multiply events across past 30 days
INSERT INTO radares_eventos (dispositivo_id, tipo_evento_id, recebido_em)
SELECT
    e.dispositivo_id,
    e.tipo_evento_id,
    DATE_ADD(
        DATE_SUB(CURDATE(), INTERVAL n DAY),
        INTERVAL TIME(e.recebido_em) HOUR_SECOND
    ) AS recebido_em
FROM radares_eventos e
CROSS JOIN nums n
WHERE e.recebido_em >= CURDATE() - INTERVAL 1 DAY
  AND e.id <= (SELECT MAX(id) - 100000 FROM radares_eventos);

-- ─── Phase 2: Positions (3 people per position event) ──────
INSERT INTO radares_posicao_pessoas (evento_id, indice_pessoa, posicao_x_dm, posicao_y_dm, posicao_z_cm, tempo_restante_seg, estado_postura, ultimo_evento, regiao_id)
SELECT e.id, p.n, 50, 30, 100, 30, 'Standing', 'No Event', 0
FROM radares_eventos e
CROSS JOIN (SELECT 0 AS n UNION SELECT 1 UNION SELECT 2) p
WHERE e.recebido_em >= CURDATE() - INTERVAL 30 DAY
  AND e.recebido_em < CURDATE() - INTERVAL 1 DAY
  AND e.tipo_evento_id = 1;

-- ─── Phase 3: Vitals ───────────────────────────────────────
INSERT INTO radares_sinais_vitais (evento_id, taxa_respiracao, ritmo_cardiaco, estado_sono)
SELECT e.id, 18, 72, 'Awake'
FROM radares_eventos e
WHERE e.recebido_em >= CURDATE() - INTERVAL 30 DAY
  AND e.recebido_em < CURDATE() - INTERVAL 1 DAY
  AND e.tipo_evento_id = 3;

-- ─── Phase 4: Detecoes (small sample for playback test) ────
INSERT INTO radares_detecoes (evento_id, dispositivo_id, categoria, tipo, nivel, origem, indice_pessoa, regiao_id, mensagem, criado_em)
SELECT e.id, e.dispositivo_id, 'alarme', 'fall_confirmed', 'perigo', 'position', 0, NULL, 'Queda confirmada', DATE_SUB(e.recebido_em, INTERVAL 2 SECOND)
FROM radares_eventos e
WHERE e.recebido_em >= CURDATE() - INTERVAL 30 DAY
  AND e.recebido_em < CURDATE() - INTERVAL 1 DAY
  AND e.tipo_evento_id = 1
  AND e.id % 500 = 0;
