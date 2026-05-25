let root;
let chart;
let xAxis;
let yAxis;
let rangeSeries;
let chartContainer;
let hoverOverlay;
let hoverTooltip;
const MIN_LABEL_WIDTH_PX = 28;
const LABEL_HORIZONTAL_PADDING_PX = 14;
const TIMELINE_TOOLTIP_OFFSET_PX = 12;

const ROW_CATEGORY = "sleep-session";
const SEGMENT_LABELS = {
    inBed: translations.i18n["tempo_na_cama"],
    latency: translations.i18n["latencia_de_sono"],
    sleep: translations.i18n["sono"],
    awake: translations.i18n["acordado"],
    outOfBed: translations.i18n["saida_da_cama_chart"],
};
const INTERVAL_CATEGORY_CONFIG = {
    sleep_latency: {
        label: SEGMENT_LABELS.latency,
        color: 0x6c757d,
    },
    sleeping: {
        label: SEGMENT_LABELS.sleep,
        color: 0x0d6efd,
    },
    just_in_bed: {
        label: SEGMENT_LABELS.awake,
        color: 0xffc107,
    },
    out_of_bed: {
        label: SEGMENT_LABELS.outOfBed,
        color: 0x003366,
    },
};

const formatDuration = (ms) => {
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const formatTime = (date) => {
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
};

const buildDisplayLabel = (title, durationLabel) =>
    `${title} • ${durationLabel}`;

const getColumnPixelWidth = (target) => {
    const column = target?.dataItem?.get("graphics");
    return Number(column?.getPrivate("width") || 0);
};

const escapeHtml = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const colorToHex = (color) => {
    if (!color) return "#212529";

    if (typeof color === "string") return color;

    if (typeof color === "number") {
        return `#${color.toString(16).padStart(6, "0")}`;
    }

    if (typeof color.toCSSHex === "function") {
        return color.toCSSHex();
    }

    return "#212529";
};

const getReadableTextColor = (hexColor) => {
    const normalized = String(hexColor || "")
        .replace("#", "")
        .trim();

    if (normalized.length !== 6) {
        return "#ffffff";
    }

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.62 ? "#212529" : "#ffffff";
};

const ensureHoverOverlay = (containerId) => {
    chartContainer = document.getElementById(containerId);
    if (!chartContainer) return;

    if (getComputedStyle(chartContainer).position === "static") {
        chartContainer.style.position = "relative";
    }

    hoverOverlay?.remove();

    hoverOverlay = document.createElement("div");
    hoverOverlay.className = "timeline-sleep-hover-overlay";
    hoverOverlay.style.position = "absolute";
    hoverOverlay.style.inset = "0";
    hoverOverlay.style.pointerEvents = "none";
    hoverOverlay.style.zIndex = "5";

    hoverTooltip = document.createElement("div");
    hoverTooltip.className = "timeline-sleep-hover-tooltip";
    hoverTooltip.style.position = "absolute";
    hoverTooltip.style.display = "none";
    hoverTooltip.style.pointerEvents = "none";
    hoverTooltip.style.padding = "6px 10px";
    hoverTooltip.style.borderRadius = "6px";
    hoverTooltip.style.background = "rgba(33, 37, 41, 0.95)";
    hoverTooltip.style.color = "#fff";
    hoverTooltip.style.fontSize = "12px";
    hoverTooltip.style.lineHeight = "1.4";
    hoverTooltip.style.whiteSpace = "nowrap";
    hoverTooltip.style.boxShadow = "0 6px 18px rgba(0, 0, 0, 0.18)";
    hoverTooltip.style.transform = "translate(-50%, calc(-100% - 8px))";

    hoverOverlay.appendChild(hoverTooltip);
    chartContainer.appendChild(hoverOverlay);
};

const hideHoverTooltip = () => {
    if (hoverTooltip) {
        hoverTooltip.style.display = "none";
    }
};

const updateHoverTooltipPosition = (event) => {
    if (!hoverOverlay || !hoverTooltip) return;

    const bounds = hoverOverlay.getBoundingClientRect();
    const nextLeft = Math.min(
        Math.max(event.clientX - bounds.left, 18),
        Math.max(bounds.width - 18, 18),
    );
    const nextTop = Math.max(event.clientY - bounds.top - TIMELINE_TOOLTIP_OFFSET_PX, 8);

    hoverTooltip.style.left = `${nextLeft}px`;
    hoverTooltip.style.top = `${nextTop}px`;
};

const showHoverTooltip = (event, item) => {
    if (!hoverTooltip) return;

    const backgroundColor = colorToHex(item?.color);
    const textColor = getReadableTextColor(backgroundColor);

    hoverTooltip.innerHTML = escapeHtml(item?.tooltipLabel).replaceAll(
        "\n",
        "<br>",
    );
    hoverTooltip.style.display = "block";
    hoverTooltip.style.background = backgroundColor;
    hoverTooltip.style.color = textColor;
    updateHoverTooltipPosition(event);
};

const syncHoverOverlay = (timelineData) => {
    if (!hoverOverlay || !hoverTooltip || !xAxis) return;

    Array.from(hoverOverlay.querySelectorAll(".timeline-sleep-hit-area")).forEach(
        (node) => node.remove(),
    );

    if (!timelineData.length) {
        hideHoverTooltip();
        return;
    }

    const renderer = xAxis.get("renderer");
    if (!renderer?.positionToCoordinate) {
        hideHoverTooltip();
        return;
    }

    timelineData.forEach((item) => {
        const startPosition = xAxis.valueToPosition(item.start);
        const endPosition = xAxis.valueToPosition(item.end);
        const left = renderer.positionToCoordinate(startPosition);
        const right = renderer.positionToCoordinate(endPosition);

        if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left) {
            return;
        }

        const hitArea = document.createElement("div");
        hitArea.className = "timeline-sleep-hit-area";
        hitArea.style.position = "absolute";
        hitArea.style.left = `${left}px`;
        hitArea.style.top = "0";
        hitArea.style.width = `${right - left}px`;
        hitArea.style.height = "100%";
        hitArea.style.pointerEvents = "auto";
        hitArea.style.background = "transparent";

        hitArea.addEventListener("mouseenter", (event) => {
            showHoverTooltip(event, item);
        });
        hitArea.addEventListener("mousemove", (event) => {
            showHoverTooltip(event, item);
        });
        hitArea.addEventListener("mouseleave", () => {
            hideHoverTooltip();
        });

        hoverOverlay.appendChild(hitArea);
    });
};

const parseReportWallClockDate = (value) => {
    const match = String(value || "")
        .trim()
        .match(
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
        );

    if (!match) return null;

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6] || 0),
        0,
    );
};

const buildTimelineData = (
    getBed,
    sleepStart,
    sleepEnd,
    leaveBed,
    hasSleepData,
) => {
    if (!hasSleepData) {
        const totalMs = leaveBed - getBed;
        if (totalMs <= 0 || totalMs >= 172800000) return [];
        const durationLabel = formatDuration(totalMs);
        const categoryLabel = translations.i18n["tempo_na_cama"];
        const labelText = `${translations.i18n["tempo_na_cama"]}\n${formatTime(getBed)} - ${formatTime(leaveBed)} (${formatDuration(totalMs)})`;
        return [
            {
                category: ROW_CATEGORY,
                start: getBed.getTime(),
                end: leaveBed.getTime(),
                color: am5.color(0x0d6efd),
                label: buildDisplayLabel(categoryLabel, durationLabel),
                tooltipLabel: labelText,
            },
        ];
    }

    const latencyMs = sleepStart - getBed;
    const sleepMs = sleepEnd - sleepStart;
    const awakeMs = leaveBed.getTime() - sleepEnd.getTime();

    const categories = [];

    if (latencyMs > 0) {
        const durationLabel = formatDuration(latencyMs);
        categories.push({
            category: ROW_CATEGORY,
            start: getBed.getTime(),
            end: sleepStart.getTime(),
            color: am5.color(0x6c757d),
            label: buildDisplayLabel(SEGMENT_LABELS.latency, durationLabel),
            tooltipLabel: `${SEGMENT_LABELS.latency}\n${formatTime(getBed)} - ${formatTime(sleepStart)} (${durationLabel})`,
        });
    }

    if (sleepMs > 0) {
        const durationLabel = formatDuration(sleepMs);
        categories.push({
            category: ROW_CATEGORY,
            start: sleepStart.getTime(),
            end: sleepEnd.getTime(),
            color: am5.color(0x0d6efd),
            label: buildDisplayLabel(SEGMENT_LABELS.sleep, durationLabel),
            tooltipLabel: `${SEGMENT_LABELS.sleep}\n${formatTime(sleepStart)} - ${formatTime(sleepEnd)} (${durationLabel})`,
        });
    }

    if (
        awakeMs > 0 &&
        (sleepEnd.getHours() !== leaveBed.getHours() ||
            sleepEnd.getMinutes() !== leaveBed.getMinutes())
    ) {
        const durationLabel = formatDuration(awakeMs);
        categories.push({
            category: ROW_CATEGORY,
            start: sleepEnd.getTime(),
            end: leaveBed.getTime(),
            color: am5.color(0xffc107),
            label: buildDisplayLabel(SEGMENT_LABELS.awake, durationLabel),
            tooltipLabel: `${SEGMENT_LABELS.awake}\n${formatTime(sleepEnd)} - ${formatTime(leaveBed)} (${durationLabel})`,
        });
    }

    return categories;
};

const buildTimelineDataFromIntervals = (intervals = []) => {
    if (!Array.isArray(intervals) || !intervals.length) return [];

    return intervals
        .map((interval) => {
            const start = parseReportWallClockDate(interval?.start);
            const end = parseReportWallClockDate(interval?.end);

            if (!start || !end || end <= start) {
                return null;
            }

            const config =
                INTERVAL_CATEGORY_CONFIG[interval?.category] ||
                INTERVAL_CATEGORY_CONFIG.just_in_bed;
            const durationMs = end.getTime() - start.getTime();
            const durationLabel = formatDuration(durationMs);

            return {
                category: ROW_CATEGORY,
                start: start.getTime(),
                end: end.getTime(),
                color: am5.color(config.color),
                label: buildDisplayLabel(config.label, durationLabel),
                tooltipLabel: `${config.label}\n${formatTime(start)} - ${formatTime(end)} (${durationLabel})`,
            };
        })
        .filter(Boolean);
};

export function initSleepTimelineChart(containerId = "timeline-sleep-chart") {
    if (root) root.dispose();

    ensureHoverOverlay(containerId);
    root = am5.Root.new(containerId);
    root._logo?.dispose();

    chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            wheelX: "none",
            layout: root.verticalLayout,
            paddingLeft: 0,
        }),
    );

    xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(root, {
            baseInterval: { timeUnit: "minute", count: 1 },
            startLocation: -0.1,
            endLocation: 0.1,
            extraMin: 0.01,
            extraMax: 0.01,
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 70,
            }),
            dateFormats: {
                day: "HH:mm",
                hour: "HH:mm",
                minute: "HH:mm",
            },
            periodChangeDateFormats: {
                day: "HH:mm",
                hour: "HH:mm",
                minute: "HH:mm",
            },
        }),
    );

    yAxis = chart.yAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "category",
            renderer: am5xy.AxisRendererY.new(root, {
                inversed: true,
            }),
        }),
    );

    const yRenderer = yAxis.get("renderer");

    yRenderer.labels.template.set("forceHidden", true);
    yRenderer.grid.template.setAll({
        forceHidden: true,
    });
    const baseGrid = yRenderer.get("baseGrid");
    if (baseGrid) {
        baseGrid.setAll({
            forceHidden: true,
            visible: false,
            strokeOpacity: 0,
        });
    }

    rangeSeries = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            xAxis,
            yAxis,
            openValueXField: "start",
            valueXField: "end",
            categoryYField: "category",
            sequencedInterpolation: true,
        }),
    );

    rangeSeries.columns.template.setAll({
        height: am5.percent(60),
        cornerRadiusTL: 4,
        cornerRadiusTR: 4,
        cornerRadiusBL: 4,
        cornerRadiusBR: 4,
        strokeOpacity: 0,
        interactive: false,
        forceInactive: true,
    });

    rangeSeries.columns.template.adapters.add("fill", (fill, target) => {
        return target.dataItem.dataContext.color || fill;
    });

    rangeSeries.bullets.push(() => {
        const label = am5.Label.new(root, {
            text: "{label}",
            fill: am5.color(0xffffff),
            centerX: am5.p50,
            centerY: am5.p50,
            fontSize: 11,
            populateText: true,
            textAlign: "center",
            interactive: false,
            oversizedBehavior: "truncate",
            ellipsis: "...",
            maxWidth: 160,
            paddingLeft: 4,
            paddingRight: 4,
        });

        label.adapters.add("maxWidth", (maxWidth, target) => {
            const columnWidth = getColumnPixelWidth(target);
            if (columnWidth <= 0) return maxWidth;

            return Math.max(0, columnWidth - LABEL_HORIZONTAL_PADDING_PX);
        });

        label.adapters.add("visible", (visible, target) => {
            const columnWidth = getColumnPixelWidth(target);
            return visible && columnWidth >= MIN_LABEL_WIDTH_PX;
        });

        return am5.Bullet.new(root, {
            locationX: 0.5,
            sprite: label,
        });
    });

}

export function updateSleepTimeline(session, window) {
    if (!root) return;

    const bedStartIso = session?.bedTime?.start;
    const bedEndIso = session?.bedTime?.end;
    const sleepStartIso = session?.sleep?.start;
    const sleepEndIso = session?.sleep?.end;

    if (!bedStartIso || !bedEndIso) {
        rangeSeries.data.setAll([]);
        syncHoverOverlay([]);
        return;
    }

    const getBed = parseReportWallClockDate(bedStartIso);
    const leaveBed = parseReportWallClockDate(bedEndIso);

    if (!getBed || !leaveBed) {
        rangeSeries.data.setAll([]);
        syncHoverOverlay([]);
        return;
    }

    const hasSleepData = Boolean(sleepStartIso && sleepEndIso);

    let sleepStart = getBed;
    let sleepEnd = leaveBed;

    if (hasSleepData) {
        sleepStart = parseReportWallClockDate(sleepStartIso) || getBed;
        sleepEnd = parseReportWallClockDate(sleepEndIso) || leaveBed;
    }

    const timelineIntervals = buildTimelineDataFromIntervals(session?.intervals);
    const timelineData = timelineIntervals.length
        ? timelineIntervals
        : buildTimelineData(
              getBed,
              sleepStart,
              sleepEnd,
              leaveBed,
              hasSleepData,
          );

    yAxis.data.setAll([{ category: ROW_CATEGORY }]);
    rangeSeries.data.setAll(timelineData);

    if (window?.start && window?.end && xAxis) {
        const minDate = parseReportWallClockDate(window.start);
        const maxDate = parseReportWallClockDate(window.end);

        if (minDate && maxDate) {
            xAxis.set("min", minDate.getTime());
            xAxis.set("max", maxDate.getTime());
        }
    }

    root.events.once("frameended", () => {
        syncHoverOverlay(timelineData);
    });

    rangeSeries.appear(1000);
    chart.appear(1000, 100);
}
