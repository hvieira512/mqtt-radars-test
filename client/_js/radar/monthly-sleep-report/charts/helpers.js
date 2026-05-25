const DEFAULT_EMPTY_TEXT = translations.i18n["monthly_sleep_sem_dados"];
const DEFAULT_INFO_TEXT = translations.i18n["monthly_sleep_sem_dados"];

const MESSAGE_IMPACTS = {
    positive: {
        buttonClass: "btn-success",
        alertClass: "alert-outline-success",
        tooltipClass: "bg-success",
        icon: "fa fa-check text-white",
        alertIcon: "fa fa-check-circle text-success",
    },
    negative: {
        buttonClass: "btn-danger",
        alertClass: "alert-outline-danger",
        tooltipClass: "bg-danger",
        icon: "fa fa-exclamation-triangle text-white",
        alertIcon: "fa fa-exclamation-triangle text-danger",
    },
    neutral: {
        buttonClass: "btn-info",
        alertClass: "alert-outline-info",
        tooltipClass: "bg-info",
        icon: "fa fa-info text-white",
        alertIcon: "fa fa-info-circle text-info",
    },
};

const STACKED_SERIES_COLORS = [0x34bfa3, 0x3699ff, 0xffb822, 0x7e8299];

const CHART_DEFAULTS = {
    sleepDurationStatistics: {
        valueLabel: translations.i18n["monthly_sleep_duracao_sono"],
        unit: "h",
    },
    sleepDurationDistribution: {
        intervalAxis: true,
        valueLabel: translations.i18n["monthly_sleep_distribuicao"],
        unit: "%",
    },
    sleepEfficiencyStatistics: {
        valueLabel: translations.i18n["monthly_sleep_eficiencia_sono"],
        unit: "%",
    },
    sleepEfficiencyDistribution: {
        intervalAxis: true,
        valueLabel: translations.i18n["monthly_sleep_distribuicao"],
        unit: "%",
    },
    deepSleepPercentageStatistics: {
        valueLabel: translations.i18n["sono_profundo"],
        unit: "%",
    },
    deepSleepPercentageDistribution: {
        intervalAxis: true,
        valueLabel: translations.i18n["monthly_sleep_distribuicao"],
        unit: "%",
    },
    ahiStatistics: {
        valueLabel: "AHI",
    },
    ahiDistribution: {
        intervalAxis: true,
        valueLabel: translations.i18n["monthly_sleep_distribuicao"],
        unit: "%",
    },
    breathRateDistribution: {
        intervalAxis: true,
        valueLabel: translations.i18n["monthly_sleep_distribuicao"],
        unit: "%",
    },
    heartRateAnomalyStatistics: {
        valueLabel: translations.i18n["monthly_sleep_anomalias"],
    },
    heartRateDistribution: {
        intervalAxis: true,
        valueLabel: translations.i18n["monthly_sleep_distribuicao"],
        unit: "%",
    },
    bodyMovementIndexStatistics: {
        valueLabel:
            translations.i18n["monthly_sleep_indice_movimento_corporal"],
    },
    bodyMovementIndexDistribution: {
        intervalAxis: true,
        valueLabel: translations.i18n["monthly_sleep_distribuicao"],
        unit: "%",
    },
    bedExitCountStatistics: {
        valueLabel: translations.i18n["monthly_sleep_saidas_cama"],
    },
    bedExitFrequencyDistribution: {
        valueLabel: translations.i18n["monthly_sleep_distribuicao"],
        unit: "%",
    },
    bedExitDurationStatistics: {
        valueLabel: translations.i18n["duracao"],
        unit: "min",
    },
    bedExitTimesDistribution: {
        valueLabel: translations.i18n["saida_da_cama_chart"],
    },
    sleepLatencyStatistics: {
        valueLabel: translations.i18n["monthly_sleep_latencia"],
        unit: "min",
    },
    sleepLatencyDistribution: {
        intervalAxis: true,
        valueLabel: translations.i18n["monthly_sleep_distribuicao"],
        unit: "%",
    },
    dailyRoutineTimesDistribution: {
        valueLabel: translations.i18n["monthly_sleep_evento_rotina"],
        groupColors: {
            "Go to bed": 0x3699ff,
            "Fall asleep": 0x34bfa3,
            "Wake up": 0xffb822,
            "Get up": 0xf64e60,
        },
    },
    roomInOutStatistics: {
        valueLabel: translations.i18n["monthly_sleep_entradas_saidas_quarto"],
        unit: "vezes",
    },
    indoorDuration: {
        valueLabel: translations.i18n["duracao"],
        unit: "min",
    },
    walkingSteps: {
        valueLabel: translations.i18n["passos"],
        unit: "passos",
    },
    walkingSpeed: {
        valueLabel: translations.i18n["monthly_sleep_velocidade_caminhada"],
        unit: "m/min",
    },
};

const LABEL_TRANSLATIONS = {
    "Still time": translations.i18n["monthly_sleep_tempo_parado"],
    "Walking time": translations.i18n["monthly_sleep_tempo_caminhar"],
    Other: translations.i18n["outro"],
    "Bed exit": translations.i18n["saida_da_cama_chart"],
    "Go to bed": translations.i18n["deitar"],
    "Fall asleep": translations.i18n["monthly_sleep_adormecer"],
    "Wake up": translations.i18n["monthly_sleep_acordar"],
    "Get up": translations.i18n["monthly_sleep_levantar"],
    Value: translations.i18n["valor"],
};

const hasAmCharts = () =>
    typeof am5 !== "undefined" && typeof am5xy !== "undefined";

const toArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value, fallback = 0) => {
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : fallback;
};

const toNullableNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : null;
};

const hasNumericValue = (rows, key = "value") =>
    rows.some((row) => Number.isFinite(row?.[key]));

const getFirstDefined = (...values) =>
    values.find((value) => value !== undefined && value !== null);

const translateUiLabel = (value) => {
    const label = String(value || "");
    return LABEL_TRANSLATIONS[label] || label;
};

const resolveConfig = (config = {}) => ({
    ...(CHART_DEFAULTS[config.chartKey] || {}),
    ...config,
});

const usesPercentScale = (config = {}) => config.unit === "%";

const getCategory = (item, index) =>
    String(
        getFirstDefined(
            item?.category,
            item?.date,
            item?.label,
            item?.bin,
            item?.interval,
            item?.name,
            item?.x,
            index + 1,
        ),
    );

const formatDateAxisLabel = (category) => {
    const value = String(category || "");
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(5) : value;
};

const formatNumber = (value) =>
    Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));

const formatSleepWindowTimeValue = (value) => {
    let hour = Math.floor(value);
    let minute = Math.round((value - hour) * 60);
    if (minute >= 60) {
        hour += 1;
        minute -= 60;
    }

    const normalizedHour = String(hour % 24).padStart(2, "0");
    const normalizedMinute = String(minute).padStart(2, "0");

    return `${normalizedHour}:${normalizedMinute}`;
};

const normalizeSuffix = (value) => String(value || "").trim();

const formatIntervalAxisLabel = (value, suffix) => {
    const normalizedSuffix = normalizeSuffix(suffix);
    if (
        normalizedSuffix.toLowerCase() === "bpm" ||
        normalizedSuffix.toLowerCase() === "min"
    ) {
        return formatNumber(value);
    }

    const separator = ["%", "h"].includes(normalizedSuffix) ? "" : " ";
    return `${formatNumber(value)}${normalizedSuffix ? `${separator}${normalizedSuffix}` : ""}`;
};

const axisValueKey = (value) =>
    String(Math.round(Number(value) * 100000) / 100000);

const parseIntervalCategory = (category) => {
    const value = String(category || "")
        .trim()
        .replace(/[–—]/g, "-");
    const match = value.match(
        /^(-?\d+(?:\.\d+)?)\s*([^-\d]*)-\s*(-?\d+(?:\.\d+)?)\s*(.*)$/,
    );

    if (!match) return null;

    const start = Number(match[1]);
    const end = Number(match[3]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return null;
    }

    return {
        start,
        end,
        midpoint: start + (end - start) / 2,
        suffix: normalizeSuffix(match[4] || match[2]),
        label: value,
    };
};

const decorateRows = (rows) => rows.map((row) => ({ ...row }));

const withDisplayCategory = (category) => ({
    category,
    categoryLabel: formatDateAxisLabel(category),
    tooltipCategory: String(category),
});

const normalizeSeriesRows = (payload = {}, config = {}) => {
    const directRows = toArray(payload.data);
    if (directRows.length) {
        return decorateRows(
            directRows.map((item, index) => {
                const category = getCategory(item, index);
                return {
                    ...withDisplayCategory(category),
                    value: toNullableNumber(
                        getFirstDefined(
                            item?.value,
                            item?.y,
                            item?.count,
                            item?.percentage,
                        ),
                    ),
                };
            }),
            config,
        );
    }

    const categories = toArray(
        getFirstDefined(
            payload.x,
            payload.dates,
            payload.bins,
            payload.categories,
        ),
    );
    const series = toArray(getFirstDefined(payload.series, payload.values));
    const values = Array.isArray(series[0]?.data) ? series[0].data : series;

    return decorateRows(
        categories.map((category, index) => ({
            ...withDisplayCategory(String(category)),
            value: toNullableNumber(values[index]),
        })),
        config,
    );
};

const normalizeIntervalRows = (payload = {}, config = {}) =>
    decorateRows(
        normalizeSeriesRows(payload, config)
            .map((row) => {
                const interval = parseIntervalCategory(row.category);
                if (!interval) return null;

                return {
                    ...row,
                    intervalStart: interval.start,
                    intervalEnd: interval.end,
                    intervalPlotStart:
                        interval.start + (interval.end - interval.start) * 0.06,
                    intervalPlotEnd:
                        interval.end - (interval.end - interval.start) * 0.06,
                    intervalMidpoint: interval.midpoint,
                    intervalSuffix: interval.suffix,
                    intervalLabel: interval.label,
                    tooltipCategory: interval.label,
                };
            })
            .filter(Boolean),
        config,
    );

const normalizeStackedRows = (payload = {}) => {
    const categories = toArray(
        getFirstDefined(payload.x, payload.dates, payload.categories),
    );
    const series = toArray(payload.series);

    if (!categories.length || !series.length) {
        return { categories: [], rows: [], series: [] };
    }

    const keys = series.map((item, index) => ({
        key: `value${index}`,
        name: translateUiLabel(
            item?.name || item?.category || `Série ${index + 1}`,
        ),
        values: toArray(item?.data),
        color: STACKED_SERIES_COLORS[index % STACKED_SERIES_COLORS.length],
    }));

    const rows = categories.map((category, index) => {
        const row = { ...withDisplayCategory(String(category)) };
        keys.forEach((item) => {
            row[item.key] = toNullableNumber(item.values[index]);
        });
        return row;
    });

    return { categories, rows, series: keys };
};

const normalizeBubbleRows = (payload = {}, config = {}) => {
    const points = toArray(getFirstDefined(payload.points, payload.data));

    return points.map((item, index) => {
        const category = getCategory(item, index);
        const group = String(getFirstDefined(item?.group, item?.type, ""));
        const translatedGroup = translateUiLabel(group);
        const groupColor =
            config.groupColors?.[group] ||
            config.groupColors?.[translatedGroup];

        return {
            ...withDisplayCategory(category),
            x: toNumber(
                getFirstDefined(item?.x, item?.hour, item?.timeValue),
                20,
            ),
            value: Math.max(
                toNumber(getFirstDefined(item?.value, item?.size), 1),
                1,
            ),
            timeLabel: String(
                getFirstDefined(
                    item?.timeLabel,
                    item?.time,
                    item?.timestamp,
                    item?.label,
                    "",
                ),
            ),
            group: translatedGroup,
            color: groupColor || null,
        };
    });
};

const uniqueCategoryRows = (rows) => {
    const seen = new Set();
    const categories = [];

    rows.forEach((row) => {
        if (seen.has(row.category)) return;
        seen.add(row.category);
        categories.push({
            category: row.category,
            categoryLabel: row.categoryLabel,
            tooltipCategory: row.tooltipCategory,
        });
    });

    return categories;
};

const buildRoot = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container || !hasAmCharts()) return null;

    const root = am5.Root.new(containerId);
    root._logo?.dispose();
    root.setThemes([am5themes_Animated.new(root)]);
    return root;
};

const buildTooltip = (root, labelText) =>
    am5.Tooltip.new(root, {
        labelText,
        pointerOrientation: "horizontal",
    });

const applyTooltipDataColor = (tooltip, fallbackColor) => {
    const background = tooltip.get("background");
    const getColor = (fallback) => {
        const color = tooltip.dataItem?.dataContext?.color;
        const resolvedFallback =
            typeof fallbackColor === "function"
                ? fallbackColor()
                : fallbackColor;
        return color !== null && color !== undefined
            ? am5.color(color)
            : resolvedFallback || fallback;
    };

    background.adapters.add("fill", (fill) => getColor(fill));
    background.adapters.add("stroke", (stroke) => getColor(stroke));
};

const buildNoDataLabel = (root, chart, text) =>
    chart.plotContainer.children.push(
        am5.Label.new(root, {
            text,
            centerX: am5.percent(50),
            centerY: am5.percent(50),
            x: am5.percent(50),
            y: am5.percent(50),
            fill: am5.color(0x6c757d),
            fontSize: 13,
            visible: true,
        }),
    );

const toggleNoData = (label, hasData) => {
    if (label) label.set("visible", !hasData);
};

const addCursor = (root, chart, xAxis, yAxis) => {
    const cursor = chart.set(
        "cursor",
        am5xy.XYCursor.new(root, {
            xAxis,
            yAxis,
            behavior: "none",
        }),
    );
    cursor.lineY.set("visible", false);
    return cursor;
};

const applyCategoryLabelAdapter = (axis) => {
    axis.get("renderer").labels.template.adapters.add(
        "text",
        (text, target) => {
            const dataContext = target.dataItem?.dataContext;
            const category =
                dataContext?.category ||
                target.dataItem?.get("category") ||
                text;
            return dataContext?.categoryLabel || formatDateAxisLabel(category);
        },
    );
};

const getValueUnit = (config) => (config.unit ? ` ${config.unit}` : "");

const buildValueTooltipText = (config, valueField = "valueY") =>
    `{tooltipCategory}\n${config.valueLabel || translateUiLabel(config.title) || translations.i18n["valor"]}: {${valueField}}${getValueUnit(config)}`;

const createXYContainer = (containerId, config = {}) => {
    const root = buildRoot(containerId);
    if (!root) return null;

    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: "none",
            wheelY: "none",
            layout: root.verticalLayout,
        }),
    );

    const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "category",
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: config.minGridDistance || 35,
            }),
        }),
    );
    applyCategoryLabelAdapter(xAxis);

    const yAxisOptions = {
        renderer: am5xy.AxisRendererY.new(root, {}),
    };
    if (usesPercentScale(config)) {
        yAxisOptions.min = 0;
        yAxisOptions.max = 100;
    }
    if (Number.isFinite(config.min)) yAxisOptions.min = config.min;
    if (Number.isFinite(config.max)) yAxisOptions.max = config.max;
    if (Number.isFinite(config.min) && Number.isFinite(config.max)) {
        yAxisOptions.strictMinMax = true;
    }
    if (usesPercentScale(config)) {
        yAxisOptions.strictMinMax = true;
    }

    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, yAxisOptions));
    const noDataLabel = buildNoDataLabel(
        root,
        chart,
        config.emptyText || DEFAULT_EMPTY_TEXT,
    );

    addCursor(root, chart, xAxis, yAxis);

    return { root, chart, xAxis, yAxis, noDataLabel };
};

const createIntervalColumnChart = (containerId, config = {}) => {
    const root = buildRoot(containerId);
    if (!root) return { update: () => {} };

    let axisSuffix = "";
    let axisBoundaryValues = new Set();
    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: "none",
            wheelY: "none",
            layout: root.verticalLayout,
        }),
    );

    const xRenderer = am5xy.AxisRendererX.new(root, {
        minGridDistance: config.minGridDistance || 44,
    });
    xRenderer.labels.template.adapters.add("text", (text, target) => {
        const value = target.dataItem?.get("value");
        if (
            axisBoundaryValues.size > 0 &&
            !axisBoundaryValues.has(axisValueKey(value))
        ) {
            return "";
        }

        return Number.isFinite(value)
            ? formatIntervalAxisLabel(value, axisSuffix)
            : text;
    });

    const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
            renderer: xRenderer,
            strictMinMax: true,
        }),
    );

    const yAxisOptions = {
        renderer: am5xy.AxisRendererY.new(root, {}),
    };
    if (usesPercentScale(config)) {
        yAxisOptions.min = 0;
        yAxisOptions.max = 100;
    }
    if (Number.isFinite(config.min)) yAxisOptions.min = config.min;
    if (Number.isFinite(config.max)) yAxisOptions.max = config.max;
    if (Number.isFinite(config.min) && Number.isFinite(config.max)) {
        yAxisOptions.strictMinMax = true;
    }
    if (usesPercentScale(config)) {
        yAxisOptions.strictMinMax = true;
    }

    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, yAxisOptions));
    const noDataLabel = buildNoDataLabel(
        root,
        chart,
        config.emptyText || DEFAULT_EMPTY_TEXT,
    );

    const intervalTooltipText = `{intervalLabel}\n${config.valueLabel || translations.i18n["valor"]}: {valueY}${getValueUnit(config)}`;
    const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            name:
                config.valueLabel ||
                translateUiLabel(config.title) ||
                translations.i18n["valor"],
            xAxis,
            yAxis,
            openValueXField: "intervalPlotStart",
            valueXField: "intervalPlotEnd",
            valueYField: "value",
        }),
    );

    series.columns.template.setAll({
        cornerRadiusTL: 3,
        cornerRadiusTR: 3,
        strokeOpacity: 0,
        interactive: true,
        tooltipText: intervalTooltipText,
        tooltipY: 0,
    });
    addCursor(root, chart, xAxis, yAxis);

    return {
        update(payload) {
            const rows = normalizeIntervalRows(payload, config);
            axisSuffix = rows[0]?.intervalSuffix || "";
            const starts = rows.map((row) => row.intervalStart);
            const ends = rows.map((row) => row.intervalEnd);
            const min = starts.length ? Math.min(...starts) : 0;
            const max = ends.length ? Math.max(...ends) : 1;
            axisBoundaryValues = new Set(
                [...starts, ...ends].map((value) => axisValueKey(value)),
            );

            xAxis.setAll({ min, max, strictMinMax: true });
            series.data.setAll(rows);
            toggleNoData(noDataLabel, hasNumericValue(rows));
        },
    };
};

export const createBarChart = (containerId, rawConfig = {}) => {
    const config = resolveConfig(rawConfig);
    if (config.intervalAxis) {
        return createIntervalColumnChart(containerId, config);
    }

    const base = createXYContainer(containerId, config);
    if (!base) return { update: () => {} };

    const { root, chart, xAxis, yAxis, noDataLabel } = base;
    const tooltipText = buildValueTooltipText(config);
    const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            name:
                config.valueLabel ||
                translateUiLabel(config.title) ||
                translations.i18n["valor"],
            xAxis,
            yAxis,
            categoryXField: "category",
            valueYField: "value",
        }),
    );

    series.columns.template.setAll({
        cornerRadiusTL: 3,
        cornerRadiusTR: 3,
        interactive: true,
        maxWidth: 34,
        tooltipText,
        tooltipY: 0,
    });

    return {
        update(payload) {
            const rows = normalizeSeriesRows(payload, config);
            xAxis.data.setAll(rows);
            series.data.setAll(rows);
            toggleNoData(noDataLabel, hasNumericValue(rows));
        },
    };
};

export const createStackedColumnChart = (containerId, rawConfig = {}) => {
    const config = resolveConfig(rawConfig);
    const base = createXYContainer(containerId, config);
    if (!base) return { update: () => {} };

    const { root, chart, xAxis, yAxis, noDataLabel } = base;
    root.container.set("layout", root.verticalLayout);
    chart.set("height", am5.percent(100));

    const seriesByKey = new Map();
    const legendContainer = root.container.children.push(
        am5.Container.new(root, {
            layout: root.horizontalLayout,
            centerX: am5.percent(50),
            x: am5.percent(50),
            paddingTop: 8,
        }),
    );

    const ensureSeries = (item) => {
        if (seriesByKey.has(item.key)) return seriesByKey.get(item.key);

        const series = base.chart.series.push(
            am5xy.ColumnSeries.new(root, {
                name: item.name,
                stacked: true,
                xAxis,
                yAxis,
                categoryXField: "category",
                valueYField: item.key,
                tooltip: buildTooltip(
                    root,
                    `{tooltipCategory}\n${item.name}: {valueY}${getValueUnit(config)}`,
                ),
            }),
        );
        series.columns.template.setAll({
            fill: am5.color(item.color),
            stroke: am5.color(item.color),
            cornerRadiusTL: 2,
            cornerRadiusTR: 2,
        });
        seriesByKey.set(item.key, series);
        return series;
    };

    return {
        update(payload) {
            const normalized = normalizeStackedRows(payload);
            xAxis.data.setAll(normalized.rows);
            normalized.series.forEach((item) => {
                ensureSeries(item).data.setAll(normalized.rows);
            });
            legendContainer.children.clear();
            normalized.series.forEach((item) => {
                const entry = legendContainer.children.push(
                    am5.Container.new(root, {
                        layout: root.horizontalLayout,
                        paddingLeft: 8,
                        paddingRight: 8,
                        centerY: am5.percent(50),
                    }),
                );
                entry.children.push(
                    am5.Rectangle.new(root, {
                        width: 10,
                        height: 10,
                        fill: am5.color(item.color),
                        stroke: am5.color(0xffffff),
                        strokeWidth: 1,
                        centerY: am5.percent(50),
                    }),
                );
                entry.children.push(
                    am5.Label.new(root, {
                        text: item.name,
                        fontSize: 12,
                        fill: am5.color(0x6c757d),
                        paddingLeft: 5,
                        centerY: am5.percent(50),
                    }),
                );
            });
            toggleNoData(
                noDataLabel,
                normalized.rows.some((row) =>
                    normalized.series.some((item) =>
                        Number.isFinite(row[item.key]),
                    ),
                ),
            );
        },
    };
};

export const createBubbleTimelineChart = (containerId, rawConfig = {}) => {
    const config = resolveConfig(rawConfig);
    const root = buildRoot(containerId);
    if (!root) return { update: () => {} };
    root.container.set("layout", root.verticalLayout);

    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            height: am5.percent(100),
            panX: false,
            panY: true,
            wheelX: "none",
            wheelY: "zoomY",
        }),
    );

    const xAxisTooltip = am5.Tooltip.new(root, {
        pointerOrientation: "down",
        centerX: am5.percent(50),
        dy: -2,
    });
    const yAxisTooltip = am5.Tooltip.new(root, {
        pointerOrientation: "right",
        centerY: am5.percent(50),
        dx: 2,
    });

    const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 20,
            max: 32,
            strictMinMax: true,
            tooltip: xAxisTooltip,
            renderer: am5xy.AxisRendererX.new(root, {
                inversed: true,
                minGridDistance: 45,
            }),
        }),
    );

    xAxis.get("renderer").labels.template.set("visible", false);
    xAxis.get("tooltip").label.adapters.add("text", (text) => {
        const value = Number(text);
        return Number.isFinite(value)
            ? formatSleepWindowTimeValue(value)
            : text;
    });

    const yAxis = chart.yAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "category",
            tooltip: yAxisTooltip,
            renderer: am5xy.AxisRendererY.new(root, {
                minGridDistance: 26,
            }),
        }),
    );
    applyCategoryLabelAdapter(yAxis);
    yAxis
        .get("tooltip")
        .label.adapters.add("text", (text) => formatDateAxisLabel(text));

    chart.set(
        "scrollbarY",
        am5.Scrollbar.new(root, {
            orientation: "vertical",
        }),
    );

    const bubbleTooltip = buildTooltip(
        root,
        `{tooltipCategory}\n{group}: {timeLabel}`,
    );

    const series = chart.series.push(
        am5xy.LineSeries.new(root, {
            xAxis,
            yAxis,
            valueXField: "x",
            categoryYField: "category",
            valueField: "value",
            tooltip: bubbleTooltip,
        }),
    );
    applyTooltipDataColor(bubbleTooltip, () => series.get("fill"));

    series.strokes.template.set("visible", false);
    series.bullets.push((root, _series, dataItem) => {
        const circle = am5.Circle.new(root, {
            radius: 5 + Math.min(Number(dataItem.dataContext?.value || 1), 8),
            fill: series.get("fill"),
            fillOpacity: 0.75,
            stroke: am5.color(0xffffff),
            strokeWidth: 1,
        });

        circle.adapters.add("fill", (fill, target) => {
            const color = target.dataItem?.dataContext?.color;
            return color !== null && color !== undefined
                ? am5.color(color)
                : fill;
        });

        return am5.Bullet.new(root, { sprite: circle });
    });

    const noDataLabel = buildNoDataLabel(
        root,
        chart,
        config.emptyText || DEFAULT_EMPTY_TEXT,
    );

    const cursor = chart.set(
        "cursor",
        am5xy.XYCursor.new(root, {
            behavior: "none",
            xAxis,
            yAxis,
            snapToSeries: [series],
            snapToSeriesBy: "xy",
        }),
    );
    cursor.lineX.setAll({
        visible: true,
        strokeOpacity: 0.45,
    });
    cursor.lineY.setAll({
        visible: true,
        strokeOpacity: 0.45,
    });

    if (config.groupColors) {
        const legend = root.container.children.push(
            am5.Container.new(root, {
                layout: root.horizontalLayout,
                centerX: am5.percent(50),
                x: am5.percent(50),
                paddingTop: 8,
            }),
        );

        Object.entries(config.groupColors).forEach(([group, color]) => {
            const item = legend.children.push(
                am5.Container.new(root, {
                    layout: root.horizontalLayout,
                    paddingLeft: 8,
                    paddingRight: 8,
                    centerY: am5.percent(50),
                }),
            );

            item.children.push(
                am5.Circle.new(root, {
                    radius: 5,
                    fill: am5.color(color),
                    stroke: am5.color(0xffffff),
                    strokeWidth: 1,
                    centerY: am5.percent(50),
                }),
            );

            item.children.push(
                am5.Label.new(root, {
                    text: translateUiLabel(group),
                    fontSize: 12,
                    fill: am5.color(0x6c757d),
                    paddingLeft: 5,
                    centerY: am5.percent(50),
                }),
            );
        });
    }

    return {
        update(payload) {
            const rows = normalizeBubbleRows(payload, config);
            const categories = toArray(payload?.dates).length
                ? toArray(payload.dates).map((date) =>
                      withDisplayCategory(String(date)),
                  )
                : uniqueCategoryRows(rows);
            yAxis.data.setAll(categories);
            series.data.setAll(rows);
            toggleNoData(noDataLabel, rows.length > 0);
        },
    };
};

export const getChartPayload = (payload, sectionKey, chartKey) => {
    const chartNode = payload?.sections?.[sectionKey]?.charts?.[chartKey] || {};
    const chartPayload =
        chartNode?.data &&
        typeof chartNode.data === "object" &&
        !Array.isArray(chartNode.data)
            ? chartNode.data
            : chartNode;
    const reportRefs = {
        "report.dates": payload?.report?.dates,
        "report.expectedDates": payload?.report?.expectedDates,
        "report.availableDates": payload?.report?.availableDates,
    };
    const dates = toArray(reportRefs[chartPayload.datesRef]);

    if (
        dates.length &&
        !chartPayload.x &&
        !chartPayload.dates &&
        !chartPayload.categories &&
        !chartPayload.bins
    ) {
        return {
            ...chartPayload,
            dates,
        };
    }

    return chartPayload;
};

export const getChartMessage = (payload, sectionKey, chartKey, fallback) =>
    payload?.sections?.[sectionKey]?.charts?.[chartKey]?.message ||
    payload?.sections?.[sectionKey]?.messages?.[chartKey] ||
    fallback || { text: DEFAULT_INFO_TEXT, impact: "neutral" };

const normalizeMessage = (message) => {
    if (typeof message === "string") {
        return {
            text: message,
            impact: "neutral",
        };
    }

    return {
        text: message?.text || DEFAULT_INFO_TEXT,
        impact: MESSAGE_IMPACTS[message?.impact] ? message.impact : "neutral",
    };
};

export const updateInfoMessage = (messageId, message) => {
    const element = document.getElementById(messageId);
    if (!element) return;

    const normalized = normalizeMessage(message);
    const impact = MESSAGE_IMPACTS[normalized.impact];

    Object.values(MESSAGE_IMPACTS).forEach((item) => {
        element.classList.remove(item.buttonClass);
    });
    element.classList.add("btn", impact.buttonClass);
    element.dataset.impact = normalized.impact;
    element.setAttribute("title", normalized.text);
    element.setAttribute("data-original-title", normalized.text);
    element.setAttribute("aria-label", normalized.text);

    const icon = element.querySelector("i");
    if (icon) {
        icon.className = impact.icon;
    }

    if (typeof $ === "function" && typeof $(element).tooltip === "function") {
        $(element).tooltip("dispose");
        $(element).tooltip({
            container: "body",
            placement: element.getAttribute("data-placement") || "left",
            trigger: "hover focus",
            title: normalized.text,
            template: `<div class="tooltip" role="tooltip"><div class="arrow"></div><div class="tooltip-inner ${impact.tooltipClass} text-white"></div></div>`,
        });
    }
};

export const updateSectionMessageAlert = (messageId, message) => {
    const element = document.getElementById(messageId);
    if (!element) return;

    const normalized = normalizeMessage(message);
    const impact = MESSAGE_IMPACTS[normalized.impact];

    Object.values(MESSAGE_IMPACTS).forEach((item) => {
        element.classList.remove(item.alertClass);
    });
    element.classList.add("alert", "alert-custom", impact.alertClass);
    element.dataset.impact = normalized.impact;

    const icon = element.querySelector(".alert-icon i");
    if (icon) {
        icon.className = impact.alertIcon;
    }

    const text = element.querySelector(".monthly-sleep-section-message-text");
    if (text) {
        text.textContent = normalized.text;
    }
};

export const createMonthlyChartModule = (config, chartFactory) => {
    let chart = null;

    const init = (containerId = config.containerId) => {
        if (chart) return;
        chart = chartFactory(containerId, resolveConfig(config));
    };

    const update = (payload) => {
        if (!chart) init();
        chart?.update(
            getChartPayload(payload, config.sectionKey, config.chartKey),
        );
        updateInfoMessage(
            config.messageId,
            getChartMessage(
                payload,
                config.sectionKey,
                config.chartKey,
                config.fallbackMessage,
            ),
        );
    };

    return { init, update };
};
