import { BED_POSTURES, getLayoutCache } from "../core/index.js";

let lastMonthFalls = 0;
let totalBedSlots = null;
let lastGlobalKpis = null;

const devicePeopleState = new Map();
const roomActiveDevices = new Map();
const roomMetrics = new Map();
const bedRegionsCache = new Map();
const deviceMetaCache = new Map();
const roomViewCache = new Map();

const pendingDeviceUpdates = new Map();
let flushScheduled = false;

function formatQuantity(total, singularKey) {
    const key = total === 1 ? singularKey : singularKey + "s";
    return `${total} ${String(translations.i18n[key]).toLowerCase()}`;
}

function rebuildDeviceMetaCache() {
    deviceMetaCache.clear();

    document.querySelectorAll(".item-radar button[data-id]").forEach((button) => {
        const deviceCode = button.dataset.id;
        if (!deviceCode || deviceMetaCache.has(deviceCode)) return;

        const radarCard = button.closest(".item-radar");
        if (!radarCard) return;

        const roomId = String(radarCard.dataset.quarto || "");
        if (!roomId) return;

        deviceMetaCache.set(deviceCode, {
            button,
            radarCard,
            roomId,
            isWc: button.dataset.wc === "1",
        });
    });
}

function getDeviceMeta(deviceCode) {
    const cached = deviceMetaCache.get(deviceCode);
    if (cached) return cached;

    rebuildDeviceMetaCache();
    return deviceMetaCache.get(deviceCode) || null;
}

function getRoomView(roomId) {
    const cached = roomViewCache.get(roomId);
    if (cached) return cached;

    const radarCard = document.querySelector(`.item-radar[data-quarto="${roomId}"]`);
    if (!radarCard) return null;

    const bedCounter = radarCard.querySelector(".numero-pessoas-camas");
    const wcCounter = radarCard.querySelector(".radar-descricao-info .numero-pessoas-wc");
    const wcIcons = Array.from(
        radarCard.querySelectorAll(".container-wc .item-wc i.fa-toilet"),
    );

    const bedItems = Array.from(radarCard.querySelectorAll(".item-cama")).map((el) => {
        const deviceIds = Array.from(el.querySelectorAll("button[data-id]"))
            .filter((button) => button.dataset.wc !== "1")
            .map((button) => button.dataset.id)
            .filter(Boolean);

        return { el, deviceIds };
    });

    const view = {
        radarCard,
        bedCounter,
        bedCounterParent: bedCounter ? bedCounter.parentElement : null,
        wcCounter,
        wcCounterParent: wcCounter ? wcCounter.parentElement : null,
        wcIcons,
        bedItems,
        bedCount: bedItems.length,
    };

    roomViewCache.set(roomId, view);
    return view;
}

function getTotalBedSlots() {
    if (totalBedSlots !== null) return totalBedSlots;
    totalBedSlots = document.querySelectorAll(".item-radar .item-cama").length;
    return totalBedSlots;
}

function parseAreasToBedRegions(declareAreaStr) {
    const bedTypes = new Set([5, 2]);
    const bedRegionKeys = new Set();

    if (!declareAreaStr) return bedRegionKeys;

    const areas = declareAreaStr
        .split("},")
        .map((area) => area.replace(/[{}]/g, "").trim())
        .filter(Boolean);

    for (const area of areas) {
        const values = area.split(",").map(Number);
        const key = values[0];
        const type = values[1];
        if (bedTypes.has(type)) {
            bedRegionKeys.add(key);
        }
    }

    return bedRegionKeys;
}

function getBedRegionsForDevice(deviceCode) {
    const layoutData = getLayoutCache(deviceCode);
    const declareArea = layoutData ? String(layoutData.declare_area || "") : "";

    const cached = bedRegionsCache.get(deviceCode);
    if (cached && cached.declareArea === declareArea) {
        return cached.regions;
    }

    const regions = parseAreasToBedRegions(declareArea);
    bedRegionsCache.set(deviceCode, { declareArea, regions });
    return regions;
}

function toggleBedIcon(bedItem, hasPersonInBed) {
    const bedIcon = bedItem.querySelector(".estado-na-cama");
    if (!bedIcon) return;

    bedIcon.classList.toggle("text-success", hasPersonInBed);
    bedIcon.classList.toggle("fw-bold", hasPersonInBed);
    bedIcon.classList.toggle("opacity-25", !hasPersonInBed);
}

function addRoomActiveDevice(roomId, deviceCode) {
    let roomSet = roomActiveDevices.get(roomId);
    if (!roomSet) {
        roomSet = new Set();
        roomActiveDevices.set(roomId, roomSet);
    }
    roomSet.add(deviceCode);
}

function removeRoomActiveDevice(roomId, deviceCode) {
    const roomSet = roomActiveDevices.get(roomId);
    if (!roomSet) return;

    roomSet.delete(deviceCode);
    if (roomSet.size === 0) {
        roomActiveDevices.delete(roomId);
    }
}

function setCounterState(counterEl, parentEl, count) {
    if (!counterEl) return;

    counterEl.textContent = String(count);
    parentEl?.classList.toggle("text-success", count > 0);
    parentEl?.classList.toggle("fw-bold", count > 0);
}

function renderRoomState(roomId) {
    const roomView = getRoomView(roomId);
    if (!roomView) return;

    const roomSet = roomActiveDevices.get(roomId);
    const bedroomOccupancyByDevice = new Map();
    let bedroomMaxCount = 0;
    let totalWcPeople = 0;
    let hasAnyWcOccupant = false;

    if (roomSet) {
        roomSet.forEach((deviceCode) => {
            const state = devicePeopleState.get(deviceCode);
            if (!state) return;

            if (state.isWc) {
                totalWcPeople += state.people.length;
                if (state.people.length > 0) {
                    hasAnyWcOccupant = true;
                }
                return;
            }

            bedroomMaxCount = Math.max(bedroomMaxCount, state.people.length);

            const deviceBedRegions = getBedRegionsForDevice(deviceCode);
            const hasPersonInBed = state.people.some(
                (person) =>
                    deviceBedRegions.has(person.region_id) &&
                    BED_POSTURES.has(person.posture_state),
            );

            bedroomOccupancyByDevice.set(deviceCode, hasPersonInBed);
        });
    }

    setCounterState(
        roomView.bedCounter,
        roomView.bedCounterParent,
        bedroomMaxCount,
    );

    let occupiedBedCount = 0;
    roomView.bedItems.forEach(({ el, deviceIds }) => {
        const hasPersonInBed = deviceIds.some(
            (deviceCode) => bedroomOccupancyByDevice.get(deviceCode) === true,
        );
        if (hasPersonInBed) {
            occupiedBedCount++;
        }
        toggleBedIcon(el, hasPersonInBed);
    });

    roomView.wcIcons.forEach((icon) => {
        icon.classList.toggle("text-success", hasAnyWcOccupant);
        icon.classList.toggle("fw-bold", hasAnyWcOccupant);
    });

    setCounterState(
        roomView.wcCounter,
        roomView.wcCounterParent,
        totalWcPeople,
    );

    roomMetrics.set(roomId, {
        occupiedBedCount,
        wcPeopleCount: totalWcPeople,
    });
}

function updateGlobalKPIs() {
    const bedroomDeviceCount = getTotalBedSlots();

    let occupiedBedCount = 0;
    let globalWCPeople = 0;

    roomMetrics.forEach((metrics) => {
        occupiedBedCount += metrics.occupiedBedCount || 0;
        globalWCPeople = Math.max(globalWCPeople, metrics.wcPeopleCount || 0);
    });

    const emptyBeds = bedroomDeviceCount - occupiedBedCount;

    const kpis = {
        "indicador-pessoas-monitorizadas": bedroomDeviceCount,
        "indicador-camas-ocupadas": occupiedBedCount,
        "indicador-camas-vazias": emptyBeds,
        "indicador-pessoas-wc": globalWCPeople,
    };

    const last = lastGlobalKpis;
    if (
        last &&
        last["indicador-pessoas-monitorizadas"] ===
            kpis["indicador-pessoas-monitorizadas"] &&
        last["indicador-camas-ocupadas"] === kpis["indicador-camas-ocupadas"] &&
        last["indicador-camas-vazias"] === kpis["indicador-camas-vazias"] &&
        last["indicador-pessoas-wc"] === kpis["indicador-pessoas-wc"]
    ) {
        return;
    }
    lastGlobalKpis = kpis;

    const labels = {
        "indicador-pessoas-monitorizadas": formatQuantity(
            bedroomDeviceCount,
            "pessoa",
        ),
        "indicador-camas-ocupadas": formatQuantity(occupiedBedCount, "cama"),
        "indicador-camas-vazias": formatQuantity(emptyBeds, "cama"),
        "indicador-pessoas-wc": formatQuantity(globalWCPeople, "pessoa"),
    };

    Object.entries(kpis).forEach(([id]) => {
        const element = document.getElementById(id);
        if (!element) return;
        element.textContent = labels[id];
    });
}

function flushPendingPositions() {
    const affectedRooms = new Set();

    pendingDeviceUpdates.forEach((update, deviceCode) => {
        const previous = devicePeopleState.get(deviceCode);
        if (previous) {
            removeRoomActiveDevice(previous.roomId, deviceCode);
            affectedRooms.add(previous.roomId);
        }

        if (update.people.length === 0) {
            devicePeopleState.delete(deviceCode);
            return;
        }

        devicePeopleState.set(deviceCode, update);
        addRoomActiveDevice(update.roomId, deviceCode);
        affectedRooms.add(update.roomId);
    });

    pendingDeviceUpdates.clear();

    affectedRooms.forEach((roomId) => {
        renderRoomState(roomId);
    });

    updateGlobalKPIs();
}

function schedulePositionFlush() {
    if (flushScheduled) return;
    flushScheduled = true;

    const flush = () => {
        flushScheduled = false;
        flushPendingPositions();
    };

    if (typeof window !== "undefined" && window.requestAnimationFrame) {
        window.requestAnimationFrame(flush);
        return;
    }

    setTimeout(flush, 16);
}

export function onPosition(deviceCode, people = []) {
    const meta = getDeviceMeta(deviceCode);
    if (!meta) return;

    const validPeople = Array.isArray(people)
        ? people.filter((person) => Number(person.person_index) !== 88)
        : [];

    pendingDeviceUpdates.set(deviceCode, {
        people: validPeople,
        isWc: meta.isWc,
        roomId: meta.roomId,
    });

    schedulePositionFlush();
}

export function onAlarm(alarm) {
    if (!alarm || !alarm.device_code) return;

    const meta = getDeviceMeta(alarm.device_code);
    if (!meta) return;
    const radarCard = meta.radarCard;

    const dangerTypes = [
        "fall_confirmed",
        "heart_rate_high_critical",
        "heart_rate_low_critical",
        "apnea",
    ];
    const isDanger = dangerTypes.includes(alarm.alarm_type);

    if (!isDanger || alarm.intervencao_inicio) return;

    radarCard.classList.add("radar-sos");
    radarCard.dataset.radarSosType = alarm.alarm_type || "";

    if (alarm.detection_id) {
        meta.button.dataset.detectionId = alarm.detection_id;
        meta.button.dataset.detectionType = alarm.alarm_type || "";
    }

    radarCard
        .querySelectorAll(".container-camas .item-cama")
        .forEach((element) => element.classList.add("d-none"));
    radarCard
        .querySelectorAll(".container-camas .item-alerta")
        .forEach((element) => element.classList.remove("d-none"));
    radarCard
        .querySelectorAll(".container-wc .item-wc")
        .forEach((element) => element.classList.add("d-none"));
    radarCard
        .querySelectorAll(".container-wc .item-alerta")
        .forEach((element) => element.classList.remove("d-none"));
}

export function onPollComplete(currentMonthFalls) {
    if (currentMonthFalls === null || currentMonthFalls === undefined) return;
    if (currentMonthFalls === lastMonthFalls) return;

    lastMonthFalls = currentMonthFalls;
    $("#indicador-alertas-queda-mes").text(
        formatQuantity(currentMonthFalls, "alerta"),
    );
}

export function onOnlineDevices(onlineDevices = []) {
    const onlineDevicesSet = new Set(onlineDevices);

    document
        .querySelectorAll(".radar-link-button[data-id]")
        .forEach((button) => {
            const uid = button.getAttribute("data-id");
            if (!uid) return;

            const isOnline = onlineDevicesSet.has(uid);
            if (isOnline) {
                if (!button.classList.contains("bg-success")) {
                    button.classList.add("bg-success", "text-white");
                    button.classList.remove("bg-danger");
                }
                return;
            }

            if (!button.classList.contains("bg-danger")) {
                button.classList.remove("bg-success");
                button.classList.add("bg-danger", "text-white");
            }
        });
}
