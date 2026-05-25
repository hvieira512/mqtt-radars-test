import {
    buildReplayDateTime,
    formatLocalDate,
    parseMysqlDateTimeLocal,
} from "./time.js";

const TIMELINE_COLORS = {
    primary: "#5867dd",
    success: "#1dc9b7",
    info: "#5578eb",
    warning: "#ffb822",
    danger: "#fd397a",
    secondary: "#74788d",
    purple: "#6f42c1",
};

export function getReplayTimelineColorValue(color) {
    return TIMELINE_COLORS[color] || TIMELINE_COLORS.secondary;
}

export function getVisibleReplaySegments(segments = []) {
    return segments.filter((segment) => segment.key !== "unknown");
}

export function getReplayFrameAtSeconds(frames = [], currentSeconds) {
    if (!frames.length) return null;

    return (
        frames
            .filter((frame) => frame.seconds <= currentSeconds)
            .slice(-1)[0] || frames[0]
    );
}

export function getReplaySegmentAtSeconds(segments = [], currentSeconds) {
    if (!segments.length) return null;

    return (
        segments.find(
            (segment) =>
                currentSeconds >= segment.start &&
                (currentSeconds < segment.end ||
                    (segment.isLast && currentSeconds <= segment.end)),
        ) || null
    );
}

export function getReplayLayoutForSeconds({
    layouts = [],
    dateValue,
    currentSeconds,
}) {
    if (!layouts.length) return null;

    const effectiveDate = dateValue || formatLocalDate(new Date());
    const timestamp = buildReplayDateTime(effectiveDate, currentSeconds);
    const currentTime = parseMysqlDateTimeLocal(timestamp)?.getTime() || 0;
    const exact = layouts.find((layout) => {
        const startMs =
            parseMysqlDateTimeLocal(layout.valido_de)?.getTime() || 0;
        const endMs = layout.valido_ate
            ? parseMysqlDateTimeLocal(layout.valido_ate)?.getTime() || null
            : null;

        return (
            startMs <= currentTime && (endMs === null || currentTime < endMs)
        );
    });

    if (exact) return exact;

    const nextKnown = layouts.find((layout) => {
        const startMs =
            parseMysqlDateTimeLocal(layout.valido_de)?.getTime() || 0;
        return startMs > currentTime;
    });

    return nextKnown || layouts[layouts.length - 1];
}
