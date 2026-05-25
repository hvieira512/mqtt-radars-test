export function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function formatLocalDateTime(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${formatLocalDate(date)} ${hours}:${minutes}:${seconds}`;
}

export function parseLocalDateValue(dateValue) {
    const match = String(dateValue || "")
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return null;

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        0,
        0,
        0,
        0,
    );
}

export function parseMysqlDateTimeLocal(value) {
    const match = String(value || "")
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);

    if (!match) return null;

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6]),
        0,
    );
}

export function getReplayBaseDate(dateValue) {
    return parseLocalDateValue(dateValue) || new Date();
}

export function buildReplayDateTime(dateValue, totalSeconds) {
    const baseDate = getReplayBaseDate(dateValue);
    const targetDate = new Date(baseDate.getTime() + totalSeconds * 1000);
    return formatLocalDateTime(targetDate);
}

export function parseTimeValue(value) {
    const match = String(value || "")
        .trim()
        .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        Number.isNaN(seconds) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59 ||
        seconds < 0 ||
        seconds > 59
    ) {
        return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

export function normalizeTimeInputValue(value, fallback) {
    const raw = String(value || "").trim();
    if (!raw) return fallback;

    const digitsOnly = raw.replace(/\D/g, "");
    if (/^\d{1,2}:\d{2}$/.test(raw)) {
        return raw;
    }

    if (digitsOnly.length === 3) {
        return `0${digitsOnly[0]}:${digitsOnly.slice(1)}`;
    }

    if (digitsOnly.length === 4) {
        return `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2)}`;
    }

    return fallback;
}

export function formatClock(totalSeconds, includeSeconds = false) {
    const normalized = ((Math.round(totalSeconds) % 86400) + 86400) % 86400;
    const hours = String(Math.floor(normalized / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((normalized % 3600) / 60)).padStart(
        2,
        "0",
    );
    const seconds = String(normalized % 60).padStart(2, "0");

    return includeSeconds
        ? `${hours}:${minutes}:${seconds}`
        : `${hours}:${minutes}`;
}

export function timestampToReplaySeconds(timestamp, dateValue) {
    const targetDate = parseMysqlDateTimeLocal(timestamp);
    if (!targetDate) return null;

    const baseDate = getReplayBaseDate(dateValue);
    return Math.round((targetDate.getTime() - baseDate.getTime()) / 1000);
}

export function buildReplayRangeFromAlarm(
    alarmTimestamp,
    beforeSeconds = 30,
    afterSeconds = 60,
) {
    const alarmDate = parseMysqlDateTimeLocal(alarmTimestamp);
    if (!alarmDate) return null;

    const alarmSeconds =
        alarmDate.getHours() * 3600 +
        alarmDate.getMinutes() * 60 +
        alarmDate.getSeconds();
    const startSeconds = Math.max(alarmSeconds - beforeSeconds, 0);
    const endSeconds = Math.min(alarmSeconds + afterSeconds, 86399);

    return {
        dateValue: formatLocalDate(alarmDate),
        startSeconds,
        endSeconds,
        totalSeconds: Math.max(endSeconds - startSeconds, 1),
        alarmSeconds,
    };
}
