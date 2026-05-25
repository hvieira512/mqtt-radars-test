// main.js - Radar monitoring main entry point
// Composes polling, modal controllers, and auxiliary modals

import { grid, poll, setLayoutCache } from "./core/index.js";
import {
    modalController as liveModalController,
    pageUpdater as livePageUpdater,
} from "./live/index.js";
import { controller as playbackController } from "./playback/index.js";

import { initFallReplayModal } from "./fall-replay/main.js";
import { initSleepReportModal } from "./sleep-report/main.js";
import { initMonthlySleepReportModal } from "./monthly-sleep-report/index.js";
import { loadScript } from "../utils.js";

let modal = null;
let isModalBound = false;
let isPollBound = false;
let isWindowBound = false;
const layoutCurrentUrl = "/modulos/radares/_ajax/layouts/current.php";

function runInitStep(name, fn) {
    try {
        fn();
    } catch (error) {
        console.error(`Radar init step failed (${name}):`, error);
    }
}

function showTabBySelector(selector) {
    const tabElement = document.querySelector(selector);
    if (!tabElement) return;

    if (
        typeof bootstrap !== "undefined" &&
        bootstrap?.Tab &&
        typeof bootstrap.Tab.getOrCreateInstance === "function"
    ) {
        bootstrap.Tab.getOrCreateInstance(tabElement).show();
        return;
    }

    const jqTab = $(selector);
    if (jqTab.length && typeof jqTab.tab === "function") {
        jqTab.tab("show");
    }
}

function getModalContext(event) {
    const target = event?.relatedTarget || modal;
    return {
        uid: target?.getAttribute("data-id") || modal?.dataset.id || "",
        name: target?.getAttribute("data-name") || modal?.dataset.name || "",
    };
}

function showLiveTab() {
    showTabBySelector("#radar-live-tab");
}

async function handleModalShown(event) {
    const context = getModalContext(event);
    if (!context.uid) return;

    showLiveTab();
    playbackController.handleModalShown({ uid: context.uid });
    await liveModalController.handleModalShown(context);
}

function handleModalHidden() {
    showLiveTab();
    playbackController.handleModalHidden();
    liveModalController.handleModalHidden();
}

function handleTabShown(event) {
    const targetId = $(event.target).attr("href");
    if (!targetId) return;

    liveModalController.handleTabShown(targetId);
    playbackController.handleTabShown(targetId);
}

function bindModalEvents() {
    if (!modal || isModalBound) return;

    $(modal).on("shown.bs.modal", handleModalShown);
    $(modal).on("hidden.bs.modal", handleModalHidden);

    $(document)
        .off("shown.bs.tab.radarMode")
        .on(
            "shown.bs.tab.radarMode",
            '#radarModeTabs a[data-toggle="tab"], #radarModeTabs a[data-bs-toggle="tab"]',
            handleTabShown,
        );

    isModalBound = true;
}

function bindWindowEvents() {
    if (isWindowBound) return;

    window.addEventListener("resize", () => {
        liveModalController.resize();
        playbackController.resize();
    });

    isWindowBound = true;
}

function setupPollCallbacks() {
    if (isPollBound) return;

    poll.onPosition((deviceCode, people) => {
        liveModalController.onPosition(deviceCode, people);
        livePageUpdater.onPosition(deviceCode, people);
    });

    poll.onVitals((deviceCode, vitals) => {
        liveModalController.onVitals(deviceCode, vitals);
    });

    poll.onAlarm((alarm) => {
        grid.addAlarm(alarm);
        livePageUpdater.onAlarm(alarm);
    });

    poll.onPollComplete((currentMonthFalls) => {
        livePageUpdater.onPollComplete(currentMonthFalls);
    });

    poll.onOnlineDevices((onlineDevices) => {
        livePageUpdater.onOnlineDevices(onlineDevices);
    });

    isPollBound = true;
}

async function preloadDashboardLayouts() {
    const response = await fetch(layoutCurrentUrl);

    if (!response.ok) {
        throw new Error(`Layout preload failed with status ${response.status}`);
    }

    const data = await response.json();
    const layouts = data?.layouts;
    if (!layouts || typeof layouts !== "object") return;

    Object.entries(layouts).forEach(([uid, layout]) => {
        if (!uid || !layout || typeof layout !== "object") return;
        setLayoutCache(uid, layout);
    });
}

export function initModal() {
    modal = document.getElementById("radarModal");
    if (!modal) return;

    liveModalController.init({
        modal,
        mapContainer: document.getElementById("radar-map"),
    });
    playbackController.init({
        modal,
        mapContainer: document.getElementById("playback-map"),
    });

    bindModalEvents();
    bindWindowEvents();
}

export async function init() {
    // Load Konva + AMCharts early (removed from blocking HTML, loaded async now)
    await Promise.all([
        loadScript('https://unpkg.com/konva@9/konva.min.js'),
        loadScript('https://cdn.amcharts.com/lib/5/index.js'),
    ]);
    await Promise.all([
        loadScript('https://cdn.amcharts.com/lib/5/xy.js'),
        loadScript('https://cdn.amcharts.com/lib/5/percent.js'),
        loadScript('https://cdn.amcharts.com/lib/5/themes/Animated.js'),
    ]);

    runInitStep("modal", initModal);
    runInitStep("fall-replay", initFallReplayModal);
    runInitStep("sleep-report", initSleepReportModal);
    runInitStep("monthly-sleep-report", initMonthlySleepReportModal);
    runInitStep("grid", grid.init);
    runInitStep("poll-callbacks", setupPollCallbacks);

    try {
        await preloadDashboardLayouts();
    } catch (error) {
        console.error("Radar layout preload error:", error);
    } finally {
        poll.start(1000);
    }
}
