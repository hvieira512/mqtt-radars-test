#!/bin/bash
# ─────────────────────────────────────────────────────────────
# MQTT Radars Test Suite — Simulate 500 radars with batching
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORT_DIR="$SCRIPT_DIR/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/test_$TIMESTAMP.log"
PID_FILE="$REPORT_DIR/pids.txt"

mkdir -p "$REPORT_DIR"

echo "═══════════════════════════════════════════════════════" | tee -a "$REPORT_FILE"
echo "  MQTT Radar Test — $(date)" | tee -a "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════" | tee -a "$REPORT_FILE"

cleanup() {
    echo "" | tee -a "$REPORT_FILE"
    echo "── Cleaning up processes..." | tee -a "$REPORT_FILE"
    if [ -f "$PID_FILE" ]; then
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                echo "  Stopping PID $pid" | tee -a "$REPORT_FILE"
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    echo "  Done." | tee -a "$REPORT_FILE"
}
trap cleanup EXIT INT TERM

# ─── 1. Start infrastructure ──────────────────────────────
echo "" | tee -a "$REPORT_FILE"
echo "── [1/5] Starting Docker containers..." | tee -a "$REPORT_FILE"
cd "$SCRIPT_DIR"
docker compose up -d mysql redis mosquitto 2>&1 | tee -a "$REPORT_FILE"

echo "  Waiting for services..."  | tee -a "$REPORT_FILE"
sleep 5

# ─── 2. Seed database ─────────────────────────────────────
echo "" | tee -a "$REPORT_FILE"
echo "── [2/5] Seeding database..." | tee -a "$REPORT_FILE"
docker compose exec -T mysql mysql -u root -prootpassword -e "CREATE DATABASE IF NOT EXISTS radar_test;" 2>/dev/null
docker compose exec -T mysql mysql -u root -prootpassword radar_test < "$SCRIPT_DIR/schema.sql" 2>&1 | tee -a "$REPORT_FILE"

# Verify device count
DEVICE_COUNT=$(docker compose exec -T mysql mysql -u root -prootpassword -N -e "SELECT COUNT(*) FROM radar_test.radares;" 2>/dev/null | tr -d ' ')
echo "  Devices in DB: $DEVICE_COUNT" | tee -a "$REPORT_FILE"

# Clear Redis
docker compose exec -T redis redis-cli FLUSHALL 2>/dev/null | tee -a "$REPORT_FILE"
echo "  Redis flushed" | tee -a "$REPORT_FILE"

# ─── 3. Start PHP built-in server (client) ────────────────
echo "" | tee -a "$REPORT_FILE"
echo "── [3/5] Starting test ingest server on port 8089..." | tee -a "$REPORT_FILE"
cd "$SCRIPT_DIR/client"
if command -v lsof >/dev/null 2>&1; then
    EXISTING_8089=$(lsof -ti:8089 2>/dev/null || true)
    if [ -n "$EXISTING_8089" ]; then
        echo "  Port 8089 already in use, stopping existing process(es): $EXISTING_8089" | tee -a "$REPORT_FILE"
        echo "$EXISTING_8089" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
fi
DB_HOST=127.0.0.1 DB_PORT=3307 DB_DATABASE=radar_test DB_USERNAME=radar_user DB_PASSWORD=radar_pass \
    php -S 0.0.0.0:8089 -t "$SCRIPT_DIR/client" "$SCRIPT_DIR/client/router.php" > "$REPORT_DIR/ingest_server.log" 2>&1 &
# Note: PHP built-in server passes env vars to all scripts; db.class.php reads them via getenv().
INGEST_PID=$!
echo $INGEST_PID >> "$PID_FILE"
echo "  Ingest server PID: $INGEST_PID" | tee -a "$REPORT_FILE"
sleep 1

# Verify ingest server
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:8089/modulos/radares/_ajax/radar-data-ingest.php -d '{"batch":true,"messages":[]}' 2>/dev/null && echo "  Ingest server OK" | tee -a "$REPORT_FILE" || echo "  WARNING: Ingest server not responding" | tee -a "$REPORT_FILE"

# ─── 4. Start forward consumer + mqtt worker ──────────────
echo "" | tee -a "$REPORT_FILE"
echo "── [4/5] Starting MQTT worker and forward consumer..." | tee -a "$REPORT_FILE"

cd "$SCRIPT_DIR/server"

# Start MQTT worker
php mqtt-worker.php > "$REPORT_DIR/mqtt_worker.log" 2>&1 &
WORKER_PID=$!
echo $WORKER_PID >> "$PID_FILE"
echo "  MQTT worker PID: $WORKER_PID" | tee -a "$REPORT_FILE"

sleep 1

# Start forward consumer (batch mode)
php forward-consumer.php --license=9999 > "$REPORT_DIR/forward_consumer.log" 2>&1 &
FORWARD_PID=$!
echo $FORWARD_PID >> "$PID_FILE"
echo "  Forward consumer PID: $FORWARD_PID" | tee -a "$REPORT_FILE"

sleep 2

# ─── 5. Run simulation ───────────────────────────────────
echo "" | tee -a "$REPORT_FILE"
echo "── [5/5] Starting radar simulation (500 radars)..." | tee -a "$REPORT_FILE"
echo "  Duration: ${1:-60} seconds" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

cd "$SCRIPT_DIR/server"

# Run simulator for specified duration
SIM_DURATION="${1:-60}"
if command -v timeout >/dev/null 2>&1; then
    timeout "$SIM_DURATION" php simulate-radars.php --count=500 --license=9999 2>&1 | tee -a "$REPORT_FILE"
elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$SIM_DURATION" php simulate-radars.php --count=500 --license=9999 2>&1 | tee -a "$REPORT_FILE"
else
    php simulate-radars.php --count=500 --license=9999 2>&1 | tee -a "$REPORT_FILE" &
    SIM_PID=$!
    sleep "$SIM_DURATION"
    kill "$SIM_PID" 2>/dev/null || true
    wait "$SIM_PID" 2>/dev/null || true
fi

echo "" | tee -a "$REPORT_FILE"
echo "═══ Simulation complete ═══" | tee -a "$REPORT_FILE"

# ─── Collect results ──────────────────────────────────────
echo "" | tee -a "$REPORT_FILE"
echo "── Results ──────────────────────────────────────────" | tee -a "$REPORT_FILE"

echo "Redis queue size:" | tee -a "$REPORT_FILE"
docker compose exec -T redis redis-cli LLEN "mqtt:forward:9999" 2>/dev/null | tee -a "$REPORT_FILE"

echo "" | tee -a "$REPORT_FILE"
echo "DB row counts:" | tee -a "$REPORT_FILE"
for table in radares_eventos radares_posicao_pessoas radares_estado_pessoas radares_sinais_vitais radares_detecoes; do
    count=$(docker compose exec -T mysql mysql -u root -prootpassword -N -e "SELECT COUNT(*) FROM radar_test.$table;" 2>/dev/null | tr -d ' ')
    printf "  %-35s %s\n" "$table:" "$count" | tee -a "$REPORT_FILE"
done

echo "" | tee -a "$REPORT_FILE"
echo "Environment summary:" | tee -a "$REPORT_FILE"
echo "  Ingest server:    http://127.0.0.1:8089/_ajax/radar-data/ingest.php" | tee -a "$REPORT_FILE"
echo "  MySQL:            127.0.0.1:3307 (radar_test)" | tee -a "$REPORT_FILE"
echo "  Redis:            127.0.0.1:6380" | tee -a "$REPORT_FILE"
echo "  MQTT:             127.0.0.1:1884" | tee -a "$REPORT_FILE"
echo "  Dashboard:        http://127.0.0.1:8089/monitorizacao.php" | tee -a "$REPORT_FILE"
echo "  Adminer:          http://127.0.0.1:8080 (docker compose run --profile admin)" | tee -a "$REPORT_FILE"
echo "  Reports dir:      $REPORT_DIR" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"
echo "Report saved to: $REPORT_FILE"
