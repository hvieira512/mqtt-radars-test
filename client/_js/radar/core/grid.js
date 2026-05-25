// radar-grid.js - KT DataTables for alarms and events display

import {
    getAreaName,
    getLayoutCache,
    typeConfig,
    calcularDuracao,
    calcularTempo,
} from "./utils.js";

let eventsTable = null;
let alarmsTable = null;
let currentDeviceCode = null;
let lastAlarmId = 0;
let fallReplayHandler = null;
let knownAlarmIds = new Set();
let pendingAlarmReloadTimer = null;
const ALARM_RELOAD_DEBOUNCE_MS = 250;
const EVENT_MESSAGE_COLUMN_INDEX = 3;
const EVENT_COMPACT_COLUMN_TARGETS = [0, 1, 2];
const ALARM_MESSAGE_COLUMN_INDEX = 6;
const ALARM_COMPACT_COLUMN_TARGETS = [0, 1, 2, 3, 4, 5, 7];
const DEFAULT_USER_PHOTO_URL = "/assets/media/icons/svg/General/User.svg";
const USER_AVATAR_BASE_URL = "https://dev.hitcare.net/public/avatars/";
const DATA_TABLES_LANGUAGE_URL =
    "/assets/plugins/custom/datatables/i18n/pt.json";
let dataTablesLanguage = null;
let dataTablesLanguagePromise = null;
let pendingEventsInit = false;
let pendingAlarmsInit = false;

function loadDataTablesLanguage() {
    if (dataTablesLanguage) {
        return Promise.resolve(dataTablesLanguage);
    }

    if (!dataTablesLanguagePromise) {
        dataTablesLanguagePromise = fetch(DATA_TABLES_LANGUAGE_URL)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `DataTables language failed: ${response.status}`,
                    );
                }

                return response.json();
            })
            .then((language) => {
                dataTablesLanguage = language;
                return dataTablesLanguage;
            })
            .catch((error) => {
                console.error("DataTables language preload error:", error);
                dataTablesLanguage = {};
                return dataTablesLanguage;
            });
    }

    return dataTablesLanguagePromise;
}

function initPendingTables() {
    if (pendingEventsInit) {
        pendingEventsInit = false;
        initEventsTable();
    }

    if (pendingAlarmsInit) {
        pendingAlarmsInit = false;
        initAlarmsTable();
    }
}

function ensureDataTablesLanguageLoaded(tableType) {
    if (dataTablesLanguage) return true;

    if (tableType === "events") {
        pendingEventsInit = true;
    } else if (tableType === "alarms") {
        pendingAlarmsInit = true;
    }

    loadDataTablesLanguage().then(initPendingTables);
    return false;
}

function cancelPendingTableInit() {
    pendingEventsInit = false;
    pendingAlarmsInit = false;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        };
        return entities[char];
    });
}

function buildUserPhotoUrl(foto) {
    const value = String(foto || "").trim();
    if (!value) return DEFAULT_USER_PHOTO_URL;
    if (/^(https?:)?\/\//i.test(value)) return value;
    if (value.startsWith("/")) return `https://dev.hitcare.net${value}`;

    return `${USER_AVATAR_BASE_URL}${encodeURIComponent(value).replace(
        /%2F/g,
        "/",
    )}`;
}

function getRegionColumnTitle() {
    return (
        translations.i18n["regiao_de_alarme"] || "Região de alarme"
    ).replace(/\s+de\s+alarme$/i, "");
}

function resetKnownAlarms() {
    knownAlarmIds = new Set();
}

function rememberAlarmId(alarmId) {
    if (alarmId === undefined || alarmId === null || alarmId === "") return;
    knownAlarmIds.add(String(alarmId));
}

function scheduleAlarmsReload() {
    if (!alarmsTable) return;

    if (pendingAlarmReloadTimer) {
        window.clearTimeout(pendingAlarmReloadTimer);
    }

    pendingAlarmReloadTimer = window.setTimeout(() => {
        pendingAlarmReloadTimer = null;
        if (alarmsTable) {
            alarmsTable.ajax.reload(null, false);
        }
    }, ALARM_RELOAD_DEBOUNCE_MS);
}

function isAlarmForCurrentDevice(alarm) {
    if (!alarm || !currentDeviceCode) return false;
    if (!alarm.device_code) return true;

    return alarm.device_code === currentDeviceCode;
}

function handleResolveClick(detectionId, rowData) {
    const { intervencao_inicio, intervencao_fim } = rowData;

    let action, message;
    if (intervencao_fim) {
        return;
    } else if (intervencao_inicio) {
        action = "resolve";
        message = translations.i18n["marcar_alarme_resolvido"];
    } else {
        action = "silence";
        message = translations.i18n["silenciar_alarme"];
    }

    if (!confirm(message)) return;

    fetch("/modulos/radares/_ajax/detections/resolve.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: action,
            detection_ids: [detectionId],
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.status === "ok") {
                refreshAlarms();
            }
        })
        .catch((err) => console.error("Error resolving alarm:", err));
}

function tipoCellRenderer(data, type, row) {
    if (!data) return "-";
    const config = typeConfig[data];
    if (!config) return data;
    return `<span class="badge ${config.badgeClass} w-100 d-flex align-items-center justify-content-start gap-2">
        <i class="fa ${config.icon}"></i>
        <strong>${config.label}</strong>
    </span>`;
}

function regiaoCellRenderer(data, type, row) {
    if (row?.regiao_nome) return row.regiao_nome;
    if (!data || !currentDeviceCode) return data || "-";
    const layoutData = getLayoutCache(currentDeviceCode);
    if (!layoutData) return data || "-";
    return getAreaName(layoutData, data, 0) || data || "-";
}

function resolveRegiaoNome(deviceCode, regionId) {
    if (!deviceCode || !regionId) return null;
    const layoutData = getLayoutCache(deviceCode);
    if (!layoutData) return null;
    return getAreaName(layoutData, regionId, 0) || null;
}

function duracaoCellRenderer(data, type, row) {
    if (!row) return "-";

    const { intervencao_inicio, intervencao_fim } = row;

    if (intervencao_fim) {
        return calcularDuracao(intervencao_inicio, intervencao_fim);
    }

    if (intervencao_inicio) {
        return calcularTempo(intervencao_inicio);
    }

    return "-";
}

function interventionUserCellRenderer(data, type, row) {
    if (!data || (!data && type !== "display")) return "";

    const name = data.name || (data.id ? `#${data.id}` : "");
    if (type !== "display") return name;

    const photoUrl = buildUserPhotoUrl(data.foto);
    const escapedPhotoUrl = escapeHtml(photoUrl);
    const escapedFallbackUrl = escapeHtml(DEFAULT_USER_PHOTO_URL);

    return `
        <div class="d-flex align-items-center gap-2">
            <img
                src="${escapedPhotoUrl}"
                alt="${escapeHtml(name)}"
                class="rounded-circle object-fit-cover"
                style="--size: 1.75rem; width:var(--size);height:var(--size);"
                onerror="this.onerror=null;this.src='${escapedFallbackUrl}';" >
            <span>${escapeHtml(name)}</span>
        </div>
    `;
}

function interventionDateWithUserCellRenderer(userField) {
    return function (data, type, row) {
        const renderedUser = interventionUserCellRenderer(
            row?.[userField],
            type,
            row,
        );

        if (type !== "display") {
            return [data, renderedUser].filter(Boolean).join(" ");
        }

        // if data is empty, dont even try to render the user, just return empty
        return `
            <div class="d-inline-flex align-items-center flex-nowrap gap-3">
                <span style="min-width:16ch;">${data ? escapeHtml(data) : "-"}</span>
                ${renderedUser}
            </div>
        `;
    };
}

function opcoesCellRenderer(data, type, row) {
    if (row.tipo !== "fall_confirmed") {
        return "-";
    }

    return `
        <button class="btn btn-sm btn-outline-primary btn-playback-alarm" data-id="${row.id}">
            <i class="fa fa-play mr-1"></i> Reproduzir Queda
        </button>
    `;
}

function initEventsTable() {
    const tableEl = document.querySelector("#events-grid");
    if (!tableEl || eventsTable) return;

    // Only init if we have a device code (modal is open with device)
    if (!currentDeviceCode) return;
    if (!ensureDataTablesLanguageLoaded("events")) return;

    eventsTable = $("#events-grid").DataTable({
        language: dataTablesLanguage,
        processing: true,
        serverSide: true,
        deferRender: true,
        searchDelay: 350,
        autoWidth: false,
        ajax: {
            url: "/modulos/radares/_ajax/detections/device-table.php",
            type: "GET",
            data: function (d) {
                d.device_code = currentDeviceCode || "";
                d.categoria = "event";
            },
            dataSrc: "data",
        },
        columns: [
            {
                data: "criado_em",
                title: translations.i18n["data_e_hora"],
                orderable: true,
                searchable: true,
            },
            {
                data: "tipo",
                title: translations.i18n["tipo_de_evento"],
                render: tipoCellRenderer,
            },
            {
                data: "regiao_id",
                title: getRegionColumnTitle(),
                render: regiaoCellRenderer,
            },
            {
                data: "mensagem",
                title: translations.i18n["detalhes"],
                render: function (data, type, row) {
                    return data || "";
                },
            },
        ],
        columnDefs: [
            {
                targets: EVENT_COMPACT_COLUMN_TARGETS,
                className: "text-nowrap",
                width: "1%",
            },
            {
                targets: EVENT_MESSAGE_COLUMN_INDEX,
                width: "100%",
            },
        ],
        order: [[0, "desc"]],
        rowId: "id",
        lengthMenu: [
            [10, 20, 50, 100],
            [10, 20, 50, 100],
        ],
        pageLength: 20,
        scrollX: true,
        scrollCollapse: false,
        drawCallback: function (settings) {
            // Re-initialize any needed post-render logic
        },
    });
}

function initAlarmsTable() {
    const tableEl = document.querySelector("#alarms-grid");
    if (!tableEl || alarmsTable) return;

    // Only init if we have a device code (modal is open with device)
    if (!currentDeviceCode) return;
    if (!ensureDataTablesLanguageLoaded("alarms")) return;

    alarmsTable = $("#alarms-grid").DataTable({
        language: dataTablesLanguage,
        processing: true,
        serverSide: true,
        deferRender: true,
        searchDelay: 350,
        autoWidth: false,
        ajax: {
            url: "/modulos/radares/_ajax/detections/device-table.php",
            type: "GET",
            data: function (d) {
                d.device_code = currentDeviceCode;
                d.categoria = "alarm";
            },
            dataSrc: function (json) {
                const rows = Array.isArray(json?.data) ? json.data : [];
                rows.forEach((row) => rememberAlarmId(row.id));
                return rows;
            },
        },
        columns: [
            { data: "criado_em", title: translations.i18n["data_e_hora"] },
            {
                data: "tipo",
                title: translations.i18n["tipo_de_alarme"],
                render: tipoCellRenderer,
            },
            {
                data: "regiao_id",
                title: getRegionColumnTitle(),
                render: regiaoCellRenderer,
            },
            {
                data: "intervencao_inicio",
                title:
                    translations.i18n["inicio_tratamento"] ||
                    "Início do Tratamento",
                render: interventionDateWithUserCellRenderer(
                    "intervencao_inicio_user",
                ),
            },
            {
                data: "intervencao_fim",
                title:
                    translations.i18n["fim_tratamento"] || "Fim do Tratamento",
                render: interventionDateWithUserCellRenderer(
                    "intervencao_fim_user",
                ),
            },
            {
                title: translations.i18n["duracao_tratamento"],
                render: duracaoCellRenderer,
            },
            {
                data: "mensagem",
                title: translations.i18n["detalhes"],
                render: function (data, type, row) {
                    return data || "-";
                },
            },
            {
                title: "Opções",
                orderable: false,
                searchable: false,
                render: opcoesCellRenderer,
            },
        ],
        columnDefs: [
            {
                targets: ALARM_COMPACT_COLUMN_TARGETS,
                className: "text-nowrap",
                width: "1%",
            },
            {
                targets: ALARM_MESSAGE_COLUMN_INDEX,
                width: "100%",
            },
        ],
        order: [[0, "desc"]],
        rowId: "id",
        lengthMenu: [
            [10, 20, 50, 100],
            [10, 20, 50, 100],
        ],
        pageLength: 20,
        scrollX: true,
        scrollCollapse: false,
        drawCallback: function (settings) {
            // Attach click handlers to resolve buttons
            $("#alarms-grid")
                .off("click", ".btn-resolve")
                .on("click", ".btn-resolve", function () {
                    const detectionId = parseInt($(this).data("id"));
                    const rowData = alarmsTable
                        .row($(this).closest("tr"))
                        .data();
                    handleResolveClick(detectionId, rowData);
                });

            $("#alarms-grid")
                .off("click", ".btn-playback-alarm")
                .on("click", ".btn-playback-alarm", function () {
                    if (typeof fallReplayHandler !== "function") return;

                    const baseRowData = alarmsTable
                        .row($(this).closest("tr"))
                        .data();
                    if (!baseRowData) return;

                    const radarModal = document.getElementById("radarModal");
                    const rowData = {
                        ...baseRowData,
                        device_code: currentDeviceCode,
                        device_name: radarModal?.dataset?.name || "",
                    };

                    fallReplayHandler(rowData);
                });
        },
    });
}

export function init() {
    // Fix for DataTables column width when switching between tabs
    // Use event delegation since modal might not be open when this runs
    $(document).on("shown.bs.tab", "#deviceTabs", function (e) {
        const targetId = $(e.target).attr("href");

        if (targetId === "#alarms" && alarmsTable) {
            alarmsTable.columns.adjust();
        }
        if (targetId === "#events" && eventsTable) {
            eventsTable.columns.adjust();
        }
    });

    // Also ensure tables adjust when radar modal opens
    $(document).on("shown.bs.modal", "#radarModal", function () {
        setTimeout(function () {
            if (alarmsTable) alarmsTable.columns.adjust();
            if (eventsTable) eventsTable.columns.adjust();
        }, 100);
    });

    // Clean up tables and event listeners when modal closes
    $(document).on("hidden.bs.modal", "#radarModal", function () {
        destroyTables();
    });
}

function destroyTables() {
    cancelPendingTableInit();

    if (pendingAlarmReloadTimer) {
        window.clearTimeout(pendingAlarmReloadTimer);
        pendingAlarmReloadTimer = null;
    }

    if (eventsTable) {
        eventsTable.destroy();
        eventsTable = null;
    }
    if (alarmsTable) {
        alarmsTable.destroy();
        alarmsTable = null;
    }
    currentDeviceCode = null;
    resetKnownAlarms();
}

export function adjustTables() {
    window.setTimeout(() => {
        if (alarmsTable) alarmsTable.columns.adjust();
        if (eventsTable) eventsTable.columns.adjust();
    }, 0);
}

export function clear() {
    cancelPendingTableInit();

    if (pendingAlarmReloadTimer) {
        window.clearTimeout(pendingAlarmReloadTimer);
        pendingAlarmReloadTimer = null;
    }

    if (eventsTable) {
        eventsTable.clear();
    }
    if (alarmsTable) {
        alarmsTable.clear();
    }
    currentDeviceCode = null;
    resetKnownAlarms();
}

export function addAlarm(a) {
    if (!alarmsTable) return;
    if (!isAlarmForCurrentDevice(a)) return;

    const detectionId = a.detection_id;
    if (!detectionId || knownAlarmIds.has(String(detectionId))) return;

    rememberAlarmId(detectionId);
    scheduleAlarmsReload();
}

const DETECTIONS_TABLE_AJAX_URL =
    "/modulos/radares/_ajax/detections/device-table.php";

function reloadDetectionsTable(
    table,
    deviceCode,
    categoria,
    filters,
    filterKeys,
) {
    const queryParams = new URLSearchParams({
        device_code: deviceCode,
        categoria,
    });

    for (const key of filterKeys) {
        if (filters[key]) queryParams.append(key, filters[key]);
    }

    table.ajax.url(`${DETECTIONS_TABLE_AJAX_URL}?${queryParams}`).load();
}

export function loadAlarms(deviceCode, filters = {}) {
    if (!deviceCode) return;

    const isDifferentDevice = currentDeviceCode !== deviceCode;
    currentDeviceCode = deviceCode;

    if (isDifferentDevice) {
        resetKnownAlarms();
    }

    if (!alarmsTable) {
        initAlarmsTable();
    } else {
        reloadDetectionsTable(alarmsTable, deviceCode, "alarm", filters, [
            "estado",
            "data_inicio",
            "data_fim",
        ]);
    }
}

export function loadEvents(deviceCode, filters = {}) {
    if (!deviceCode) return;

    currentDeviceCode = deviceCode;

    if (!eventsTable) {
        initEventsTable();
    } else {
        reloadDetectionsTable(eventsTable, deviceCode, "event", filters, [
            "tipo",
            "data_inicio",
            "data_fim",
        ]);
    }
}

export function refreshAlarms(filters = {}) {
    if (currentDeviceCode) {
        loadAlarms(currentDeviceCode, filters);
    }
}

export function onFallReplay(handler) {
    fallReplayHandler = handler;
}
