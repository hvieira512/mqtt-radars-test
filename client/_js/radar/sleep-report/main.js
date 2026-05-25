import * as Breathe from "./charts/breathe.js";
import * as Daytime from "./charts/daytime.js";
import * as HealthScore from "./charts/health-score.js";
import * as HeartRate from "./charts/heart-rate.js";
import * as Sleep from "./charts/sleep.js";
import * as Timeline from "./charts/timeline-sleep.js";
import { initKPIElements, updateKPIs } from "./kpis.js";
import * as Suggestion from "./suggestions.js";
import * as DatePicker from "./date-picker.js";
import {
    ensureNestedModalBackdrop,
    removeNestedModalBackdrop,
    restoreParentModalScrollState,
} from "../../utils.js";

import { toast } from "../core/index.js";

const DOM = {
    modal: document.getElementById("sleepReportModal"),
    container: document.querySelector("#sleepReportModal .modal-body"),
    dateField: document.getElementById("pick-date-field"),
    periodPickers: document.querySelectorAll("[data-sleep-report-period-picker]"),
    noDataState: document.getElementById("no-data-state"),
    reportContent: document.getElementById("report-content-wrapper"),
};

let currentDevice = { id: null, name: null };
let sleepReportBackdropEl = null;
const isDueMessage = translations.i18n["relatorio_de_hoje_apos_8h"];
const SLEEP_REPORT_URL = "/modulos/radares/_ajax/sleep-reports.php";

const parseIsoWallClockParts = (value) => {
    const match = String(value || "")
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);

    if (!match) return null;

    return {
        date: `${match[1]}-${match[2]}-${match[3]}`,
        hour: Number.parseInt(match[4], 10),
    };
};

const getCurrentLocalDateParts = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return {
        date: `${year}-${month}-${day}`,
        hour: now.getHours(),
    };
};

const getSleepReportNowContext = (data) => {
    const generatedParts = parseIsoWallClockParts(data?.report?.generatedAt);
    if (generatedParts) {
        return generatedParts;
    }

    return getCurrentLocalDateParts();
};

const getToday = () => getCurrentLocalDateParts().date;

const setReportVisibility = (hasData) => {
    if (DOM.noDataState) DOM.noDataState.classList.toggle("d-none", hasData);
    if (DOM.reportContent)
        DOM.reportContent.classList.toggle("d-none", !hasData);
};

const syncPeriodPickerVisibility = (activePane = "#sleep-report-daily-pane") => {
    const activePeriod =
        activePane === "#sleep-report-monthly-pane" ? "monthly" : "daily";

    DOM.periodPickers.forEach((picker) => {
        picker.classList.toggle(
            "d-none",
            picker.dataset.sleepReportPeriodPicker !== activePeriod,
        );
    });
};

const hasRenderableReport = (data) =>
    !!(
        data &&
        data.error !== true &&
        data.report &&
        data.device &&
        data.window &&
        data.summary &&
        data.session &&
        data.stages &&
        data.charts
    );

const requestJson = async (url) => {
    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const text = await response.text();
    let payload = null;

    if (text) {
        try {
            payload = JSON.parse(text);
        } catch (parseError) {
            payload = null;
        }
    }

    if (!response.ok) {
        const error = new Error(
            payload?.message || `Request failed with status ${response.status}`,
        );
        error.status = response.status;
        error.code = payload?.code || null;
        error.payload = payload;
        throw error;
    }

    return payload;
};

const fetchLocalSleepReport = async (uid, date) => {
    const url = new URL(SLEEP_REPORT_URL, window.location.origin);
    url.searchParams.set("period", "daily");
    url.searchParams.set("view", "report");
    url.searchParams.set("uid", uid);
    url.searchParams.set("date", date);
    // url.searchParams.set("debug", 1);

    return requestJson(url);
};

const fetchStoredSleepReport = async (uid, date) => {
    const url = new URL(SLEEP_REPORT_URL, window.location.origin);
    url.searchParams.set("period", "daily");
    url.searchParams.set("view", "stored");
    url.searchParams.set("uid", uid);
    url.searchParams.set("date", date);

    return requestJson(url);
};

const fetchStoredSleepReportDays = async (uid, date) => {
    const url = new URL(SLEEP_REPORT_URL, window.location.origin);
    url.searchParams.set("period", "daily");
    url.searchParams.set("view", "calendar");
    url.searchParams.set("uid", uid);
    url.searchParams.set("date", date);

    return requestJson(url);
};

const refreshStoredReportDays = async (uid, monthDate) => {
    if (!uid || !monthDate) return;

    const daysData = await fetchStoredSleepReportDays(uid, monthDate);
    DatePicker.updateCalendar(Array.isArray(daysData) ? daysData : []);
};

const refreshData = (data) => {
    HealthScore.updateHealthScoreChart(
        data.summary?.overallScore,
        data.summary?.overallScoreLabel,
    );
    Sleep.updateSleepChart(data.stages?.segments, data.window);

    data.breathKPIs = Breathe.updateBreatheChart(data);
    data.heartKPIs = HeartRate.updateHeartRateChart(data);

    Timeline.updateSleepTimeline(data.session, data.window);

    Daytime.updateDaytimeActivityChart(data);
    updateKPIs(data);
    Suggestion.updateSuggestions(
        data.evaluation?.sleepAnalysis,
        "sleep-analysis-content",
        "primary",
    );
    Suggestion.updateSuggestions(
        data.evaluation?.breathingAnalysis,
        "breath-analysis-content",
        "success",
    );
};

const loadSleepReportData = async (uid, date) => {
    const storedResponse = await fetchStoredSleepReport(uid, date);
    if (storedResponse?.found && hasRenderableReport(storedResponse.data)) {
        return storedResponse.data;
    }

    return fetchLocalSleepReport(uid, date);
};

const fetchReport = async (uid, name, date) => {
    if (!uid) return;

    try {
        if (DOM.container) renderLoading(DOM.container);

        try {
            const firstDayOfMonth = date.substring(0, 8) + "01";
            await refreshStoredReportDays(uid, firstDayOfMonth);
        } catch (daysError) {
            console.warn("Could not fetch stored report days:", daysError);
        }

        const data = await loadSleepReportData(uid, date);
        const reportNow = getSleepReportNowContext(data);
        if (date === reportNow.date && reportNow.hour < 8) {
            toast.info(isDueMessage);
            setReportVisibility(false);
            return;
        }

        if (!hasRenderableReport(data)) {
            setReportVisibility(false);
            return;
        }

        setReportVisibility(true);
        refreshData(data);
    } catch (error) {
        const invalidReasons = error?.payload?.validation?.reasons || [];
        const hasNotReadyReason = invalidReasons.some(
            (reason) => reason?.code === "report_not_ready_yet",
        );

        if (error?.status === 422 && error?.code === "invalid_sleep_report") {
            if (hasNotReadyReason) {
                toast.info(isDueMessage);
            }
            setReportVisibility(false);
        } else if ((error.message || "").includes("No active user found")) {
            toast.warning(translations.i18n["erro_utilizador_ativo"]);
        } else {
            console.error("[SleepReport] Fetch error:", error);
            toast.error(translations.i18n["erro_carregar_relatorio"]);
        }
        setReportVisibility(false);
    } finally {
        if (DOM.container) removeLoading(DOM.container);
    }
};

const handleCalendarMonthChange = (firstDayOfMonth) => {
    if (!currentDevice.id) return;

    refreshStoredReportDays(currentDevice.id, firstDayOfMonth).catch(
        (error) => {
            console.warn("Could not refresh stored report days:", error);
        },
    );
};

const handleModalOpen = (e) => {
    sleepReportBackdropEl = ensureNestedModalBackdrop(
        DOM.modal,
        sleepReportBackdropEl,
    );

    const trigger = e.relatedTarget;
    if (!trigger) return;

    const id = trigger.dataset?.id || trigger.getAttribute("data-id");
    const name = trigger.dataset?.name || trigger.getAttribute("data-name");
    if (!id) return;

    currentDevice = { id, name };
    const date = DOM.dateField?.value || getToday();
    fetchReport(id, name, date);
};

const handleDateChange = () => {
    if (currentDevice.id) {
        fetchReport(currentDevice.id, currentDevice.name, DOM.dateField.value);
    }
};

const renderLoading = (container) => {
    if (!container) return;
    if (container.querySelector(".loading-overlay")) return;

    const overlay = document.createElement("div");
    overlay.className =
        "loading-overlay d-flex justify-content-center align-items-center";
    overlay.style.cssText =
        "position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.8);z-index:999";
    overlay.innerHTML =
        '<i class="fas fa-spinner fa-spin fa-2x text-primary"></i>';

    if (getComputedStyle(container).position === "static") {
        container.style.position = "relative";
    }

    container.appendChild(overlay);
};

const removeLoading = (container) => {
    if (!container) return;
    const overlay = container.querySelector(".loading-overlay");
    if (overlay) overlay.remove();
};

export function initSleepReportModal() {
    if (!DOM.modal) return;

    DatePicker.initCalendar(handleCalendarMonthChange);
    HealthScore.initHealthScoreChart();
    Sleep.initSleepChart();
    Breathe.initBreatheChart();
    HeartRate.initHeartRateChart();
    Timeline.initSleepTimelineChart();
    Daytime.initDaytimeActivityChart();
    initKPIElements();

    if (DOM.dateField) DOM.dateField.value = getToday();
    syncPeriodPickerVisibility();

    $(DOM.modal).on("shown.bs.modal", handleModalOpen);
    $(DOM.modal).on("hidden.bs.modal", () => {
        removeNestedModalBackdrop(DOM.modal, sleepReportBackdropEl);
        sleepReportBackdropEl = null;
        currentDevice = { id: null, name: null };
        setReportVisibility(true);
        restoreParentModalScrollState("radarModal");
    });

    const dateFieldPicker = $(DOM.dateField);
    if (dateFieldPicker.length && typeof dateFieldPicker.datepicker === "function") {
        dateFieldPicker.datepicker().on("changeDate", function (e) {
            if (currentDevice.id) {
                const selectedDate = e.format("yyyy-mm-dd");
                fetchReport(currentDevice.id, currentDevice.name, selectedDate);
            }
        });
    }

    $(document)
        .off("shown.bs.tab.sleepReportPeriodPickers")
        .on(
            "shown.bs.tab.sleepReportPeriodPickers",
            '#sleepReportPeriodTabs a[data-toggle="tab"], #sleepReportPeriodTabs a[data-bs-toggle="tab"]',
            (event) => {
                syncPeriodPickerVisibility($(event.target).attr("href"));
            },
        );
}
