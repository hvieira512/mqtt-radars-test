import { animateNumber } from "../../utils.js";

let elements = {};
const previousValues = new WeakMap();

const renderEvaluation = (status) => {
    if (!status) return "";

    const s = status.toLowerCase();

    if (s.includes("no compliance")) {
        return `<span class="text-danger"><i class="fa fa-times"></i> ${translations.i18n["nao_conformidade"]}</span>`;
    }

    if (s.includes("compliance")) {
        return `<span class="text-success"><i class="fa fa-check"></i> ${translations.i18n["conformidade"]}</span>`;
    }

    return `<span>${status}</span>`;
};

const setMetaValue = (el, html) => {
    if (el) el.innerHTML = html;
};

const formatDurationMinutes = (minutes) => {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (hours > 0) {
        return `${hours} H ${remainingMinutes} Min`;
    }

    return `${remainingMinutes} Min`;
};

const formatKPI = (value, unit) => {
    if (value === null || value === undefined || value === "-") return "-";

    switch (unit) {
        case "vezes":
            return `${value} ${
                value === 1
                    ? translations.i18n["vez"]
                    : translations.i18n["vezes"]
            }`;
        case "passos":
            return `${value} ${
                value === 1
                    ? translations.i18n["passo"]
                    : translations.i18n["passos"]
            }`;
        case "%":
            return `${value}%`;
        default:
            return unit ? `${value} ${unit}` : value;
    }
};

const setValue = (el, value, unit) => {
    if (!el) return;

    if (value === null || value === undefined || value === "-") {
        el.textContent = "-";
        return;
    }

    const num = Number(value);

    if (isNaN(num)) {
        el.textContent = formatKPI(value, unit);
        return;
    }

    const prev = previousValues.get(el) ?? 0;
    previousValues.set(el, num);

    animateNumber({
        from: prev,
        to: num,
        onUpdate: (val) => {
            const rounded =
                unit === "%" || Number.isInteger(num)
                    ? Math.round(val)
                    : val.toFixed(1);

            el.textContent = formatKPI(rounded, unit);
        },
    });
};

export const initKPIElements = () => {
    elements = {
        general: {
            sleepDuration: document.getElementById(
                "general-sleep-duration-value",
            ),
            leaveBed: document.getElementById("leave-bed-value"),
            deepSleepPercentage: document.getElementById(
                "deep-sleep-percentage-value",
            ),
            ahi: document.getElementById("ahi-value"),
            breathRate: document.getElementById("sleep-breath-rate-value"),
            heartRate: document.getElementById("sleep-heart-rate-value"),
            meta: {
                sleepDuration: document.getElementById("sleep-duration-meta"),
                leaveBed: document.getElementById("leave-bed-meta"),
                deepSleep: document.getElementById(
                    "deep-sleep-percentage-meta",
                ),
                ahi: document.getElementById("ahi-meta"),
                heartRate: document.getElementById("sleep-heart-rate-meta"),
                breathRate: document.getElementById("sleep-breath-rate-meta"),
            },
        },
        sleep: {
            hours: {
                deepSleep: document.getElementById("deep-sleep-value"),
                lightSleep: document.getElementById("light-sleep-value"),
                rem: document.getElementById("rem-sleep-value"),
                awake: document.getElementById("awake-time-value"),
                sleepTotal: document.getElementById("sleep-duration-value"),
            },
            times: {
                bedExits: document.getElementById("number-of-bed-exits-value"),
            },
            percent: {
                deepSleepPercent: document.getElementById("deep-sleep-meta"),
                lightSleepPercent: document.getElementById("light-sleep-meta"),
                remPercent: document.getElementById("rem-sleep-meta"),
            },
        },
        heartRate: {
            bpm: {
                min: document.getElementById("min-heart-rate-value"),
                avg: document.getElementById("avg-heart-rate-value"),
                max: document.getElementById("max-heart-rate-value"),
            },
        },
        breathRate: {
            bpm: {
                min: document.getElementById("min-breath-rate-value"),
                avg: document.getElementById("avg-breath-rate-value"),
                max: document.getElementById("max-breath-rate-value"),
            },
            times: {
                apnea: document.getElementById("apnea-value"),
                tachypnea: document.getElementById("tachypnea-value"),
                bradypnea: document.getElementById("bradypnea-value"),
            },
        },
        daytimeActivity: {
            times: {
                inOutRoom: document.getElementById("in-out-room-value"),
                walkingSteps: document.getElementById("walking-steps-value"),
            },
            speed: {
                walkingSpeed: document.getElementById("walking-speed-value"),
            },
        },
    };
};

export const updateKPIs = (data) => {
    if (!data) return;

    const summary = data.summary || {};
    const stages = data.stages?.totals || {};
    const evaluation = data.evaluation || {};
    const breathingRate = data.charts?.breathingRate || {};
    const heartRate = data.charts?.heartRate || {};
    const activity = data.activity || {};

    setValue(
        elements.general.sleepDuration,
        formatDurationMinutes(summary.sleepDurationMinutes),
    );
    setValue(elements.general.leaveBed, summary.leaveBedCount, "vezes");
    setValue(elements.general.deepSleepPercentage, stages.deep?.percent, "%");
    setValue(elements.general.ahi, summary.ahi);

    setValue(elements.general.breathRate, breathingRate.avg, "BPM");
    setValue(elements.general.heartRate, heartRate.avg, "BPM");

    setMetaValue(
        elements.general.meta.sleepDuration,
        renderEvaluation(evaluation.duration),
    );
    setMetaValue(
        elements.general.meta.leaveBed,
        renderEvaluation(evaluation.leaveBed),
    );
    setMetaValue(
        elements.general.meta.deepSleep,
        renderEvaluation(evaluation.deepSleep),
    );
    setMetaValue(elements.general.meta.ahi, renderEvaluation(evaluation.ahi));

    setValue(
        elements.sleep.hours.deepSleep,
        formatDurationMinutes(stages.deep?.minutes),
    );
    setValue(
        elements.sleep.hours.lightSleep,
        formatDurationMinutes(stages.light?.minutes),
    );
    setValue(
        elements.sleep.hours.rem,
        formatDurationMinutes(stages.rem?.minutes),
    );
    setValue(
        elements.sleep.hours.awake,
        formatDurationMinutes(stages.awake?.minutes),
    );
    setValue(
        elements.sleep.hours.sleepTotal,
        formatDurationMinutes(summary.sleepDurationMinutes),
    );

    setValue(elements.sleep.times.bedExits, summary.leaveBedCount, "vezes");

    const deepSleepRatio = Number(stages.deep?.percent || 0);
    const lightSleepRatio = Number(stages.light?.percent || 0);
    const remRatio = Number(stages.rem?.percent || 0);

    setValue(elements.sleep.percent.deepSleepPercent, deepSleepRatio, "%");
    setValue(elements.sleep.percent.lightSleepPercent, lightSleepRatio, "%");
    setValue(elements.sleep.percent.remPercent, remRatio, "%");

    setValue(elements.heartRate.bpm.min, heartRate.min, "BPM");
    setValue(elements.heartRate.bpm.avg, heartRate.avg, "BPM");
    setValue(elements.heartRate.bpm.max, heartRate.max, "BPM");

    setValue(elements.breathRate.bpm.min, breathingRate.min, "BPM");
    setValue(elements.breathRate.bpm.avg, breathingRate.avg, "BPM");
    setValue(elements.breathRate.bpm.max, breathingRate.max, "BPM");

    setValue(
        elements.breathRate.times.apnea,
        data.breathKPIs?.apneaEvents,
        "vezes",
    );
    setValue(
        elements.breathRate.times.tachypnea,
        data.breathKPIs?.tachypneaEvents,
        "vezes",
    );
    setValue(
        elements.breathRate.times.bradypnea,
        data.breathKPIs?.bradypneaEvents,
        "vezes",
    );

    setValue(
        elements.daytimeActivity.times.inOutRoom,
        activity.roomEntries,
        "vezes",
    );
    setValue(
        elements.daytimeActivity.times.walkingSteps,
        activity.steps,
        "passos",
    );
    setValue(
        elements.daytimeActivity.speed.walkingSpeed,
        activity.speedMetersPerMinute,
        "m/min",
    );
};
