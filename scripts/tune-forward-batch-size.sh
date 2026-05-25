#!/usr/bin/env bash
set -euo pipefail

DURATION_SECONDS="${1:-60}"
shift || true

if ! [[ "$DURATION_SECONDS" =~ ^[0-9]+$ ]] || [ "$DURATION_SECONDS" -le 0 ]; then
    echo "Usage: $0 [duration_seconds] [batch_size1 batch_size2 ...]" >&2
    exit 1
fi

if [ "$#" -gt 0 ]; then
    BATCH_SIZES=("$@")
else
    BATCH_SIZES=("100" "200" "300")
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BENCH_SCRIPT="$SCRIPT_DIR/benchmark-forward-consumer.sh"

if [ ! -x "$BENCH_SCRIPT" ]; then
    echo "Benchmark script not executable: $BENCH_SCRIPT" >&2
    exit 1
fi

echo "Tuning forward-consumer batch size with ${DURATION_SECONDS}s windows..."

for size in "${BATCH_SIZES[@]}"; do
    if ! [[ "$size" =~ ^[0-9]+$ ]] || [ "$size" -le 0 ]; then
        echo "Skipping invalid batch size: $size" >&2
        continue
    fi

    echo ""
    echo "=== Batch size: $size ==="
    FORWARD_BATCH_SIZE="$size" docker compose up -d --no-deps --force-recreate forward-consumer >/dev/null
    sleep 3
    "$BENCH_SCRIPT" "$DURATION_SECONDS" 9999
done
