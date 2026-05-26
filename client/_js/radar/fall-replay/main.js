import { grid } from "../core/index.js";
import {
    createPlaybackCategoryPreviewMarkup,
    getPlaybackCategoryPresentation,
    normalizePlaybackResponse as normalizeSharedPlaybackResponse,
} from "../playback/index.js";
import {
    getReplayFrameAtSeconds,
    getReplayLayoutForSeconds,
    getReplaySegmentAtSeconds,
    getReplayTimelineColorValue,
    getVisibleReplaySegments,
} from "../replay/index.js";
import {
    buildReplayDateTime as buildSharedReplayDateTime,
    buildReplayRangeFromAlarm,
    formatClock as formatSharedClock,
    formatLocalDate as formatSharedLocalDate,
    formatLocalDateTime as formatSharedLocalDateTime,
    parseMysqlDateTimeLocal as parseSharedMysqlDateTimeLocal,
} from "../replay/index.js";
import {
    getReplaySecondsFromClientX,
    positionReplayTimelineOverlay as positionSharedReplayTimelineOverlay,
    renderReplayCurrentPeople as renderSharedReplayCurrentPeople,
} from "../replay/index.js";
import {
    getTrailPoints as getReplayTrailPoints,
    resolveTrailTargetPersonIndex,
} from "./trail.js";
import {
    ensureReplayBackdrop,
    removeReplayBackdrop,
    setReplayModalHeader,
} from "./modal-ui.js";
import { playbackMap } from "../scene/index.js";
import { restoreParentModalScrollState } from "../../utils.js";
const SPEED_OPTIONS = {
    "0.5x": 0.5,
    "1x": 1,
    "2x": 2,
    "4x": 4,
};

const TIMELINE_COLORS = {
    primary: "#5867dd",
    success: "#1dc9b7",
    info: "#5578eb",
    warning: "#ffb822",
    danger: "#fd397a",
    secondary: "#74788d",
    purple: "#6f42c1",
};

const state = {
    modal: null,
    mapContainer: null,
    backdropEl: null,
    timerId: null,
    lastTickMs: null,
    isPlaying: false,
    data: null,
    layouts: [],
    layoutWindow: null,
    range: null,
    alarm: null,
    pendingAlarm: null,
    targetPersonIndex: null,
    isScrubbing: false,
    isHoveringTimeline: false,
    previewSeconds: null,
    requestToken: 0,
};

function isModalVisible() {
    return Boolean(state.modal?.classList?.contains("show"));
}

function showFallReplayModal() {
    if (!state.modal) return;

    if (
        typeof bootstrap !== "undefined" &&
        bootstrap?.Modal &&
        typeof bootstrap.Modal.getOrCreateInstance === "function"
    ) {
        const instance = bootstrap.Modal.getOrCreateInstance(state.modal, {
            backdrop: false,
        });
        instance.show();
        return;
    }

    const jqModal = $(state.modal);
    if (jqModal.length && typeof jqModal.modal === "function") {
        jqModal.modal({
            backdrop: false,
            show: true,
        });
    }
}

function renderReplayCurrentPeople(elementId, people = []) {
    return renderSharedReplayCurrentPeople(elementId, people);
}

function parseMysqlDateTimeLocal(value) {
    return parseSharedMysqlDateTimeLocal(value);
}

function formatLocalDate(date) {
    return formatSharedLocalDate(date);
}

function formatLocalDateTime(date) {
    return formatSharedLocalDateTime(date);
}

function formatClock(totalSeconds, includeSeconds = false) {
    return formatSharedClock(totalSeconds, includeSeconds);
}

function buildRangeFromAlarm(alarmTimestamp) { return buildReplayRangeFromAlarm(alarmTimestamp); }
function buildReplayDateTime(dateValue, totalSeconds) { return buildSharedReplayDateTime(dateValue, totalSeconds); }

function getTimelineColorValue(color) {
    return getReplayTimelineColorValue(color);
}

function getSpeedMultiplier() {
    const speedEl = document.getElementById("fall-replay-speed");
    return SPEED_OPTIONS[speedEl?.value] || 1;
}

function normalizePlaybackResponse(data, dateValue, range) {
    return normalizeSharedPlaybackResponse(data, dateValue, range, formatClock);
}

function getVisibleSegments(segments = state.data?.segments || []) {
    return getVisibleReplaySegments(segments);
}

function getCurrentSeconds() {
    if (!state.range) return 0;
    const timelineEl = document.getElementById("fall-replay-timeline");
    if (!timelineEl) return state.range.startSeconds;

    const progress = Number(timelineEl.value || 0) / 100;
    return state.range.startSeconds + state.range.totalSeconds * progress;
}

function getSegmentAtSeconds(currentSeconds) {
    return getReplaySegmentAtSeconds(state.data?.segments || [], currentSeconds);
}

function getFrameAtSeconds(currentSeconds) {
    return getReplayFrameAtSeconds(state.data?.positionFrames || [], currentSeconds);
}

function updateCurrentTimeLabel(currentSeconds) {
    const currentTimeEl = document.getElementById("fall-replay-current-time");
    if (!currentTimeEl || !state.range) return;

    currentTimeEl.innerHTML = `<i class="fa fa-play-circle mr-1"></i> A reproduzir: ${state.range.dateValue} ${formatClock(currentSeconds, true)}`;
}

function hideScrubPreview() {
    const previewTimeEl = document.getElementById(
        "fall-replay-timeline-preview-time",
    );
    const previewCardEl = document.getElementById(
        "fall-replay-timeline-preview-card",
    );

    if (previewTimeEl) previewTimeEl.classList.add("d-none");
    if (previewCardEl) previewCardEl.classList.add("d-none");
}

function getSecondsFromClientX(clientX) {
    if (!state.range) return 0;

    return getReplaySecondsFromClientX({
        clientX,
        timelineEl: document.getElementById("fall-replay-timeline"),
        range: state.range,
    });
}

function positionTimelineOverlay(element, progressPercent) {
    return positionSharedReplayTimelineOverlay({
        element,
        progressPercent,
        wrapperEl: document.getElementById("fall-replay-timeline-wrapper"),
        timelineEl: document.getElementById("fall-replay-timeline"),
        previewTimeEl: document.getElementById(
            "fall-replay-timeline-preview-time",
        ),
    });
}

function updateScrubPreview(currentSeconds) {
    if ((!state.isScrubbing && !state.isHoveringTimeline) || !state.range) {
        hideScrubPreview();
        return;
    }

    const previewTimeEl = document.getElementById(
        "fall-replay-timeline-preview-time",
    );
    const previewCardEl = document.getElementById(
        "fall-replay-timeline-preview-card",
    );
    if (!previewTimeEl || !previewCardEl) return;

    const progress =
        ((currentSeconds - state.range.startSeconds) /
            Math.max(state.range.totalSeconds, 1)) *
        100;
    const segment = getSegmentAtSeconds(currentSeconds) || {
        key: "unknown",
        label: "Sem dados",
        start: currentSeconds,
        end: currentSeconds,
        timeLabel: formatClock(currentSeconds, true),
    };

    previewTimeEl.textContent = formatClock(currentSeconds, true);
    previewTimeEl.classList.remove("d-none");
    positionTimelineOverlay(previewTimeEl, progress);

    if (segment.key === "unknown") {
        previewCardEl.classList.add("d-none");
        previewCardEl.innerHTML = "";
        return;
    }

    previewCardEl.innerHTML = createPlaybackCategoryPreviewMarkup(segment);
    previewCardEl.classList.remove("d-none");
    positionTimelineOverlay(previewCardEl, progress);
}

function updateTimelineUI() {
    if (!state.range) return;

    const startLabel = document.getElementById("fall-replay-timeline-start");
    const currentLabel = document.getElementById(
        "fall-replay-timeline-current",
    );
    const endLabel = document.getElementById("fall-replay-timeline-end");
    const currentSeconds = Math.round(getCurrentSeconds());

    if (startLabel)
        startLabel.textContent = formatClock(state.range.startSeconds);
    if (currentLabel)
        currentLabel.textContent = formatClock(currentSeconds, true);
    if (endLabel) endLabel.textContent = formatClock(state.range.endSeconds);

    updateCurrentTimeLabel(currentSeconds);

    const previewSeconds =
        (state.isScrubbing || state.isHoveringTimeline) &&
        state.previewSeconds !== null
            ? state.previewSeconds
            : currentSeconds;
    updateScrubPreview(previewSeconds);

    if (state.data) {
        renderVisuals(currentSeconds);
    }
}

function renderTimelineSections() {
    const sectionsEl = document.getElementById("fall-replay-timeline-sections");
    if (!sectionsEl || !state.range) return;

    const visibleSegments = getVisibleSegments(state.data?.segments || []);

    sectionsEl.innerHTML =
        '<div class="position-relative w-100 h-100 border rounded-pill overflow-hidden bg-light"></div>';

    const container = sectionsEl.firstElementChild;
    if (!container) return;

    visibleSegments.forEach((segment) => {
        const presentation = getPlaybackCategoryPresentation(segment);
        const startPercent =
            ((segment.start - state.range.startSeconds) /
                Math.max(state.range.totalSeconds, 1)) *
            100;
        const widthPercent =
            ((segment.end - segment.start) /
                Math.max(state.range.totalSeconds, 1)) *
            100;
        const section = document.createElement("span");

        section.className = "position-absolute h-100";
        section.style.left = `${Math.max(startPercent, 0)}%`;
        section.style.width = `${Math.max(widthPercent, 1)}%`;
        section.style.backgroundColor = getTimelineColorValue(
            presentation.color,
        );
        section.style.opacity = "0.45";
        container.appendChild(section);
    });

    updateTimelineUI();
}

function renderLoadingState() {
    const sectionsEl = document.getElementById("fall-replay-timeline-sections");
    if (!sectionsEl) return;

    sectionsEl.innerHTML =
        '<div class="w-100 h-100 border rounded-pill bg-light"></div>';
    hideScrubPreview();
}

function updateButtonState() {
    const toggleButton = document.getElementById("fall-replay-toggle");
    if (!toggleButton) return;

    toggleButton.classList.remove("btn-outline-primary");
    toggleButton.classList.add("btn-primary", "text-white");
    toggleButton.title = state.isPlaying ? "Pausar" : "Reproduzir";
    toggleButton.innerHTML = state.isPlaying
        ? '<i class="fa fa-pause pr-0"></i><span class="sr-only">Pausar</span>'
        : '<i class="fa fa-play pr-0"></i><span class="sr-only">Reproduzir</span>';
}

function setTimelineBySeconds(targetSeconds, forceCenter = false) {
    const timelineEl = document.getElementById("fall-replay-timeline");
    if (!timelineEl || !state.range) return;

    const bounded = Math.min(
        Math.max(targetSeconds, state.range.startSeconds),
        state.range.endSeconds,
    );
    const progress =
        ((bounded - state.range.startSeconds) /
            Math.max(state.range.totalSeconds, 1)) *
        100;

    timelineEl.step = "any";
    timelineEl.value = String(progress);
    if (forceCenter && (state.isScrubbing || state.isHoveringTimeline)) {
        state.previewSeconds = bounded;
    }
    updateTimelineUI();
}

function setPlaying(shouldPlay) {
    if (state.timerId) {
        window.clearInterval(state.timerId);
        state.timerId = null;
    }

    state.lastTickMs = null;
    state.isPlaying = shouldPlay;
    updateButtonState();

    if (!shouldPlay || !state.range) return;

    if (Math.round(getCurrentSeconds()) >= state.range.endSeconds) {
        setTimelineBySeconds(state.range.startSeconds);
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

        const currentSeconds = getCurrentSeconds();
        const nextSeconds =
            currentSeconds + elapsedSeconds * getSpeedMultiplier();

        if (nextSeconds >= state.range.endSeconds) {
            setTimelineBySeconds(state.range.endSeconds);
            setPlaying(false);
            return;
        }

        setTimelineBySeconds(nextSeconds);
    }, 100);
}

function getLayoutForSeconds(currentSeconds) {
    return getReplayLayoutForSeconds({
        layouts: state.layouts,
        dateValue: state.range?.dateValue,
        currentSeconds,
    });
}

function ensureLayoutForSeconds(currentSeconds) {
    if (!state.mapContainer || !state.data) return;

    const layout = getLayoutForSeconds(currentSeconds);
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

function resolveTargetPersonIndex() {
    return resolveTrailTargetPersonIndex({
        alarm: state.alarm,
        frames: state.data?.positionFrames || [],
        alarmSeconds: state.range?.alarmSeconds,
    });
}

function getTrailPoints(currentSeconds) {
    return getReplayTrailPoints({
        currentSeconds,
        frames: state.data?.positionFrames || [],
        targetPersonIndex: state.targetPersonIndex,
    });
}

function clearTrail() {
    playbackMap.clearTrail();
}

function renderVisuals(currentSeconds) {
    if (!state.data || !state.mapContainer) return;

    const activeSegment = getSegmentAtSeconds(currentSeconds);
    const frame = getFrameAtSeconds(currentSeconds);
    renderReplayCurrentPeople(
        "fall-replay-current-people",
        frame?.people || [],
    );
    ensureLayoutForSeconds(currentSeconds);

    if (!state.layoutWindow?.data) return;

    if (activeSegment?.key === "unknown") {
        playbackMap.clearPeople();
    } else {
        playbackMap.updatePeople(frame?.people || []);
    }

    const trailPoints = getTrailPoints(currentSeconds);
    if (trailPoints.length > 1) {
        playbackMap.setTrail(trailPoints, {
            stroke: "#5867dd",
            strokeWidth: 1,
            showEndpoint: false,
        });
        return;
    }

    clearTrail();
}

async function fetchReplayData() {
    if (!state.alarm?.device_code || !state.range) return false;

    const start = buildReplayDateTime(
        state.range.dateValue,
        state.range.startSeconds,
    );
    const end = buildReplayDateTime(
        state.range.dateValue,
        state.range.endSeconds,
    );
    const requestToken = ++state.requestToken;

    renderLoadingState();

    try {
        const [playbackResponse, layoutsResponse] = await Promise.all([
            fetch(
                `/modulos/radares/_ajax/radar-data/playback.php?uid=${encodeURIComponent(state.alarm.device_code)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
            ),
            fetch(
                `/modulos/radares/_ajax/layouts/read.php?uid=${encodeURIComponent(state.alarm.device_code)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
            ),
        ]);

        if (!playbackResponse.ok) {
            throw new Error(
                `Playback request failed with ${playbackResponse.status}`,
            );
        }

        if (!layoutsResponse.ok) {
            throw new Error(
                `Playback layout request failed with ${layoutsResponse.status}`,
            );
        }

        const [data, layoutsPayload] = await Promise.all([
            playbackResponse.json(),
            layoutsResponse.json(),
        ]);

        if (requestToken !== state.requestToken) return false;
        if (data?.error) throw new Error(data.error);
        if (layoutsPayload?.error) throw new Error(layoutsPayload.error);

        state.data = normalizePlaybackResponse(
            data,
            state.range.dateValue,
            state.range,
        );
        state.layouts = Array.isArray(layoutsPayload?.layouts)
            ? layoutsPayload.layouts
            : [];
        state.layoutWindow = null;
        state.targetPersonIndex = resolveTargetPersonIndex();
        renderTimelineSections();
        return true;
    } catch (error) {
        console.error("Failed to load fall replay data:", error);
        state.data = null;
        state.layouts = [];
        state.layoutWindow = null;
        state.targetPersonIndex = null;
        renderLoadingState();
        if (state.mapContainer) {
            state.mapContainer.innerHTML = "";
            playbackMap.init(state.mapContainer);
            playbackMap.renderPlaceholder(state.mapContainer);
        }
        return false;
    }
}

function resetModalState(destroySharedMap = false) {
    setPlaying(false);
    state.requestToken += 1;
    state.data = null;
    state.layouts = [];
    state.layoutWindow = null;
    state.range = null;
    state.alarm = null;
    state.pendingAlarm = null;
    state.targetPersonIndex = null;
    state.isScrubbing = false;
    state.isHoveringTimeline = false;
    state.previewSeconds = null;
    hideScrubPreview();

    const timelineEl = document.getElementById("fall-replay-timeline");
    if (timelineEl) timelineEl.value = 0;

    const subtitleEl = document.getElementById("fall-replay-modal-subtitle");
    if (subtitleEl) {
        subtitleEl.textContent =
            "Selecione um alarme de queda para reproduzir.";
    }

    const titleEl = document.getElementById("fallReplayModalLabel");
    if (titleEl) {
        titleEl.textContent = "Reprodução de queda confirmada";
    }

    const currentTimeEl = document.getElementById("fall-replay-current-time");
    if (currentTimeEl) {
        currentTimeEl.innerHTML =
            '<i class="fa fa-play-circle mr-1"></i> A reproduzir: --:--:--';
    }

    const startLabel = document.getElementById("fall-replay-timeline-start");
    const currentLabel = document.getElementById(
        "fall-replay-timeline-current",
    );
    const endLabel = document.getElementById("fall-replay-timeline-end");
    if (startLabel) startLabel.textContent = "--:--";
    if (currentLabel) currentLabel.textContent = "--:--:--";
    if (endLabel) endLabel.textContent = "--:--";

    renderLoadingState();
    updateButtonState();
    clearTrail();
    renderReplayCurrentPeople("fall-replay-current-people", []);

    if (destroySharedMap && state.mapContainer) {
        playbackMap.destroy();
        state.mapContainer.innerHTML = "";
    }
}

async function loadAlarmReplay(alarmRow) {
    if (!alarmRow?.device_code || alarmRow.tipo !== "fall_confirmed") return;

    const range = buildRangeFromAlarm(alarmRow.criado_em);
    if (!range) return;

    setPlaying(false);
    state.alarm = { ...alarmRow };
    state.range = range;
    state.targetPersonIndex = null;
    state.previewSeconds = null;
    state.isScrubbing = false;
    state.isHoveringTimeline = false;

    const timelineEl = document.getElementById("fall-replay-timeline");
    if (timelineEl) {
        timelineEl.step = "any";
        timelineEl.value = 0;
    }

    setReplayModalHeader({
        alarm: state.alarm,
        range: state.range,
        formatClock,
    });
    renderLoadingState();
    updateTimelineUI();

    if (state.mapContainer) {
        playbackMap.destroy();
        state.mapContainer.innerHTML = "";
        playbackMap.init(state.mapContainer);
        playbackMap.renderPlaceholder(state.mapContainer);
    }

    const loaded = await fetchReplayData();
    if (!loaded || !isModalVisible()) return;

    setTimelineBySeconds(state.range.startSeconds);
    setPlaying(true);
}

function openFallReplay(alarmRow) {
    if (!state.modal || alarmRow?.tipo !== "fall_confirmed") return;

    document.dispatchEvent(new CustomEvent("radar:pauseGenericPlayback"));

    if (isModalVisible()) {
        loadAlarmReplay(alarmRow);
        return;
    }

    state.pendingAlarm = alarmRow;
    showFallReplayModal();
}

function bindControl(id, handler) {
    const element = document.getElementById(id);
    if (!element || element.dataset.bound === "1") return;
    handler(element);
    element.dataset.bound = "1";
}

function setupUI() {
    bindControl("fall-replay-speed", (el) => {
        el.addEventListener("change", function () {
            if (state.isPlaying) {
                setPlaying(true);
            }
        });
    });

    bindControl("fall-replay-toggle", (el) => {
        el.addEventListener("click", function () {
            setPlaying(!state.isPlaying);
        });
    });

    bindControl("fall-replay-step-prev", (el) => {
        el.addEventListener("click", function () {
            const currentSeconds = getCurrentSeconds();
            const segments = getVisibleSegments(state.data?.segments || [])
                .map((segment) => Number(segment.start))
                .filter((value) => value < currentSeconds - 1)
                .sort((a, b) => a - b);

            const target = segments.length
                ? segments[segments.length - 1]
                : state.range?.startSeconds || 0;

            setPlaying(false);
            setTimelineBySeconds(target, true);
        });
    });

    bindControl("fall-replay-step-next", (el) => {
        el.addEventListener("click", function () {
            const currentSeconds = getCurrentSeconds();
            const segments = getVisibleSegments(state.data?.segments || [])
                .map((segment) => Number(segment.start))
                .filter((value) => value > currentSeconds + 1)
                .sort((a, b) => a - b);

            const target = segments.length
                ? segments[0]
                : state.range?.endSeconds || 0;

            setPlaying(false);
            setTimelineBySeconds(target, true);
        });
    });

    bindControl("fall-replay-timeline", (el) => {
        el.addEventListener("input", function () {
            state.previewSeconds = getCurrentSeconds();
            updateTimelineUI();
        });
        el.addEventListener("mouseenter", function (event) {
            state.isHoveringTimeline = true;
            state.previewSeconds = getSecondsFromClientX(event.clientX);
            updateScrubPreview(state.previewSeconds);
        });
        el.addEventListener("mousemove", function (event) {
            if (!state.isHoveringTimeline && !state.isScrubbing) return;

            state.previewSeconds = getSecondsFromClientX(event.clientX);
            updateScrubPreview(state.previewSeconds);
        });
        el.addEventListener("mouseleave", function () {
            state.isHoveringTimeline = false;
            if (!state.isScrubbing) {
                state.previewSeconds = null;
                hideScrubPreview();
            }
        });
        el.addEventListener("mousedown", function () {
            state.isScrubbing = true;
            state.previewSeconds = getCurrentSeconds();
            updateTimelineUI();
        });
        el.addEventListener("touchstart", function () {
            state.isScrubbing = true;
            state.previewSeconds = getCurrentSeconds();
            updateTimelineUI();
        });
        el.addEventListener("change", function () {
            state.isScrubbing = false;
            if (!state.isHoveringTimeline) {
                state.previewSeconds = null;
                hideScrubPreview();
            }
            updateTimelineUI();
        });
        el.addEventListener("blur", function () {
            state.isScrubbing = false;
            state.isHoveringTimeline = false;
            state.previewSeconds = null;
            hideScrubPreview();
        });
    });

    $(document)
        .off("mouseup.fallReplayScrub touchend.fallReplayScrub")
        .on("mouseup.fallReplayScrub touchend.fallReplayScrub", function () {
            if (!state.isScrubbing) return;
            state.isScrubbing = false;
            if (!state.isHoveringTimeline) {
                state.previewSeconds = null;
                hideScrubPreview();
            }
        });
}

function handleModalShown() {
    state.backdropEl = ensureReplayBackdrop(state.modal, state.backdropEl);
    if (!state.pendingAlarm) return;
    loadAlarmReplay(state.pendingAlarm);
    state.pendingAlarm = null;
}

function handleModalHidden() {
    removeReplayBackdrop(state.modal, state.backdropEl);
    state.backdropEl = null;
    resetModalState(true);
    restoreParentModalScrollState("radarModal");
    document.dispatchEvent(new CustomEvent("radar:fallReplayClosed"));
}

export function initFallReplayModal() {
    state.modal = document.getElementById("fallReplayModal");
    state.mapContainer = document.getElementById("fall-replay-map");
    if (!state.modal || !state.mapContainer) return;

    setupUI();
    resetModalState(false);
    grid.onFallReplay(openFallReplay);

    $(state.modal).on("shown.bs.modal", handleModalShown);
    $(state.modal).on("hidden.bs.modal", handleModalHidden);
    window.addEventListener("resize", () => {
        if (state.modal?.classList.contains("show") && state.mapContainer) {
            playbackMap.resize(state.mapContainer);
        }
    });
}
