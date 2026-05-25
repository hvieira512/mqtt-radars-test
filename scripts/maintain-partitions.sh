#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Partition maintenance for radares_eventos
# Run monthly (e.g., cron: 0 0 1 * *) to ensure partitions
# exist for at least 3 months ahead of the current date.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-radar_user}"
DB_PASS="${DB_PASS:-radar_pass}"
DB_NAME="${DB_NAME:-radar_test}"

MYSQL="mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASS} ${DB_NAME} -Bse"

# Get the last named partition boundary (excluding p_future)
LAST_PARTITION=$(${MYSQL} "
    SELECT PARTITION_NAME
    FROM INFORMATION_SCHEMA.PARTITIONS
    WHERE TABLE_SCHEMA = '${DB_NAME}'
      AND TABLE_NAME = 'radares_eventos'
      AND PARTITION_NAME != 'p_future'
    ORDER BY PARTITION_ORDINAL_POSITION DESC
    LIMIT 1
")

if [ -z "$LAST_PARTITION" ]; then
    echo "ERROR: No partitions found for radares_eventos"
    exit 1
fi

# Parse partition name to get the boundary date
# p_2026_08 -> 2026-08-01
PART_DATE="${LAST_PARTITION#p_}"
PART_DATE="${PART_DATE//_/-}"
PART_DATE="${PART_DATE}-01"

echo "Last partition: ${LAST_PARTITION} (boundary: ${PART_DATE})"

# Calculate target: keep at least 4 named partitions ahead
# of the last partition boundary
TARGET=$(date -d "$PART_DATE +4 months" +%Y-%m-%d)
echo "Target: ensure partitions through ${TARGET}"

# Loop: add one partition at a time until we reach the target
NEXT_DATE="$PART_DATE"
while [[ "$NEXT_DATE" < "$TARGET" ]]; do
    NEXT_DATE=$(date -d "$NEXT_DATE +1 month" +%Y-%m-%d)
    PART_NAME="p_$(date -d "$NEXT_DATE" +%Y_%m)"
    
    echo "Adding partition: ${PART_NAME} (boundary: ${NEXT_DATE})"
    
    ${MYSQL} "
        ALTER TABLE radares_eventos
        REORGANIZE PARTITION p_future INTO (
            PARTITION ${PART_NAME} VALUES LESS THAN (TO_DAYS('${NEXT_DATE}')),
            PARTITION p_future VALUES LESS THAN MAXVALUE
        );
    "
    echo "  -> done"
done

echo "Partition maintenance complete."
