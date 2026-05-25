const SLEEP_STATUS = {
    3: { label: translations.i18n["saida_da_cama_chart"], color: 0x003366 },
    2: { label: translations.i18n["acordado"], color: 0xc0c0c0 },
    7: { label: translations.i18n["rem"], color: 0xff9933 },
    1: { label: translations.i18n["sono_leve"], color: 0x80c0ff },
    0: {
        label: translations.i18n["sono_profundo"],
        color: 0x744596,
    },
};

const STATUS_TO_Y = {
    3: 4,
    2: 3,
    7: 2,
    1: 1,
    0: 0,
};

const parseReportWallClockDate = (value) => {
    const match = String(value || "")
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);

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

let chartComponents = null;
let sleepSeries = null;
let transitionSeries = null;
let chartContainer = null;
let hoverOverlay = null;
let hoverTooltip = null;
const SEGMENT_VERTICAL_PADDING = 0.2;
const SLEEP_TOOLTIP_OFFSET_PX = 12;

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
    hoverOverlay.className = "sleep-chart-hover-overlay";
    hoverOverlay.style.position = "absolute";
    hoverOverlay.style.inset = "0";
    hoverOverlay.style.pointerEvents = "none";
    hoverOverlay.style.zIndex = "5";

    hoverTooltip = document.createElement("div");
    hoverTooltip.className = "sleep-chart-hover-tooltip";
    hoverTooltip.style.position = "absolute";
    hoverTooltip.style.display = "none";
    hoverTooltip.style.pointerEvents = "none";
    hoverTooltip.style.padding = "6px 10px";
    hoverTooltip.style.borderRadius = "6px";
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
    const nextTop = Math.max(
        event.clientY - bounds.top - SLEEP_TOOLTIP_OFFSET_PX,
        8,
    );

    hoverTooltip.style.left = `${nextLeft}px`;
    hoverTooltip.style.top = `${nextTop}px`;
};

const showHoverTooltip = (event, item) => {
    if (!hoverTooltip) return;

    const backgroundColor = colorToHex(item?.fill ?? item?.color);
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

const getSpriteCoordinate = (sprite, key) => {
    if (!sprite) return 0;

    const directValue = sprite.get?.(key);
    if (Number.isFinite(directValue)) {
        return directValue;
    }

    const privateValue = sprite.getPrivate?.(key);
    if (Number.isFinite(privateValue)) {
        return privateValue;
    }

    const method = sprite[key];
    if (typeof method === "function") {
        const methodValue = method.call(sprite);
        if (Number.isFinite(methodValue)) {
            return methodValue;
        }
    }

    return 0;
};

const syncHoverOverlay = () => {
    if (!hoverOverlay || !chartComponents?.chart || !sleepSeries) {
        return;
    }

    Array.from(hoverOverlay.querySelectorAll(".sleep-chart-hit-area")).forEach(
        (node) => node.remove(),
    );

    const dataItems = sleepSeries.dataItems || [];
    if (!dataItems.length) {
        hideHoverTooltip();
        return;
    }

    const chart = chartComponents.chart;
    const plotContainer = chart.plotContainer;
    const leftAxesContainer = chart.leftAxesContainer;
    const topAxesContainer = chart.topAxesContainer;
    const chartPaddingLeft = Number(chart.get("paddingLeft") || 0);
    const chartPaddingTop = Number(chart.get("paddingTop") || 0);

    hoverOverlay.style.inset = "auto";
    hoverOverlay.style.left = `${getSpriteCoordinate(leftAxesContainer, "width") + chartPaddingLeft}px`;
    hoverOverlay.style.top = `${getSpriteCoordinate(topAxesContainer, "height") + chartPaddingTop}px`;
    hoverOverlay.style.width = `${getSpriteCoordinate(plotContainer, "width")}px`;
    hoverOverlay.style.height = `${getSpriteCoordinate(plotContainer, "height")}px`;

    dataItems.forEach((dataItem) => {
        const item = dataItem.dataContext;
        const graphics = dataItem.get("graphics");
        if (!graphics || !item) {
            return;
        }

        const left = getSpriteCoordinate(graphics, "x");
        const top = getSpriteCoordinate(graphics, "y");
        const width = getSpriteCoordinate(graphics, "width");
        const height = getSpriteCoordinate(graphics, "height");

        if (
            !Number.isFinite(left) ||
            !Number.isFinite(top) ||
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width <= 0 ||
            height <= 0
        ) {
            return;
        }

        const hitArea = document.createElement("div");
        hitArea.className = "sleep-chart-hit-area";
        hitArea.style.position = "absolute";
        hitArea.style.left = `${left}px`;
        hitArea.style.top = `${top}px`;
        hitArea.style.width = `${width}px`;
        hitArea.style.height = `${height}px`;
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

const buildTransitionGradient = (root, topColor, bottomColor) => {
    return am5.LinearGradient.new(root, {
        rotation: 90,
        stops: [
            { color: topColor, opacity: 1, offset: 0 },
            { color: topColor, opacity: 1, offset: 0.28 },
            { color: bottomColor, opacity: 1, offset: 0.72 },
            { color: bottomColor, opacity: 1, offset: 1 },
        ],
    });
};

const getTransitionHalfWidth = (current, next) => {
    const currentDuration = current.endTime - current.startTime;
    const nextDuration = next.endTime - next.startTime;

    return Math.max(
        4000,
        Math.min(
            18000,
            Math.floor(Math.min(currentDuration, nextDuration) / 5),
        ),
    );
};

const buildSleepTransitionData = (segments, root) => {
    const transitions = [];

    for (let index = 0; index < segments.length - 1; index++) {
        const current = segments[index];
        const next = segments[index + 1];

        if (!current || !next || current.status === next.status) {
            continue;
        }

        const boundaryTime = current.endTime;
        const gapMs = Math.abs(next.startTime - boundaryTime);

        if (gapMs > 1000) {
            continue;
        }

        const halfWidth = getTransitionHalfWidth(current, next);
        const fromY = current.y1 + 0.5;
        const toY = next.y1 + 0.5;
        const topSegment = fromY >= toY ? current : next;
        const bottomSegment = fromY >= toY ? next : current;

        transitions.push({
            startTime: boundaryTime - halfWidth,
            endTime: boundaryTime + halfWidth,
            y1: Math.min(fromY, toY),
            y2: Math.max(fromY, toY),
            fill: current.fill,
            fillGradient: buildTransitionGradient(
                root,
                topSegment.fill,
                bottomSegment.fill,
            ),
        });
    }

    return transitions;
};

export function initSleepChart() {
    if (chartComponents) return;

    ensureHoverOverlay("sleep-chart");
    const root = am5.Root.new("sleep-chart");
    root._logo?.dispose();

    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            layout: root.verticalLayout,
        }),
    );

    const xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(root, {
            baseInterval: { timeUnit: "minute", count: 1 },
            endLocation: 0.1,
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 50,
            }),
        }),
    );

    const yRenderer = am5xy.AxisRendererY.new(root, {
        strokeOpacity: 0.1,
        minGridDistance: 1,
        inside: false,
    });

    yRenderer.grid.template.setAll({
        forceHidden: true,
    });

    yRenderer.labels.template.setAll({
        forceHidden: true,
    });

    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 0,
            max: 5,
            strictMinMax: true,
            renderer: yRenderer,
        }),
    );

    const stageLabels = [
        { value: 4.5, text: SLEEP_STATUS[3].label, color: 0x003366 },
        { value: 3.5, text: SLEEP_STATUS[2].label, color: 0x555555 },
        { value: 2.5, text: SLEEP_STATUS[7].label, color: 0xcc7700 },
        { value: 1.5, text: SLEEP_STATUS[1].label, color: 0x4070cc },
        { value: 0.5, text: SLEEP_STATUS[0].label, color: 0x744596 },
    ];

    stageLabels.forEach((stage) => {
        const rangeDataItem = yAxis.makeDataItem({ value: stage.value });
        const range = yAxis.createAxisRange(rangeDataItem);

        range.get("label").setAll({
            text: stage.text,
            fill: am5.color(stage.color),
            fontSize: "12px",
            fontWeight: "bold",
            centerX: am5.p100,
            paddingRight: 15,
            visible: true,
            forceHidden: false,
        });

        range.get("grid").setAll({
            strokeOpacity: 0.2,
            strokeDasharray: [3, 3],
            location: 1,
            visible: true,
            forceHidden: false,
        });
    });

    transitionSeries = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            xAxis: xAxis,
            yAxis: yAxis,
            openValueYField: "y1",
            valueYField: "y2",
            openValueXField: "startTime",
            valueXField: "endTime",
        }),
    );

    transitionSeries.columns.template.setAll({
        strokeOpacity: 0,
        interactive: false,
        forceInactive: true,
    });

    transitionSeries.columns.template.adapters.add("fill", (fill, target) => {
        return target.dataItem?.dataContext?.fill ?? fill;
    });

    transitionSeries.columns.template.adapters.add(
        "fillGradient",
        (fillGradient, target) => {
            return target.dataItem?.dataContext?.fillGradient ?? fillGradient;
        },
    );

    sleepSeries = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            xAxis: xAxis,
            yAxis: yAxis,
            openValueYField: "y1",
            valueYField: "y2",
            openValueXField: "startTime",
            valueXField: "endTime",
        }),
    );

    sleepSeries.columns.template.setAll({
        strokeOpacity: 0,
        width: am5.percent(100),
        interactive: false,
        forceInactive: true,
    });

    sleepSeries.columns.template.adapters.add("fill", (fill, target) => {
        return target.dataItem?.dataContext?.fill ?? fill;
    });

    chartComponents = { root, chart, xAxis, yAxis };
    return chartComponents;
}

export function updateSleepChart(data, window) {
    if (!sleepSeries || !transitionSeries) return;

    if (!data?.length) {
        sleepSeries.data.setAll([]);
        transitionSeries.data.setAll([]);
        syncHoverOverlay();
        return;
    }

    const chartData = data
        .map((item) => {
            const statusKey = Number.parseInt(item.code ?? item.status, 10);
            const yPos = STATUS_TO_Y[statusKey] ?? 0;
            const config = SLEEP_STATUS[statusKey] || {
                label: translations.i18n["desconhecido_simples"],
                color: 0x999999,
            };

            const start = parseReportWallClockDate(item.start);
            const end = parseReportWallClockDate(item.end);

            if (!start || !end || end <= start) {
                return null;
            }

            return {
                status: statusKey,
                statusText: config.label,
                startTime: start.getTime(),
                endTime: end.getTime(),
                startTimeFormatted: chartComponents.root.dateFormatter.format(
                    start,
                    "HH:mm",
                ),
                endTimeFormatted: chartComponents.root.dateFormatter.format(
                    end,
                    "HH:mm",
                ),
                tooltipLabel: `${config.label}: ${chartComponents.root.dateFormatter.format(
                    start,
                    "HH:mm",
                )} - ${chartComponents.root.dateFormatter.format(end, "HH:mm")}`,
                y1: yPos + SEGMENT_VERTICAL_PADDING,
                y2: yPos + 1 - SEGMENT_VERTICAL_PADDING,
                fill: am5.color(config.color),
            };
        })
        .filter(Boolean);

    const transitionData = buildSleepTransitionData(
        chartData,
        chartComponents.root,
    );

    transitionSeries.data.setAll(transitionData);
    sleepSeries.data.setAll(chartData);

    const minDate = parseReportWallClockDate(window?.start);
    const maxDate = parseReportWallClockDate(window?.end);

    if (minDate && maxDate) {
        chartComponents.xAxis.set("min", minDate.getTime());
        chartComponents.xAxis.set("max", maxDate.getTime());
    }

    chartComponents.root.events.once("frameended", () => {
        syncHoverOverlay();
    });
}
