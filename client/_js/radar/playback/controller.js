import { infoPanel as info } from "../live/index.js";
import { BED_POSTURES } from "../core/index.js";
import { playbackMap } from "../scene/index.js";
import {
    getReplayLayoutForSeconds,
    getReplaySegmentAtSeconds,
} from "../replay/index.js";
import {
    formatClock,
    formatLocalDate,
    normalizeTimeInputValue,
    parseMysqlDateTimeLocal,
    parseTimeValue,
} from "../replay/index.js";
import {
    getReplaySecondsFromClientX,
    renderReplayCurrentPeople,
} from "../replay/index.js";
import {
    getPlaybackFetchParams,
    initializePlaybackDatepicker,
    initializePlaybackTimepickers,
    loadPlaybackData,
    updatePlaybackTimepickerValues,
} from "./service.js";
import {
    hidePlaybackScrubPreview,
    renderPlaybackLoadingState as renderPlaybackLoadingStateView,
    renderPlaybackTimelineSections as renderPlaybackTimelineSectionsView,
    updatePlaybackButtonState as updatePlaybackButtonStateView,
    updatePlaybackCurrentTimeLabel as updatePlaybackCurrentTimeLabelView,
    updatePlaybackScrubPreview as updatePlaybackScrubPreviewView,
} from "./view.js";

const PLAYBACK_SPEED_OPTIONS = {
    "0.5x": 0.5,
    "1x": 1,
    "2x": 2,
    "4x": 4,
};

const PLAYBACK_VITALS_ENABLED = true;
const PLAYBACK_BED_AREA_TYPES = new Set([2, 5]);

const state = {
    modal: null,
    mapContainer: null,
    isInitialized: false,
    currentUID: null,
    timerId: null,
    lastTickMs: null,
    isPlaying: false,
    segments: [],
    data: null,
    markers: [],
    layouts: [],
    fetchDebounceId: null,
    requestToken: 0,
    layoutWindow: null,
    rangeKey: null,
    syncingTimepicker: false,
    isScrubbing: false,
    isHoveringTimeline: false,
    previewSeconds: null,
    lastCommittedInputKey: null,
    lastCommittedInputAt: 0,
};

function getPlaybackSpeedMultiplier() {
    const speedEl = document.getElementById("playback-speed");
    return PLAYBACK_SPEED_OPTIONS[speedEl?.value] || 1;
}

function isPlaybackPaneActive() {
    return document
        .getElementById("radar-playback-pane")
        ?.classList.contains("active");
}

function getPlaybackRange() {
    const startEl = document.getElementById("playback-start");
    const endEl = document.getElementById("playback-end");

    const defaultStart = "00:00";
    const defaultEnd = "23:59";

    if (!startEl || !endEl) {
        return {
            startSeconds: parseTimeValue(defaultStart),
            endSeconds: parseTimeValue(defaultEnd),
            totalSeconds: 1800,
        };
    }

    const normalizedStart = normalizeTimeInputValue(
        startEl.value,
        defaultStart,
    );
    startEl.value = normalizedStart;

    let startSeconds = parseTimeValue(normalizedStart);
    let endSeconds = parseTimeValue(
        normalizeTimeInputValue(endEl.value, defaultEnd),
    );

    if (!endSeconds || endSeconds <= startSeconds) {
        endSeconds = Math.min(startSeconds + 60, 86399);
        endEl.value = formatClock(endSeconds);
    } else {
        endEl.value = formatClock(endSeconds);
    }

    updatePlaybackTimepickerValues({
        startValue: startEl.value,
        endValue: endEl.value,
        setSyncing(value) {
            state.syncingTimepicker = value;
        },
    });

    return {
        startSeconds,
        endSeconds,
        totalSeconds: Math.max(endSeconds - startSeconds, 1),
    };
}

function getCurrentPlaybackSeconds(range = getPlaybackRange()) {
    const timelineEl = document.getElementById("playback-timeline");
    if (!timelineEl) return range.startSeconds;

    const progress = Number(timelineEl.value || 0) / 100;
    return range.startSeconds + range.totalSeconds * progress;
}

function updatePlaybackScrubPreview(
    currentSeconds,
    range = getPlaybackRange(),
) {
    const segment = getReplaySegmentAtSeconds(
        state.data?.segments || [],
        currentSeconds,
    );

    return updatePlaybackScrubPreviewView({
        currentSeconds,
        range,
        isScrubbing: state.isScrubbing,
        isHoveringTimeline: state.isHoveringTimeline,
        segment,
    });
}

function updatePlaybackTimelineUI(
    range = getPlaybackRange(),
    _centerBehavior = null,
    _forceCenter = false,
) {
    const startLabel = document.getElementById("playback-timeline-start");
    const currentLabel = document.getElementById("playback-timeline-current");
    const endLabel = document.getElementById("playback-timeline-end");
    const dateValue = document.getElementById("playback-date")?.value || "";
    const currentSeconds = Math.round(getCurrentPlaybackSeconds(range));

    if (startLabel) startLabel.textContent = formatClock(range.startSeconds);
    if (currentLabel)
        currentLabel.textContent = formatClock(currentSeconds, true);
    if (endLabel) endLabel.textContent = formatClock(range.endSeconds);

    updatePlaybackCurrentTimeLabelView(currentSeconds, dateValue);
    const previewSeconds =
        (state.isScrubbing || state.isHoveringTimeline) &&
        state.previewSeconds !== null
            ? state.previewSeconds
            : currentSeconds;
    updatePlaybackScrubPreview(previewSeconds, range);

    if (state.data) {
        renderPlaybackVisuals(currentSeconds);
    }
}

function setPlaybackTimelineBySeconds(
    targetSeconds,
    range = getPlaybackRange(),
    centerBehavior = null,
    forceCenter = false,
) {
    const timelineEl = document.getElementById("playback-timeline");
    if (!timelineEl) return;

    const bounded = Math.min(
        Math.max(targetSeconds, range.startSeconds),
        range.endSeconds,
    );
    const progress =
        ((bounded - range.startSeconds) / Math.max(range.totalSeconds, 1)) *
        100;

    timelineEl.step = "any";
    timelineEl.value = String(progress);
    if (forceCenter && (state.isScrubbing || state.isHoveringTimeline)) {
        state.previewSeconds = bounded;
    }
    updatePlaybackTimelineUI(range, centerBehavior, forceCenter);
}

function renderPlaybackTimelineSections(
    range = getPlaybackRange(),
    segments = state.data?.segments || [],
) {
    return renderPlaybackTimelineSectionsView({
        range,
        segments,
        onSegmentsChange(visibleSegments) {
            state.segments = visibleSegments;
        },
        onRendered() {
            updatePlaybackTimelineUI(range, null, false);
        },
    });
}

function setPlaybackPlaying(shouldPlay) {
    if (state.timerId) {
        window.clearInterval(state.timerId);
        state.timerId = null;
    }

    state.lastTickMs = null;
    state.isPlaying = shouldPlay;
    updatePlaybackButtonStateView(state.isPlaying);

    if (!shouldPlay) return;

    const initialRange = getPlaybackRange();
    if (
        Math.round(getCurrentPlaybackSeconds(initialRange)) >=
        initialRange.endSeconds
    ) {
        setPlaybackTimelineBySeconds(
            initialRange.startSeconds,
            initialRange,
            "auto",
            true,
        );
    }

    state.lastTickMs = window.performance?.now
        ? window.performance.now()
        : Date.now();

    state.timerId = window.setInterval(() => {
        const now = window.performance?.now
            ? window.performance.now()
            : Date.now();
        const previousTickMs = state.lastTickMs || now;
        const elapsedSeconds = Math.max((now - previousTickMs) / 1000, 0);

        state.lastTickMs = now;

        const range = getPlaybackRange();
        const currentSeconds = getCurrentPlaybackSeconds(range);
        const nextSeconds =
            currentSeconds + elapsedSeconds * getPlaybackSpeedMultiplier();

        if (nextSeconds >= range.endSeconds) {
            setPlaybackTimelineBySeconds(
                range.endSeconds,
                range,
                "smooth",
                true,
            );
            setPlaybackPlaying(false);
            return;
        }

        setPlaybackTimelineBySeconds(nextSeconds, range, "smooth", false);
    }, 100);
}

async function fetchPlaybackData(uid, range = getPlaybackRange()) {
    if (!uid) return false;

    const fetchParams = getPlaybackFetchParams(uid, range);
    if (!fetchParams) return false;

    const requestToken = ++state.requestToken;
    state.rangeKey = fetchParams.rangeKey;

    renderPlaybackLoadingStateView((segments) => {
        state.segments = segments;
    });

    try {
        const result = await loadPlaybackData({
            uid,
            range,
            requestToken,
        });
        if (!result) return false;

        if (
            result.requestToken !== state.requestToken ||
            uid !== state.currentUID
        ) {
            return false;
        }
        state.rangeKey = result.rangeKey;
        state.data = result.playbackData;
        state.markers = state.data.markers;
        state.layouts = result.layouts;
        state.layoutWindow = null;
        info.resetPlaybackVitals();
        renderPlaybackTimelineSections(range, state.data.segments);
        return true;
    } catch (error) {
        console.error("Failed to load playback data:", error);
        state.data = null;
        state.markers = [];
        state.layouts = [];
        state.segments = [];
        state.layoutWindow = null;
        renderPlaybackLoadingStateView((segments) => {
            state.segments = segments;
        });
        updatePlaybackTimelineUI(range, null, false);
        info.resetPlaybackVitals();
        if (state.mapContainer) {
            playbackMap.destroy();
            state.mapContainer.innerHTML = "";
            playbackMap.init(state.mapContainer);
            playbackMap.renderPlaceholder(state.mapContainer);
        }
        return false;
    }
}

function ensurePlaybackLayoutForSeconds(currentSeconds) {
    if (!state.mapContainer || !state.data) return;

    const dateValue = document.getElementById("playback-date")?.value || "";
    const layout = getReplayLayoutForSeconds({
        layouts: state.layouts,
        dateValue,
        currentSeconds,
    });

    if (!layout) {
        state.layoutWindow = null;
        state.mapContainer.innerHTML = "";
        playbackMap.init(state.mapContainer);
        playbackMap.renderPlaceholder(state.mapContainer);
        return;
    }

    const startMs = parseMysqlDateTimeLocal(layout.valido_de)?.getTime() || 0;
    const endMs = layout.valido_ate
        ? parseMysqlDateTimeLocal(layout.valido_ate)?.getTime() || null
        : null;
    const cached = state.layoutWindow;

    if (cached && cached.startMs === startMs && cached.endMs === endMs) {
        return;
    }

    state.layoutWindow = {
        startMs,
        endMs,
        data: layout,
    };

    state.mapContainer.innerHTML = "";
    playbackMap.init(state.mapContainer);
    playbackMap.renderRoom(layout.rectangle, layout.declare_area, layout);
}

function clearPlaybackTrail() {
    playbackMap.clearTrail();
}

function getPlaybackFrameAtSeconds(frames = [], currentSeconds) {
    if (!frames.length) return null;

    return (
        frames
            .filter((frame) => frame.seconds <= currentSeconds)
            .slice(-1)[0] || null
    );
}

function getPlaybackBedRegionIds(layout) {
    const declareAreaStr = layout?.declare_area || "";
    const bedRegionIds = new Set();

    if (!declareAreaStr) return bedRegionIds;

    declareAreaStr
        .split("},")
        .map((area) => area.replace(/[{}]/g, "").trim())
        .filter(Boolean)
        .forEach((area) => {
            const values = area.split(",").map(Number);
            const key = values[0];
            const type = values[1];

            if (PLAYBACK_BED_AREA_TYPES.has(type)) {
                bedRegionIds.add(key);
            }
        });

    return bedRegionIds;
}

function getPlaybackBedOccupancy(frame, layout) {
    if (!frame || !Array.isArray(frame.people)) {
        return null;
    }

    if (frame.shouldClear) return false;

    const bedRegionIds = getPlaybackBedRegionIds(layout);

    return frame.people.some((person) => {
        if (!BED_POSTURES.has(person.posture_state)) {
            return false;
        }

        return bedRegionIds.size
            ? bedRegionIds.has(Number(person.region_id))
            : true;
    });
}

function renderPlaybackVisuals(currentSeconds) {
    if (!state.data) return;

    const activeSegment = getReplaySegmentAtSeconds(
        state.data?.segments || [],
        currentSeconds,
    );
    const frame = getPlaybackFrameAtSeconds(
        state.data?.positionFrames || [],
        currentSeconds,
    );

    ensurePlaybackLayoutForSeconds(currentSeconds);
    const hasPersonInMonitoredBed = getPlaybackBedOccupancy(
        frame,
        state.layoutWindow?.data,
    );

    renderReplayCurrentPeople("playback-current-people", frame?.people || []);

    if (state.mapContainer) {
        if (!state.layoutWindow) {
            state.mapContainer.innerHTML = "";
            playbackMap.init(state.mapContainer);
        }

        if (state.layoutWindow?.data) {
            if (activeSegment?.key === "unknown") {
                playbackMap.clearPeople();
            } else {
                playbackMap.updatePeople(frame?.people || []);
            }
            clearPlaybackTrail();
        }
    }

    if (PLAYBACK_VITALS_ENABLED) {
        info.renderPlaybackVitals(
            state.data.vitalsTimeline || [],
            currentSeconds,
            { hasPersonInMonitoredBed },
        );
    }
}

function schedulePlaybackDataFetch(immediate = false) {
    if (!state.currentUID) return;

    if (state.fetchDebounceId) {
        window.clearTimeout(state.fetchDebounceId);
        state.fetchDebounceId = null;
    }

    const run = () => {
        state.fetchDebounceId = null;
        setPlaybackPlaying(false);
        fetchPlaybackData(state.currentUID, getPlaybackRange());
    };

    if (immediate) {
        run();
        return;
    }

    state.fetchDebounceId = window.setTimeout(run, 900);
}

function resetPlaybackDataState(
    loadingMessage = "Selecione um período para carregar o replay.",
) {
    state.data = null;
    state.markers = [];
    state.layouts = [];
    state.segments = [];
    state.layoutWindow = null;
    state.rangeKey = null;
    renderPlaybackLoadingStateView((segments) => {
        state.segments = segments;
    });
    info.resetPlaybackVitals();
    clearPlaybackTrail();
    renderReplayCurrentPeople("playback-current-people", []);
}

function initializePlaybackDefaults() {
    const dateEl = document.getElementById("playback-date");
    const startEl = document.getElementById("playback-start");
    const endEl = document.getElementById("playback-end");
    const timelineEl = document.getElementById("playback-timeline");

    if (!dateEl || !startEl || !endEl || !timelineEl) return;

    const currentDate = new Date();
    const formattedDate = formatLocalDate(currentDate);
    const formattedStart = "00:00";
    const formattedEnd = "08:00";

    dateEl.value = formattedDate;
    updatePlaybackTimepickerValues({
        startValue: formattedStart,
        endValue: formattedEnd,
        setSyncing(value) {
            state.syncingTimepicker = value;
        },
    });
    startEl.value = formattedStart;
    endEl.value = formattedEnd;

    if ($(dateEl).data("datepicker")) {
        $(dateEl).datepicker("update", formattedDate);
    }

    timelineEl.step = "any";
    timelineEl.value = 0;
    resetPlaybackDataState("Selecione um período para carregar o replay.");
    updatePlaybackTimelineUI(getPlaybackRange(), null, false);

    if (state.mapContainer) {
        playbackMap.destroy();
        state.mapContainer.innerHTML = "";
        playbackMap.init(state.mapContainer);
        playbackMap.renderPlaceholder(state.mapContainer);
    }
}

function handlePlaybackInputCommit() {
    const range = getPlaybackRange();
    const fetchParams = getPlaybackFetchParams(state.currentUID, range);
    const now = Date.now();

    if (!fetchParams) return;

    if (fetchParams.rangeKey === state.rangeKey && state.data) {
        return;
    }

    if (
        fetchParams.rangeKey === state.lastCommittedInputKey &&
        now - state.lastCommittedInputAt < 500
    ) {
        return;
    }

    state.lastCommittedInputKey = fetchParams.rangeKey;
    state.lastCommittedInputAt = now;

    const timelineEl = document.getElementById("playback-timeline");
    if (timelineEl) timelineEl.value = 0;
    resetPlaybackDataState("A carregar replay...");
    updatePlaybackTimelineUI(range, null, false);
    schedulePlaybackDataFetch();
}

function bindPlaybackControl(id, handler) {
    const element = document.getElementById(id);
    if (!element || element.dataset.playbackBound === "1") return;
    handler(element);
    element.dataset.playbackBound = "1";
}

function setupPlaybackUI() {
    initializePlaybackDatepicker();
    initializePlaybackTimepickers();
    initializePlaybackDefaults();

    bindPlaybackControl("playback-date", (element) => {
        $(element).on("changeDate", function () {
            const timelineEl = document.getElementById("playback-timeline");
            if (timelineEl) timelineEl.value = 0;
            resetPlaybackDataState("A carregar replay...");
            updatePlaybackTimelineUI(getPlaybackRange(), null, false);
            schedulePlaybackDataFetch();
        });
    });

    ["playback-start", "playback-end"].forEach((id) => {
        bindPlaybackControl(id, (element) => {
            element.addEventListener("change", function () {
                handlePlaybackInputCommit();
            });

            $(element).on("hide.timepicker", function () {
                if (state.syncingTimepicker) return;

                window.setTimeout(() => {
                    if (document.activeElement === element) return;
                    handlePlaybackInputCommit();
                }, 0);
            });

            element.addEventListener("blur", function () {
                if (state.syncingTimepicker) return;
                handlePlaybackInputCommit();
            });
        });
    });

    bindPlaybackControl("playback-speed", (element) => {
        element.addEventListener("change", function () {
            if (state.isPlaying) {
                setPlaybackPlaying(true);
            }
        });
    });

    bindPlaybackControl("playback-timeline", (element) => {
        element.addEventListener("input", function () {
            state.previewSeconds =
                getCurrentPlaybackSeconds(getPlaybackRange());
            updatePlaybackTimelineUI(getPlaybackRange(), null, true);
        });
        element.addEventListener("mouseenter", function (event) {
            state.isHoveringTimeline = true;
            state.previewSeconds = getReplaySecondsFromClientX({
                clientX: event.clientX,
                timelineEl: element,
                range: getPlaybackRange(),
            });
            updatePlaybackScrubPreview(
                state.previewSeconds,
                getPlaybackRange(),
            );
        });
        element.addEventListener("mousemove", function (event) {
            if (!state.isHoveringTimeline && !state.isScrubbing) {
                return;
            }

            state.previewSeconds = getReplaySecondsFromClientX({
                clientX: event.clientX,
                timelineEl: element,
                range: getPlaybackRange(),
            });
            updatePlaybackScrubPreview(
                state.previewSeconds,
                getPlaybackRange(),
            );
        });
        element.addEventListener("mouseleave", function () {
            state.isHoveringTimeline = false;
            if (!state.isScrubbing) {
                state.previewSeconds = null;
                hidePlaybackScrubPreview();
            }
        });
        element.addEventListener("mousedown", function () {
            state.isScrubbing = true;
            state.previewSeconds =
                getCurrentPlaybackSeconds(getPlaybackRange());
            updatePlaybackTimelineUI(getPlaybackRange(), null, true);
        });
        element.addEventListener("touchstart", function () {
            state.isScrubbing = true;
            state.previewSeconds =
                getCurrentPlaybackSeconds(getPlaybackRange());
            updatePlaybackTimelineUI(getPlaybackRange(), null, true);
        });
        element.addEventListener("change", function () {
            state.isScrubbing = false;
            if (!state.isHoveringTimeline) {
                state.previewSeconds = null;
                hidePlaybackScrubPreview();
            }
            updatePlaybackTimelineUI(getPlaybackRange(), null, true);
        });
        element.addEventListener("blur", function () {
            state.isScrubbing = false;
            state.isHoveringTimeline = false;
            state.previewSeconds = null;
            hidePlaybackScrubPreview();
        });
    });

    $(document)
        .off("mouseup.playbackScrub touchend.playbackScrub")
        .on("mouseup.playbackScrub touchend.playbackScrub", function () {
            if (!state.isScrubbing) return;
            state.isScrubbing = false;
            if (!state.isHoveringTimeline) {
                state.previewSeconds = null;
                hidePlaybackScrubPreview();
            }
        });

    bindPlaybackControl("playback-toggle", (element) => {
        element.addEventListener("click", function () {
            setPlaybackPlaying(!state.isPlaying);
        });
    });

    bindPlaybackControl("playback-step-prev", (element) => {
        element.addEventListener("click", function () {
            const currentSeconds = getCurrentPlaybackSeconds();
            const segments = state.segments
                .map((segment) => Number(segment.start))
                .filter((value) => value < currentSeconds - 1)
                .sort((a, b) => a - b);

            const target = segments.length
                ? segments[segments.length - 1]
                : getPlaybackRange().startSeconds;

            setPlaybackPlaying(false);
            setPlaybackTimelineBySeconds(
                target,
                getPlaybackRange(),
                "auto",
                true,
            );
        });
    });

    bindPlaybackControl("playback-step-next", (element) => {
        element.addEventListener("click", function () {
            const currentSeconds = getCurrentPlaybackSeconds();
            const segments = state.segments
                .map((segment) => Number(segment.start))
                .filter((value) => value > currentSeconds + 1)
                .sort((a, b) => a - b);

            const target = segments.length
                ? segments[0]
                : getPlaybackRange().endSeconds;

            setPlaybackPlaying(false);
            setPlaybackTimelineBySeconds(
                target,
                getPlaybackRange(),
                "auto",
                true,
            );
        });
    });

    renderPlaybackLoadingStateView((segments) => {
        state.segments = segments;
    });
    updatePlaybackButtonStateView(state.isPlaying);
}

export function init({ modal, mapContainer }) {
    state.modal = modal;
    state.mapContainer = mapContainer;
    if (state.isInitialized) return;

    setupPlaybackUI();
    state.isInitialized = true;

    document.addEventListener("radar:pauseGenericPlayback", () => {
        pause();
    });
    document.addEventListener("radar:fallReplayClosed", () => {
        restoreAfterSharedReplayClose();
    });
}

export function handleModalShown({ uid }) {
    state.currentUID = uid || null;
    initializePlaybackDefaults();
}

export function handleModalHidden() {
    state.currentUID = null;
    state.requestToken += 1;
    setPlaybackPlaying(false);
    resetPlaybackDataState();
    state.isScrubbing = false;
    state.isHoveringTimeline = false;
    state.previewSeconds = null;
    hidePlaybackScrubPreview();

    if (state.fetchDebounceId) {
        window.clearTimeout(state.fetchDebounceId);
        state.fetchDebounceId = null;
    }

    playbackMap.destroy();
}

export function handleTabShown(targetId) {
    if (targetId === "#radar-live-pane") {
        setPlaybackPlaying(false);
        return;
    }

    if (targetId !== "#radar-playback-pane") {
        return;
    }

    if (state.mapContainer) {
        playbackMap.resize(state.mapContainer);
    }

    if (!state.data) {
        schedulePlaybackDataFetch(true);
        return;
    }

    renderPlaybackVisuals(
        Math.round(getCurrentPlaybackSeconds(getPlaybackRange())),
    );
}

export function resize() {
    if (
        !state.modal?.classList.contains("show") ||
        !state.mapContainer ||
        !isPlaybackPaneActive()
    ) {
        return;
    }

    playbackMap.resize(state.mapContainer);
}

export function pause() {
    setPlaybackPlaying(false);
    clearPlaybackTrail();
}

export function restoreAfterSharedReplayClose() {
    state.layoutWindow = null;
    clearPlaybackTrail();

    if (!state.mapContainer || !isPlaybackPaneActive() || !state.data) {
        return;
    }

    const currentSeconds = Math.round(
        getCurrentPlaybackSeconds(getPlaybackRange()),
    );
    renderPlaybackVisuals(currentSeconds);
    playbackMap.resize(state.mapContainer);
}
