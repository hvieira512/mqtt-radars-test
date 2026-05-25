-- ═══════════════════════════════════════════════════════════
-- Migration: Index optimization + table partitioning
-- ═══════════════════════════════════════════════════════════

USE radar_test;

-- ─── 1. Remove unused indexes ──────────────────────────────
-- These indexes are never used by application queries.
-- Each secondary index adds write overhead on every INSERT.

DROP INDEX idx_eventos_tipo ON radares_eventos;
DROP INDEX idx_estado_evento ON radares_estado_pessoas;
DROP INDEX idx_estado_atualizado ON radares_estado_pessoas;
DROP INDEX idx_det_evento ON radares_detecoes;

-- ─── 2. Add composite indexes for real query patterns ──────
-- Playback: WHERE dispositivo_id=?, tipo_evento_id=?, recebido_em BETWEEN ? AND ?
--           ORDER BY recebido_em ASC, id ASC
ALTER TABLE radares_eventos
  ADD INDEX idx_eventos_device_type_time (dispositivo_id, tipo_evento_id, recebido_em, id);

-- Playback detections: WHERE dispositivo_id=?, criado_em BETWEEN ? AND ?
--                      ORDER BY criado_em ASC, id ASC
ALTER TABLE radares_detecoes
  ADD INDEX idx_det_device_time (dispositivo_id, criado_em, id);

-- ─── 3. Partition radares_eventos BY RANGE on recebido_em ──
-- MySQL requires all unique keys (incl. PK) to include the partition key.
-- PK changes from (id) to (id, recebido_em). id remains auto_increment.
-- This enables partition pruning on playback queries and instant DROP PARTITION.

ALTER TABLE radares_eventos
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (id, recebido_em);

ALTER TABLE radares_eventos
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
