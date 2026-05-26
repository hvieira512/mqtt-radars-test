-- ─────────────────────────────────────────────────────────────
-- Optimize radares_eventos: composite PK + partitioning + covering index
-- Drop redundant simple indexes
-- ─────────────────────────────────────────────────────────────
ALTER TABLE radares_eventos
  DROP INDEX idx_eventos_dispositivo,
  DROP INDEX idx_eventos_tipo,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (id, recebido_em),
  ADD INDEX idx_eventos_device_type_time (dispositivo_id, tipo_evento_id, recebido_em, id);

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

-- ─────────────────────────────────────────────────────────────
-- Optimize radares_detecoes: targeted composites, drop unused
-- ─────────────────────────────────────────────────────────────
ALTER TABLE radares_detecoes
  DROP INDEX idx_det_evento,
  DROP INDEX idx_det_dispositivo,
  DROP INDEX idx_det_tipo,
  ADD INDEX idx_det_device_time (dispositivo_id, criado_em, id),
  ADD INDEX idx_det_fall_alerts (tipo, id);
