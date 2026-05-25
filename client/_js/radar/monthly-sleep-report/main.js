import { updateSectionMessageAlert } from "./charts/helpers.js";
import { MONTHLY_SLEEP_REPORT_SECTIONS } from "./charts/sections/index.js";
import { fetchMonthlySleepReport } from "./service.js";

const CHART_MODULES = MONTHLY_SLEEP_REPORT_SECTIONS.flatMap(
    (section) => section.charts,
);

const DOM = {
    modal: document.getElementById("sleepReportModal"),
    tab: document.getElementById("sleep-report-monthly-tab"),
    pane: document.getElementById("sleep-report-monthly-pane"),
    monthField: document.getElementById("monthly-sleep-report-month-field"),
    content: document.getElementById("monthly-sleep-report-content-wrapper"),
    noDataState: document.getElementById("monthly-sleep-report-no-data-state"),
};

let currentDevice = { id: null, name: null };
let chartsInitialized = false;
let lastLoadedKey = "";
let pendingLoadKey = "";

const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

const getMonthPickerArrows = () => {
    if (
        typeof KTUtil !== "undefined" &&
        typeof KTUtil.isRTL === "function" &&
        KTUtil.isRTL()
    ) {
        return {
            leftArrow: '<i class="la la-angle-right"></i>',
            rightArrow: '<i class="la la-angle-left"></i>',
        };
    }

    return {
        leftArrow: '<i class="la la-angle-left"></i>',
        rightArrow: '<i class="la la-angle-right"></i>',
    };
};

const isMonthlyTabActive = () =>
    DOM.pane?.classList.contains("active") || DOM.tab?.classList.contains("active");

const setVisibility = (hasData) => {
    if (DOM.noDataState) DOM.noDataState.classList.toggle("d-none", hasData);
    if (DOM.content) DOM.content.classList.toggle("d-none", !hasData);
};

const renderLoading = (container) => {
    if (!container || container.querySelector(".loading-overlay")) return;

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
    const overlay = container?.querySelector(".loading-overlay");
    if (overlay) overlay.remove();
};

const ensureChartsInitialized = () => {
    if (chartsInitialized) return;
    CHART_MODULES.forEach((chartModule) => chartModule.init());
    chartsInitialized = true;
};

const hasRenderableReport = (payload) =>
    payload?.report?.type === "monthly" && payload?.sections;

const updateCharts = (payload) => {
    ensureChartsInitialized();
    MONTHLY_SLEEP_REPORT_SECTIONS.forEach(({ sectionKey, messageId }) => {
        updateSectionMessageAlert(
            messageId,
            payload?.sections?.[sectionKey]?.message,
        );
    });
    CHART_MODULES.forEach((chartModule) => chartModule.update(payload));
};

const loadMonthlyReport = async () => {
    if (!currentDevice.id) return;

    const month = DOM.monthField?.value || getCurrentMonth();
    const loadKey = `${currentDevice.id}:${month}`;
    if (loadKey === lastLoadedKey || loadKey === pendingLoadKey) return;

    try {
        pendingLoadKey = loadKey;
        renderLoading(DOM.content);
        const payload = await fetchMonthlySleepReport(currentDevice.id, month);

        if (!hasRenderableReport(payload)) {
            setVisibility(false);
            return;
        }

        lastLoadedKey = loadKey;
        setVisibility(true);
        updateCharts(payload);
    } catch (error) {
        console.error("[MonthlySleepReport] Fetch error:", error);
        setVisibility(false);
    } finally {
        if (pendingLoadKey === loadKey) pendingLoadKey = "";
        removeLoading(DOM.content);
    }
};

const handleModalOpen = (event) => {
    const trigger = event.relatedTarget;
    currentDevice = {
        id: trigger?.dataset?.id || trigger?.getAttribute("data-id") || "",
        name: trigger?.dataset?.name || trigger?.getAttribute("data-name") || "",
    };

    if (isMonthlyTabActive()) {
        loadMonthlyReport();
    }
};

export function initMonthlySleepReportModal() {
    if (!DOM.modal || !DOM.tab || !DOM.pane) return;

    if (DOM.monthField) {
        DOM.monthField.value = getCurrentMonth();
        const monthFieldPicker = $(DOM.monthField);
        if (
            monthFieldPicker.length &&
            typeof monthFieldPicker.datepicker === "function"
        ) {
            monthFieldPicker
                .datepicker({
                    rtl:
                        typeof KTUtil !== "undefined" &&
                        typeof KTUtil.isRTL === "function"
                            ? KTUtil.isRTL()
                            : false,
                    todayHighlight: true,
                    format: "yyyy-mm",
                    autoclose: true,
                    minViewMode: 1,
                    startView: 1,
                    templates: getMonthPickerArrows(),
                    language: "pt-PT",
                    defaultViewDate: new Date(),
                })
                .on("changeDate.monthlySleepReport", (event) => {
                    const selectedMonth =
                        typeof event.format === "function"
                            ? event.format("yyyy-mm")
                            : DOM.monthField.value;

                    if (selectedMonth) DOM.monthField.value = selectedMonth;
                    if (isMonthlyTabActive()) loadMonthlyReport();
                });
        }
    }

    $(DOM.modal).on("shown.bs.modal", handleModalOpen);
    $(DOM.modal).on("hidden.bs.modal", () => {
        currentDevice = { id: null, name: null };
        lastLoadedKey = "";
        pendingLoadKey = "";
        const tabElement = document.getElementById("sleep-report-daily-tab");
        if (
            tabElement &&
            typeof bootstrap !== "undefined" &&
            bootstrap?.Tab &&
            typeof bootstrap.Tab.getOrCreateInstance === "function"
        ) {
            bootstrap.Tab.getOrCreateInstance(tabElement).show();
        } else {
            const jqTab = $("#sleep-report-daily-tab");
            if (jqTab.length && typeof jqTab.tab === "function") {
                jqTab.tab("show");
            }
        }
    });

    $(document)
        .off("shown.bs.tab.monthlySleepReport")
        .on(
            "shown.bs.tab.monthlySleepReport",
            '#sleepReportPeriodTabs a[data-toggle="tab"], #sleepReportPeriodTabs a[data-bs-toggle="tab"]',
            (event) => {
                if ($(event.target).attr("href") === "#sleep-report-monthly-pane") {
                    loadMonthlyReport();
                }
            },
        );

    $(DOM.monthField).on("change.monthlySleepReport", () => {
        if (isMonthlyTabActive()) loadMonthlyReport();
    });
}
