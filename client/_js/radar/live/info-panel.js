import { parseMysqlDateTimeLocal } from "../replay/time.js";

// radar-info.js - Vitals rendering with charts

function formatValue(val) {
    return val === undefined || val === null || val === "" ? "—" : val;
}

function getWorkingMode(mode) {
    const modes = {
        15: translations.i18n["monitorizacao_de_cama"],
        11: translations.i18n["respiracao_e_sono"],
        7: translations.i18n["monitorizacao_de_queda"],
        3: translations.i18n["rastreamento_de_pessoas"],
    };
    return modes[mode] || "-";
}

function getSignalStrength(val) {
    if (!val || val === "-") return "—";
    const num = Number(val);
    if (isNaN(num)) return val;
    if (val.includes("CSQ")) {
        return num >= 23
            ? `${val} — ${translations.i18n["forte"]}`
            : num >= 15
              ? `${val} — ${translations.i18n["medio"]}`
              : `${val} — ${translations.i18n["fraco"]}`;
    }
    if (num <= -100) return `${val} — ${translations.i18n["sem_sinal"]}`;
    if (num > -100 && num <= -88)
        return `${val} — ${translations.i18n["fraco"]}`;
    if (num > -88 && num <= -66) return `${val} — ${translations.i18n["ok"]}`;
    if (num > -66 && num <= -55) return `${val} — ${translations.i18n["bom"]}`;
    return `${val} — ${translations.i18n["forte"]}`;
}

function parsePostureParams(str) {
    if (!str) return { fallTime: "—", bits: "—", sitTime: "—" };
    const parts = str.split(",").map((s) => s.trim());
    if (parts.length < 3) return { fallTime: str, bits: "—", sitTime: "—" };

    let fallSec = Number(parts[0]) * 10;
    if (parts[0] === "0") fallSec = 30;

    const bits = Number(parts[1]);
    const bitDesc = [];
    if (bits & 1) {
        bitDesc.push(translations.i18n["alarme_sentar_levantar_ligado"]);
    }
    if (bits & 2) {
        bitDesc.push(translations.i18n["detecao_postura_ligado"]);
    }
    if (bits & 4) {
        bitDesc.push(translations.i18n["alarme_sentar_cama_ligado"]);
    }

    let sitSec = Number(parts[2]) * 10;
    if (parts[2] === "0") sitSec = 30;

    return {
        fallTime:
            fallSec === 0
                ? translations.i18n["padrao_30s"]
                : `${fallSec} ${translations.i18n["segundos"]}`,
        bits: bitDesc.length
            ? bitDesc.join(", ")
            : translations.i18n["nenhum_ativo"],
        sitTime:
            sitSec === 0
                ? translations.i18n["padrao_30s"]
                : `${sitSec} ${translations.i18n["segundos"]}`,
    };
}

function parseHeartBreath(str) {
    if (!str) return null;
    const vals = str
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((v) => Number(v.trim()) & 0xff);
    return vals.length >= 7 ? vals : null;
}

export function renderRadarInfo(container, data) {
    if (!container) return;
    container.innerHTML = "";

    const posture = parsePostureParams(data.postureParams);
    const hb = parseHeartBreath(data.heart_breath_param);
    const onLabel = translations.i18n["ligado"];
    const offLabel = translations.i18n["desligado"];

    container.innerHTML = `
    <div class="container-fluid py-3">
        <div class="row g-4">

            <!-- Radar Settings -->
            <div class="col-lg-6">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-header bg-primary-10 text-primary h5 mb-0">${translations.i18n["configuracao_do_radar"]}</div>
                    <div class="card-body">
                        <dl class="row mb-0">
                            <dt class="col-sm-5 text-muted">${translations.i18n["modo_atual"]}</dt>
                            <dd class="col-sm-7">${getWorkingMode(data.radar_func_ctrl)}</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["metodo_de_instalacao"]}</dt>
                            <dd class="col-sm-7">${formatValue(data.radar_install_style)}</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["altura_de_instalacao"]}</dt>
                            <dd class="col-sm-7">${formatValue(data.radar_install_height)} dm</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["forca_do_sinal"]}</dt>
                            <dd class="col-sm-7">${getSignalStrength(data.signal_intensity)}</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["inclinacao_do_radar"]}</dt>
                            <dd class="col-sm-7">${formatValue(data.accelera)}</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["tempo_de_compilacao_radar"]}</dt>
                            <dd class="col-sm-7">${formatValue(data.radar_compile_time)}</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["tempo_de_compilacao_app"]}</dt>
                            <dd class="col-sm-7">${formatValue(data.app_compile_time)}</dd>
                        </dl>
                    </div>
                </div>
            </div>

            <!-- Alarm & Detection -->
            <div class="col-lg-6">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-header bg-danger-10 text-danger h5 mb-0">${translations.i18n["alarmes_e_detecao"]}</div>
                    <div class="card-body">
                        <dl class="row mb-0">
                            <dt class="col-sm-5 text-muted">${translations.i18n["tempo_de_queda_suspeita"]}</dt>
                            <dd class="col-sm-7">${formatValue(data.suspected_fall_time)} × 10s</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["alarme_de_saida_da_cama"]}</dt>
                            <dd class="col-sm-7">${data.leaveAlarmSwitch === "0" ? onLabel : data.leaveAlarmSwitch === "1" ? offLabel : "—"}</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["tempo_de_ativacao_da_saida"]}</dt>
                            <dd class="col-sm-7">${formatValue(data.leaveDetectionTime)} min</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["faixa_de_deteccao_da_saida"]}</dt>
                            <dd class="col-sm-7">${formatValue(data.leaveDetectionRange)}</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["monitoramento_de_ausencia_longa"]}</dt>
                            <dd class="col-sm-7">${data.longAwaySwitch === "0" ? onLabel : data.longAwaySwitch === "1" ? offLabel : "—"}</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["alarme_de_detencao"]}</dt>
                            <dd class="col-sm-7">${data.detentionAlarmSwitch === "0" ? onLabel : data.detentionAlarmSwitch === "1" ? offLabel : "—"}</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["tempo_de_ativacao_da_detencao"]}</dt>
                            <dd class="col-sm-7">${formatValue(data.entryDetectionTime)} min</dd>

                            <dt class="col-sm-5 text-muted">${translations.i18n["sinais_vitais_fracos"]}</dt>
                            <dd class="col-sm-7">${data.suddenDeathSwitch === "0" ? onLabel : data.suddenDeathSwitch === "1" ? offLabel : "—"}</dd>
                        </dl>
                    </div>
                </div>
            </div>

            <!-- Posture & Heart/Breath -->
            <div class="col-12">
                <div class="card shadow-sm border-0 mt-3">
                    <div class="card-header bg-warning-10 text-warning h5 mb-0">${translations.i18n["postura_e_parametros_de_sinais_vitais"]}</div>
                    <div class="card-body">
                        <div class="row g-4">

                            <!-- Posture -->
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-3">${translations.i18n["parametros_de_postura"]}</h6>
                                <dl class="row small mb-0">
                                    <dt class="col-sm-5 text-muted">${translations.i18n["tempo_de_queda_suspeita"]}</dt>
                                    <dd class="col-sm-7">${posture.fallTime}</dd>
                                    <dt class="col-sm-5 text-muted">${translations.i18n["funcionalidades_ativas"]}</dt>
                                    <dd class="col-sm-7">${posture.bits}</dd>
                                    <dt class="col-sm-5 text-muted">${translations.i18n["tempo_de_alarme_de_sentado"]}</dt>
                                    <dd class="col-sm-7">${posture.sitTime}</dd>
                                </dl>
                            </div>

                            <!-- Heart & Breath -->
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-3">${translations.i18n["faixa_de_frequencia_cardiaca_e_respiratoria"]}</h6>
                                ${
                                    hb
                                        ? `
                                <dl class="row small mb-0">
                                    <dt class="col-sm-6 text-muted">${translations.i18n["respiracao_superior"]}</dt><dd class="col-sm-6">${hb[0]}</dd>
                                    <dt class="col-sm-6 text-muted">${translations.i18n["frequencia_cardiaca_superior"]}</dt><dd class="col-sm-6">${hb[1]}</dd>
                                    <dt class="col-sm-6 text-muted">${translations.i18n["respiracao_inferior"]}</dt><dd class="col-sm-6">${hb[2]}</dd>
                                    <dt class="col-sm-6 text-muted">${translations.i18n["frequencia_cardiaca_inferior"]}</dt><dd class="col-sm-6">${hb[3]}</dd>
                                    <dt class="col-sm-6 text-muted">${translations.i18n["medicao_continua"]}</dt><dd class="col-sm-6">${hb[4] ? onLabel : offLabel}</dd>
                                    <dt class="col-sm-6 text-muted">${translations.i18n["tempo_de_ativacao_fraco"]}</dt><dd class="col-sm-6">${hb[5]} min</dd>
                                    <dt class="col-sm-6 text-muted">${translations.i18n["sensatividade"]}</dt><dd class="col-sm-6">${hb[6]}</dd>
                                </dl>`
                                        : "<p class='text-muted'>—</p>"
                                }
                            </div>

                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
    `;
}

const sleepStateMap = {
    Undefined: {
        label: translations.i18n["indefinido"],
        icon: "fa-question-circle",
        gradient: "linear-gradient(135deg, #6c757d 0%, #495057 100%)",
    },
    "Light Sleep": {
        label: translations.i18n["sono_leve"],
        icon: "fa-bed",
        gradient: "linear-gradient(135deg, #0dcaf0 0%, #0aa2c0 100%)",
    },
    "Deep Sleep": {
        label: translations.i18n["sono_profundo"],
        icon: "fa-moon",
        gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    },
    Awake: {
        label: translations.i18n["acordado"],
        icon: "fa-eye",
        gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    },
};

function updateSleepStateDisplay(
    containerId,
    labelId,
    stateRootSelector,
    sleepState,
) {
    const sleepContainer = document.getElementById(containerId);
    if (!sleepContainer) return;

    const state = sleepStateMap[sleepState] || sleepStateMap["Undefined"];
    sleepContainer.style.background = state.gradient;

    const label = document.getElementById(labelId);
    if (label) {
        label.textContent = sleepState ? state.label : "--";
    }

    const icon = document.querySelector(`${stateRootSelector} i`);
    if (icon) {
        icon.className = `fa ${state.icon} fa-2x mr-3`;
    }
}

function createMetricState() {
    return {
        chart: null,
        series: null,
        xAxis: null,
        root: null,
        data: [],
        stats: { min: null, max: null, sum: 0, count: 0 },
    };
}

function createPanelState() {
    return {
        heart: createMetricState(),
        breath: createMetricState(),
        lastRenderKey: "",
    };
}

const PANEL_CONFIGS = {
    live: {
        containerId: "liveRadarInfo",
        modalGuard: true,
        heart: {
            prefix: "heart-rate",
            chartId: "chart-heart-rate",
            color: 0xe74c3c,
            minY: 40,
            maxY: 180,
        },
        breath: {
            prefix: "breath-rate",
            chartId: "chart-breath-rate",
            color: 0x3498db,
            minY: 5,
            maxY: 40,
        },
        sleep: {
            containerId: "sleep-state-container",
            labelId: "sleep-state-label",
            rootSelector: "#sleep-state",
        },
    },
    playback: {
        containerId: "playbackRadarInfo",
        modalGuard: false,
        heart: {
            prefix: "playback-heart-rate",
            chartId: "playback-chart-heart-rate",
            color: 0xe74c3c,
            minY: 40,
            maxY: 180,
        },
        breath: {
            prefix: "playback-breath-rate",
            chartId: "playback-chart-breath-rate",
            color: 0x3498db,
            minY: 5,
            maxY: 40,
        },
        sleep: {
            containerId: "playback-sleep-state-container",
            labelId: "playback-sleep-state-label",
            rootSelector: "#playback-sleep-state",
        },
    },
};

const livePanelState = createPanelState();
const playbackPanelState = createPanelState();
const VITALS_VISIBLE_WINDOW_MS = 60 * 60 * 1000;
const VITALS_MINUTE_LABEL_SPAN_MS = 20 * 60 * 1000;
const PLAYBACK_DEFAULT_VITALS_FRESHNESS_SECONDS = 75;
const PLAYBACK_MIN_VITALS_FRESHNESS_SECONDS = 15;
const PLAYBACK_MAX_VITALS_FRESHNESS_SECONDS = 90;

function getVitalsTime(vitals) {
    const eventTime = parseMysqlDateTimeLocal(vitals?.created_at);
    return eventTime ? eventTime.getTime() : new Date().getTime();
}

function createChart(containerId, color, minY = 0, maxY = 100) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    if (container.__am5root) container.__am5root.dispose();
    container.innerHTML = "";

    const root = am5.Root.new(containerId);
    container.__am5root = root;
    root._logo && root._logo.dispose();
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            layout: root.verticalLayout,
            paddingLeft: 5,
            paddingRight: 5,
            paddingTop: 5,
            paddingBottom: 5,
        }),
    );

    const cursor = chart.set(
        "cursor",
        am5xy.XYCursor.new(root, {
            behavior: "none",
            snapToSeriesBy: "x",
        }),
    );
    cursor.lineX.set("visible", false);
    cursor.lineY.set("visible", false);
    chart.set("wheelX", "none");
    chart.set("wheelY", "none");
    if (chart.zoomOutButton) chart.zoomOutButton.set("visible", false);

    const xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(root, {
            baseInterval: { timeUnit: "second", count: 1 },
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 70,
            }),
            tooltipLocation: 0,
            maxDeviation: 500,
            groupData: false,
            dateFormats: {
                second: "HH:mm:ss",
                minute: "HH:mm",
            },
            periodChangeDateFormats: {
                second: "HH:mm:ss",
                minute: "HH:mm",
            },
        }),
    );

    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            min: minY,
            max: maxY,
            strictMinMax: true,
            renderer: am5xy.AxisRendererY.new(root, {
                minGridDistance: 30,
                strokeOpacity: 0.1,
            }),
            labels: { template: { maxWidth: 35, text: "{value}" } },
        }),
    );

    const series = chart.series.push(
        am5xy.SmoothedXLineSeries.new(root, {
            xAxis,
            yAxis,
            valueYField: "value",
            valueXField: "time",
            stroke: am5.color(color),
            strokeWidth: 2,
            tensionX: 0.8,
            fill: am5.color(color),
            tooltip: am5.Tooltip.new(root, {
                labelText:
                    "{valueX.formatDate('HH:mm:ss')}\n[bold]{valueY} BPM[/]",
            }),
        }),
    );

    cursor.set("snapToSeries", [series]);
    series.fills.template.setAll({ visible: true, fillOpacity: 0.2 });

    return { chart, series, xAxis, root };
}

function calculateStats(data, stats) {
    if (data.length === 0) return stats;
    const values = data.map((d) => d.value).filter((v) => v > 0);
    if (values.length === 0) return stats;
    stats.min = Math.min.apply(Math, values);
    stats.max = Math.max.apply(Math, values);
    stats.sum = values.reduce((a, b) => a + b, 0);
    stats.count = values.length;
    return stats;
}

const TREND_ICONS = {
    flat: '<i class="fa fa-minus text-muted"></i>',
    up: '<i class="fa fa-arrow-up text-success"></i>',
    down: '<i class="fa fa-arrow-down text-danger"></i>',
};

function getTrendIcon(data) {
    if (data.length < 2) return TREND_ICONS.flat;
    const last = data[data.length - 1].value;
    const prev = data[data.length - 2].value;
    const diff = last - prev;
    if (Math.abs(diff) < 2) return TREND_ICONS.flat;
    return diff > 0 ? TREND_ICONS.up : TREND_ICONS.down;
}

function getTimeSpanMs(data) {
    if (!Array.isArray(data) || data.length < 2) return 0;

    const firstTime = Number(data[0]?.time);
    const lastTime = Number(data[data.length - 1]?.time);

    if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime)) return 0;

    return Math.max(lastTime - firstTime, 0);
}

function getVitalsWindowData(data, windowEndTime = null) {
    if (!Array.isArray(data) || data.length < 2) return data?.slice() || [];

    const fallbackEndTime = Number(data[data.length - 1]?.time);
    const providedEndTime = Number(windowEndTime);
    const endTime =
        windowEndTime !== null &&
        windowEndTime !== undefined &&
        Number.isFinite(providedEndTime)
            ? providedEndTime
            : fallbackEndTime;

    if (!Number.isFinite(endTime)) return data.slice();

    const firstTime = Number(data[0]?.time);
    if (!Number.isFinite(firstTime)) return data.slice();

    const spanMs = Math.max(endTime - firstTime, 0);
    if (spanMs <= VITALS_VISIBLE_WINDOW_MS) return data.slice();

    const cutoffTime = endTime - VITALS_VISIBLE_WINDOW_MS;
    return data.filter((item) => Number(item.time) >= cutoffTime);
}

function getVitalsGridDistance(container, visibleSpanMs) {
    const width = container?.clientWidth || container?.offsetWidth || 420;

    if (width < 360) return 110;
    if (width < 520) return 90;
    if (visibleSpanMs >= VITALS_MINUTE_LABEL_SPAN_MS) return 85;
    return 70;
}

function updateVitalsXAxis(xAxis, container, visibleData) {
    if (!xAxis) return;

    const visibleSpanMs = getTimeSpanMs(visibleData);
    const labelFormat =
        visibleSpanMs >= VITALS_MINUTE_LABEL_SPAN_MS ? "HH:mm" : "HH:mm:ss";
    const renderer = xAxis.get("renderer");

    if (renderer) {
        renderer.set(
            "minGridDistance",
            getVitalsGridDistance(container, visibleSpanMs),
        );
        renderer.labels.template.setAll({
            fontSize: 11,
            oversizedBehavior: "none",
            paddingTop: 4,
        });
    }

    xAxis.set("dateFormats", {
        second: labelFormat,
        minute: "HH:mm",
        hour: "HH:mm",
    });
    xAxis.set("periodChangeDateFormats", {
        second: labelFormat,
        minute: "HH:mm",
        hour: "HH:mm",
    });
    xAxis.set("start", 0);
    xAxis.set("end", 1);
}

function getPlaybackChartPointLimit(container) {
    const width = container?.clientWidth || container?.offsetWidth || 420;
    const estimatedMajorTicks = Math.max(Math.round(width / 70), 4);
    return Math.max(estimatedMajorTicks * 4, 16);
}

function downsamplePlaybackSeries(data, maxPoints) {
    if (!Array.isArray(data) || data.length <= maxPoints || maxPoints < 3) {
        return data.slice();
    }

    const first = data[0];
    const last = data[data.length - 1];
    const bucketCount = Math.max(maxPoints - 2, 1);
    const bucketSize = (data.length - 2) / bucketCount;
    const sampled = [first];

    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex += 1) {
        const start = 1 + Math.floor(bucketIndex * bucketSize);
        const end = Math.min(
            1 + Math.floor((bucketIndex + 1) * bucketSize),
            data.length - 1,
        );
        const slice = data.slice(start, Math.max(end, start + 1));
        if (!slice.length) continue;

        const aggregate = slice.reduce(
            (acc, item) => ({
                time: acc.time + item.time,
                value: acc.value + item.value,
            }),
            { time: 0, value: 0 },
        );

        sampled.push({
            time: Math.round(aggregate.time / slice.length),
            value: Math.round((aggregate.value / slice.length) * 10) / 10,
        });
    }

    sampled.push(last);
    return sampled;
}

function getPlaybackVitalsFreshnessSeconds(vitalsTimeline) {
    const intervals = vitalsTimeline
        .map((item, index) =>
            index === 0
                ? null
                : item.seconds - vitalsTimeline[index - 1].seconds,
        )
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((a, b) => a - b);

    if (!intervals.length) {
        return PLAYBACK_DEFAULT_VITALS_FRESHNESS_SECONDS;
    }

    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    return Math.min(
        Math.max(medianInterval * 2.5, PLAYBACK_MIN_VITALS_FRESHNESS_SECONDS),
        PLAYBACK_MAX_VITALS_FRESHNESS_SECONDS,
    );
}

function hasFreshPlaybackVitals(currentVitals, currentSeconds, vitalsTimeline) {
    if (!currentVitals) return false;

    const hasReadableVitals =
        Number(currentVitals.heart_rate || 0) > 0 ||
        Number(currentVitals.breathing || 0) > 0 ||
        Boolean(currentVitals.sleep_state);

    if (!hasReadableVitals) return false;
    if (currentSeconds === null) return true;

    const ageSeconds = currentSeconds - Number(currentVitals.seconds);
    if (!Number.isFinite(ageSeconds) || ageSeconds < 0) return false;

    return ageSeconds <= getPlaybackVitalsFreshnessSeconds(vitalsTimeline);
}

function getPlaybackWindowEndTime(currentVitals, currentSeconds) {
    if (currentSeconds === null || !currentVitals) return null;

    const anchorTime = Number(currentVitals.timeMs);
    const anchorSeconds = Number(currentVitals.seconds);
    const replaySeconds = Number(currentSeconds);

    if (
        !Number.isFinite(anchorTime) ||
        !Number.isFinite(anchorSeconds) ||
        !Number.isFinite(replaySeconds)
    ) {
        return null;
    }

    return anchorTime + (replaySeconds - anchorSeconds) * 1000;
}

function ensureMetricChart(metricState, metricConfig) {
    if (metricState.chart) return true;

    const chart = createChart(
        metricConfig.chartId,
        metricConfig.color,
        metricConfig.minY,
        metricConfig.maxY,
    );

    if (!chart) return false;

    metricState.chart = chart.chart;
    metricState.series = chart.series;
    metricState.xAxis = chart.xAxis;
    metricState.root = chart.root;

    return true;
}

function ensurePanelCharts(panelState, panelConfig) {
    return (
        ensureMetricChart(panelState.heart, panelConfig.heart) &&
        ensureMetricChart(panelState.breath, panelConfig.breath)
    );
}

function updateMetricSummary(prefix, stats, currentValue, trendHtml) {
    const valueEl = document.getElementById(`${prefix}-value`);
    const minEl = document.getElementById(`${prefix}-min`);
    const avgEl = document.getElementById(`${prefix}-avg`);
    const maxEl = document.getElementById(`${prefix}-max`);
    const trendEl = document.getElementById(`${prefix}-trend`);

    if (valueEl) valueEl.textContent = currentValue > 0 ? currentValue : "--";
    if (minEl) minEl.textContent = stats.min || "--";
    if (avgEl) {
        avgEl.textContent =
            stats.count > 0 ? Math.round(stats.sum / stats.count) : "--";
    }
    if (maxEl) maxEl.textContent = stats.max || "--";
    if (trendEl) trendEl.innerHTML = trendHtml;
}

function resetMetricSummary(prefix) {
    ["-value", "-min", "-avg", "-max"].forEach((suffix) => {
        const el = document.getElementById(`${prefix}${suffix}`);
        if (el) el.textContent = "--";
    });

    const trendEl = document.getElementById(`${prefix}-trend`);
    if (trendEl) {
        trendEl.innerHTML = '<i class="fa fa-minus text-muted"></i>';
    }
}

function resetMetricChart(metricState, metricConfig) {
    if (metricState.root) {
        metricState.root.dispose();
    }

    metricState.chart = null;
    metricState.series = null;
    metricState.xAxis = null;
    metricState.root = null;
    metricState.data = [];
    metricState.stats = { min: null, max: null, sum: 0, count: 0 };

    const container = document.getElementById(metricConfig.chartId);
    if (container) {
        container.innerHTML = "";
        container.__am5root = null;
    }
}

function resetPanel(panelState, panelConfig) {
    resetMetricChart(panelState.heart, panelConfig.heart);
    resetMetricChart(panelState.breath, panelConfig.breath);
    resetMetricSummary(panelConfig.heart.prefix);
    resetMetricSummary(panelConfig.breath.prefix);
    panelState.lastRenderKey = "";

    updateSleepStateDisplay(
        panelConfig.sleep.containerId,
        panelConfig.sleep.labelId,
        panelConfig.sleep.rootSelector,
        "",
    );
}

export function renderVitals(uid, vitals) {
    const panelConfig = PANEL_CONFIGS.live;
    const panelState = livePanelState;
    const container = document.getElementById(panelConfig.containerId);
    const hrContainer = document.getElementById(panelConfig.heart.chartId);
    const brContainer = document.getElementById(panelConfig.breath.chartId);

    if (!container) return;

    const modal = document.getElementById("radarModal");
    if (panelConfig.modalGuard && modal && modal.dataset.id !== uid) return;

    const time = getVitalsTime(vitals);
    const currentHR = vitals.heart_rate || 0;
    const currentBR = vitals.breathing || 0;

    if (!ensurePanelCharts(panelState, panelConfig)) return;

    panelState.heart.data.push({ time, value: currentHR });
    panelState.breath.data.push({ time, value: currentBR });

    const visibleHeartData = getVitalsWindowData(panelState.heart.data);
    const visibleBreathData = getVitalsWindowData(panelState.breath.data);

    panelState.heart.series.data.setAll(visibleHeartData);
    panelState.breath.series.data.setAll(visibleBreathData);
    updateVitalsXAxis(panelState.heart.xAxis, hrContainer, visibleHeartData);
    updateVitalsXAxis(panelState.breath.xAxis, brContainer, visibleBreathData);

    panelState.heart.stats = calculateStats(visibleHeartData, {
        min: null,
        max: null,
        sum: 0,
        count: 0,
    });
    panelState.breath.stats = calculateStats(visibleBreathData, {
        min: null,
        max: null,
        sum: 0,
        count: 0,
    });

    updateMetricSummary(
        panelConfig.heart.prefix,
        panelState.heart.stats,
        currentHR,
        getTrendIcon(visibleHeartData),
    );
    updateMetricSummary(
        panelConfig.breath.prefix,
        panelState.breath.stats,
        currentBR,
        getTrendIcon(visibleBreathData),
    );

    if (vitals.sleep_state) {
        updateSleepStateDisplay(
            panelConfig.sleep.containerId,
            panelConfig.sleep.labelId,
            panelConfig.sleep.rootSelector,
            vitals.sleep_state,
        );
    }
}

export function renderPlaybackVitals(
    vitalsTimeline,
    currentSeconds = null,
    options = {},
) {
    const panelConfig = PANEL_CONFIGS.playback;
    const panelState = playbackPanelState;
    const hrContainer = document.getElementById(panelConfig.heart.chartId);
    const brContainer = document.getElementById(panelConfig.breath.chartId);
    const hasPersonInMonitoredBed = options.hasPersonInMonitoredBed;

    if (!hrContainer || !brContainer) return;

    if (!ensurePanelCharts(panelState, panelConfig)) return;

    panelState.heart.data = vitalsTimeline.map((item) => ({
        time: item.timeMs,
        value: item.heart_rate || 0,
        seconds: item.seconds,
    }));
    panelState.breath.data = vitalsTimeline.map((item) => ({
        time: item.timeMs,
        value: item.breathing || 0,
        seconds: item.seconds,
    }));

    let currentVitals =
        currentSeconds === null
            ? vitalsTimeline[vitalsTimeline.length - 1] || null
            : null;

    if (currentSeconds !== null && vitalsTimeline.length) {
        const candidate = vitalsTimeline
            .filter((item) => item.seconds <= currentSeconds)
            .slice(-1)[0];
        currentVitals = candidate || null;
    }

    const hasFreshVitals = hasFreshPlaybackVitals(
        currentVitals,
        currentSeconds,
        vitalsTimeline,
    );
    const shouldResetCurrentVitals =
        hasPersonInMonitoredBed === false && !hasFreshVitals;

    const visibleHrData =
        currentSeconds === null
            ? panelState.heart.data.slice()
            : panelState.heart.data.filter(
                  (item) => item.seconds <= currentSeconds,
              );
    const visibleBrData =
        currentSeconds === null
            ? panelState.breath.data.slice()
            : panelState.breath.data.filter(
                  (item) => item.seconds <= currentSeconds,
              );
    const playbackWindowEndTime = getPlaybackWindowEndTime(
        currentVitals,
        currentSeconds,
    );
    const windowedHrData = getVitalsWindowData(
        visibleHrData,
        playbackWindowEndTime,
    );
    const windowedBrData = getVitalsWindowData(
        visibleBrData,
        playbackWindowEndTime,
    );

    const hrCurrent = shouldResetCurrentVitals
        ? 0
        : currentVitals?.heart_rate || 0;
    const brCurrent = shouldResetCurrentVitals
        ? 0
        : currentVitals?.breathing || 0;
    const hrTrend = shouldResetCurrentVitals
        ? '<i class="fa fa-minus text-muted"></i>'
        : getTrendIcon(windowedHrData);
    const brTrend = shouldResetCurrentVitals
        ? '<i class="fa fa-minus text-muted"></i>'
        : getTrendIcon(windowedBrData);
    const renderKey = [
        windowedHrData.length,
        windowedHrData[0]?.seconds ?? "none",
        windowedHrData[windowedHrData.length - 1]?.seconds ?? "none",
        windowedBrData.length,
        windowedBrData[0]?.seconds ?? "none",
        windowedBrData[windowedBrData.length - 1]?.seconds ?? "none",
        hrCurrent,
        brCurrent,
        playbackWindowEndTime
            ? Math.round(playbackWindowEndTime / 1000)
            : "none",
        shouldResetCurrentVitals
            ? "empty-bed"
            : hasFreshVitals
              ? "fresh-vitals"
              : "active-vitals",
    ].join("|");

    panelState.heart.stats = calculateStats(windowedHrData, {
        min: null,
        max: null,
        sum: 0,
        count: 0,
    });
    panelState.breath.stats = calculateStats(windowedBrData, {
        min: null,
        max: null,
        sum: 0,
        count: 0,
    });
    const heartStats = shouldResetCurrentVitals
        ? { min: null, max: null, sum: 0, count: 0 }
        : panelState.heart.stats;
    const breathStats = shouldResetCurrentVitals
        ? { min: null, max: null, sum: 0, count: 0 }
        : panelState.breath.stats;

    updateMetricSummary(
        panelConfig.heart.prefix,
        heartStats,
        hrCurrent,
        hrTrend,
    );
    updateMetricSummary(
        panelConfig.breath.prefix,
        breathStats,
        brCurrent,
        brTrend,
    );

    updateSleepStateDisplay(
        panelConfig.sleep.containerId,
        panelConfig.sleep.labelId,
        panelConfig.sleep.rootSelector,
        shouldResetCurrentVitals ? "" : currentVitals?.sleep_state || "",
    );

    if (renderKey === panelState.lastRenderKey) {
        return;
    }

    panelState.lastRenderKey = renderKey;

    const maxHrPoints = getPlaybackChartPointLimit(hrContainer);
    const maxBrPoints = getPlaybackChartPointLimit(brContainer);
    const sampledHrData = downsamplePlaybackSeries(windowedHrData, maxHrPoints);
    const sampledBrData = downsamplePlaybackSeries(windowedBrData, maxBrPoints);

    panelState.heart.series.data.setAll(sampledHrData);
    panelState.breath.series.data.setAll(sampledBrData);
    updateVitalsXAxis(panelState.heart.xAxis, hrContainer, sampledHrData);
    updateVitalsXAxis(panelState.breath.xAxis, brContainer, sampledBrData);
}

export function resetPlaybackVitals() {
    resetPanel(playbackPanelState, PANEL_CONFIGS.playback);
}

export function reset() {
    resetPanel(livePanelState, PANEL_CONFIGS.live);
    resetPlaybackVitals();
}
