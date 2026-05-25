import {
    parseMysqlDateTimeLocal,
    timestampToReplaySeconds,
} from "../replay/index.js";

function resolvePlaybackPostureCategory(postureState) {
    switch (postureState) {
        case "Fall Confirmation":
            return {
                key: "fall_confirmed",
                label: "Queda confirmada",
                priority: 80,
            };
        case "Suspected Fall":
            return {
                key: "suspected_fall",
                label: "Queda suspeita",
                priority: 60,
            };
        case "Confirmed Sitting on Ground":
            return {
                key: "on_floor",
                label: "No chão",
                priority: 55,
            };
        case "Walking":
        case "Standing":
        case "Out Bed":
            return {
                key: "movement",
                label: "Deslocação",
                priority: 40,
            };
        case "Lying Down":
        case "Sitting Up Bed":
        case "Suspected Sitting Up Bed":
        case "Confirmed Sitting Up Bed":
        case "In Bed":
            return {
                key: "in_bed_resting",
                label: "Repouso na cama",
                priority: 20,
            };
        default:
            return {
                key: "unknown",
                label: "Sem dados",
                priority: 0,
            };
    }
}

function resolvePlaybackDetectionCategory(detection) {
    const type = detection.type;
    const level = detection.level || "";

    if (type === "fall_confirmed") {
        return {
            key: "fall_confirmed",
            label: "Queda confirmada",
            priority: 100,
            markerOnly: false,
        };
    }

    if (type === "apnea") {
        return {
            key: "apnea",
            label: "Apneia",
            priority: 95,
            markerOnly: false,
        };
    }

    if (type === "vitals_signal_lost") {
        return {
            key: "vitals_signal_lost",
            label: "Sem leitura vital",
            priority: 85,
            markerOnly: false,
        };
    }

    if (
        [
            "heart_rate_high",
            "heart_rate_low",
            "heart_rate_high_critical",
            "heart_rate_low_critical",
        ].includes(type)
    ) {
        return {
            key: "heart_alert",
            label: detection.message || "Alerta cardíaco",
            priority: level === "perigo" ? 90 : 70,
            markerOnly: false,
        };
    }

    if (["breathing_high", "breathing_low"].includes(type)) {
        return {
            key: "breathing_alert",
            label: detection.message || "Alerta respiratório",
            priority: level === "perigo" ? 88 : 68,
            markerOnly: false,
        };
    }

    if (["room_entry", "room_exit"].includes(type)) {
        return {
            key: "room_transition",
            label: detection.message || "Transição na sala",
            priority: 50,
            markerOnly: true,
        };
    }

    if (["area_entry", "area_exit"].includes(type)) {
        return {
            key: "area_transition",
            label: detection.message || "Transição de região",
            priority: 45,
            markerOnly: true,
        };
    }

    return null;
}

function groupPlaybackPositionFrames(rows, dateValue, range) {
    const grouped = new Map();

    rows.forEach((row) => {
        const seconds = timestampToReplaySeconds(row.timestamp, dateValue);
        if (seconds === null) return;
        if (seconds < range.startSeconds || seconds > range.endSeconds) return;

        const eventId = Number(row.event_id || 0);
        const frameKey = `${seconds}:${eventId}`;

        if (!grouped.has(frameKey)) {
            grouped.set(frameKey, {
                eventId,
                seconds,
                rows: [],
            });
        }

        grouped.get(frameKey).rows.push({
            ...row,
            seconds,
        });
    });

    return Array.from(grouped.values())
        .sort((a, b) => {
            if (a.seconds !== b.seconds) return a.seconds - b.seconds;
            return a.eventId - b.eventId;
        })
        .map((frame) => {
            const shouldClear = frame.rows.some(
                (person) => Number(person.person_index) === 88,
            );
            const people = shouldClear
                ? []
                : frame.rows.filter(
                      (person) => Number(person.person_index) !== 88,
                  );

            let dominant = {
                key: "unknown",
                label: "Sem dados",
                priority: 0,
                personIndex: null,
                regionId: null,
            };

            people.forEach((person) => {
                const candidate = resolvePlaybackPostureCategory(
                    person.posture_state,
                );
                if (candidate.priority >= dominant.priority) {
                    dominant = {
                        ...candidate,
                        personIndex: person.person_index,
                        regionId: person.region_id,
                    };
                }
            });

            return {
                eventId: frame.eventId,
                seconds: frame.seconds,
                people,
                shouldClear,
                dominant,
            };
        });
}

function buildPlaybackPositionFrames(positionRows, dateValue, range) {
    return groupPlaybackPositionFrames(positionRows, dateValue, range).map(
        (frame) => ({
            eventId: frame.eventId,
            seconds: frame.seconds,
            people: frame.people,
            shouldClear: frame.shouldClear,
            dominant: frame.dominant,
        }),
    );
}

function buildPlaybackVitalsTimeline(vitalsRows, dateValue, range) {
    return vitalsRows
        .map((row) => {
            const time = parseMysqlDateTimeLocal(row.timestamp);
            const seconds = timestampToReplaySeconds(
                row.timestamp,
                dateValue,
            );

            if (!time || seconds === null) return null;
            if (seconds < range.startSeconds || seconds > range.endSeconds) {
                return null;
            }

            return {
                ...row,
                seconds,
                timeMs: time.getTime(),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.seconds - b.seconds);
}

function buildBasePlaybackIntervals(positionRows, dateValue, range) {
    const frames = groupPlaybackPositionFrames(positionRows, dateValue, range);

    if (!frames.length) {
        return [
            {
                key: "unknown",
                label: "Sem dados",
                start: range.startSeconds,
                end: range.endSeconds,
                priority: 0,
                source: "fallback",
                personIndex: null,
                regionId: null,
                metadata: {},
            },
        ];
    }

    const intervals = [];

    if (frames[0].seconds > range.startSeconds) {
        intervals.push({
            key: "unknown",
            label: "Sem dados",
            start: range.startSeconds,
            end: frames[0].seconds,
            priority: 0,
            source: "fallback",
            personIndex: null,
            regionId: null,
            metadata: {},
        });
    }

    frames.forEach((frame, index) => {
        const nextSeconds =
            index < frames.length - 1
                ? frames[index + 1].seconds
                : range.endSeconds;
        const start = Math.max(frame.seconds, range.startSeconds);
        const end = Math.min(nextSeconds, range.endSeconds);

        if (end <= start) return;

        intervals.push({
            key: frame.dominant.key,
            label: frame.dominant.label,
            start,
            end,
            priority: frame.dominant.priority,
            source: "posture",
            personIndex: frame.dominant.personIndex,
            regionId: frame.dominant.regionId,
            metadata: {
                people: frame.people,
            },
        });
    });

    return intervals;
}

function findPlaybackIntervalAt(intervals, seconds) {
    return (
        intervals.find(
            (interval) =>
                seconds >= interval.start &&
                (seconds < interval.end || seconds === interval.end),
        ) || null
    );
}

function buildDetectionPlaybackIntervals(
    detections,
    dateValue,
    range,
    baseIntervals,
) {
    const intervals = [];
    const markers = [];

    detections.forEach((detection) => {
        const seconds = timestampToReplaySeconds(
            detection.timestamp,
            dateValue,
        );
        if (seconds === null) return;
        if (seconds < range.startSeconds || seconds > range.endSeconds) return;

        const normalized = resolvePlaybackDetectionCategory(detection);
        if (!normalized) return;

        markers.push({
            ...normalized,
            timestamp: seconds,
            personIndex: detection.person_index,
            regionId: detection.region_id,
            metadata: {
                type: detection.type,
                level: detection.level,
                message: detection.message,
            },
        });

        if (normalized.markerOnly) return;

        let end = Math.min(seconds + 30, range.endSeconds);

        if (normalized.key === "fall_confirmed") {
            const baseAtDetection = findPlaybackIntervalAt(
                baseIntervals,
                seconds,
            );

            if (
                baseAtDetection &&
                ["fall_confirmed", "on_floor"].includes(baseAtDetection.key)
            ) {
                end = Math.min(baseAtDetection.end, range.endSeconds);
            }
        }

        intervals.push({
            key: normalized.key,
            label: normalized.label,
            start: seconds,
            end,
            priority: normalized.priority,
            source: "detection",
            personIndex: detection.person_index,
            regionId: detection.region_id,
            metadata: {
                type: detection.type,
                level: detection.level,
                message: detection.message,
            },
        });
    });

    return { intervals, markers };
}

function mergePlaybackSegments(segments) {
    return segments.reduce((merged, segment) => {
        const lastSegment = merged[merged.length - 1];

        if (
            lastSegment &&
            lastSegment.key === segment.key &&
            lastSegment.label === segment.label &&
            lastSegment.source === segment.source &&
            lastSegment.end === segment.start
        ) {
            lastSegment.end = segment.end;
            lastSegment.isLast = segment.isLast;
            return merged;
        }

        merged.push({ ...segment });
        return merged;
    }, []);
}

function composePlaybackSegments(
    baseIntervals,
    detectionIntervals,
    range,
    formatClock,
) {
    const boundaries = new Set([range.startSeconds, range.endSeconds]);

    [...baseIntervals, ...detectionIntervals].forEach((interval) => {
        boundaries.add(Math.max(interval.start, range.startSeconds));
        boundaries.add(Math.min(interval.end, range.endSeconds));
    });

    const orderedBoundaries = Array.from(boundaries)
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b);
    const segments = [];

    for (let index = 0; index < orderedBoundaries.length - 1; index += 1) {
        const start = orderedBoundaries[index];
        const end = orderedBoundaries[index + 1];

        if (end <= start) continue;

        const probe = start + (end - start) / 2;
        const activeDetection = detectionIntervals
            .filter(
                (interval) => probe >= interval.start && probe < interval.end,
            )
            .sort((a, b) => b.priority - a.priority)[0];
        const activeBase = findPlaybackIntervalAt(baseIntervals, probe);
        const active = activeDetection ||
            activeBase || {
                key: "unknown",
                label: "Sem dados",
                priority: 0,
                source: "fallback",
                personIndex: null,
                regionId: null,
                metadata: {},
            };

        segments.push({
            ...active,
            start,
            end,
        });
    }

    const merged = mergePlaybackSegments(segments).filter(
        (segment) => segment.end > segment.start,
    );

    return merged.map((segment, index) => ({
        ...segment,
        isLast: index === merged.length - 1,
        timeLabel: `${formatClock(segment.start)} - ${formatClock(segment.end)}`,
    }));
}

export function normalizePlaybackResponse(
    data,
    dateValue,
    range,
    formatClock,
) {
    const positions = Array.isArray(data?.positions) ? data.positions : [];
    const detections = Array.isArray(data?.detections) ? data.detections : [];
    const vitals = Array.isArray(data?.vitals) ? data.vitals : [];
    const positionFrames = buildPlaybackPositionFrames(
        positions,
        dateValue,
        range,
    );
    const vitalsTimeline = buildPlaybackVitalsTimeline(
        vitals,
        dateValue,
        range,
    );
    const baseIntervals = buildBasePlaybackIntervals(
        positions,
        dateValue,
        range,
    );
    const detectionData = buildDetectionPlaybackIntervals(
        detections,
        dateValue,
        range,
        baseIntervals,
    );

    return {
        positions,
        detections,
        vitals,
        positionFrames,
        vitalsTimeline,
        baseIntervals,
        markers: detectionData.markers,
        segments: composePlaybackSegments(
            baseIntervals,
            detectionData.intervals,
            range,
            formatClock,
        ),
    };
}
