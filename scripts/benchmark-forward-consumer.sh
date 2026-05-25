#!/usr/bin/env bash
set -euo pipefail

DURATION_SECONDS="${1:-60}"
LICENSE_ID="${2:-9999}"

if ! [[ "$DURATION_SECONDS" =~ ^[0-9]+$ ]] || [ "$DURATION_SECONDS" -le 0 ]; then
    echo "Usage: $0 [duration_seconds] [license_id]" >&2
    exit 1
fi

START_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
QUEUE_KEY="mqtt:forward:${LICENSE_ID}"

queue_before="$(docker compose exec -T redis redis-cli LLEN "$QUEUE_KEY" | tr -d '\r')"
events_before="$(docker compose exec -T mysql mysql -u root -prootpassword -N -e "SELECT COUNT(*) FROM radar_test.radares_eventos;" | tr -d ' \r')"

sleep "$DURATION_SECONDS"

queue_after="$(docker compose exec -T redis redis-cli LLEN "$QUEUE_KEY" | tr -d '\r')"
events_after="$(docker compose exec -T mysql mysql -u root -prootpassword -N -e "SELECT COUNT(*) FROM radar_test.radares_eventos;" | tr -d ' \r')"

log_file="$(mktemp)"
durations_file="$(mktemp)"
sorted_file="$(mktemp)"
trap 'rm -f "$log_file" "$durations_file" "$sorted_file"' EXIT

docker compose logs --since "$START_ISO" forward-consumer > "$log_file"

rg -o 'HTTP 200 [0-9]+ms' "$log_file" | awk '{gsub(/ms/, "", $3); print $3}' > "$durations_file" || true

total_batches="$(rg -c 'batch=' "$log_file" || echo 0)"
failed_batches="$(rg -c 'FAILED' "$log_file" || echo 0)"
success_batches=$((total_batches - failed_batches))

success_messages="$(rg -o 'batch=[0-9]+ HTTP 200' "$log_file" | awk -F'[= ]' '{sum += $2} END {print sum + 0}')"

queue_delta=$((queue_after - queue_before))
events_delta=$((events_after - events_before))

throughput_events="$(awk -v e="$events_delta" -v d="$DURATION_SECONDS" 'BEGIN { printf "%.2f", (d > 0 ? e / d : 0) }')"
throughput_messages="$(awk -v m="$success_messages" -v d="$DURATION_SECONDS" 'BEGIN { printf "%.2f", (d > 0 ? m / d : 0) }')"

count_samples="$(wc -l < "$durations_file" | tr -d ' ')"

mean_ms="NA"
p50_ms="NA"
p95_ms="NA"
p99_ms="NA"
min_ms="NA"
max_ms="NA"

if [ "${count_samples:-0}" -gt 0 ]; then
    sort -n "$durations_file" > "$sorted_file"
    mean_ms="$(awk '{sum += $1} END {printf "%.2f", (NR > 0 ? sum / NR : 0)}' "$sorted_file")"
    min_ms="$(head -n 1 "$sorted_file")"
    max_ms="$(tail -n 1 "$sorted_file")"

    p50_ms="$(awk -v p=0.50 '
        {a[NR]=$1}
        END {
            if (NR == 0) { print "NA"; exit }
            idx = int((p * NR) + 0.999999);
            if (idx < 1) idx = 1;
            if (idx > NR) idx = NR;
            print a[idx];
        }
    ' "$sorted_file")"

    p95_ms="$(awk -v p=0.95 '
        {a[NR]=$1}
        END {
            if (NR == 0) { print "NA"; exit }
            idx = int((p * NR) + 0.999999);
            if (idx < 1) idx = 1;
            if (idx > NR) idx = NR;
            print a[idx];
        }
    ' "$sorted_file")"

    p99_ms="$(awk -v p=0.99 '
        {a[NR]=$1}
        END {
            if (NR == 0) { print "NA"; exit }
            idx = int((p * NR) + 0.999999);
            if (idx < 1) idx = 1;
            if (idx > NR) idx = NR;
            print a[idx];
        }
    ' "$sorted_file")"
fi

echo "Window: ${DURATION_SECONDS}s (license ${LICENSE_ID})"
echo "Batches: total=${total_batches}, success=${success_batches}, failed=${failed_batches}"
echo "Batch latency ms: min=${min_ms}, p50=${p50_ms}, p95=${p95_ms}, p99=${p99_ms}, max=${max_ms}, mean=${mean_ms}, samples=${count_samples}"
echo "Queue delta (${QUEUE_KEY}): ${queue_before} -> ${queue_after} (delta ${queue_delta})"
echo "Events delta (radares_eventos): ${events_before} -> ${events_after} (delta ${events_delta})"
echo "Throughput: events/s=${throughput_events}, forwarded_messages/s=${throughput_messages}"
