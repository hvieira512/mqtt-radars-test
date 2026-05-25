CREATE DATABASE IF NOT EXISTS radar_test;
USE radar_test;

CREATE USER IF NOT EXISTS 'radar_user'@'%' IDENTIFIED BY 'radar_pass';
GRANT ALL PRIVILEGES ON radar_test.* TO 'radar_user'@'%';
FLUSH PRIVILEGES;

-- ─── radares ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS radares (
    id int(11) NOT NULL AUTO_INCREMENT,
    uid varchar(50) NOT NULL,
    criado_em timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY idx_radares_uid (uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── configs_tipologias ────────────────────────────────────
CREATE TABLE IF NOT EXISTS configs_tipologias (
    id int(11) NOT NULL AUTO_INCREMENT,
    abreviatura varchar(50) NOT NULL DEFAULT '',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── configs_tipologia_pisos ───────────────────────────────
CREATE TABLE IF NOT EXISTS configs_tipologia_pisos (
    id int(11) NOT NULL AUTO_INCREMENT,
    nome varchar(100) NOT NULL DEFAULT '',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── quartos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quartos (
    id int(11) NOT NULL AUTO_INCREMENT,
    nomeQuarto varchar(100) DEFAULT NULL,
    tipologia int(11) DEFAULT 1,
    id_piso int(11) DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── camas ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS camas (
    id int(11) NOT NULL AUTO_INCREMENT,
    id_quarto int(11) NOT NULL DEFAULT 0,
    descricao varchar(100) DEFAULT '',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── utentes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utentes (
    id int(11) NOT NULL AUTO_INCREMENT,
    nomeSerTratado varchar(100) DEFAULT '',
    imagem varchar(200) DEFAULT 'default.png',
    rotacao_imagem int(11) DEFAULT 0,
    estado int(11) DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── utentes_admissao ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS utentes_admissao (
    id int(11) NOT NULL AUTO_INCREMENT,
    quarto int(11) DEFAULT NULL,
    cama int(11) DEFAULT NULL,
    data_arquivado datetime DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_admissao_quarto (quarto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── radares_esquema ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS radares_esquema (
    id_radar int(11) NOT NULL,
    id_quarto int(11) NOT NULL,
    id_cama int(11) DEFAULT NULL,
    wc tinyint(4) DEFAULT 0,
    PRIMARY KEY (id_radar),
    KEY idx_esquema_quarto (id_quarto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── radares_layouts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS radares_layouts (
    id int(11) NOT NULL AUTO_INCREMENT,
    dispositivo_id int(11) NOT NULL,
    rectangle text DEFAULT NULL,
    declare_area text DEFAULT NULL,
    declare_area_name text DEFAULT NULL,
    valido_de datetime NOT NULL DEFAULT current_timestamp(),
    valido_ate datetime DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_layout_device (dispositivo_id),
    KEY idx_layout_validade (dispositivo_id, valido_ate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── configs_ucc ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configs_ucc (
    id int(11) NOT NULL AUTO_INCREMENT,
    touch_app_nfc_alertas_radares int(11) DEFAULT 0,
    colunas_dashboard_radares int(11) DEFAULT 5,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── radares_eventos ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS radares_eventos (
    id bigint(20) NOT NULL AUTO_INCREMENT,
    dispositivo_id int(11) NOT NULL,
    tipo_evento_id int(11) NOT NULL,
    recebido_em datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id, recebido_em),
    KEY idx_eventos_device_type_time (dispositivo_id, tipo_evento_id, recebido_em, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
PARTITION BY RANGE (TO_DAYS(recebido_em)) (
    PARTITION p_2025_old VALUES LESS THAN (TO_DAYS('2025-05-01')),
    PARTITION p_2025_05  VALUES LESS THAN (TO_DAYS('2025-06-01')),
    PARTITION p_2025_06  VALUES LESS THAN (TO_DAYS('2025-07-01')),
    PARTITION p_2025_07  VALUES LESS THAN (TO_DAYS('2025-08-01')),
    PARTITION p_2025_08  VALUES LESS THAN (TO_DAYS('2025-09-01')),
    PARTITION p_2025_09  VALUES LESS THAN (TO_DAYS('2025-10-01')),
    PARTITION p_2025_10  VALUES LESS THAN (TO_DAYS('2025-11-01')),
    PARTITION p_2025_11  VALUES LESS THAN (TO_DAYS('2025-12-01')),
    PARTITION p_2025_12  VALUES LESS THAN (TO_DAYS('2026-01-01')),
    PARTITION p_2026_01  VALUES LESS THAN (TO_DAYS('2026-02-01')),
    PARTITION p_2026_02  VALUES LESS THAN (TO_DAYS('2026-03-01')),
    PARTITION p_2026_03  VALUES LESS THAN (TO_DAYS('2026-04-01')),
    PARTITION p_2026_04  VALUES LESS THAN (TO_DAYS('2026-05-01')),
    PARTITION p_2026_05  VALUES LESS THAN (TO_DAYS('2026-06-01')),
    PARTITION p_2026_06  VALUES LESS THAN (TO_DAYS('2026-07-01')),
    PARTITION p_2026_07  VALUES LESS THAN (TO_DAYS('2026-08-01')),
    PARTITION p_2026_08  VALUES LESS THAN (TO_DAYS('2026-09-01')),
    PARTITION p_future   VALUES LESS THAN MAXVALUE
);

-- ─── radares_posicao_pessoas ──────────────────────────────
CREATE TABLE IF NOT EXISTS radares_posicao_pessoas (
    evento_id bigint(20) NOT NULL,
    indice_pessoa tinyint(3) unsigned NOT NULL,
    posicao_x_dm tinyint DEFAULT NULL,
    posicao_y_dm tinyint DEFAULT NULL,
    posicao_z_cm tinyint unsigned DEFAULT NULL,
    tempo_restante_seg tinyint unsigned DEFAULT NULL,
    estado_postura enum('Initialization','Walking','Suspected Fall','Squatting','Standing','Fall Confirmation','Lying Down','Suspected Sitting on Ground','Confirmed Sitting on Ground','Sitting Up Bed','Suspected Sitting Up Bed','Confirmed Sitting Up Bed','Unknown') DEFAULT NULL,
    ultimo_evento enum('No Event','Enter Room','Leave Room','Enter Area','Leave Area','Unknown') DEFAULT NULL,
    regiao_id tinyint unsigned DEFAULT NULL,
    PRIMARY KEY (evento_id, indice_pessoa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── radares_estado_pessoas ───────────────────────────────
CREATE TABLE IF NOT EXISTS radares_estado_pessoas (
    dispositivo_id int(11) NOT NULL,
    indice_pessoa tinyint unsigned NOT NULL,
    evento_id bigint(20) NOT NULL,
    posicao_x_dm tinyint DEFAULT NULL,
    posicao_y_dm tinyint DEFAULT NULL,
    posicao_z_cm tinyint unsigned DEFAULT NULL,
    tempo_restante_seg tinyint unsigned DEFAULT NULL,
    estado_postura enum('Initialization','Walking','Suspected Fall','Squatting','Standing','Fall Confirmation','Lying Down','Suspected Sitting on Ground','Confirmed Sitting on Ground','Sitting Up Bed','Suspected Sitting Up Bed','Confirmed Sitting Up Bed','Unknown') DEFAULT NULL,
    ultimo_evento enum('No Event','Enter Room','Leave Room','Enter Area','Leave Area','Unknown') DEFAULT NULL,
    regiao_id tinyint unsigned DEFAULT NULL,
    atualizado_em timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (dispositivo_id, indice_pessoa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── radares_sinais_vitais ────────────────────────────────
CREATE TABLE IF NOT EXISTS radares_sinais_vitais (
    evento_id bigint(20) NOT NULL,
    taxa_respiracao tinyint unsigned DEFAULT NULL,
    ritmo_cardiaco tinyint unsigned DEFAULT NULL,
    estado_sono enum('Undefined','Light Sleep','Deep Sleep','Awake') DEFAULT NULL,
    PRIMARY KEY (evento_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── radares_estatisticas_minuto ──────────────────────────
CREATE TABLE IF NOT EXISTS radares_estatisticas_minuto (
    evento_id bigint(20) NOT NULL,
    versao tinyint unsigned DEFAULT NULL,
    contagem_pessoas tinyint unsigned DEFAULT NULL,
    distancia_caminhada smallint unsigned DEFAULT NULL,
    tempo_caminhada tinyint unsigned DEFAULT NULL,
    tempo_meditacao tinyint unsigned DEFAULT NULL,
    tempo_na_cama tinyint unsigned DEFAULT NULL,
    tempo_em_pe tinyint unsigned DEFAULT NULL,
    tempo_multiplayer tinyint unsigned DEFAULT NULL,
    respiracao_ativa tinyint unsigned DEFAULT NULL,
    PRIMARY KEY (evento_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── radares_estatisticas_sono ────────────────────────────
CREATE TABLE IF NOT EXISTS radares_estatisticas_sono (
    evento_id bigint(20) NOT NULL,
    respiracao_tempo_real tinyint unsigned DEFAULT NULL,
    ritmo_cardiaco_tempo_real tinyint unsigned DEFAULT NULL,
    media_respiracao_min tinyint unsigned DEFAULT NULL,
    media_ritmo_cardiaco_min tinyint unsigned DEFAULT NULL,
    estado_respiracao enum('Normal','Hypopnea','Hyperpnea','Apnea','unknown') DEFAULT NULL,
    estado_ritmo_cardiaco enum('Normal','Low','High','Undefined','unknown') DEFAULT NULL,
    estado_sinais_vitais enum('Normal','Undefined','Weak','unknown') DEFAULT NULL,
    estado_sono enum('Undefined','Light Sleep','Deep Sleep','Awake','unknown') DEFAULT NULL,
    PRIMARY KEY (evento_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── radares_ultimo_evento ────────────────────────────────
CREATE TABLE IF NOT EXISTS radares_ultimo_evento (
    dispositivo_id int NOT NULL PRIMARY KEY,
    ultimo_recebido_em datetime NOT NULL,
    criado_em timestamp NOT NULL DEFAULT current_timestamp(),
    atualizado_em timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── radares_detecoes ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS radares_detecoes (
    id bigint(20) NOT NULL AUTO_INCREMENT,
    evento_id bigint(20) DEFAULT NULL,
    dispositivo_id int(11) DEFAULT NULL,
    categoria varchar(20) DEFAULT NULL,
    tipo varchar(50) DEFAULT NULL,
    nivel varchar(20) DEFAULT NULL,
    origem varchar(20) DEFAULT NULL,
    indice_pessoa int(11) DEFAULT NULL,
    regiao_id int(11) DEFAULT NULL,
    mensagem text DEFAULT NULL,
    criado_em timestamp NOT NULL DEFAULT current_timestamp(),
    intervencao_inicio datetime DEFAULT NULL,
    intervencao_inicio_por int(11) DEFAULT NULL,
    intervencao_fim datetime DEFAULT NULL,
    intervencao_fim_por int(11) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_det_dispositivo (dispositivo_id),
    KEY idx_det_tipo (tipo),
    KEY idx_det_device_time (dispositivo_id, criado_em, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ═══════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE radares_ultimo_evento;
TRUNCATE TABLE radares_detecoes;
TRUNCATE TABLE radares_estatisticas_sono;
TRUNCATE TABLE radares_estatisticas_minuto;
TRUNCATE TABLE radares_sinais_vitais;
TRUNCATE TABLE radares_estado_pessoas;
TRUNCATE TABLE radares_posicao_pessoas;
TRUNCATE TABLE radares_eventos;
TRUNCATE TABLE radares_layouts;
TRUNCATE TABLE radares_esquema;
TRUNCATE TABLE radares;
TRUNCATE TABLE quartos;
TRUNCATE TABLE camas;
TRUNCATE TABLE utentes;
TRUNCATE TABLE utentes_admissao;
TRUNCATE TABLE configs_ucc;
TRUNCATE TABLE configs_tipologias;
TRUNCATE TABLE configs_tipologia_pisos;
SET FOREIGN_KEY_CHECKS = 1;

-- ─── Config tables ────────────────────────────────────────
INSERT INTO configs_tipologias (id, abreviatura) VALUES (1, 'UCC');
INSERT INTO configs_tipologia_pisos (id, nome) VALUES (1, 'Piso 0');
INSERT INTO configs_ucc (touch_app_nfc_alertas_radares, colunas_dashboard_radares) VALUES (1, 5);

-- ─── Seed 500 devices ─────────────────────────────────────
INSERT INTO radares (uid) VALUES
('9D8A3204F853'), ('9D8A3204F854'), ('9D8A3204F855'), ('9D8A3204F856'), ('9D8A3204F857'),
('9D8A3204F858'), ('9D8A3204F859'), ('9D8A3204F85A'), ('9D8A3204F85B'), ('9D8A3204F85C'),
('594B3CF100A7'), ('594B3CF100A8'), ('594B3CF100A9'), ('594B3CF100AA'), ('594B3CF100AB'),
('594B3CF100AC'), ('594B3CF100AD'), ('594B3CF100AE'), ('594B3CF100AF'), ('594B3CF100B0'),
('414D74184CBF'), ('414D74184CC0'), ('414D74184CC1'), ('414D74184CC2'), ('414D74184CC3'),
('414D74184CC4'), ('414D74184CC5'), ('414D74184CC6'), ('414D74184CC7'), ('414D74184CC8');

INSERT INTO radares (uid)
SELECT CONCAT('TEST', LPAD(HEX(1000 + (@row := @row + 1)), 8, '0')) AS uid
FROM information_schema.COLUMNS t1
CROSS JOIN information_schema.COLUMNS t2
CROSS JOIN (SELECT @row := 30) r
LIMIT 470;

-- ─── Seed 200 rooms ───────────────────────────────────────
INSERT INTO quartos (id, nomeQuarto, tipologia, id_piso)
SELECT n, CONCAT('Room ', n), 1, 1
FROM (
    SELECT (@r := @r + 1) AS n
    FROM information_schema.COLUMNS t1
    CROSS JOIN information_schema.COLUMNS t2
    CROSS JOIN (SELECT @r := 0) init
    LIMIT 200
) nums;

-- ─── Seed 200 beds ────────────────────────────────────────
INSERT INTO camas (id, id_quarto, descricao)
SELECT n, n, CONCAT('Cama ', n)
FROM (
    SELECT (@b := @b + 1) AS n
    FROM information_schema.COLUMNS t1
    CROSS JOIN (SELECT @b := 0) init
    LIMIT 200
) nums;

-- ─── Assign radars to rooms with diverse topology ─────────
-- 1-80:     room + WC + bed   (240)
-- 81-140:   room + bed        (120)
-- 141-170:  room only         (30)
-- 171-190:  bed only          (20)
-- 191-200:  WC only           (10)
-- extra:    +40 room +40 bed  (80)
-- total:    500

-- Radars 1-80 → room radars for rooms 1-80
INSERT INTO radares_esquema (id_radar, id_quarto, wc)
SELECT r.id, r.id, 0
FROM radares r
WHERE r.id BETWEEN 1 AND 80;

-- Radars 81-160 → WC radars for rooms 1-80
INSERT INTO radares_esquema (id_radar, id_quarto, wc)
SELECT r.id, (r.id - 80), 1
FROM radares r
WHERE r.id BETWEEN 81 AND 160;

-- Radars 161-240 → bed radars for rooms 1-80
INSERT INTO radares_esquema (id_radar, id_quarto, id_cama, wc)
SELECT r.id, (r.id - 160), (r.id - 160), 0
FROM radares r
WHERE r.id BETWEEN 161 AND 240;

-- Radars 241-300 → room radars for rooms 81-140
INSERT INTO radares_esquema (id_radar, id_quarto, wc)
SELECT r.id, (r.id - 160), 0
FROM radares r
WHERE r.id BETWEEN 241 AND 300;

-- Radars 301-360 → bed radars for rooms 81-140
INSERT INTO radares_esquema (id_radar, id_quarto, id_cama, wc)
SELECT r.id, (r.id - 220), (r.id - 220), 0
FROM radares r
WHERE r.id BETWEEN 301 AND 360;

-- Radars 361-390 → room-only setup for rooms 141-170
INSERT INTO radares_esquema (id_radar, id_quarto, wc)
SELECT r.id, (r.id - 220), 0
FROM radares r
WHERE r.id BETWEEN 361 AND 390;

-- Radars 391-410 → bed-only setup for rooms 171-190
INSERT INTO radares_esquema (id_radar, id_quarto, id_cama, wc)
SELECT r.id, (r.id - 220), (r.id - 220), 0
FROM radares r
WHERE r.id BETWEEN 391 AND 410;

-- Radars 411-420 → WC-only setup for rooms 191-200
INSERT INTO radares_esquema (id_radar, id_quarto, wc)
SELECT r.id, (r.id - 220), 1
FROM radares r
WHERE r.id BETWEEN 411 AND 420;

-- Radars 421-460 → extra room radars for rooms 1-40
INSERT INTO radares_esquema (id_radar, id_quarto, wc)
SELECT r.id, (r.id - 420), 0
FROM radares r
WHERE r.id BETWEEN 421 AND 460;

-- Radars 461-500 → extra bed radars for rooms 41-80
INSERT INTO radares_esquema (id_radar, id_quarto, id_cama, wc)
SELECT r.id, (r.id - 420), (r.id - 420), 0
FROM radares r
WHERE r.id BETWEEN 461 AND 500;

-- ─── Seed 200 patients with avatar CDN ────────────────────
INSERT INTO utentes (id, nomeSerTratado, imagem, rotacao_imagem, estado)
SELECT
    n,
    ELT(1 + (n % 10),
        'Maria Santos', 'João Silva', 'Ana Pereira', 'Carlos Costa', 'Sofia Martins',
        'Pedro Oliveira', 'Isabel Rodrigues', 'Luís Fernandes', 'Rita Almeida', 'Manuel Gomes'
    ),
    CASE
        WHEN MOD(n, 9) = 0 THEN 'default.png'
        ELSE CONCAT('https://i.pravatar.cc/150?u=patient', n)
    END,
    0,
    NULL
FROM (
    SELECT (@u := @u + 1) AS n
    FROM information_schema.COLUMNS t1
    CROSS JOIN (SELECT @u := 0) init
    LIMIT 200
) nums;

-- ─── Admit patients to a subset of beds (mixed occupancy) ─
INSERT INTO utentes_admissao (quarto, cama, data_arquivado)
SELECT
    c.id_quarto,
    c.id,
    CASE
        WHEN MOD(c.id, 10) = 0 THEN DATE_SUB(NOW(), INTERVAL 7 DAY)
        ELSE NULL
    END
FROM camas c
WHERE c.id <= 160;

-- Link active admissions to patients (what monitorizacao expects)
UPDATE utentes u
LEFT JOIN utentes_admissao ua ON ua.id = u.id
SET u.estado = CASE
    WHEN ua.id IS NOT NULL AND ua.data_arquivado IS NULL THEN ua.id
    ELSE NULL
END;

-- ─── Seed layouts for each radar ──────────────────────────
INSERT INTO radares_layouts (dispositivo_id, rectangle, declare_area, declare_area_name, valido_de)
SELECT
    re.id_radar,
    '{-30,-7;19,-7;-30,20;19,20}',
    '{0,5,-4,-7,6,-7,-4,11,6,11},{1,4,15,15,19,15,15,20,19,20},{2,1,6,-7,11,-7,6,-2,11,-2},{3,6,-35,-2,-25,-2,-35,4,-25,4}',
    '["5_Bed","4_Door","1_Mesa","6_Casa de Banho"]',
    NOW()
FROM radares_esquema re;

-- ═══════════════════════════════════════════════════════════
-- Verify counts
-- ═══════════════════════════════════════════════════════════
SELECT 'radares' AS tbl, COUNT(*) AS cnt FROM radares
UNION ALL SELECT 'quartos', COUNT(*) FROM quartos
UNION ALL SELECT 'camas', COUNT(*) FROM camas
UNION ALL SELECT 'radares_esquema', COUNT(*) FROM radares_esquema
UNION ALL SELECT 'utentes', COUNT(*) FROM utentes
UNION ALL SELECT 'utentes_admissao', COUNT(*) FROM utentes_admissao
UNION ALL SELECT 'radares_layouts', COUNT(*) FROM radares_layouts
UNION ALL SELECT 'configs_ucc', COUNT(*) FROM configs_ucc
UNION ALL SELECT 'configs_tipologias', COUNT(*) FROM configs_tipologias
UNION ALL SELECT 'configs_tipologia_pisos', COUNT(*) FROM configs_tipologia_pisos;
