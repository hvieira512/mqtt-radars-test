import { grid, setLayoutCache } from "../core/index.js";
import * as info from "./info-panel.js";
import { liveMap as map } from "../scene/index.js";
import { removeLoading, renderLoading } from "../../utils.js";

const state = {
    modal: null,
    mapContainer: null,
    currentUID: null,
    requestToken: 0,
    isLayoutSyncing: false,
};

function updateModalTitle(title) {
    const titleEl = state.modal?.querySelector(".modal-title");
    if (titleEl) titleEl.textContent = title;
}

function getEventsCard() {
    return document.getElementById("liveRadarEvents");
}

function initMapWithData(layoutData) {
    if (!state.mapContainer || !layoutData) return;

    if (!layoutData.rectangle) {
        showPlaceholder();
        return;
    }

    try {
        state.mapContainer.innerHTML = "";
        map.init(state.mapContainer);
        map.renderRoom(
            layoutData.rectangle,
            layoutData.declare_area,
            layoutData,
        );
        map.resize(state.mapContainer);
    } catch (error) {
        console.error("Failed to render radar map:", error);
        showPlaceholder();
    }

    const infoTab = document.getElementById("info");
    if (infoTab) info.renderRadarInfo(infoTab, layoutData);
}

function showPlaceholder() {
    if (!state.mapContainer) return;

    state.mapContainer.innerHTML = "";
    try {
        map.renderPlaceholder(state.mapContainer);
    } catch (error) {
        console.error("Failed to render map placeholder:", error);
        state.mapContainer.innerHTML =
            '<div class="text-center text-muted py-5">No map layout available</div>';
    }
}

function getRefreshLayoutButton() {
    return document.getElementById("refresh-live-layout-btn");
}

function setRefreshLayoutButtonLoading(isLoading) {
    const button = getRefreshLayoutButton();
    if (!button) return;

    button.disabled = isLoading;
}

async function syncAndRetry(uid, requestToken) {
    try {
        await fetch(
            `/modulos/radares/_ajax/layouts/sync.php?uid=${encodeURIComponent(uid)}`,
            { mode: "no-cors" },
        );

        const retryResponse = await fetch(
            `/modulos/radares/_ajax/layouts/read.php?uid=${encodeURIComponent(uid)}`,
        );
        if (!retryResponse.ok) {
            throw new Error(
                `Layout retry read failed with status ${retryResponse.status}`,
            );
        }
        const retryData = await retryResponse.json();

        if (requestToken !== state.requestToken || uid !== state.currentUID) {
            return;
        }

        if (retryData && !retryData.error) {
            setLayoutCache(uid, retryData);
            initMapWithData(retryData);
            return;
        }

        showPlaceholder();
    } catch (error) {
        console.error("Failed to sync layout:", error);
        if (requestToken === state.requestToken && uid === state.currentUID) {
            showPlaceholder();
        }
    }
}

async function fetchMapData(uid) {
    const requestToken = ++state.requestToken;
    const container = document.getElementById("radar-map");

    try {
        renderLoading(container);
        const response = await fetch(
            `/modulos/radares/_ajax/layouts/read.php?uid=${encodeURIComponent(uid)}`,
        );
        if (!response.ok) {
            throw new Error(`Layout read failed with status ${response.status}`);
        }
        const data = await response.json();

        if (requestToken !== state.requestToken || uid !== state.currentUID) {
            return;
        }

        if (data && !data.error) {
            setLayoutCache(uid, data);
            initMapWithData(data);
            return;
        }

        await syncAndRetry(uid, requestToken);
    } catch (error) {
        console.error("Failed to fetch layout:", error);
        await syncAndRetry(uid, requestToken);
    } finally {
        if (requestToken === state.requestToken) {
            removeLoading(container);
        }
    }
}

export function init({ modal, mapContainer }) {
    state.modal = modal;
    state.mapContainer = mapContainer;

    getRefreshLayoutButton()?.addEventListener("click", () => {
        refreshCurrentLayout();
    });
}

export async function refreshCurrentLayout() {
    if (!state.currentUID || !state.mapContainer || state.isLayoutSyncing) {
        return;
    }

    const uid = state.currentUID;
    const requestToken = ++state.requestToken;
    const container = state.mapContainer;
    state.isLayoutSyncing = true;
    setRefreshLayoutButtonLoading(true);

    try {
        renderLoading(container);

        const syncResponse = await fetch(
            `/modulos/radares/_ajax/layouts/sync.php?uid=${encodeURIComponent(uid)}`,
        );
        if (!syncResponse.ok) {
            throw new Error(
                `Layout sync failed with status ${syncResponse.status}`,
            );
        }

        const layoutResponse = await fetch(
            `/modulos/radares/_ajax/layouts/read.php?uid=${encodeURIComponent(uid)}`,
        );
        if (!layoutResponse.ok) {
            throw new Error(
                `Layout read failed with status ${layoutResponse.status}`,
            );
        }

        const layoutData = await layoutResponse.json();
        if (requestToken !== state.requestToken || uid !== state.currentUID) {
            return;
        }

        if (!layoutData || layoutData.error) {
            throw new Error(layoutData?.error || "No layout data returned");
        }

        setLayoutCache(uid, layoutData);
        initMapWithData(layoutData);
    } catch (error) {
        console.error("Failed to refresh live layout:", error);
        if (requestToken === state.requestToken && uid === state.currentUID) {
            showPlaceholder();
        }
    } finally {
        if (requestToken === state.requestToken && uid === state.currentUID) {
            removeLoading(container);
            state.isLayoutSyncing = false;
            setRefreshLayoutButtonLoading(false);
        }
    }
}

export async function handleModalShown({ uid, name }) {
    if (!state.modal || !uid) return;

    state.isLayoutSyncing = false;
    setRefreshLayoutButtonLoading(false);
    state.currentUID = uid;
    state.modal.dataset.id = uid;
    state.modal.dataset.name = name || "";

    const sleepReportButton = document.getElementById("sleep-report-btn");
    if (sleepReportButton) {
        sleepReportButton.dataset.id = uid;
        sleepReportButton.dataset.name = name || "";
    }

    updateModalTitle(name || translations.i18n["detalhes_do_radar"]);
    info.reset();
    grid.clear();

    const eventsCard = getEventsCard();
    if (eventsCard) {
        eventsCard.classList.remove("d-none");
    }

    grid.loadAlarms(uid);
    grid.loadEvents(uid);
    await fetchMapData(uid);
}

export function handleModalHidden() {
    state.currentUID = null;
    state.requestToken += 1;
    state.isLayoutSyncing = false;
    if (state.mapContainer) removeLoading(state.mapContainer);
    setRefreshLayoutButtonLoading(false);

    if (state.modal) {
        state.modal.dataset.id = "";
        state.modal.dataset.name = "";
    }

    updateModalTitle(translations.i18n["detalhes_do_radar"]);

    const infoTab = document.getElementById("info");
    if (infoTab) {
        infoTab.innerHTML = "";
    }

    info.reset();
    grid.clear();
    map.destroy();

    const eventsCard = getEventsCard();
    if (eventsCard) {
        eventsCard.classList.remove("d-none");
    }
}

export function handleTabShown(targetId) {
    const eventsCard = getEventsCard();
    if (eventsCard) {
        eventsCard.classList.toggle(
            "d-none",
            targetId === "#radar-playback-pane",
        );
    }

    if (targetId !== "#radar-live-pane" || !state.mapContainer) return;

    map.resize(state.mapContainer);
    grid.adjustTables();
}

export function resize() {
    if (
        !state.modal?.classList.contains("show") ||
        !state.mapContainer ||
        !document
            .getElementById("radar-live-pane")
            ?.classList.contains("active")
    ) {
        return;
    }

    map.resize(state.mapContainer);
}

export function onPosition(deviceCode, people) {
    if (state.currentUID === deviceCode && state.mapContainer) {
        map.updatePeople(people);
    }
}

export function onVitals(deviceCode, vitals) {
    if (state.currentUID === deviceCode) {
        info.renderVitals(deviceCode, vitals);
    }
}
