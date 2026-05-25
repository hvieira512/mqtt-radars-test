import {
    createPlaybackCategoryPreviewMarkup,
    getPlaybackCategoryPresentation,
} from "./category-renderer.js";
import {
    formatClock,
    getReplayTimelineColorValue,
    getVisibleReplaySegments,
    positionReplayTimelineOverlay,
} from "../replay/index.js";

export function updatePlaybackCurrentTimeLabel(currentSeconds, dateValue) {
    const currentTimeEl = document.getElementById("playback-current-time");
    if (!currentTimeEl) return;

    const label =
        dateValue || document.getElementById("playback-date")?.value || "Sem data";
    currentTimeEl.innerHTML = `<i class="fa fa-play-circle mr-1"></i> A reproduzir: ${label} ${formatClock(currentSeconds, true)}`;
}

export function hidePlaybackScrubPreview() {
    const previewTimeEl = document.getElementById(
        "playback-timeline-preview-time",
    );
    const previewCardEl = document.getElementById(
        "playback-timeline-preview-card",
    );

    if (previewTimeEl) previewTimeEl.classList.add("d-none");
    if (previewCardEl) previewCardEl.classList.add("d-none");
}

export function updatePlaybackScrubPreview({
    currentSeconds,
    range,
    isScrubbing,
    isHoveringTimeline,
    segment,
}) {
    if (!isScrubbing && !isHoveringTimeline) {
        hidePlaybackScrubPreview();
        return;
    }

    const previewTimeEl = document.getElementById(
        "playback-timeline-preview-time",
    );
    const previewCardEl = document.getElementById(
        "playback-timeline-preview-card",
    );
    const wrapperEl = document.getElementById("playback-timeline-wrapper");
    const timelineEl = document.getElementById("playback-timeline");

    if (!previewTimeEl || !previewCardEl || !wrapperEl || !timelineEl) return;

    const progress =
        ((currentSeconds - range.startSeconds) /
            Math.max(range.totalSeconds, 1)) *
        100;
    const previewSegment = segment || {
        key: "unknown",
        label: "Sem dados",
        start: currentSeconds,
        end: currentSeconds,
        timeLabel: formatClock(currentSeconds, true),
    };

    previewTimeEl.textContent = formatClock(currentSeconds, true);
    previewTimeEl.classList.remove("d-none");
    positionReplayTimelineOverlay({
        element: previewTimeEl,
        progressPercent: progress,
        wrapperEl,
        timelineEl,
        previewTimeEl,
    });

    if (previewSegment.key === "unknown") {
        previewCardEl.classList.add("d-none");
        previewCardEl.innerHTML = "";
        return;
    }

    previewCardEl.innerHTML = createPlaybackCategoryPreviewMarkup(previewSegment);
    previewCardEl.classList.remove("d-none");
    positionReplayTimelineOverlay({
        element: previewCardEl,
        progressPercent: progress,
        wrapperEl,
        timelineEl,
        previewTimeEl,
    });
}

export function renderPlaybackLoadingState(onSegmentsChange) {
    const sectionsEl = document.getElementById("playback-timeline-sections");
    onSegmentsChange([]);

    if (sectionsEl) {
        sectionsEl.innerHTML =
            '<div class="w-100 h-100 border rounded-pill bg-light"></div>';
    }

    hidePlaybackScrubPreview();
}

export function renderPlaybackTimelineSections({
    range,
    segments,
    onSegmentsChange,
    onRendered,
}) {
    const sectionsEl = document.getElementById("playback-timeline-sections");
    if (!sectionsEl) return;

    const visibleSegments = getVisibleReplaySegments(segments);
    onSegmentsChange(visibleSegments);

    sectionsEl.innerHTML =
        '<div class="position-relative w-100 h-100 border rounded-pill overflow-hidden bg-light"></div>';

    const container = sectionsEl.firstElementChild;
    if (!container) return;

    visibleSegments.forEach((segment) => {
        const presentation = getPlaybackCategoryPresentation(segment);
        const startPercent =
            ((segment.start - range.startSeconds) /
                Math.max(range.totalSeconds, 1)) *
            100;
        const widthPercent =
            ((segment.end - segment.start) / Math.max(range.totalSeconds, 1)) *
            100;
        const section = document.createElement("span");

        section.className = "position-absolute h-100";
        section.style.left = `${Math.max(startPercent, 0)}%`;
        section.style.width = `${Math.max(widthPercent, 1)}%`;
        section.style.backgroundColor = getReplayTimelineColorValue(
            presentation.color,
        );
        section.style.opacity = "0.45";
        container.appendChild(section);
    });

    onRendered();
}

export function updatePlaybackButtonState(isPlaying) {
    const toggleButton = document.getElementById("playback-toggle");
    if (!toggleButton) return;

    toggleButton.classList.remove("btn-outline-primary");
    toggleButton.classList.add("btn-primary", "text-white");
    toggleButton.title = isPlaying ? "Pausar" : "Reproduzir";
    toggleButton.innerHTML = isPlaying
        ? '<i class="fa fa-pause pr-0"></i><span class="sr-only">Pausar</span>'
        : '<i class="fa fa-play pr-0"></i><span class="sr-only">Reproduzir</span>';
}
