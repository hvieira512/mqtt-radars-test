import { BED_POSTURES, getLayoutCache } from "../core/index.js";

let devicePeopleState = {};
let lastMonthFalls = 0;

function formatQuantity(total, singularKey) {
    const key = total === 1 ? singularKey : singularKey + "s";
    return `${total} ${String(translations.i18n[key]).toLowerCase()}`;
}

function getRadarCardByUid(uid) {
    const button = getRadarButtonByUid(document, uid);
    if (!button) return null;
    return button.closest(".item-radar");
}

function getRadarButtonByUid(root, uid) {
    return (
        Array.from(root.querySelectorAll("button[data-id]")).find(
            (button) => button.dataset.id === uid,
        ) || null
    );
}

function toggleBedIcon(bedItem, hasPersonInBed) {
    const bedIcon = bedItem.querySelector(".estado-na-cama");
    if (!bedIcon) return;

    bedIcon.classList.toggle("text-success", hasPersonInBed);
    bedIcon.classList.toggle("fw-bold", hasPersonInBed);
    bedIcon.classList.toggle("opacity-25", !hasPersonInBed);
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

function updateGlobalKPIs() {
    const bedroomDeviceCount = document.querySelectorAll(
        ".item-radar .item-cama",
    ).length;
    const occupiedBedCount = document.querySelectorAll(
        ".item-radar .item-cama .estado-na-cama.text-success",
    ).length;
    const emptyBeds = bedroomDeviceCount - occupiedBedCount;

    let globalWCPeople = 0;
    document.querySelectorAll(".item-radar").forEach((card) => {
        const wcCounter = card.querySelector(".numero-pessoas-wc");
        if (!wcCounter) return;

        const value = parseInt(wcCounter.textContent, 10) || 0;
        globalWCPeople = Math.max(globalWCPeople, value);
    });

    const kpiMap = {
        "indicador-pessoas-monitorizadas": bedroomDeviceCount,
        "indicador-camas-ocupadas": occupiedBedCount,
        "indicador-camas-vazias": emptyBeds,
        "indicador-pessoas-wc": globalWCPeople,
    };

    Object.entries(kpiMap).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (!element) return;

        const labels = {
            "indicador-pessoas-monitorizadas": formatQuantity(value, "pessoa"),
            "indicador-camas-ocupadas": formatQuantity(value, "cama"),
            "indicador-camas-vazias": formatQuantity(value, "cama"),
            "indicador-pessoas-wc": formatQuantity(value, "pessoa"),
        };

        element.textContent = labels[id] || String(value);
    });
}

export function onPosition(deviceCode, people = []) {
    const radarCard = getRadarCardByUid(deviceCode);
    if (!radarCard) return;

    const button = getRadarButtonByUid(radarCard, deviceCode);
    const isWc = button ? button.dataset.wc === "1" : false;
    const validPeople = Array.isArray(people)
        ? people.filter((person) => Number(person.person_index) !== 88)
        : [];

    if (validPeople.length === 0) {
        delete devicePeopleState[deviceCode];
    } else {
        devicePeopleState[deviceCode] = { people: validPeople, isWc };
    }

    const quartoId = radarCard.dataset.quarto;
    let bedroomMaxCount = 0;
    const bedroomOccupancyByDevice = new Map();

    const layoutData = getLayoutCache(deviceCode);
    const bedRegionKeys = layoutData
        ? parseAreasToBedRegions(layoutData.declare_area)
        : new Set();

    Object.entries(devicePeopleState).forEach(([code, state]) => {
        const card = getRadarCardByUid(code);
        if (!card || card.dataset.quarto !== quartoId) return;

        const deviceLayout = getLayoutCache(code);
        const deviceBedRegions = deviceLayout
            ? parseAreasToBedRegions(deviceLayout.declare_area)
            : bedRegionKeys;

        if (state.isWc) {
            return;
        }

        bedroomMaxCount = Math.max(bedroomMaxCount, state.people.length);
        const hasPersonInBed = state.people.some(
            (p) =>
                deviceBedRegions.has(p.region_id) &&
                BED_POSTURES.has(p.posture_state),
        );

        bedroomOccupancyByDevice.set(code, hasPersonInBed);
    });

    const bedCounter = radarCard.querySelector(".numero-pessoas-camas");
    if (bedCounter) {
        bedCounter.textContent = bedroomMaxCount;
        const parent = bedCounter.parentElement;
        parent?.classList.toggle("text-success", bedroomMaxCount > 0);
        parent?.classList.toggle("fw-bold", bedroomMaxCount > 0);
    }

    radarCard.querySelectorAll(".item-cama").forEach((bedItem) => {
        const bedHasPersonInBed = Array.from(
            bedItem.querySelectorAll("button[data-id]"),
        ).some(
            (bedButton) =>
                bedButton.dataset.wc !== "1" &&
                bedroomOccupancyByDevice.get(bedButton.dataset.id) === true,
        );

        toggleBedIcon(bedItem, bedHasPersonInBed);
    });

    const wcDevicesInRoom = Object.entries(devicePeopleState).filter(
        ([code, state]) => {
            const card = getRadarCardByUid(code);
            return state.isWc && card?.dataset?.quarto === quartoId;
        },
    );

    const hasAnyWcOccupant = wcDevicesInRoom.some(
        ([, state]) => state.people.length > 0,
    );

    radarCard.querySelectorAll(".container-wc .item-wc").forEach((wcItem) => {
        const icon = wcItem.querySelector("i.fa-toilet");
        if (!icon) return;

        icon.classList.toggle("text-success", hasAnyWcOccupant);
        icon.classList.toggle("fw-bold", hasAnyWcOccupant);
    });

    const wcCounter = radarCard.querySelector(
        ".radar-descricao-info .numero-pessoas-wc",
    );
    if (wcCounter) {
        const totalWcPeople = wcDevicesInRoom.reduce(
            (sum, [, state]) => sum + state.people.length,
            0,
        );
        wcCounter.textContent = totalWcPeople;
        const parent = wcCounter.parentElement;
        parent?.classList.toggle("text-success", totalWcPeople > 0);
        parent?.classList.toggle("fw-bold", totalWcPeople > 0);
    }

    updateGlobalKPIs();
}

export function onAlarm(alarm) {
    if (!alarm || !alarm.device_code) return;

    const radarCard = getRadarCardByUid(alarm.device_code);
    if (!radarCard) return;

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
        const radarButton = radarCard.querySelector(
            `button[data-id="${alarm.device_code}"]`,
        );
        if (radarButton) {
            radarButton.dataset.detectionId = alarm.detection_id;
            radarButton.dataset.detectionType = alarm.alarm_type || "";
        }
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
    document
        .querySelectorAll(".radar-link-button[data-id]")
        .forEach((button) => {
            const uid = button.getAttribute("data-id");
            if (!uid) return;

            const isOnline = onlineDevices.includes(uid);
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
