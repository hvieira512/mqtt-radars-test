var __r = {};

// --- _js/radar/core/utils.js ---
// radar-utils.js - Shared utilities and constants for radar polling system

var RADAR_AREA_COLORS = {
    4: "#ffa500",
    5: "#32cd32",
    6: "#ff4500",
    3: "#808080",
    default: "#a9a9a9",
};

var RADAR_AREA_LABELS = {
    0: "-",
    1: translations.i18n["customizado"],
    2: translations.i18n["cama"],
    3: translations.i18n["interferencia"],
    4: translations.i18n["porta"],
    5: translations.i18n["cama_de_monitorizacao"],
    6: translations.i18n["regiao_de_alarme"],
};

var RADAR_POSTURE_STATES = {
    Initialization: {
        icon: "\uf128",
        color: "#6c757d",
        labelPT: translations.i18n["inicializacao"],
    },
    Walking: {
        icon: "\uf554",
        color: "#0d6efd",
        labelPT: translations.i18n["a_andar"],
    },
    "Suspected Fall": {
        icon: "\uf071",
        color: "#ffc107",
        labelPT: translations.i18n["suspeita_de_queda"],
    },
    Squatting: {
        icon: "\uf6ec",
        color: "#fd7e14",
        labelPT:
            translations.i18n["agachado"] == "Agachado"
                ? "Sentado"
                : translations.i18n["agachado"],
    },
    Standing: {
        icon: "\uf183",
        color: "#198754",
        labelPT: translations.i18n["em_pe"],
    },
    "Fall Confirmation": {
        icon: "\uf071",
        color: "#dc3545",
        labelPT: translations.i18n["queda_confirmada"],
    },
    "Lying Down": {
        icon: "\uf236",
        color: "#6f42c1",
        labelPT: translations.i18n["deitado"],
    },
    "Suspected Sitting on Ground": {
        icon: "\uf6ec",
        color: "#ffc107",
        labelPT: translations.i18n["suspeita_sentado_no_chao"],
    },
    "Confirmed Sitting on Ground": {
        icon: "\uf6ec",
        color: "#fd7e14",
        labelPT: translations.i18n["sentado_no_chao_confirmado"],
    },
    "Sitting Up Bed": {
        icon: "\uf236",
        color: "#20c997",
        labelPT: translations.i18n["sentado_na_cama"],
    },
    "Suspected Sitting Up Bed": {
        icon: "\uf236",
        color: "#ffc107",
        labelPT: translations.i18n["suspeita_sentado_na_cama"],
    },
    "Confirmed Sitting Up Bed": {
        icon: "\uf236",
        color: "#198754",
        labelPT: translations.i18n["sentado_na_cama_confirmado"],
    },
    Lying: {
        icon: "\uf236",
        color: "#6f42c1",
        labelPT: translations.i18n["deitado"],
    },
    "In Bed": {
        icon: "\uf236",
        color: "#6f42c1",
        labelPT: translations.i18n["na_cama"],
    },
    "Out Bed": {
        icon: "\uf183",
        color: "#198754",
        labelPT: translations.i18n["fora_da_cama"],
    },
};

var BED_POSTURES = new Set([
    "Lying Down",
    "Sitting Up Bed",
    "Suspected Sitting Up Bed",
    "Confirmed Sitting Up Bed",
    "In Bed",
    "Squatting",
]);

var mapCache = {};

var getAreaName = function(data, key, type) {
    let label =
        RADAR_AREA_LABELS[type] || `${translations.i18n["area"]} ${key}`;
    if (data?.declare_area_name?.[key]) {
        const parts = data.declare_area_name[key].split("_");
        label =
            parts.length > 1
                ? parts.slice(1).join("_")
                : data.declare_area_name[key];
    }
    return label;
}

var getAreaColor = function(areaType) {
    return RADAR_AREA_COLORS[areaType] || RADAR_AREA_COLORS.default;
}

var getPostureStyle = function(state) {
    return (
        RADAR_POSTURE_STATES[state] || RADAR_POSTURE_STATES["Initialization"]
    );
}

var reorderRect = function(coords) {
    if (coords.length < 8) return coords;
    return [
        coords[0],
        coords[1],
        coords[2],
        coords[3],
        coords[6],
        coords[7],
        coords[4],
        coords[5],
    ];
}

var getBounds = function(coords) {
    if (coords.length < 2) return { minX: 0, minY: 0, width: 100, height: 100 };
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (let i = 0; i < coords.length; i += 2) {
        if (coords[i] < minX) minX = coords[i];
        if (coords[i + 1] < minY) minY = coords[i + 1];
        if (coords[i] > maxX) maxX = coords[i];
        if (coords[i + 1] > maxY) maxY = coords[i + 1];
    }
    return { minX, minY, width: maxX - minX, height: maxY - minY };
}

var parseRectangle = function(rectangle) {
    if (!rectangle) return [];
    return rectangle
        .replace(/[{}]/g, "")
        .split(";")
        .map((p) => p.trim().split(",").map(Number))
        .flat();
}

var layoutCache = {};

var setLayoutCache = function(deviceCode, data) {
    layoutCache[deviceCode] = data;
}

var getLayoutCache = function(deviceCode) {
    return layoutCache[deviceCode] || null;
}

var renderLoading = function(container) {
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
}

var removeLoading = function(container) {
    if (!container) return;
    const overlay = container.querySelector(".loading-overlay");
    if (overlay) overlay.remove();
}

var typeConfig = {
    fall_confirmed: {
        icon: "fa-exclamation-triangle",
        badgeClass: "bg-danger text-white",
        label: translations.i18n["queda_confirmada_label"],
    },
    room_entry: {
        icon: "fa-sign-in",
        badgeClass: "bg-success text-white",
        label: translations.i18n["entrou_na_sala"],
    },
    room_exit: {
        icon: "fa-sign-out",
        badgeClass: "bg-warning text-dark",
        label: translations.i18n["saiu_na_sala"],
    },
    area_entry: {
        icon: "fa-arrow-right",
        badgeClass: "bg-info text-white",
        label: translations.i18n["entrou_na_regiao"],
    },
    area_exit: {
        icon: "fa-arrow-left",
        badgeClass: "bg-info text-white",
        label: translations.i18n["saiu_na_regiao"],
    },
};

var loadScript = function(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve();
            return;
        }
        const s = document.createElement('script');
        s.src = url;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(s);
    });
}

var calcularDuracao = function(inicio, fim) {
    if (!inicio || !fim) return "-";

    const start = new Date(inicio);
    const end = new Date(fim);
    const diffMs = end - start;

    return formatDuration(diffMs);
}

var calcularTempo = function(inicio) {
    if (!inicio) return "-";

    const start = new Date(inicio);
    const now = new Date();
    const diffMs = now - start;

    return formatDuration(diffMs);
}

var formatDuration = function(ms) {
    if (ms < 0) return "0m";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
    }
    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m`;
    }
    return `${seconds}s`;
}
__r['m0'] = __r['m0'] || {};
__r['m0'].getAreaName = getAreaName;
__r['m0'].getAreaColor = getAreaColor;
__r['m0'].getPostureStyle = getPostureStyle;
__r['m0'].reorderRect = reorderRect;
__r['m0'].getBounds = getBounds;
__r['m0'].parseRectangle = parseRectangle;
__r['m0'].setLayoutCache = setLayoutCache;
__r['m0'].getLayoutCache = getLayoutCache;
__r['m0'].renderLoading = renderLoading;
__r['m0'].removeLoading = removeLoading;
__r['m0'].loadScript = loadScript;
__r['m0'].calcularDuracao = calcularDuracao;
__r['m0'].calcularTempo = calcularTempo;
__r['m0'].BED_POSTURES = BED_POSTURES;
__r['m0'].typeConfig = typeConfig;

// --- _js/radar/core/poll.js ---
// radar-poll.js - Database polling system for radar data

var pollInterval = null;
var afterId = 0;
var afterDetectionId = 0;
var isPolling = false;
var pollTick = 0;
var pollUrl = "/modulos/radares/_ajax/radar-data/poll.php";
var pollDelay = 1000;

var callbacks = {
    onPosition: null,
    onVitals: null,
    onAlarm: null,
    onPollComplete: null,
    onOnlineDevices: null,
};

var onPosition = function(cb) {
    callbacks.onPosition = cb;
}

var onVitals = function(cb) {
    callbacks.onVitals = cb;
}

var onAlarm = function(cb) {
    callbacks.onAlarm = cb;
}

var onPollComplete = function(cb) {
    callbacks.onPollComplete = cb;
}

var onOnlineDevices = function(cb) {
    callbacks.onOnlineDevices = cb;
}

var start = function(delay) {
    if (pollInterval) return;
    pollDelay = delay || pollDelay;
    pollInterval = setInterval(fetchPollData, pollDelay);
    fetchPollData();
}

var fetchPollData = function() {
    if (isPolling) return;
    isPolling = true;
    pollTick++;

    const includeOnlineDevices =
        (afterId === 0 && afterDetectionId === 0) || pollTick % 10 === 0;

    const dataParams = {
        after_id: afterId,
        after_detection_id: afterDetectionId,
        limit: 50,
        include_online: includeOnlineDevices ? 1 : 0,
    };

    $.ajax({
        url: pollUrl,
        method: "GET",
        data: dataParams,
        dataType: "json",
        success: function (data) {
            try {
                processPollData(data);
            } catch (e) {
                console.error("Radar poll processing error:", e);
            }
        },
        error: function (xhr, status, error) {
            let errorMsg = error;
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.error) {
                    errorMsg = response.error;
                }
            } catch (e) {
                if (xhr.responseText) {
                    errorMsg = xhr.responseText.substring(0, 500);
                }
            }
            console.error("Radar poll error:", status, errorMsg);
        },
        complete: function () {
            isPolling = false;
        },
    });
}

var processPollData = function(data) {
    if (!data) return;

    if (data.next_after_id && data.next_after_id > afterId) {
        afterId = data.next_after_id;
    }

    if (
        data.next_after_detection_id &&
        data.next_after_detection_id > afterDetectionId
    ) {
        afterDetectionId = data.next_after_detection_id;
    }

    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(function (item) {
            if (
                item.type === "position" &&
                item.payload &&
                item.payload.people
            ) {
                if (callbacks.onPosition) {
                    callbacks.onPosition(item.device_code, item.payload.people);
                }
            }

            if (item.type === "vitals" && item.payload) {
                if (callbacks.onVitals) {
                    callbacks.onVitals(item.device_code, {
                        ...item.payload,
                        created_at: item.created_at,
                    });
                }
            }
        });
    }

    if (data.positions) {
        Object.keys(data.positions).forEach(function (deviceCode) {
            const posData = data.positions[deviceCode];
            if (posData.people && callbacks.onPosition) {
                callbacks.onPosition(deviceCode, posData.people);
            }
        });
    }

    if (data.alarms && Array.isArray(data.alarms)) {
        const dangerTypes = [
            "fall_confirmed",
            "heart_rate_high_critical",
            "heart_rate_low_critical",
            "apnea",
        ];

        data.alarms.forEach(function (alarm) {
            const isDanger = dangerTypes.includes(alarm.alarm_type);

            if ((alarm.category === "alarm" || isDanger) && callbacks.onAlarm) {
                callbacks.onAlarm(alarm);
            }
        });
    }

    if (
        data.online_devices &&
        Array.isArray(data.online_devices) &&
        callbacks.onOnlineDevices
    ) {
        callbacks.onOnlineDevices(data.online_devices);
    }

    if (callbacks.onPollComplete) {
        callbacks.onPollComplete(data.current_month_falls);
    }
}
__r['m1'] = __r['m1'] || {};
__r['m1'].onPosition = onPosition;
__r['m1'].onVitals = onVitals;
__r['m1'].onAlarm = onAlarm;
__r['m1'].onPollComplete = onPollComplete;
__r['m1'].onOnlineDevices = onOnlineDevices;
__r['m1'].start = start;

// --- _js/radar/core/toast.js ---
var themes = {
    success: {
        icon: "success",
        customClass: { popup: "toast-success" },
    },

    danger: {
        icon: "error",
        customClass: { popup: "toast-danger" },
    },

    perigo: {
        icon: "error",
        customClass: { popup: "toast-danger" },
    },

    warning: {
        icon: "warning",
        customClass: { popup: "toast-warning" },
    },

    aviso: {
        icon: "warning",
        customClass: { popup: "toast-warning" },
    },

    info: {
        icon: "info",
        customClass: { popup: "toast-info" },
    },

    primary: {
        icon: "info",
        customClass: { popup: "toast-primary" },
    },

    secondary: {
        icon: "info",
        customClass: { popup: "toast-secondary" },
    },
};

var toast = function({
    title = "",
    text = "",
    theme = "info",
    timer = null,
    ...options
}) {
    const themeConfig = themes[theme] || themes.info;
    const defaultTimer = (theme === 'perigo' || theme === 'danger') ? 8000 : 5000;
    const finalTimer = timer !== null ? timer : defaultTimer;

    Swal.fire({
        toast: true,
        position: "top",
        showConfirmButton: false,
        showCloseButton: true,
        timer: finalTimer,
        timerProgressBar: true,
        ...themeConfig,
        title: title,
        text: text,
        ...options,
    });
}

toast.success = (title, text, opts = {}) =>
    toast({ title, text, theme: "success", ...opts });

toast.error = (title, text, opts = {}) =>
    toast({ title, text, theme: "danger", ...opts });

toast.warning = (title, text, opts = {}) =>
    toast({ title, text, theme: "warning", ...opts });

toast.info = (title, text, opts = {}) =>
    toast({ title, text, theme: "info", ...opts });

toast;
__r['m2'] = __r['m2'] || {};
__r['m2'].toast = toast;
__r['m2'] = __r['m2'] || {};
__r['m2'].default = toast;

// --- _js/radar/core/grid.js ---
var getAreaName = __r['m0'].getAreaName, getLayoutCache = __r['m0'].getLayoutCache, typeConfig = __r['m0'].typeConfig, calcularDuracao = __r['m0'].calcularDuracao, calcularTempo = __r['m0'].calcularTempo;
// radar-grid.js - KT DataTables for alarms and events display


var eventsTable = null;
var alarmsTable = null;
var currentDeviceCode = null;
var lastAlarmId = 0;
var fallReplayHandler = null;
var knownAlarmIds = new Set();
var pendingAlarmReloadTimer = null;
var ALARM_RELOAD_DEBOUNCE_MS = 250;
var EVENT_MESSAGE_COLUMN_INDEX = 3;
var EVENT_COMPACT_COLUMN_TARGETS = [0, 1, 2];
var ALARM_MESSAGE_COLUMN_INDEX = 6;
var ALARM_COMPACT_COLUMN_TARGETS = [0, 1, 2, 3, 4, 5, 7];
var DEFAULT_USER_PHOTO_URL = "/assets/media/icons/svg/General/User.svg";
var USER_AVATAR_BASE_URL = "https://dev.hitcare.net/public/avatars/";
var DATA_TABLES_LANGUAGE_URL =
    "/assets/plugins/custom/datatables/i18n/pt.json";
var dataTablesLanguage = null;
var dataTablesLanguagePromise = null;
var pendingEventsInit = false;
var pendingAlarmsInit = false;

var loadDataTablesLanguage = function() {
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

var initPendingTables = function() {
    if (pendingEventsInit) {
        pendingEventsInit = false;
        initEventsTable();
    }

    if (pendingAlarmsInit) {
        pendingAlarmsInit = false;
        initAlarmsTable();
    }
}

var ensureDataTablesLanguageLoaded = function(tableType) {
    if (dataTablesLanguage) return true;

    if (tableType === "events") {
        pendingEventsInit = true;
    } else if (tableType === "alarms") {
        pendingAlarmsInit = true;
    }

    loadDataTablesLanguage().then(initPendingTables);
    return false;
}

var cancelPendingTableInit = function() {
    pendingEventsInit = false;
    pendingAlarmsInit = false;
}

var escapeHtml = function(value) {
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

var buildUserPhotoUrl = function(foto) {
    const value = String(foto || "").trim();
    if (!value) return DEFAULT_USER_PHOTO_URL;
    if (/^(https?:)?\/\//i.test(value)) return value;
    if (value.startsWith("/")) return `https://dev.hitcare.net${value}`;

    return `${USER_AVATAR_BASE_URL}${encodeURIComponent(value).replace(
        /%2F/g,
        "/",
    )}`;
}

var getRegionColumnTitle = function() {
    return (
        translations.i18n["regiao_de_alarme"] || "Região de alarme"
    ).replace(/\s+de\s+alarme$/i, "");
}

var resetKnownAlarms = function() {
    knownAlarmIds = new Set();
}

var rememberAlarmId = function(alarmId) {
    if (alarmId === undefined || alarmId === null || alarmId === "") return;
    knownAlarmIds.add(String(alarmId));
}

var scheduleAlarmsReload = function() {
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

var isAlarmForCurrentDevice = function(alarm) {
    if (!alarm || !currentDeviceCode) return false;
    if (!alarm.device_code) return true;

    return alarm.device_code === currentDeviceCode;
}

var handleResolveClick = function(detectionId, rowData) {
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

var tipoCellRenderer = function(data, type, row) {
    if (!data) return "-";
    const config = typeConfig[data];
    if (!config) return data;
    return `<span class="badge ${config.badgeClass} w-100 d-flex align-items-center justify-content-start gap-2">
        <i class="fa ${config.icon}"></i>
        <strong>${config.label}</strong>
    </span>`;
}

var regiaoCellRenderer = function(data, type, row) {
    if (row?.regiao_nome) return row.regiao_nome;
    if (!data || !currentDeviceCode) return data || "-";
    const layoutData = getLayoutCache(currentDeviceCode);
    if (!layoutData) return data || "-";
    return getAreaName(layoutData, data, 0) || data || "-";
}

var resolveRegiaoNome = function(deviceCode, regionId) {
    if (!deviceCode || !regionId) return null;
    const layoutData = getLayoutCache(deviceCode);
    if (!layoutData) return null;
    return getAreaName(layoutData, regionId, 0) || null;
}

var duracaoCellRenderer = function(data, type, row) {
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

var interventionUserCellRenderer = function(data, type, row) {
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

var interventionDateWithUserCellRenderer = function(userField) {
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

var opcoesCellRenderer = function(data, type, row) {
    if (row.tipo !== "fall_confirmed") {
        return "-";
    }

    return `
        <button class="btn btn-sm btn-outline-primary btn-playback-alarm" data-id="${row.id}">
            <i class="fa fa-play mr-1"></i> Reproduzir Queda
        </button>
    `;
}

var initEventsTable = function() {
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

var initAlarmsTable = function() {
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

var init = function() {
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

var destroyTables = function() {
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

var adjustTables = function() {
    window.setTimeout(() => {
        if (alarmsTable) alarmsTable.columns.adjust();
        if (eventsTable) eventsTable.columns.adjust();
    }, 0);
}

var clear = function() {
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

var addAlarm = function(a) {
    if (!alarmsTable) return;
    if (!isAlarmForCurrentDevice(a)) return;

    const detectionId = a.detection_id;
    if (!detectionId || knownAlarmIds.has(String(detectionId))) return;

    rememberAlarmId(detectionId);
    scheduleAlarmsReload();
}

var DETECTIONS_TABLE_AJAX_URL =
    "/modulos/radares/_ajax/detections/device-table.php";

var reloadDetectionsTable = function(
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

var loadAlarms = function(deviceCode, filters = {}) {
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

var loadEvents = function(deviceCode, filters = {}) {
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

var refreshAlarms = function(filters = {}) {
    if (currentDeviceCode) {
        loadAlarms(currentDeviceCode, filters);
    }
}

var onFallReplay = function(handler) {
    fallReplayHandler = handler;
}
__r['m3'] = __r['m3'] || {};
__r['m3'].init = init;
__r['m3'].adjustTables = adjustTables;
__r['m3'].clear = clear;
__r['m3'].addAlarm = addAlarm;
__r['m3'].loadAlarms = loadAlarms;
__r['m3'].loadEvents = loadEvents;
__r['m3'].refreshAlarms = refreshAlarms;
__r['m3'].onFallReplay = onFallReplay;

// --- _js/radar/core/index.js ---
__r['m4'] = __r['m4'] || {};
__r['m4'].grid = __r['m3'];
__r['m4'] = __r['m4'] || {};
__r['m4'].poll = __r['m1'];
__r['m4'] = __r['m4'] || {};
for(var k in __r['m0']) __r['m4'][k] = __r['m0'][k];
__r['m4'] = __r['m4'] || {};
__r['m4'].toast = __r['m2'].default;



// --- _js/radar/replay/time.js ---
var formatLocalDate = function(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

var formatLocalDateTime = function(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${formatLocalDate(date)} ${hours}:${minutes}:${seconds}`;
}

var parseLocalDateValue = function(dateValue) {
    const match = String(dateValue || "")
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return null;

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        0,
        0,
        0,
        0,
    );
}

var parseMysqlDateTimeLocal = function(value) {
    const match = String(value || "")
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);

    if (!match) return null;

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6]),
        0,
    );
}

var getReplayBaseDate = function(dateValue) {
    return parseLocalDateValue(dateValue) || new Date();
}

var buildReplayDateTime = function(dateValue, totalSeconds) {
    const baseDate = getReplayBaseDate(dateValue);
    const targetDate = new Date(baseDate.getTime() + totalSeconds * 1000);
    return formatLocalDateTime(targetDate);
}

var parseTimeValue = function(value) {
    const match = String(value || "")
        .trim()
        .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        Number.isNaN(seconds) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59 ||
        seconds < 0 ||
        seconds > 59
    ) {
        return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

var normalizeTimeInputValue = function(value, fallback) {
    const raw = String(value || "").trim();
    if (!raw) return fallback;

    const digitsOnly = raw.replace(/\D/g, "");
    if (/^\d{1,2}:\d{2}$/.test(raw)) {
        return raw;
    }

    if (digitsOnly.length === 3) {
        return `0${digitsOnly[0]}:${digitsOnly.slice(1)}`;
    }

    if (digitsOnly.length === 4) {
        return `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2)}`;
    }

    return fallback;
}

var formatClock = function(totalSeconds, includeSeconds = false) {
    const normalized = ((Math.round(totalSeconds) % 86400) + 86400) % 86400;
    const hours = String(Math.floor(normalized / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((normalized % 3600) / 60)).padStart(
        2,
        "0",
    );
    const seconds = String(normalized % 60).padStart(2, "0");

    return includeSeconds
        ? `${hours}:${minutes}:${seconds}`
        : `${hours}:${minutes}`;
}

var timestampToReplaySeconds = function(timestamp, dateValue) {
    const targetDate = parseMysqlDateTimeLocal(timestamp);
    if (!targetDate) return null;

    const baseDate = getReplayBaseDate(dateValue);
    return Math.round((targetDate.getTime() - baseDate.getTime()) / 1000);
}

var buildReplayRangeFromAlarm = function(
    alarmTimestamp,
    beforeSeconds = 30,
    afterSeconds = 60,
) {
    const alarmDate = parseMysqlDateTimeLocal(alarmTimestamp);
    if (!alarmDate) return null;

    const alarmSeconds =
        alarmDate.getHours() * 3600 +
        alarmDate.getMinutes() * 60 +
        alarmDate.getSeconds();
    const startSeconds = Math.max(alarmSeconds - beforeSeconds, 0);
    const endSeconds = Math.min(alarmSeconds + afterSeconds, 86399);

    return {
        dateValue: formatLocalDate(alarmDate),
        startSeconds,
        endSeconds,
        totalSeconds: Math.max(endSeconds - startSeconds, 1),
        alarmSeconds,
    };
}
__r['m5'] = __r['m5'] || {};
__r['m5'].formatLocalDate = formatLocalDate;
__r['m5'].formatLocalDateTime = formatLocalDateTime;
__r['m5'].parseLocalDateValue = parseLocalDateValue;
__r['m5'].parseMysqlDateTimeLocal = parseMysqlDateTimeLocal;
__r['m5'].getReplayBaseDate = getReplayBaseDate;
__r['m5'].buildReplayDateTime = buildReplayDateTime;
__r['m5'].parseTimeValue = parseTimeValue;
__r['m5'].normalizeTimeInputValue = normalizeTimeInputValue;
__r['m5'].formatClock = formatClock;
__r['m5'].timestampToReplaySeconds = timestampToReplaySeconds;
__r['m5'].buildReplayRangeFromAlarm = buildReplayRangeFromAlarm;

// --- _js/radar/replay/core.js ---
var buildReplayDateTime = __r['m5'].buildReplayDateTime, formatLocalDate = __r['m5'].formatLocalDate, parseMysqlDateTimeLocal = __r['m5'].parseMysqlDateTimeLocal;

var TIMELINE_COLORS = {
    primary: "#5867dd",
    success: "#1dc9b7",
    info: "#5578eb",
    warning: "#ffb822",
    danger: "#fd397a",
    secondary: "#74788d",
    purple: "#6f42c1",
};

var getReplayTimelineColorValue = function(color) {
    return TIMELINE_COLORS[color] || TIMELINE_COLORS.secondary;
}

var getVisibleReplaySegments = function(segments = []) {
    return segments.filter((segment) => segment.key !== "unknown");
}

var getReplayFrameAtSeconds = function(frames = [], currentSeconds) {
    if (!frames.length) return null;

    return (
        frames
            .filter((frame) => frame.seconds <= currentSeconds)
            .slice(-1)[0] || frames[0]
    );
}

var getReplaySegmentAtSeconds = function(segments = [], currentSeconds) {
    if (!segments.length) return null;

    return (
        segments.find(
            (segment) =>
                currentSeconds >= segment.start &&
                (currentSeconds < segment.end ||
                    (segment.isLast && currentSeconds <= segment.end)),
        ) || null
    );
}

var getReplayLayoutForSeconds = function({
    layouts = [],
    dateValue,
    currentSeconds,
}) {
    if (!layouts.length) return null;

    const effectiveDate = dateValue || formatLocalDate(new Date());
    const timestamp = buildReplayDateTime(effectiveDate, currentSeconds);
    const currentTime = parseMysqlDateTimeLocal(timestamp)?.getTime() || 0;
    const exact = layouts.find((layout) => {
        const startMs =
            parseMysqlDateTimeLocal(layout.valido_de)?.getTime() || 0;
        const endMs = layout.valido_ate
            ? parseMysqlDateTimeLocal(layout.valido_ate)?.getTime() || null
            : null;

        return (
            startMs <= currentTime && (endMs === null || currentTime < endMs)
        );
    });

    if (exact) return exact;

    const nextKnown = layouts.find((layout) => {
        const startMs =
            parseMysqlDateTimeLocal(layout.valido_de)?.getTime() || 0;
        return startMs > currentTime;
    });

    return nextKnown || layouts[layouts.length - 1];
}
__r['m6'] = __r['m6'] || {};
__r['m6'].getReplayTimelineColorValue = getReplayTimelineColorValue;
__r['m6'].getVisibleReplaySegments = getVisibleReplaySegments;
__r['m6'].getReplayFrameAtSeconds = getReplayFrameAtSeconds;
__r['m6'].getReplaySegmentAtSeconds = getReplaySegmentAtSeconds;
__r['m6'].getReplayLayoutForSeconds = getReplayLayoutForSeconds;

// --- _js/radar/replay/ui.js ---
var renderReplayCurrentPeople = function(elementId, people = []) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const safePeople = Array.isArray(people)
        ? people.filter((person) => Number(person.person_index) !== 88)
        : [];
    const count = safePeople.length;
    const tone =
        count <= 0
            ? "danger"
            : count === 1
              ? "success"
              : count <= 5
                ? "primary"
                : count <= 10
                  ? "warning"
                  : "danger";

    element.innerHTML = `<span class="me-2">${count}</span> ${
        count === 1
            ? translations.i18n["pessoa"]
            : `${translations.i18n["pessoa"]}s`
    }`;
    element.className = "d-flex justify-content-center align-items-center";

    const countEl = element.querySelector("span");
    if (!countEl) return;

    countEl.className = `h4 font-weight-bold mb-0 text-${tone} me-2`;
}

var getReplaySecondsFromClientX = function({ clientX, timelineEl, range }) {
    if (!timelineEl || !range) return range?.startSeconds || 0;

    const timelineRect = timelineEl.getBoundingClientRect();
    const relativeX = Math.min(
        Math.max(clientX - timelineRect.left, 0),
        timelineRect.width,
    );
    const progress =
        timelineRect.width > 0 ? relativeX / timelineRect.width : 0;

    return range.startSeconds + range.totalSeconds * progress;
}

var positionReplayTimelineOverlay = function({
    element,
    progressPercent,
    wrapperEl,
    timelineEl,
    previewTimeEl = null,
}) {
    if (!wrapperEl || !timelineEl || !element) return;

    const timelineRect = timelineEl.getBoundingClientRect();
    const wrapperRect = wrapperEl.getBoundingClientRect();
    const thumbX =
        timelineRect.left -
        wrapperRect.left +
        timelineRect.width *
            (Math.min(Math.max(progressPercent, 0), 100) / 100);
    const thumbY = timelineRect.top - wrapperRect.top + timelineRect.height / 2;

    element.style.left = `${thumbX}px`;

    if (element === previewTimeEl) {
        const timeHeight = element.offsetHeight || 0;
        element.style.top = `${thumbY - timeHeight - 10}px`;
        return;
    }

    const cardHeight = element.offsetHeight || 0;
    const timeHeight = previewTimeEl?.offsetHeight || 0;
    const timeTop = thumbY - timeHeight - 10;
    element.style.top = `${timeTop - cardHeight - 8}px`;
}
__r['m7'] = __r['m7'] || {};
__r['m7'].renderReplayCurrentPeople = renderReplayCurrentPeople;
__r['m7'].getReplaySecondsFromClientX = getReplaySecondsFromClientX;
__r['m7'].positionReplayTimelineOverlay = positionReplayTimelineOverlay;

// --- _js/radar/replay/index.js ---
__r['m8'] = __r['m8'] || {};
for(var k in __r['m5']) __r['m8'][k] = __r['m5'][k];
__r['m8'] = __r['m8'] || {};
for(var k in __r['m6']) __r['m8'][k] = __r['m6'][k];
__r['m8'] = __r['m8'] || {};
for(var k in __r['m7']) __r['m8'][k] = __r['m7'][k];



// --- _js/radar/scene/radar-scene.js ---
var getAreaName = __r['m4'].getAreaName, getAreaColor = __r['m4'].getAreaColor, getPostureStyle = __r['m4'].getPostureStyle, reorderRect = __r['m4'].reorderRect, getBounds = __r['m4'].getBounds, parseRectangle = __r['m4'].parseRectangle;

var createTransform = function(bounds, cw, ch, padding = 30) {
    const scale = Math.min(
        (cw - 2 * padding) / bounds.width,
        (ch - 2 * padding) / bounds.height,
    );

    const offsetX = -bounds.minX;
    const offsetY = -bounds.minY;
    const scaledWidth = bounds.width * scale;
    const scaledHeight = bounds.height * scale;
    const centerOffsetX = (cw - scaledWidth) / 2;
    const centerOffsetY = (ch - scaledHeight) / 2;

    return function (coords) {
        const result = [];
        for (let i = 0; i < coords.length; i += 2) {
            const x = (coords[i] + offsetX) * scale + centerOffsetX;
            const y = ch - ((coords[i + 1] + offsetY) * scale + centerOffsetY);
            result.push(x, y);
        }
        return result;
    };
}

var parseAreas = function(areaStr) {
    if (!areaStr) return [];

    return areaStr
        .split("},")
        .map((area) => area.replace(/[{}]/g, "").trim())
        .filter(Boolean)
        .map((area) => {
            const values = area.split(",").map(Number);
            const key = values[0];
            const type = values[1];
            const coords = [];

            for (let index = 2; index < values.length; index += 2) {
                coords.push(values[index], values[index + 1]);
            }

            return { key, type, coords };
        });
}

var renderPlaceholderMarkup = function(container) {
    container.innerHTML = `<div class="text-center text-muted py-5"><i class="fa fa-map-marked-alt fa-3x mb-3"></i><p>${translations.i18n["mapa_nao_disponivel"]}</p><small>${translations.i18n["configure_layout_monitorizacao"]}</small></div>`;
}

var createPersonNode = function(peopleLayer, x, y, style) {
    const group = new Konva.Group({ x, y });
    const circle = new Konva.Circle({
        radius: 10,
        fill: "#0d6efd22",
        stroke: style.color,
        strokeWidth: 3,
    });
    const icon = new Konva.Text({
        text: style.icon || "\uf129",
        fontFamily: "Font Awesome 5 Pro",
        fontStyle: "900",
        fontSize: 12,
        fill: style.color,
    });

    icon.offsetX(icon.width() / 2);
    icon.offsetY(icon.height() / 2);

    const label = new Konva.Text({
        x: 14,
        y: -8,
        text: style.labelPT || translations.i18n["pessoa_label"],
        fontSize: 12,
        fontFamily: "Poppins",
        fontStyle: "bold",
        fill: style.color,
    });

    group.circle = circle;
    group.icon = icon;
    group.label = label;
    group.moveTween = null;

    group.add(circle, icon, label);
    peopleLayer.add(group);

    return group;
}

var drawTrail = function(state) {
    if (!state.showTrail || !state.trailLayer || !state.transformCoords) return;

    state.trailLayer.destroyChildren();

    if (!Array.isArray(state.currentTrail) || state.currentTrail.length < 2) {
        state.trailLayer.batchDraw();
        return;
    }

    const transformedPoints = [];

    state.currentTrail.forEach((point) => {
        const coords = state.transformCoords([
            point.x_position_dm,
            point.y_position_dm,
        ]);
        transformedPoints.push(coords[0], coords[1]);
    });

    if (transformedPoints.length < 4) {
        state.trailLayer.batchDraw();
        return;
    }

    const options = state.currentTrailOptions || {};
    const stroke = options.stroke || "#fd397a";
    const strokeWidth = options.strokeWidth || 4;
    const opacity = options.opacity || 0.9;
    const dash = Array.isArray(options.dash) ? options.dash : [6, 6];
    const showEndpoint = options.showEndpoint !== false;
    const lastPoint = transformedPoints.slice(-2);

    state.trailLayer.add(
        new Konva.Line({
            points: transformedPoints,
            stroke,
            strokeWidth,
            lineCap: "round",
            lineJoin: "round",
            dash,
            opacity,
        }),
    );

    if (showEndpoint) {
        state.trailLayer.add(
            new Konva.Circle({
                x: lastPoint[0],
                y: lastPoint[1],
                radius: 6,
                fill: stroke,
                opacity,
            }),
        );
    }

    state.trailLayer.batchDraw();
}

var emitPeopleCount = function(state) {
    if (typeof state.onPeopleCountChange !== "function") return;

    state.onPeopleCountChange(state.currentPeople.length, state.currentPeople);
}

var clearPeopleNodes = function(state) {
    state.peopleNodes.forEach((node) => {
        if (node.moveTween) node.moveTween.destroy();
        node.destroy();
    });

    state.peopleNodes.clear();
}

var syncPeople = function(state) {
    if (!state.stage || !state.peopleLayer || !state.transformCoords) return;

    const active = new Set();

    state.currentPeople.forEach((person) => {
        const coords = state.transformCoords([
            person.x_position_dm,
            person.y_position_dm,
        ]);
        const style = getPostureStyle(person.posture_state);

        let node = state.peopleNodes.get(person.person_index);
        active.add(person.person_index);

        if (!node) {
            node = createPersonNode(state.peopleLayer, coords[0], coords[1], style);
            state.peopleNodes.set(person.person_index, node);
        }

        node.circle.stroke(style.color);
        node.icon.text(style.icon);
        node.icon.fill(style.color);
        node.icon.offsetX(node.icon.width() / 2);
        node.icon.offsetY(node.icon.height() / 2);
        node.label.text(style.labelPT);
        node.label.fill(style.color);

        if (node.moveTween) node.moveTween.destroy();
        node.moveTween = new Konva.Tween({
            node,
            x: coords[0],
            y: coords[1],
            duration: 0.15,
            easing: Konva.Easings.Linear,
        });
        node.moveTween.play();
    });

    state.peopleNodes.forEach((node, index) => {
        if (!active.has(index)) {
            if (node.moveTween) node.moveTween.destroy();
            node.destroy();
            state.peopleNodes.delete(index);
        }
    });

    emitPeopleCount(state);
    state.peopleLayer.batchDraw();
}

var drawRoom = function(state, rectangle, declareArea, data) {
    if (!state.stage || !state.layer) return;

    const rect = reorderRect(parseRectangle(rectangle));
    const bounds = getBounds(rect);
    const cw = state.stage.width();
    const ch = state.stage.height();

    state.transformCoords = createTransform(bounds, cw, ch);

    state.layer.add(
        new Konva.Line({
            points: state.transformCoords(rect),
            stroke: "gray",
            strokeWidth: 3,
            closed: true,
        }),
    );

    parseAreas(declareArea).forEach((area) => {
        const color = getAreaColor(area.type);
        const coords = reorderRect(area.coords);
        const points = state.transformCoords(coords);
        const labelX =
            (Math.min(...coords.filter((_, index) => index % 2 === 0)) +
                Math.max(...coords.filter((_, index) => index % 2 === 0))) /
            2;
        const labelY =
            (Math.min(...coords.filter((_, index) => index % 2 === 1)) +
                Math.max(...coords.filter((_, index) => index % 2 === 1))) /
            2;
        const labelPos = state.transformCoords([labelX, labelY]);
        const areaName = getAreaName(data, area.key, area.type);

        state.layer.add(
            new Konva.Line({
                points,
                stroke: color,
                strokeWidth: 2.5,
                dash: [10, 10],
                fill: `${color}22`,
                closed: true,
            }),
        );

        state.layer.add(
            new Konva.Text({
                x: labelPos[0] - 60,
                y: labelPos[1] - 10,
                width: 120,
                align: "center",
                text: areaName,
                fontSize: 14,
                fontFamily: "Poppins",
                fill: color,
                shadowColor: "white",
                shadowBlur: 5,
            }),
        );
    });

    const radarPos = state.transformCoords([0, 0]);
    const radarIcon = new Konva.Text({
        text: "\uf8dd",
        fontFamily: "Font Awesome 5 Pro",
        fontStyle: "900",
        fontSize: 18,
        fill: "#20c997",
    });

    radarIcon.offsetX(radarIcon.width() / 2);
    radarIcon.offsetY(radarIcon.height() / 2);
    radarIcon.position({ x: radarPos[0], y: radarPos[1] });

    state.layer.add(radarIcon);
    state.layer.add(
        new Konva.Text({
            x: radarPos[0] - 20,
            y: radarPos[1] + 12,
            text: translations.i18n["radar"],
            fontSize: 11,
            fontFamily: "Poppins",
            fill: "#20c997",
            fontStyle: "bold",
            align: "center",
            width: 40,
        }),
    );

    state.layer.draw();
}

var createRadarScene = function(options = {}) {
    const state = {
        stage: null,
        layer: null,
        trailLayer: null,
        peopleLayer: null,
        transformCoords: null,
        currentLayout: null,
        currentPeople: [],
        currentTrail: [],
        currentTrailOptions: {},
        peopleNodes: new Map(),
        showTrail: options.showTrail === true,
        clearSentinelPersonIndex:
            options.clearSentinelPersonIndex === undefined
                ? 88
                : options.clearSentinelPersonIndex,
        onPeopleCountChange:
            typeof options.onPeopleCountChange === "function"
                ? options.onPeopleCountChange
                : null,
    };

    function init(container) {
        if (state.stage) state.stage.destroy();
        state.peopleNodes.clear();
        state.transformCoords = null;

        if (container.offsetHeight === 0) {
            container.style.height = "400px";
        }

        state.stage = new Konva.Stage({
            container: container.id,
            width: container.offsetWidth,
            height: container.offsetHeight,
        });
        state.layer = new Konva.Layer();
        state.peopleLayer = new Konva.Layer();
        state.stage.add(state.layer);

        if (state.showTrail) {
            state.trailLayer = new Konva.Layer();
            state.stage.add(state.trailLayer);
        } else {
            state.trailLayer = null;
        }

        state.stage.add(state.peopleLayer);
    }

    function renderRoom(rectangle, declareArea, data) {
        if (!state.stage) return;

        state.currentLayout = { rectangle, declare_area: declareArea, data };
        state.layer.destroyChildren();
        if (state.trailLayer) state.trailLayer.destroyChildren();
        if (state.peopleLayer) clearPeopleNodes(state);

        drawRoom(state, rectangle, declareArea, data);
        drawTrail(state);
        syncPeople(state);
    }

    function updatePeople(people) {
        const nextPeople = Array.isArray(people) ? people.slice() : [];
        const shouldClear =
            nextPeople.length === 1 &&
            Number(nextPeople[0]?.person_index) ===
                Number(state.clearSentinelPersonIndex);

        state.currentPeople = shouldClear ? [] : nextPeople;

        if (!state.transformCoords) return;

        if (!state.currentPeople.length) {
            clearPeopleNodes(state);
            emitPeopleCount(state);
            state.peopleLayer?.batchDraw();
            return;
        }

        syncPeople(state);
    }

    function clearPeople() {
        state.currentPeople = [];
        clearPeopleNodes(state);
        emitPeopleCount(state);
        state.peopleLayer?.batchDraw();
    }

    function setTrail(points, trailOptions = {}) {
        if (!state.showTrail) return;

        state.currentTrail = Array.isArray(points) ? points.slice() : [];
        state.currentTrailOptions = trailOptions;

        if (!state.transformCoords) return;

        drawTrail(state);
    }

    function clearTrail() {
        if (!state.showTrail || !state.trailLayer) return;

        state.currentTrail = [];
        state.currentTrailOptions = {};
        state.trailLayer.destroyChildren();
        state.trailLayer.batchDraw();
    }

    function destroy() {
        clearPeopleNodes(state);

        if (state.stage) {
            state.stage.destroy();
        }

        state.stage = null;
        state.layer = null;
        state.trailLayer = null;
        state.peopleLayer = null;
        state.transformCoords = null;
        state.currentLayout = null;
        state.currentPeople = [];
        state.currentTrail = [];
        state.currentTrailOptions = {};
        emitPeopleCount(state);
    }

    function resize(container) {
        if (!state.stage || !container) return;

        state.stage.width(container.offsetWidth);
        state.stage.height(container.offsetHeight);

        if (!state.currentLayout) return;

        renderRoom(
            state.currentLayout.rectangle,
            state.currentLayout.declare_area,
            state.currentLayout.data,
        );
    }

    function renderPlaceholder(container) {
        renderPlaceholderMarkup(container);
    }

    return {
        init,
        renderRoom,
        updatePeople,
        clearPeople,
        setTrail,
        clearTrail,
        destroy,
        resize,
        renderPlaceholder,
    };
}
__r['m9'] = __r['m9'] || {};
__r['m9'].createRadarScene = createRadarScene;

// --- _js/radar/scene/live-map.js ---
var createRadarScene = __r['m9'].createRadarScene;
// radar-map.js - Map rendering for radar positions using Konva.js


var scene = createRadarScene({
    onPeopleCountChange(count) {
        updateCurrentPeople(count);
    },
});

var init = function(container) {
    scene.init(container);
}

var renderRoom = function(rectangle, declare_area, data) {
    scene.renderRoom(rectangle, declare_area, data);
}

var updatePeople = function(people) {
    scene.updatePeople(people);
}

var updateCurrentPeople = function(count) {
    const el = document.getElementById("current-people");
    if (!el) return;

    el.innerHTML = `<span id="people-count" class="me-2">${count}</span> ${
        count === 1
            ? translations.i18n["pessoa"]
            : `${translations.i18n["pessoa"]}s`
    }`;
    el.className = "d-flex justify-content-center align-items-center";

    const countEl = document.getElementById("people-count");
    if (!countEl) return;
    countEl.className = "";

    const colorClasses = [
        { max: 0, class: "danger" },
        { max: 1, class: "success" },
        { max: 5, class: "primary" },
        { max: 10, class: "warning" },
        { max: Infinity, class: "danger" },
    ];

    const colorClass =
        colorClasses.find((c) => count <= c.max)?.class || "secondary";
    countEl.className = `h4 font-weight-bold mb-0 text-${colorClass} me-2`;
}

var destroy = function() {
    scene.destroy();
}

var resize = function(container) {
    scene.resize(container);
}

var renderPlaceholder = function(container) {
    scene.renderPlaceholder(container);
}
__r['m10'] = __r['m10'] || {};
__r['m10'].init = init;
__r['m10'].renderRoom = renderRoom;
__r['m10'].updatePeople = updatePeople;
__r['m10'].destroy = destroy;
__r['m10'].resize = resize;
__r['m10'].renderPlaceholder = renderPlaceholder;

// --- _js/radar/scene/playback-map.js ---
var createRadarScene = __r['m9'].createRadarScene;

var scene = createRadarScene({ showTrail: true });

var init = function(container) {
    scene.init(container);
}

var renderRoom = function(rectangle, declare_area, data) {
    scene.renderRoom(rectangle, declare_area, data);
}

var updatePeople = function(people) {
    scene.updatePeople(people);
}

var setTrail = function(points, options = {}) {
    scene.setTrail(points, options);
}

var clearPeople = function() {
    scene.clearPeople();
}

var clearTrail = function() {
    scene.clearTrail();
}

var destroy = function() {
    scene.destroy();
}

var resize = function(container) {
    scene.resize(container);
}

var renderPlaceholder = function(container) {
    scene.renderPlaceholder(container);
}
__r['m11'] = __r['m11'] || {};
__r['m11'].init = init;
__r['m11'].renderRoom = renderRoom;
__r['m11'].updatePeople = updatePeople;
__r['m11'].setTrail = setTrail;
__r['m11'].clearPeople = clearPeople;
__r['m11'].clearTrail = clearTrail;
__r['m11'].destroy = destroy;
__r['m11'].resize = resize;
__r['m11'].renderPlaceholder = renderPlaceholder;

// --- _js/radar/scene/index.js ---
__r['m12'] = __r['m12'] || {};
__r['m12'].liveMap = __r['m10'];
__r['m12'] = __r['m12'] || {};
__r['m12'].playbackMap = __r['m11'];
__r['m12'] = __r['m12'] || {};
__r['m12'].createRadarScene = __r['m9'].createRadarScene;



// --- _js/radar/utils.js ---
var coreRemoveLoading = __r['m0'].removeLoading, coreRenderLoading = __r['m0'].renderLoading, coreLoadScript = __r['m0'].loadScript;

var animateNumber = function({
    from = 0,
    to = 0,
    duration = 400,
    onUpdate = () => {},
    onComplete = null,
}) {
    const startValue = Number(from) || 0;
    const endValue = Number(to) || 0;
    const safeDuration = Math.max(0, Number(duration) || 0);

    if (safeDuration === 0 || startValue === endValue) {
        onUpdate(endValue);
        if (typeof onComplete === "function") onComplete(endValue);
        return;
    }

    const startedAt = performance.now();
    const delta = endValue - startValue;

    const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / safeDuration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = startValue + delta * eased;
        onUpdate(value);

        if (progress < 1) {
            requestAnimationFrame(tick);
            return;
        }

        if (typeof onComplete === "function") onComplete(endValue);
    };

    requestAnimationFrame(tick);
}

var ensureNestedModalBackdrop = function(_modalEl, currentBackdropEl) {
    if (currentBackdropEl?.isConnected) return currentBackdropEl;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop fade show nested-modal-backdrop";
    backdrop.style.zIndex = "1055";
    document.body.appendChild(backdrop);
    return backdrop;
}

var removeNestedModalBackdrop = function(_modalEl, backdropEl) {
    if (backdropEl?.isConnected) backdropEl.remove();
}

var restoreParentModalScrollState = function(parentModalId) {
    const parentModal = parentModalId
        ? document.getElementById(parentModalId)
        : null;
    const hasOpenParent = !!parentModal?.classList.contains("show");

    if (hasOpenParent) {
        document.body.classList.add("modal-open");
        return;
    }

    const hasOpenModals = document.querySelector(".modal.show") !== null;
    document.body.classList.toggle("modal-open", hasOpenModals);
}

var renderLoading = function(container) {
    coreRenderLoading(container);
}

var removeLoading = function(container) {
    coreRemoveLoading(container);
}

var loadScript = function(url) {
    return coreLoadScript(url);
}
__r['m13'] = __r['m13'] || {};
__r['m13'].animateNumber = animateNumber;
__r['m13'].ensureNestedModalBackdrop = ensureNestedModalBackdrop;
__r['m13'].removeNestedModalBackdrop = removeNestedModalBackdrop;
__r['m13'].restoreParentModalScrollState = restoreParentModalScrollState;
__r['m13'].renderLoading = renderLoading;
__r['m13'].removeLoading = removeLoading;
__r['m13'].loadScript = loadScript;

// --- _js/utils.js ---
__r['m14'] = __r['m14'] || {};
__r['m14'].animateNumber = __r['m13'].animateNumber;
__r['m14'] = __r['m14'] || {};
__r['m14'].ensureNestedModalBackdrop = __r['m13'].ensureNestedModalBackdrop;
__r['m14'] = __r['m14'] || {};
__r['m14'].loadScript = __r['m13'].loadScript;
__r['m14'] = __r['m14'] || {};
__r['m14'].removeLoading = __r['m13'].removeLoading;
__r['m14'] = __r['m14'] || {};
__r['m14'].removeNestedModalBackdrop = __r['m13'].removeNestedModalBackdrop;
__r['m14'] = __r['m14'] || {};
__r['m14'].renderLoading = __r['m13'].renderLoading;
__r['m14'] = __r['m14'] || {};
__r['m14'].restoreParentModalScrollState = __r['m13'].restoreParentModalScrollState;

// --- _js/radar/live/info-panel.js ---
var parseMysqlDateTimeLocal = __r['m5'].parseMysqlDateTimeLocal;

// radar-info.js - Vitals rendering with charts

var formatValue = function(val) {
    return val === undefined || val === null || val === "" ? "—" : val;
}

var getWorkingMode = function(mode) {
    const modes = {
        15: translations.i18n["monitorizacao_de_cama"],
        11: translations.i18n["respiracao_e_sono"],
        7: translations.i18n["monitorizacao_de_queda"],
        3: translations.i18n["rastreamento_de_pessoas"],
    };
    return modes[mode] || "-";
}

var getSignalStrength = function(val) {
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

var parsePostureParams = function(str) {
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

var parseHeartBreath = function(str) {
    if (!str) return null;
    const vals = str
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((v) => Number(v.trim()) & 0xff);
    return vals.length >= 7 ? vals : null;
}

var renderRadarInfo = function(container, data) {
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

var sleepStateMap = {
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

var updateSleepStateDisplay = function(
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

var createMetricState = function() {
    return {
        chart: null,
        series: null,
        xAxis: null,
        root: null,
        data: [],
        stats: { min: null, max: null, sum: 0, count: 0 },
    };
}

var createPanelState = function() {
    return {
        heart: createMetricState(),
        breath: createMetricState(),
        lastRenderKey: "",
    };
}

var PANEL_CONFIGS = {
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

var livePanelState = createPanelState();
var playbackPanelState = createPanelState();
var VITALS_VISIBLE_WINDOW_MS = 60 * 60 * 1000;
var VITALS_MINUTE_LABEL_SPAN_MS = 20 * 60 * 1000;
var PLAYBACK_DEFAULT_VITALS_FRESHNESS_SECONDS = 75;
var PLAYBACK_MIN_VITALS_FRESHNESS_SECONDS = 15;
var PLAYBACK_MAX_VITALS_FRESHNESS_SECONDS = 90;

var getVitalsTime = function(vitals) {
    const eventTime = parseMysqlDateTimeLocal(vitals?.created_at);
    return eventTime ? eventTime.getTime() : new Date().getTime();
}

var createChart = function(containerId, color, minY = 0, maxY = 100) {
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

var calculateStats = function(data, stats) {
    if (data.length === 0) return stats;
    const values = data.map((d) => d.value).filter((v) => v > 0);
    if (values.length === 0) return stats;
    stats.min = Math.min.apply(Math, values);
    stats.max = Math.max.apply(Math, values);
    stats.sum = values.reduce((a, b) => a + b, 0);
    stats.count = values.length;
    return stats;
}

var TREND_ICONS = {
    flat: '<i class="fa fa-minus text-muted"></i>',
    up: '<i class="fa fa-arrow-up text-success"></i>',
    down: '<i class="fa fa-arrow-down text-danger"></i>',
};

var getTrendIcon = function(data) {
    if (data.length < 2) return TREND_ICONS.flat;
    const last = data[data.length - 1].value;
    const prev = data[data.length - 2].value;
    const diff = last - prev;
    if (Math.abs(diff) < 2) return TREND_ICONS.flat;
    return diff > 0 ? TREND_ICONS.up : TREND_ICONS.down;
}

var getTimeSpanMs = function(data) {
    if (!Array.isArray(data) || data.length < 2) return 0;

    const firstTime = Number(data[0]?.time);
    const lastTime = Number(data[data.length - 1]?.time);

    if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime)) return 0;

    return Math.max(lastTime - firstTime, 0);
}

var getVitalsWindowData = function(data, windowEndTime = null) {
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

var getVitalsGridDistance = function(container, visibleSpanMs) {
    const width = container?.clientWidth || container?.offsetWidth || 420;

    if (width < 360) return 110;
    if (width < 520) return 90;
    if (visibleSpanMs >= VITALS_MINUTE_LABEL_SPAN_MS) return 85;
    return 70;
}

var updateVitalsXAxis = function(xAxis, container, visibleData) {
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

var getPlaybackChartPointLimit = function(container) {
    const width = container?.clientWidth || container?.offsetWidth || 420;
    const estimatedMajorTicks = Math.max(Math.round(width / 70), 4);
    return Math.max(estimatedMajorTicks * 4, 16);
}

var downsamplePlaybackSeries = function(data, maxPoints) {
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

var getPlaybackVitalsFreshnessSeconds = function(vitalsTimeline) {
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

var hasFreshPlaybackVitals = function(currentVitals, currentSeconds, vitalsTimeline) {
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

var getPlaybackWindowEndTime = function(currentVitals, currentSeconds) {
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

var ensureMetricChart = function(metricState, metricConfig) {
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

var ensurePanelCharts = function(panelState, panelConfig) {
    return (
        ensureMetricChart(panelState.heart, panelConfig.heart) &&
        ensureMetricChart(panelState.breath, panelConfig.breath)
    );
}

var updateMetricSummary = function(prefix, stats, currentValue, trendHtml) {
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

var resetMetricSummary = function(prefix) {
    ["-value", "-min", "-avg", "-max"].forEach((suffix) => {
        const el = document.getElementById(`${prefix}${suffix}`);
        if (el) el.textContent = "--";
    });

    const trendEl = document.getElementById(`${prefix}-trend`);
    if (trendEl) {
        trendEl.innerHTML = '<i class="fa fa-minus text-muted"></i>';
    }
}

var resetMetricChart = function(metricState, metricConfig) {
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

var resetPanel = function(panelState, panelConfig) {
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

var renderVitals = function(uid, vitals) {
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

var renderPlaybackVitals = function(
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

var resetPlaybackVitals = function() {
    resetPanel(playbackPanelState, PANEL_CONFIGS.playback);
}

var reset = function() {
    resetPanel(livePanelState, PANEL_CONFIGS.live);
    resetPlaybackVitals();
}
__r['m15'] = __r['m15'] || {};
__r['m15'].renderRadarInfo = renderRadarInfo;
__r['m15'].renderVitals = renderVitals;
__r['m15'].renderPlaybackVitals = renderPlaybackVitals;
__r['m15'].resetPlaybackVitals = resetPlaybackVitals;
__r['m15'].reset = reset;

// --- _js/radar/live/modal-controller.js ---
var info = __r['m15'];
var grid = __r['m4'].grid, setLayoutCache = __r['m4'].setLayoutCache;
var map = __r['m12'].liveMap;
var removeLoading = __r['m14'].removeLoading, renderLoading = __r['m14'].renderLoading, loadScript = __r['m14'].loadScript;



var state = {
    modal: null,
    mapContainer: null,
    currentUID: null,
    requestToken: 0,
    isLayoutSyncing: false,
};

var updateModalTitle = function(title) {
    const titleEl = state.modal?.querySelector(".modal-title");
    if (titleEl) titleEl.textContent = title;
}

var getEventsCard = function() {
    return document.getElementById("liveRadarEvents");
}

var initMapWithData = function(layoutData) {
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

var showPlaceholder = function() {
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

var getRefreshLayoutButton = function() {
    return document.getElementById("refresh-live-layout-btn");
}

var setRefreshLayoutButtonLoading = function(isLoading) {
    const button = getRefreshLayoutButton();
    if (!button) return;

    button.disabled = isLoading;
}

var syncAndRetry = async function(uid, requestToken) {
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

var fetchMapData = async function(uid) {
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

var init = function({ modal, mapContainer }) {
    state.modal = modal;
    state.mapContainer = mapContainer;

    getRefreshLayoutButton()?.addEventListener("click", () => {
        refreshCurrentLayout();
    });
}

var refreshCurrentLayout = async function() {
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

var handleModalShown = async function({ uid, name }) {
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

    // Lazy-load Konva + AMCharts (not needed on page load, only when modal opens)
    await Promise.all([
        loadScript('https://unpkg.com/konva@9/konva.min.js'),
        loadScript('https://cdn.amcharts.com/lib/5/index.js'),
    ]);
    await Promise.all([
        loadScript('https://cdn.amcharts.com/lib/5/xy.js'),
        loadScript('https://cdn.amcharts.com/lib/5/percent.js'),
        loadScript('https://cdn.amcharts.com/lib/5/themes/Animated.js'),
    ]);

    await fetchMapData(uid);
}

var handleModalHidden = function() {
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

var handleTabShown = function(targetId) {
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

var resize = function() {
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

var onPosition = function(deviceCode, people) {
    if (state.currentUID === deviceCode && state.mapContainer) {
        map.updatePeople(people);
    }
}

var onVitals = function(deviceCode, vitals) {
    if (state.currentUID === deviceCode) {
        info.renderVitals(deviceCode, vitals);
    }
}
__r['m16'] = __r['m16'] || {};
__r['m16'].init = init;
__r['m16'].refreshCurrentLayout = refreshCurrentLayout;
__r['m16'].handleModalShown = handleModalShown;
__r['m16'].handleModalHidden = handleModalHidden;
__r['m16'].handleTabShown = handleTabShown;
__r['m16'].resize = resize;
__r['m16'].onPosition = onPosition;
__r['m16'].onVitals = onVitals;

// --- _js/radar/live/page-updater.js ---
var BED_POSTURES = __r['m4'].BED_POSTURES, getLayoutCache = __r['m4'].getLayoutCache;

var lastMonthFalls = 0;
var totalBedSlots = null;
var lastGlobalKpis = null;

var devicePeopleState = new Map();
var roomActiveDevices = new Map();
var roomMetrics = new Map();
var bedRegionsCache = new Map();
var deviceMetaCache = new Map();
var roomViewCache = new Map();

var pendingDeviceUpdates = new Map();
var flushScheduled = false;

var formatQuantity = function(total, singularKey) {
    const key = total === 1 ? singularKey : singularKey + "s";
    return `${total} ${String(translations.i18n[key]).toLowerCase()}`;
}

var rebuildDeviceMetaCache = function() {
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

var getDeviceMeta = function(deviceCode) {
    const cached = deviceMetaCache.get(deviceCode);
    if (cached) return cached;

    rebuildDeviceMetaCache();
    return deviceMetaCache.get(deviceCode) || null;
}

var getRoomView = function(roomId) {
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

var getTotalBedSlots = function() {
    if (totalBedSlots !== null) return totalBedSlots;
    totalBedSlots = document.querySelectorAll(".item-radar .item-cama").length;
    return totalBedSlots;
}

var parseAreasToBedRegions = function(declareAreaStr) {
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

var getBedRegionsForDevice = function(deviceCode) {
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

var toggleBedIcon = function(bedItem, hasPersonInBed) {
    const bedIcon = bedItem.querySelector(".estado-na-cama");
    if (!bedIcon) return;

    bedIcon.classList.toggle("text-success", hasPersonInBed);
    bedIcon.classList.toggle("fw-bold", hasPersonInBed);
    bedIcon.classList.toggle("opacity-25", !hasPersonInBed);
}

var addRoomActiveDevice = function(roomId, deviceCode) {
    let roomSet = roomActiveDevices.get(roomId);
    if (!roomSet) {
        roomSet = new Set();
        roomActiveDevices.set(roomId, roomSet);
    }
    roomSet.add(deviceCode);
}

var removeRoomActiveDevice = function(roomId, deviceCode) {
    const roomSet = roomActiveDevices.get(roomId);
    if (!roomSet) return;

    roomSet.delete(deviceCode);
    if (roomSet.size === 0) {
        roomActiveDevices.delete(roomId);
    }
}

var setCounterState = function(counterEl, parentEl, count) {
    if (!counterEl) return;

    counterEl.textContent = String(count);
    parentEl?.classList.toggle("text-success", count > 0);
    parentEl?.classList.toggle("fw-bold", count > 0);
}

var renderRoomState = function(roomId) {
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

var updateGlobalKPIs = function() {
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

var flushPendingPositions = function() {
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

var schedulePositionFlush = function() {
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

var onPosition = function(deviceCode, people = []) {
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

var onAlarm = function(alarm) {
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

var onPollComplete = function(currentMonthFalls) {
    if (currentMonthFalls === null || currentMonthFalls === undefined) return;
    if (currentMonthFalls === lastMonthFalls) return;

    lastMonthFalls = currentMonthFalls;
    $("#indicador-alertas-queda-mes").text(
        formatQuantity(currentMonthFalls, "alerta"),
    );
}

var onOnlineDevices = function(onlineDevices = []) {
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
__r['m17'] = __r['m17'] || {};
__r['m17'].onPosition = onPosition;
__r['m17'].onAlarm = onAlarm;
__r['m17'].onPollComplete = onPollComplete;
__r['m17'].onOnlineDevices = onOnlineDevices;

// --- _js/radar/live/index.js ---
__r['m18'] = __r['m18'] || {};
__r['m18'].infoPanel = __r['m15'];
__r['m18'] = __r['m18'] || {};
__r['m18'].modalController = __r['m16'];
__r['m18'] = __r['m18'] || {};
__r['m18'].pageUpdater = __r['m17'];



// --- _js/radar/playback/category-renderer.js ---
var PLAYBACK_FALL_SVG_PATH =
    "M288 64C305.7 64 320 78.3 320 96L320 101.4C320 156.6 296.3 208.4 256.1 244.5L319 320L408 320C423.1 320 437.3 327.1 446.4 339.2L489.6 396.8C500.2 410.9 497.3 431 483.2 441.6C469.1 452.2 449 449.3 438.4 435.2L400 384L295.2 384L408.8 523.8C419.9 537.5 417.9 557.7 404.1 568.8C390.3 579.9 370.2 577.9 359.1 564.1L169.4 330.6C163.3 345.6 160 361.9 160 378.6L160 448C160 465.7 145.7 480 128 480C110.3 480 96 465.7 96 448L96 378.6C96 311.2 131.4 248.7 189.2 214L193.8 211.2C232.4 188 256 146.4 256 101.4L256 96C256 78.3 270.3 64 288 64zM48 152C48 121.1 73.1 96 104 96C134.9 96 160 121.1 160 152C160 182.9 134.9 208 104 208C73.1 208 48 182.9 48 152zM424 144.1C424 157.4 413.3 168.1 400 168.1C386.7 168.1 376 157.4 376 144.1L376 96.1C376 82.8 386.7 72.1 400 72.1C413.3 72.1 424 82.8 424 96.1L424 144.1zM528 296.1C514.7 296.1 504 285.4 504 272.1C504 258.8 514.7 248.1 528 248.1L576 248.1C589.3 248.1 600 258.8 600 272.1C600 285.4 589.3 296.1 576 296.1L528 296.1zM473.5 198.6C464.1 189.2 464.1 174 473.5 164.7L507.4 130.8C516.8 121.4 532 121.4 541.3 130.8C550.6 140.2 550.7 155.4 541.3 164.7L507.4 198.6C498 208 482.8 208 473.5 198.6z";

var CATEGORY_APPEARANCE = {
    fall_confirmed: {
        label: "Queda confirmada",
        color: "danger",
        iconType: "svg",
        icon: "fall-confirmed",
        badgeClass: "badge-danger text-white",
    },
    suspected_fall: {
        label: "Queda suspeita",
        color: "warning",
        iconType: "fa",
        icon: "fa-exclamation-triangle",
        badgeClass: "badge-warning text-dark",
    },
    on_floor: {
        label: "No chão",
        color: "warning",
        iconType: "fa",
        icon: "fa-user-injured",
        badgeClass: "badge-warning text-white",
    },
    in_bed_resting: {
        label: "Repouso na cama",
        color: "purple",
        iconType: "fa",
        icon: "fa-bed",
        badgeClass: "badge-light text-purple border-purple",
    },
    movement: {
        label: "Deslocação",
        color: "success",
        iconType: "fa",
        icon: "fa-walking",
        badgeClass: "badge-success text-white",
    },
    standing: {
        label: "Em pé",
        color: "success",
        iconType: "fa",
        icon: "fa-user",
        badgeClass: "badge-success text-white",
    },
    room_transition: {
        label: "Transição na sala",
        color: "info",
        iconType: "fa",
        icon: "fa-sign-in-alt",
        badgeClass: "badge-info text-white",
    },
    area_transition: {
        label: "Transição de região",
        color: "info",
        iconType: "fa",
        icon: "fa-random",
        badgeClass: "badge-info text-white",
    },
    heart_alert: {
        label: "Alerta cardíaco",
        color: "danger",
        iconType: "fa",
        icon: "fa-heartbeat",
        badgeClass: "badge-danger text-white",
    },
    breathing_alert: {
        label: "Alerta respiratório",
        color: "warning",
        iconType: "fa",
        icon: "fa-lungs",
        badgeClass: "badge-warning text-dark",
    },
    apnea: {
        label: "Apneia",
        color: "danger",
        iconType: "fa",
        icon: "fa-lungs",
        badgeClass: "badge-danger text-white",
    },
    vitals_signal_lost: {
        label: "Sem leitura vital",
        color: "warning",
        iconType: "fa",
        icon: "fa-heartbeat",
        badgeClass: "badge-warning text-dark",
    },
    unknown: {
        label: "Sem dados",
        color: "secondary",
        iconType: "fa",
        icon: "fa-question-circle",
        badgeClass: "badge-light text-muted",
    },
};

var getPlaybackCategoryPresentation = function(category) {
    const appearance =
        CATEGORY_APPEARANCE[category?.key] || CATEGORY_APPEARANCE.unknown;

    return {
        ...appearance,
        key: category?.key || "unknown",
        label: category?.label || appearance.label,
        bgClass: `bg-${appearance.color}-10`,
        textClass: `text-${appearance.color}`,
        borderClass: `border-${appearance.color}`,
    };
}

var getPlaybackIconMarkup = function(presentation, sizeClass = "fa-4x") {
    if (
        presentation.iconType === "svg" &&
        presentation.icon === "fall-confirmed"
    ) {
        return `
            <svg viewBox="0 0 640 640" class="w-100 h-100" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="${PLAYBACK_FALL_SVG_PATH}"></path>
            </svg>
        `;
    }

    return `<i class="fa ${presentation.icon} pr-0 ${sizeClass}"></i>`;
}

var createPlaybackCategoryPreviewMarkup = function(segment) {
    const presentation = getPlaybackCategoryPresentation(segment);

    return `
        <div class="border rounded shadow-sm bg-white overflow-hidden">
            <div class="position-relative ${presentation.bgClass} ${presentation.textClass} px-3 py-3 overflow-hidden">
                <span class="position-absolute ${presentation.textClass}" style="left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.14; line-height: 1; width: 3.5rem; height: 3.5rem;">
                    ${getPlaybackIconMarkup(presentation, "fa-3x")}
                </span>
                <div class="position-relative" style="padding-left: 3.75rem;">
                    <div class="font-weight-bold small mb-1">${segment.timeLabel}</div>
                    <div class="font-weight-medium">${presentation.label}</div>
                </div>
            </div>
        </div>
    `;
}
__r['m19'] = __r['m19'] || {};
__r['m19'].getPlaybackCategoryPresentation = getPlaybackCategoryPresentation;
__r['m19'].getPlaybackIconMarkup = getPlaybackIconMarkup;
__r['m19'].createPlaybackCategoryPreviewMarkup = createPlaybackCategoryPreviewMarkup;

// --- _js/radar/playback/domain.js ---
var parseMysqlDateTimeLocal = __r['m8'].parseMysqlDateTimeLocal, timestampToReplaySeconds = __r['m8'].timestampToReplaySeconds;

var resolvePlaybackPostureCategory = function(postureState) {
    switch (postureState) {
        case "Fall Confirmation":
            return {
                key: "fall_confirmed",
                label: "Queda confirmada",
                priority: 80,
            };
        case "Suspected Fall":
            return {
                key: "suspected_fall",
                label: "Queda suspeita",
                priority: 60,
            };
        case "Confirmed Sitting on Ground":
            return {
                key: "on_floor",
                label: "No chão",
                priority: 55,
            };
        case "Walking":
        case "Standing":
        case "Out Bed":
            return {
                key: "movement",
                label: "Deslocação",
                priority: 40,
            };
        case "Lying Down":
        case "Sitting Up Bed":
        case "Suspected Sitting Up Bed":
        case "Confirmed Sitting Up Bed":
        case "In Bed":
            return {
                key: "in_bed_resting",
                label: "Repouso na cama",
                priority: 20,
            };
        default:
            return {
                key: "unknown",
                label: "Sem dados",
                priority: 0,
            };
    }
}

var resolvePlaybackDetectionCategory = function(detection) {
    const type = detection.type;
    const level = detection.level || "";

    if (type === "fall_confirmed") {
        return {
            key: "fall_confirmed",
            label: "Queda confirmada",
            priority: 100,
            markerOnly: false,
        };
    }

    if (type === "apnea") {
        return {
            key: "apnea",
            label: "Apneia",
            priority: 95,
            markerOnly: false,
        };
    }

    if (type === "vitals_signal_lost") {
        return {
            key: "vitals_signal_lost",
            label: "Sem leitura vital",
            priority: 85,
            markerOnly: false,
        };
    }

    if (
        [
            "heart_rate_high",
            "heart_rate_low",
            "heart_rate_high_critical",
            "heart_rate_low_critical",
        ].includes(type)
    ) {
        return {
            key: "heart_alert",
            label: detection.message || "Alerta cardíaco",
            priority: level === "perigo" ? 90 : 70,
            markerOnly: false,
        };
    }

    if (["breathing_high", "breathing_low"].includes(type)) {
        return {
            key: "breathing_alert",
            label: detection.message || "Alerta respiratório",
            priority: level === "perigo" ? 88 : 68,
            markerOnly: false,
        };
    }

    if (["room_entry", "room_exit"].includes(type)) {
        return {
            key: "room_transition",
            label: detection.message || "Transição na sala",
            priority: 50,
            markerOnly: true,
        };
    }

    if (["area_entry", "area_exit"].includes(type)) {
        return {
            key: "area_transition",
            label: detection.message || "Transição de região",
            priority: 45,
            markerOnly: true,
        };
    }

    return null;
}

var groupPlaybackPositionFrames = function(rows, dateValue, range) {
    const grouped = new Map();

    rows.forEach((row) => {
        const seconds = timestampToReplaySeconds(row.timestamp, dateValue);
        if (seconds === null) return;
        if (seconds < range.startSeconds || seconds > range.endSeconds) return;

        const eventId = Number(row.event_id || 0);
        const frameKey = `${seconds}:${eventId}`;

        if (!grouped.has(frameKey)) {
            grouped.set(frameKey, {
                eventId,
                seconds,
                rows: [],
            });
        }

        grouped.get(frameKey).rows.push({
            ...row,
            seconds,
        });
    });

    return Array.from(grouped.values())
        .sort((a, b) => {
            if (a.seconds !== b.seconds) return a.seconds - b.seconds;
            return a.eventId - b.eventId;
        })
        .map((frame) => {
            const shouldClear = frame.rows.some(
                (person) => Number(person.person_index) === 88,
            );
            const people = shouldClear
                ? []
                : frame.rows.filter(
                      (person) => Number(person.person_index) !== 88,
                  );

            let dominant = {
                key: "unknown",
                label: "Sem dados",
                priority: 0,
                personIndex: null,
                regionId: null,
            };

            people.forEach((person) => {
                const candidate = resolvePlaybackPostureCategory(
                    person.posture_state,
                );
                if (candidate.priority >= dominant.priority) {
                    dominant = {
                        ...candidate,
                        personIndex: person.person_index,
                        regionId: person.region_id,
                    };
                }
            });

            return {
                eventId: frame.eventId,
                seconds: frame.seconds,
                people,
                shouldClear,
                dominant,
            };
        });
}

var buildPlaybackPositionFrames = function(positionRows, dateValue, range) {
    return groupPlaybackPositionFrames(positionRows, dateValue, range).map(
        (frame) => ({
            eventId: frame.eventId,
            seconds: frame.seconds,
            people: frame.people,
            shouldClear: frame.shouldClear,
            dominant: frame.dominant,
        }),
    );
}

var buildPlaybackVitalsTimeline = function(vitalsRows, dateValue, range) {
    return vitalsRows
        .map((row) => {
            const time = parseMysqlDateTimeLocal(row.timestamp);
            const seconds = timestampToReplaySeconds(
                row.timestamp,
                dateValue,
            );

            if (!time || seconds === null) return null;
            if (seconds < range.startSeconds || seconds > range.endSeconds) {
                return null;
            }

            return {
                ...row,
                seconds,
                timeMs: time.getTime(),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.seconds - b.seconds);
}

var buildBasePlaybackIntervals = function(positionRows, dateValue, range) {
    const frames = groupPlaybackPositionFrames(positionRows, dateValue, range);

    if (!frames.length) {
        return [
            {
                key: "unknown",
                label: "Sem dados",
                start: range.startSeconds,
                end: range.endSeconds,
                priority: 0,
                source: "fallback",
                personIndex: null,
                regionId: null,
                metadata: {},
            },
        ];
    }

    const intervals = [];

    if (frames[0].seconds > range.startSeconds) {
        intervals.push({
            key: "unknown",
            label: "Sem dados",
            start: range.startSeconds,
            end: frames[0].seconds,
            priority: 0,
            source: "fallback",
            personIndex: null,
            regionId: null,
            metadata: {},
        });
    }

    frames.forEach((frame, index) => {
        const nextSeconds =
            index < frames.length - 1
                ? frames[index + 1].seconds
                : range.endSeconds;
        const start = Math.max(frame.seconds, range.startSeconds);
        const end = Math.min(nextSeconds, range.endSeconds);

        if (end <= start) return;

        intervals.push({
            key: frame.dominant.key,
            label: frame.dominant.label,
            start,
            end,
            priority: frame.dominant.priority,
            source: "posture",
            personIndex: frame.dominant.personIndex,
            regionId: frame.dominant.regionId,
            metadata: {
                people: frame.people,
            },
        });
    });

    return intervals;
}

var findPlaybackIntervalAt = function(intervals, seconds) {
    return (
        intervals.find(
            (interval) =>
                seconds >= interval.start &&
                (seconds < interval.end || seconds === interval.end),
        ) || null
    );
}

var buildDetectionPlaybackIntervals = function(
    detections,
    dateValue,
    range,
    baseIntervals,
) {
    const intervals = [];
    const markers = [];

    detections.forEach((detection) => {
        const seconds = timestampToReplaySeconds(
            detection.timestamp,
            dateValue,
        );
        if (seconds === null) return;
        if (seconds < range.startSeconds || seconds > range.endSeconds) return;

        const normalized = resolvePlaybackDetectionCategory(detection);
        if (!normalized) return;

        markers.push({
            ...normalized,
            timestamp: seconds,
            personIndex: detection.person_index,
            regionId: detection.region_id,
            metadata: {
                type: detection.type,
                level: detection.level,
                message: detection.message,
            },
        });

        if (normalized.markerOnly) return;

        let end = Math.min(seconds + 30, range.endSeconds);

        if (normalized.key === "fall_confirmed") {
            const baseAtDetection = findPlaybackIntervalAt(
                baseIntervals,
                seconds,
            );

            if (
                baseAtDetection &&
                ["fall_confirmed", "on_floor"].includes(baseAtDetection.key)
            ) {
                end = Math.min(baseAtDetection.end, range.endSeconds);
            }
        }

        intervals.push({
            key: normalized.key,
            label: normalized.label,
            start: seconds,
            end,
            priority: normalized.priority,
            source: "detection",
            personIndex: detection.person_index,
            regionId: detection.region_id,
            metadata: {
                type: detection.type,
                level: detection.level,
                message: detection.message,
            },
        });
    });

    return { intervals, markers };
}

var mergePlaybackSegments = function(segments) {
    return segments.reduce((merged, segment) => {
        const lastSegment = merged[merged.length - 1];

        if (
            lastSegment &&
            lastSegment.key === segment.key &&
            lastSegment.label === segment.label &&
            lastSegment.source === segment.source &&
            lastSegment.end === segment.start
        ) {
            lastSegment.end = segment.end;
            lastSegment.isLast = segment.isLast;
            return merged;
        }

        merged.push({ ...segment });
        return merged;
    }, []);
}

var composePlaybackSegments = function(
    baseIntervals,
    detectionIntervals,
    range,
    formatClock,
) {
    const boundaries = new Set([range.startSeconds, range.endSeconds]);

    [...baseIntervals, ...detectionIntervals].forEach((interval) => {
        boundaries.add(Math.max(interval.start, range.startSeconds));
        boundaries.add(Math.min(interval.end, range.endSeconds));
    });

    const orderedBoundaries = Array.from(boundaries)
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b);
    const segments = [];

    for (let index = 0; index < orderedBoundaries.length - 1; index += 1) {
        const start = orderedBoundaries[index];
        const end = orderedBoundaries[index + 1];

        if (end <= start) continue;

        const probe = start + (end - start) / 2;
        const activeDetection = detectionIntervals
            .filter(
                (interval) => probe >= interval.start && probe < interval.end,
            )
            .sort((a, b) => b.priority - a.priority)[0];
        const activeBase = findPlaybackIntervalAt(baseIntervals, probe);
        const active = activeDetection ||
            activeBase || {
                key: "unknown",
                label: "Sem dados",
                priority: 0,
                source: "fallback",
                personIndex: null,
                regionId: null,
                metadata: {},
            };

        segments.push({
            ...active,
            start,
            end,
        });
    }

    const merged = mergePlaybackSegments(segments).filter(
        (segment) => segment.end > segment.start,
    );

    return merged.map((segment, index) => ({
        ...segment,
        isLast: index === merged.length - 1,
        timeLabel: `${formatClock(segment.start)} - ${formatClock(segment.end)}`,
    }));
}

var normalizePlaybackResponse = function(
    data,
    dateValue,
    range,
    formatClock,
) {
    const positions = Array.isArray(data?.positions) ? data.positions : [];
    const detections = Array.isArray(data?.detections) ? data.detections : [];
    const vitals = Array.isArray(data?.vitals) ? data.vitals : [];
    const positionFrames = buildPlaybackPositionFrames(
        positions,
        dateValue,
        range,
    );
    const vitalsTimeline = buildPlaybackVitalsTimeline(
        vitals,
        dateValue,
        range,
    );
    const baseIntervals = buildBasePlaybackIntervals(
        positions,
        dateValue,
        range,
    );
    const detectionData = buildDetectionPlaybackIntervals(
        detections,
        dateValue,
        range,
        baseIntervals,
    );

    return {
        positions,
        detections,
        vitals,
        positionFrames,
        vitalsTimeline,
        baseIntervals,
        markers: detectionData.markers,
        segments: composePlaybackSegments(
            baseIntervals,
            detectionData.intervals,
            range,
            formatClock,
        ),
    };
}
__r['m20'] = __r['m20'] || {};
__r['m20'].normalizePlaybackResponse = normalizePlaybackResponse;

// --- _js/radar/playback/view.js ---
var createPlaybackCategoryPreviewMarkup = __r['m19'].createPlaybackCategoryPreviewMarkup, getPlaybackCategoryPresentation = __r['m19'].getPlaybackCategoryPresentation;
var formatClock = __r['m8'].formatClock, getReplayTimelineColorValue = __r['m8'].getReplayTimelineColorValue, getVisibleReplaySegments = __r['m8'].getVisibleReplaySegments, positionReplayTimelineOverlay = __r['m8'].positionReplayTimelineOverlay;


var updatePlaybackCurrentTimeLabel = function(currentSeconds, dateValue) {
    const currentTimeEl = document.getElementById("playback-current-time");
    if (!currentTimeEl) return;

    const label =
        dateValue || document.getElementById("playback-date")?.value || "Sem data";
    currentTimeEl.innerHTML = `<i class="fa fa-play-circle mr-1"></i> A reproduzir: ${label} ${formatClock(currentSeconds, true)}`;
}

var hidePlaybackScrubPreview = function() {
    const previewTimeEl = document.getElementById(
        "playback-timeline-preview-time",
    );
    const previewCardEl = document.getElementById(
        "playback-timeline-preview-card",
    );

    if (previewTimeEl) previewTimeEl.classList.add("d-none");
    if (previewCardEl) previewCardEl.classList.add("d-none");
}

var updatePlaybackScrubPreview = function({
    currentSeconds,
    range,
    isScrubbing,
    isHoveringTimeline,
    segment,
}) {
    if (!isScrubbing && !isHoveringTimeline) {
        hidePlaybackScrubPreview();
        return;
    }

    const previewTimeEl = document.getElementById(
        "playback-timeline-preview-time",
    );
    const previewCardEl = document.getElementById(
        "playback-timeline-preview-card",
    );
    const wrapperEl = document.getElementById("playback-timeline-wrapper");
    const timelineEl = document.getElementById("playback-timeline");

    if (!previewTimeEl || !previewCardEl || !wrapperEl || !timelineEl) return;

    const progress =
        ((currentSeconds - range.startSeconds) /
            Math.max(range.totalSeconds, 1)) *
        100;
    const previewSegment = segment || {
        key: "unknown",
        label: "Sem dados",
        start: currentSeconds,
        end: currentSeconds,
        timeLabel: formatClock(currentSeconds, true),
    };

    previewTimeEl.textContent = formatClock(currentSeconds, true);
    previewTimeEl.classList.remove("d-none");
    positionReplayTimelineOverlay({
        element: previewTimeEl,
        progressPercent: progress,
        wrapperEl,
        timelineEl,
        previewTimeEl,
    });

    if (previewSegment.key === "unknown") {
        previewCardEl.classList.add("d-none");
        previewCardEl.innerHTML = "";
        return;
    }

    previewCardEl.innerHTML = createPlaybackCategoryPreviewMarkup(previewSegment);
    previewCardEl.classList.remove("d-none");
    positionReplayTimelineOverlay({
        element: previewCardEl,
        progressPercent: progress,
        wrapperEl,
        timelineEl,
        previewTimeEl,
    });
}

var renderPlaybackLoadingState = function(onSegmentsChange) {
    const sectionsEl = document.getElementById("playback-timeline-sections");
    onSegmentsChange([]);

    if (sectionsEl) {
        sectionsEl.innerHTML =
            '<div class="w-100 h-100 border rounded-pill bg-light"></div>';
    }

    hidePlaybackScrubPreview();
}

var renderPlaybackTimelineSections = function({
    range,
    segments,
    onSegmentsChange,
    onRendered,
}) {
    const sectionsEl = document.getElementById("playback-timeline-sections");
    if (!sectionsEl) return;

    const visibleSegments = getVisibleReplaySegments(segments);
    onSegmentsChange(visibleSegments);

    sectionsEl.innerHTML =
        '<div class="position-relative w-100 h-100 border rounded-pill overflow-hidden bg-light"></div>';

    const container = sectionsEl.firstElementChild;
    if (!container) return;

    visibleSegments.forEach((segment) => {
        const presentation = getPlaybackCategoryPresentation(segment);
        const startPercent =
            ((segment.start - range.startSeconds) /
                Math.max(range.totalSeconds, 1)) *
            100;
        const widthPercent =
            ((segment.end - segment.start) / Math.max(range.totalSeconds, 1)) *
            100;
        const section = document.createElement("span");

        section.className = "position-absolute h-100";
        section.style.left = `${Math.max(startPercent, 0)}%`;
        section.style.width = `${Math.max(widthPercent, 1)}%`;
        section.style.backgroundColor = getReplayTimelineColorValue(
            presentation.color,
        );
        section.style.opacity = "0.45";
        container.appendChild(section);
    });

    onRendered();
}

var updatePlaybackButtonState = function(isPlaying) {
    const toggleButton = document.getElementById("playback-toggle");
    if (!toggleButton) return;

    toggleButton.classList.remove("btn-outline-primary");
    toggleButton.classList.add("btn-primary", "text-white");
    toggleButton.title = isPlaying ? "Pausar" : "Reproduzir";
    toggleButton.innerHTML = isPlaying
        ? '<i class="fa fa-pause pr-0"></i><span class="sr-only">Pausar</span>'
        : '<i class="fa fa-play pr-0"></i><span class="sr-only">Reproduzir</span>';
}
__r['m21'] = __r['m21'] || {};
__r['m21'].updatePlaybackCurrentTimeLabel = updatePlaybackCurrentTimeLabel;
__r['m21'].hidePlaybackScrubPreview = hidePlaybackScrubPreview;
__r['m21'].updatePlaybackScrubPreview = updatePlaybackScrubPreview;
__r['m21'].renderPlaybackLoadingState = renderPlaybackLoadingState;
__r['m21'].renderPlaybackTimelineSections = renderPlaybackTimelineSections;
__r['m21'].updatePlaybackButtonState = updatePlaybackButtonState;

// --- _js/radar/playback/service.js ---
var normalizePlaybackResponse = __r['m20'].normalizePlaybackResponse;
var buildReplayDateTime = __r['m8'].buildReplayDateTime, formatClock = __r['m8'].formatClock, formatLocalDate = __r['m8'].formatLocalDate;
var renderLoading = __r['m14'].renderLoading, removeLoading = __r['m14'].removeLoading;



var activePlaybackLoadingToken = null;

var getDatepickerArrows = function() {
    if (typeof KTUtil !== "undefined" && KTUtil.isRTL()) {
        return {
            leftArrow: '<i class="la la-angle-right"></i>',
            rightArrow: '<i class="la la-angle-left"></i>',
        };
    }

    return {
        leftArrow: '<i class="la la-angle-left"></i>',
        rightArrow: '<i class="la la-angle-right"></i>',
    };
}

var getTimepickerSetTimeMethod = function(instance) {
    if (!instance) return null;
    if (typeof instance.timepicker === "function") return "timepicker";
    if (typeof instance.bootstrapTimepicker === "function") {
        return "bootstrapTimepicker";
    }
    return null;
}

var getPlaybackFetchParams = function(uid, range) {
    if (!uid || !range) return null;

    const dateValue =
        document.getElementById("playback-date")?.value ||
        formatLocalDate(new Date());
    const start = buildReplayDateTime(dateValue, range.startSeconds);
    const end = buildReplayDateTime(dateValue, range.endSeconds);

    return {
        dateValue,
        start,
        end,
        rangeKey: `${uid}|${start}|${end}`,
    };
}

var loadPlaybackData = async function({ uid, range, requestToken }) {
    const container = document.getElementById("radar-playback-pane");

    const fetchParams = getPlaybackFetchParams(uid, range);
    if (!fetchParams) return null;

    const { dateValue, start, end, rangeKey } = fetchParams;
    activePlaybackLoadingToken = requestToken;
    renderLoading(container);

    try {
        const [playbackResponse, layoutsResponse] = await Promise.all([
            fetch(
                `/modulos/radares/_ajax/radar-data/playback.php?uid=${encodeURIComponent(uid)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
            ),
            fetch(
                `/modulos/radares/_ajax/layouts/read.php?uid=${encodeURIComponent(uid)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
            ),
        ]);

        if (!playbackResponse.ok) {
            throw new Error(
                `Playback request failed with ${playbackResponse.status}`,
            );
        }

        if (!layoutsResponse.ok) {
            throw new Error(
                `Playback layout request failed with ${layoutsResponse.status}`,
            );
        }

        const [data, layoutsPayload] = await Promise.all([
            playbackResponse.json(),
            layoutsResponse.json(),
        ]);

        if (data?.error) {
            throw new Error(data.error);
        }
        if (layoutsPayload?.error) {
            throw new Error(layoutsPayload.error);
        }

        return {
            requestToken,
            rangeKey,
            playbackData: normalizePlaybackResponse(
                data,
                dateValue,
                range,
                formatClock,
            ),
            layouts: Array.isArray(layoutsPayload?.layouts)
                ? layoutsPayload.layouts
                : [],
        };
    } finally {
        if (activePlaybackLoadingToken === requestToken) {
            removeLoading(container);
            activePlaybackLoadingToken = null;
        }
    }
}

var initializePlaybackDatepicker = function() {
    const playbackDate = $("#playback-date");
    if (!playbackDate.length || typeof playbackDate.datepicker !== "function") {
        return;
    }

    if (playbackDate.data("datepicker")) return;

    playbackDate.datepicker({
        rtl: typeof KTUtil !== "undefined" && KTUtil.isRTL(),
        todayHighlight: true,
        format: "yyyy-mm-dd",
        autoclose: true,
        templates: getDatepickerArrows(),
        language: "pt-PT",
        defaultViewDate: new Date(),
        updateViewDate: false,
    });
}

var initializePlaybackTimepickers = function() {
    const selectors = ["#playback-start", "#playback-end"];

    selectors.forEach((selector) => {
        const instance = $(selector);
        if (!instance.length) return;

        const method = getTimepickerSetTimeMethod(instance);
        if (!method) return;

        if (instance.data("widget-timepicker-initialized")) return;

        instance[method]({
            showMeridian: false,
            defaultTime: false,
            minuteStep: 5,
            showSeconds: false,
            explicitMode: true,
        });

        instance.data("widget-timepicker-initialized", "1");
    });
}

var updatePlaybackTimepickerValues = function({
    startValue,
    endValue,
    setSyncing,
}) {
    setSyncing(true);

    [
        { selector: "#playback-start", value: startValue },
        { selector: "#playback-end", value: endValue },
    ].forEach(({ selector, value }) => {
        const instance = $(selector);
        if (!instance.length) return;

        const method = getTimepickerSetTimeMethod(instance);
        if (method) {
            instance[method]("setTime", value);
        } else {
            instance.val(value);
        }
    });

    window.setTimeout(() => {
        setSyncing(false);
    }, 0);
}
__r['m22'] = __r['m22'] || {};
__r['m22'].getPlaybackFetchParams = getPlaybackFetchParams;
__r['m22'].loadPlaybackData = loadPlaybackData;
__r['m22'].initializePlaybackDatepicker = initializePlaybackDatepicker;
__r['m22'].initializePlaybackTimepickers = initializePlaybackTimepickers;
__r['m22'].updatePlaybackTimepickerValues = updatePlaybackTimepickerValues;

// --- _js/radar/playback/controller.js ---
var info = __r['m18'].infoPanel;
var BED_POSTURES = __r['m4'].BED_POSTURES;
var playbackMap = __r['m12'].playbackMap;
var getReplayLayoutForSeconds = __r['m8'].getReplayLayoutForSeconds, getReplaySegmentAtSeconds = __r['m8'].getReplaySegmentAtSeconds;
var formatClock = __r['m8'].formatClock, formatLocalDate = __r['m8'].formatLocalDate, normalizeTimeInputValue = __r['m8'].normalizeTimeInputValue, parseMysqlDateTimeLocal = __r['m8'].parseMysqlDateTimeLocal, parseTimeValue = __r['m8'].parseTimeValue;
var getReplaySecondsFromClientX = __r['m8'].getReplaySecondsFromClientX, renderReplayCurrentPeople = __r['m8'].renderReplayCurrentPeople;
var getPlaybackFetchParams = __r['m22'].getPlaybackFetchParams, initializePlaybackDatepicker = __r['m22'].initializePlaybackDatepicker, initializePlaybackTimepickers = __r['m22'].initializePlaybackTimepickers, loadPlaybackData = __r['m22'].loadPlaybackData, updatePlaybackTimepickerValues = __r['m22'].updatePlaybackTimepickerValues;
var hidePlaybackScrubPreview = __r['m21'].hidePlaybackScrubPreview, renderPlaybackLoadingStateView = __r['m21'].renderPlaybackLoadingState, renderPlaybackTimelineSectionsView = __r['m21'].renderPlaybackTimelineSections, updatePlaybackButtonStateView = __r['m21'].updatePlaybackButtonState, updatePlaybackCurrentTimeLabelView = __r['m21'].updatePlaybackCurrentTimeLabel, updatePlaybackScrubPreviewView = __r['m21'].updatePlaybackScrubPreview;








var PLAYBACK_SPEED_OPTIONS = {
    "0.5x": 0.5,
    "1x": 1,
    "2x": 2,
    "4x": 4,
};

var PLAYBACK_VITALS_ENABLED = true;
var PLAYBACK_BED_AREA_TYPES = new Set([2, 5]);

var state = {
    modal: null,
    mapContainer: null,
    isInitialized: false,
    currentUID: null,
    timerId: null,
    lastTickMs: null,
    isPlaying: false,
    segments: [],
    data: null,
    markers: [],
    layouts: [],
    fetchDebounceId: null,
    requestToken: 0,
    layoutWindow: null,
    rangeKey: null,
    syncingTimepicker: false,
    isScrubbing: false,
    isHoveringTimeline: false,
    previewSeconds: null,
    lastCommittedInputKey: null,
    lastCommittedInputAt: 0,
};

var getPlaybackSpeedMultiplier = function() {
    const speedEl = document.getElementById("playback-speed");
    return PLAYBACK_SPEED_OPTIONS[speedEl?.value] || 1;
}

var isPlaybackPaneActive = function() {
    return document
        .getElementById("radar-playback-pane")
        ?.classList.contains("active");
}

var getPlaybackRange = function() {
    const startEl = document.getElementById("playback-start");
    const endEl = document.getElementById("playback-end");

    const defaultStart = "00:00";
    const defaultEnd = "23:59";

    if (!startEl || !endEl) {
        return {
            startSeconds: parseTimeValue(defaultStart),
            endSeconds: parseTimeValue(defaultEnd),
            totalSeconds: 1800,
        };
    }

    const normalizedStart = normalizeTimeInputValue(
        startEl.value,
        defaultStart,
    );
    startEl.value = normalizedStart;

    let startSeconds = parseTimeValue(normalizedStart);
    let endSeconds = parseTimeValue(
        normalizeTimeInputValue(endEl.value, defaultEnd),
    );

    if (!endSeconds || endSeconds <= startSeconds) {
        endSeconds = Math.min(startSeconds + 60, 86399);
        endEl.value = formatClock(endSeconds);
    } else {
        endEl.value = formatClock(endSeconds);
    }

    updatePlaybackTimepickerValues({
        startValue: startEl.value,
        endValue: endEl.value,
        setSyncing(value) {
            state.syncingTimepicker = value;
        },
    });

    return {
        startSeconds,
        endSeconds,
        totalSeconds: Math.max(endSeconds - startSeconds, 1),
    };
}

var getCurrentPlaybackSeconds = function(range = getPlaybackRange()) {
    const timelineEl = document.getElementById("playback-timeline");
    if (!timelineEl) return range.startSeconds;

    const progress = Number(timelineEl.value || 0) / 100;
    return range.startSeconds + range.totalSeconds * progress;
}

var updatePlaybackScrubPreview = function(
    currentSeconds,
    range = getPlaybackRange(),
) {
    const segment = getReplaySegmentAtSeconds(
        state.data?.segments || [],
        currentSeconds,
    );

    return updatePlaybackScrubPreviewView({
        currentSeconds,
        range,
        isScrubbing: state.isScrubbing,
        isHoveringTimeline: state.isHoveringTimeline,
        segment,
    });
}

var updatePlaybackTimelineUI = function(
    range = getPlaybackRange(),
    _centerBehavior = null,
    _forceCenter = false,
) {
    const startLabel = document.getElementById("playback-timeline-start");
    const currentLabel = document.getElementById("playback-timeline-current");
    const endLabel = document.getElementById("playback-timeline-end");
    const dateValue = document.getElementById("playback-date")?.value || "";
    const currentSeconds = Math.round(getCurrentPlaybackSeconds(range));

    if (startLabel) startLabel.textContent = formatClock(range.startSeconds);
    if (currentLabel)
        currentLabel.textContent = formatClock(currentSeconds, true);
    if (endLabel) endLabel.textContent = formatClock(range.endSeconds);

    updatePlaybackCurrentTimeLabelView(currentSeconds, dateValue);
    const previewSeconds =
        (state.isScrubbing || state.isHoveringTimeline) &&
        state.previewSeconds !== null
            ? state.previewSeconds
            : currentSeconds;
    updatePlaybackScrubPreview(previewSeconds, range);

    if (state.data) {
        renderPlaybackVisuals(currentSeconds);
    }
}

var setPlaybackTimelineBySeconds = function(
    targetSeconds,
    range = getPlaybackRange(),
    centerBehavior = null,
    forceCenter = false,
) {
    const timelineEl = document.getElementById("playback-timeline");
    if (!timelineEl) return;

    const bounded = Math.min(
        Math.max(targetSeconds, range.startSeconds),
        range.endSeconds,
    );
    const progress =
        ((bounded - range.startSeconds) / Math.max(range.totalSeconds, 1)) *
        100;

    timelineEl.step = "any";
    timelineEl.value = String(progress);
    if (forceCenter && (state.isScrubbing || state.isHoveringTimeline)) {
        state.previewSeconds = bounded;
    }
    updatePlaybackTimelineUI(range, centerBehavior, forceCenter);
}

var renderPlaybackTimelineSections = function(
    range = getPlaybackRange(),
    segments = state.data?.segments || [],
) {
    return renderPlaybackTimelineSectionsView({
        range,
        segments,
        onSegmentsChange(visibleSegments) {
            state.segments = visibleSegments;
        },
        onRendered() {
            updatePlaybackTimelineUI(range, null, false);
        },
    });
}

var setPlaybackPlaying = function(shouldPlay) {
    if (state.timerId) {
        window.clearInterval(state.timerId);
        state.timerId = null;
    }

    state.lastTickMs = null;
    state.isPlaying = shouldPlay;
    updatePlaybackButtonStateView(state.isPlaying);

    if (!shouldPlay) return;

    const initialRange = getPlaybackRange();
    if (
        Math.round(getCurrentPlaybackSeconds(initialRange)) >=
        initialRange.endSeconds
    ) {
        setPlaybackTimelineBySeconds(
            initialRange.startSeconds,
            initialRange,
            "auto",
            true,
        );
    }

    state.lastTickMs = window.performance?.now
        ? window.performance.now()
        : Date.now();

    state.timerId = window.setInterval(() => {
        const now = window.performance?.now
            ? window.performance.now()
            : Date.now();
        const previousTickMs = state.lastTickMs || now;
        const elapsedSeconds = Math.max((now - previousTickMs) / 1000, 0);

        state.lastTickMs = now;

        const range = getPlaybackRange();
        const currentSeconds = getCurrentPlaybackSeconds(range);
        const nextSeconds =
            currentSeconds + elapsedSeconds * getPlaybackSpeedMultiplier();

        if (nextSeconds >= range.endSeconds) {
            setPlaybackTimelineBySeconds(
                range.endSeconds,
                range,
                "smooth",
                true,
            );
            setPlaybackPlaying(false);
            return;
        }

        setPlaybackTimelineBySeconds(nextSeconds, range, "smooth", false);
    }, 100);
}

var fetchPlaybackData = async function(uid, range = getPlaybackRange()) {
    if (!uid) return false;

    const fetchParams = getPlaybackFetchParams(uid, range);
    if (!fetchParams) return false;

    const requestToken = ++state.requestToken;
    state.rangeKey = fetchParams.rangeKey;

    renderPlaybackLoadingStateView((segments) => {
        state.segments = segments;
    });

    try {
        const result = await loadPlaybackData({
            uid,
            range,
            requestToken,
        });
        if (!result) return false;

        if (
            result.requestToken !== state.requestToken ||
            uid !== state.currentUID
        ) {
            return false;
        }
        state.rangeKey = result.rangeKey;
        state.data = result.playbackData;
        state.markers = state.data.markers;
        state.layouts = result.layouts;
        state.layoutWindow = null;
        info.resetPlaybackVitals();
        renderPlaybackTimelineSections(range, state.data.segments);
        return true;
    } catch (error) {
        console.error("Failed to load playback data:", error);
        state.data = null;
        state.markers = [];
        state.layouts = [];
        state.segments = [];
        state.layoutWindow = null;
        renderPlaybackLoadingStateView((segments) => {
            state.segments = segments;
        });
        updatePlaybackTimelineUI(range, null, false);
        info.resetPlaybackVitals();
        if (state.mapContainer) {
            playbackMap.destroy();
            state.mapContainer.innerHTML = "";
            playbackMap.init(state.mapContainer);
            playbackMap.renderPlaceholder(state.mapContainer);
        }
        return false;
    }
}

var ensurePlaybackLayoutForSeconds = function(currentSeconds) {
    if (!state.mapContainer || !state.data) return;

    const dateValue = document.getElementById("playback-date")?.value || "";
    const layout = getReplayLayoutForSeconds({
        layouts: state.layouts,
        dateValue,
        currentSeconds,
    });

    if (!layout) {
        state.layoutWindow = null;
        state.mapContainer.innerHTML = "";
        playbackMap.init(state.mapContainer);
        playbackMap.renderPlaceholder(state.mapContainer);
        return;
    }

    const startMs = parseMysqlDateTimeLocal(layout.valido_de)?.getTime() || 0;
    const endMs = layout.valido_ate
        ? parseMysqlDateTimeLocal(layout.valido_ate)?.getTime() || null
        : null;
    const cached = state.layoutWindow;

    if (cached && cached.startMs === startMs && cached.endMs === endMs) {
        return;
    }

    state.layoutWindow = {
        startMs,
        endMs,
        data: layout,
    };

    state.mapContainer.innerHTML = "";
    playbackMap.init(state.mapContainer);
    playbackMap.renderRoom(layout.rectangle, layout.declare_area, layout);
}

var clearPlaybackTrail = function() {
    playbackMap.clearTrail();
}

var getPlaybackFrameAtSeconds = function(frames = [], currentSeconds) {
    if (!frames.length) return null;

    return (
        frames
            .filter((frame) => frame.seconds <= currentSeconds)
            .slice(-1)[0] || null
    );
}

var getPlaybackBedRegionIds = function(layout) {
    const declareAreaStr = layout?.declare_area || "";
    const bedRegionIds = new Set();

    if (!declareAreaStr) return bedRegionIds;

    declareAreaStr
        .split("},")
        .map((area) => area.replace(/[{}]/g, "").trim())
        .filter(Boolean)
        .forEach((area) => {
            const values = area.split(",").map(Number);
            const key = values[0];
            const type = values[1];

            if (PLAYBACK_BED_AREA_TYPES.has(type)) {
                bedRegionIds.add(key);
            }
        });

    return bedRegionIds;
}

var getPlaybackBedOccupancy = function(frame, layout) {
    if (!frame || !Array.isArray(frame.people)) {
        return null;
    }

    if (frame.shouldClear) return false;

    const bedRegionIds = getPlaybackBedRegionIds(layout);

    return frame.people.some((person) => {
        if (!BED_POSTURES.has(person.posture_state)) {
            return false;
        }

        return bedRegionIds.size
            ? bedRegionIds.has(Number(person.region_id))
            : true;
    });
}

var renderPlaybackVisuals = function(currentSeconds) {
    if (!state.data) return;

    const activeSegment = getReplaySegmentAtSeconds(
        state.data?.segments || [],
        currentSeconds,
    );
    const frame = getPlaybackFrameAtSeconds(
        state.data?.positionFrames || [],
        currentSeconds,
    );

    ensurePlaybackLayoutForSeconds(currentSeconds);
    const hasPersonInMonitoredBed = getPlaybackBedOccupancy(
        frame,
        state.layoutWindow?.data,
    );

    renderReplayCurrentPeople("playback-current-people", frame?.people || []);

    if (state.mapContainer) {
        if (!state.layoutWindow) {
            state.mapContainer.innerHTML = "";
            playbackMap.init(state.mapContainer);
        }

        if (state.layoutWindow?.data) {
            if (activeSegment?.key === "unknown") {
                playbackMap.clearPeople();
            } else {
                playbackMap.updatePeople(frame?.people || []);
            }
            clearPlaybackTrail();
        }
    }

    if (PLAYBACK_VITALS_ENABLED) {
        info.renderPlaybackVitals(
            state.data.vitalsTimeline || [],
            currentSeconds,
            { hasPersonInMonitoredBed },
        );
    }
}

var schedulePlaybackDataFetch = function(immediate = false) {
    if (!state.currentUID) return;

    if (state.fetchDebounceId) {
        window.clearTimeout(state.fetchDebounceId);
        state.fetchDebounceId = null;
    }

    const run = () => {
        state.fetchDebounceId = null;
        setPlaybackPlaying(false);
        fetchPlaybackData(state.currentUID, getPlaybackRange());
    };

    if (immediate) {
        run();
        return;
    }

    state.fetchDebounceId = window.setTimeout(run, 900);
}

var resetPlaybackDataState = function(
    loadingMessage = "Selecione um período para carregar o replay.",
) {
    state.data = null;
    state.markers = [];
    state.layouts = [];
    state.segments = [];
    state.layoutWindow = null;
    state.rangeKey = null;
    renderPlaybackLoadingStateView((segments) => {
        state.segments = segments;
    });
    info.resetPlaybackVitals();
    clearPlaybackTrail();
    renderReplayCurrentPeople("playback-current-people", []);
}

var initializePlaybackDefaults = function() {
    const dateEl = document.getElementById("playback-date");
    const startEl = document.getElementById("playback-start");
    const endEl = document.getElementById("playback-end");
    const timelineEl = document.getElementById("playback-timeline");

    if (!dateEl || !startEl || !endEl || !timelineEl) return;

    const currentDate = new Date();
    const formattedDate = formatLocalDate(currentDate);
    const formattedStart = "00:00";
    const formattedEnd = "08:00";

    dateEl.value = formattedDate;
    updatePlaybackTimepickerValues({
        startValue: formattedStart,
        endValue: formattedEnd,
        setSyncing(value) {
            state.syncingTimepicker = value;
        },
    });
    startEl.value = formattedStart;
    endEl.value = formattedEnd;

    if ($(dateEl).data("datepicker")) {
        $(dateEl).datepicker("update", formattedDate);
    }

    timelineEl.step = "any";
    timelineEl.value = 0;
    resetPlaybackDataState("Selecione um período para carregar o replay.");
    updatePlaybackTimelineUI(getPlaybackRange(), null, false);

    if (state.mapContainer) {
        playbackMap.destroy();
        state.mapContainer.innerHTML = "";
        playbackMap.init(state.mapContainer);
        playbackMap.renderPlaceholder(state.mapContainer);
    }
}

var handlePlaybackInputCommit = function() {
    const range = getPlaybackRange();
    const fetchParams = getPlaybackFetchParams(state.currentUID, range);
    const now = Date.now();

    if (!fetchParams) return;

    if (fetchParams.rangeKey === state.rangeKey && state.data) {
        return;
    }

    if (
        fetchParams.rangeKey === state.lastCommittedInputKey &&
        now - state.lastCommittedInputAt < 500
    ) {
        return;
    }

    state.lastCommittedInputKey = fetchParams.rangeKey;
    state.lastCommittedInputAt = now;

    const timelineEl = document.getElementById("playback-timeline");
    if (timelineEl) timelineEl.value = 0;
    resetPlaybackDataState("A carregar replay...");
    updatePlaybackTimelineUI(range, null, false);
    schedulePlaybackDataFetch();
}

var bindPlaybackControl = function(id, handler) {
    const element = document.getElementById(id);
    if (!element || element.dataset.playbackBound === "1") return;
    handler(element);
    element.dataset.playbackBound = "1";
}

var setupPlaybackUI = function() {
    initializePlaybackDatepicker();
    initializePlaybackTimepickers();
    initializePlaybackDefaults();

    bindPlaybackControl("playback-date", (element) => {
        $(element).on("changeDate", function () {
            const timelineEl = document.getElementById("playback-timeline");
            if (timelineEl) timelineEl.value = 0;
            resetPlaybackDataState("A carregar replay...");
            updatePlaybackTimelineUI(getPlaybackRange(), null, false);
            schedulePlaybackDataFetch();
        });
    });

    ["playback-start", "playback-end"].forEach((id) => {
        bindPlaybackControl(id, (element) => {
            element.addEventListener("change", function () {
                handlePlaybackInputCommit();
            });

            $(element).on("hide.timepicker", function () {
                if (state.syncingTimepicker) return;

                window.setTimeout(() => {
                    if (document.activeElement === element) return;
                    handlePlaybackInputCommit();
                }, 0);
            });

            element.addEventListener("blur", function () {
                if (state.syncingTimepicker) return;
                handlePlaybackInputCommit();
            });
        });
    });

    bindPlaybackControl("playback-speed", (element) => {
        element.addEventListener("change", function () {
            if (state.isPlaying) {
                setPlaybackPlaying(true);
            }
        });
    });

    bindPlaybackControl("playback-timeline", (element) => {
        element.addEventListener("input", function () {
            state.previewSeconds =
                getCurrentPlaybackSeconds(getPlaybackRange());
            updatePlaybackTimelineUI(getPlaybackRange(), null, true);
        });
        element.addEventListener("mouseenter", function (event) {
            state.isHoveringTimeline = true;
            state.previewSeconds = getReplaySecondsFromClientX({
                clientX: event.clientX,
                timelineEl: element,
                range: getPlaybackRange(),
            });
            updatePlaybackScrubPreview(
                state.previewSeconds,
                getPlaybackRange(),
            );
        });
        element.addEventListener("mousemove", function (event) {
            if (!state.isHoveringTimeline && !state.isScrubbing) {
                return;
            }

            state.previewSeconds = getReplaySecondsFromClientX({
                clientX: event.clientX,
                timelineEl: element,
                range: getPlaybackRange(),
            });
            updatePlaybackScrubPreview(
                state.previewSeconds,
                getPlaybackRange(),
            );
        });
        element.addEventListener("mouseleave", function () {
            state.isHoveringTimeline = false;
            if (!state.isScrubbing) {
                state.previewSeconds = null;
                hidePlaybackScrubPreview();
            }
        });
        element.addEventListener("mousedown", function () {
            state.isScrubbing = true;
            state.previewSeconds =
                getCurrentPlaybackSeconds(getPlaybackRange());
            updatePlaybackTimelineUI(getPlaybackRange(), null, true);
        });
        element.addEventListener("touchstart", function () {
            state.isScrubbing = true;
            state.previewSeconds =
                getCurrentPlaybackSeconds(getPlaybackRange());
            updatePlaybackTimelineUI(getPlaybackRange(), null, true);
        });
        element.addEventListener("change", function () {
            state.isScrubbing = false;
            if (!state.isHoveringTimeline) {
                state.previewSeconds = null;
                hidePlaybackScrubPreview();
            }
            updatePlaybackTimelineUI(getPlaybackRange(), null, true);
        });
        element.addEventListener("blur", function () {
            state.isScrubbing = false;
            state.isHoveringTimeline = false;
            state.previewSeconds = null;
            hidePlaybackScrubPreview();
        });
    });

    $(document)
        .off("mouseup.playbackScrub touchend.playbackScrub")
        .on("mouseup.playbackScrub touchend.playbackScrub", function () {
            if (!state.isScrubbing) return;
            state.isScrubbing = false;
            if (!state.isHoveringTimeline) {
                state.previewSeconds = null;
                hidePlaybackScrubPreview();
            }
        });

    bindPlaybackControl("playback-toggle", (element) => {
        element.addEventListener("click", function () {
            setPlaybackPlaying(!state.isPlaying);
        });
    });

    bindPlaybackControl("playback-step-prev", (element) => {
        element.addEventListener("click", function () {
            const currentSeconds = getCurrentPlaybackSeconds();
            const segments = state.segments
                .map((segment) => Number(segment.start))
                .filter((value) => value < currentSeconds - 1)
                .sort((a, b) => a - b);

            const target = segments.length
                ? segments[segments.length - 1]
                : getPlaybackRange().startSeconds;

            setPlaybackPlaying(false);
            setPlaybackTimelineBySeconds(
                target,
                getPlaybackRange(),
                "auto",
                true,
            );
        });
    });

    bindPlaybackControl("playback-step-next", (element) => {
        element.addEventListener("click", function () {
            const currentSeconds = getCurrentPlaybackSeconds();
            const segments = state.segments
                .map((segment) => Number(segment.start))
                .filter((value) => value > currentSeconds + 1)
                .sort((a, b) => a - b);

            const target = segments.length
                ? segments[0]
                : getPlaybackRange().endSeconds;

            setPlaybackPlaying(false);
            setPlaybackTimelineBySeconds(
                target,
                getPlaybackRange(),
                "auto",
                true,
            );
        });
    });

    renderPlaybackLoadingStateView((segments) => {
        state.segments = segments;
    });
    updatePlaybackButtonStateView(state.isPlaying);
}

var init = function({ modal, mapContainer }) {
    state.modal = modal;
    state.mapContainer = mapContainer;
    if (state.isInitialized) return;

    setupPlaybackUI();
    state.isInitialized = true;

    document.addEventListener("radar:pauseGenericPlayback", () => {
        pause();
    });
    document.addEventListener("radar:fallReplayClosed", () => {
        restoreAfterSharedReplayClose();
    });
}

var handleModalShown = function({ uid }) {
    state.currentUID = uid || null;
    initializePlaybackDefaults();
}

var handleModalHidden = function() {
    state.currentUID = null;
    state.requestToken += 1;
    setPlaybackPlaying(false);
    resetPlaybackDataState();
    state.isScrubbing = false;
    state.isHoveringTimeline = false;
    state.previewSeconds = null;
    hidePlaybackScrubPreview();

    if (state.fetchDebounceId) {
        window.clearTimeout(state.fetchDebounceId);
        state.fetchDebounceId = null;
    }

    playbackMap.destroy();
}

var handleTabShown = function(targetId) {
    if (targetId === "#radar-live-pane") {
        setPlaybackPlaying(false);
        return;
    }

    if (targetId !== "#radar-playback-pane") {
        return;
    }

    if (state.mapContainer) {
        playbackMap.resize(state.mapContainer);
    }

    if (!state.data) {
        schedulePlaybackDataFetch(true);
        return;
    }

    renderPlaybackVisuals(
        Math.round(getCurrentPlaybackSeconds(getPlaybackRange())),
    );
}

var resize = function() {
    if (
        !state.modal?.classList.contains("show") ||
        !state.mapContainer ||
        !isPlaybackPaneActive()
    ) {
        return;
    }

    playbackMap.resize(state.mapContainer);
}

var pause = function() {
    setPlaybackPlaying(false);
    clearPlaybackTrail();
}

var restoreAfterSharedReplayClose = function() {
    state.layoutWindow = null;
    clearPlaybackTrail();

    if (!state.mapContainer || !isPlaybackPaneActive() || !state.data) {
        return;
    }

    const currentSeconds = Math.round(
        getCurrentPlaybackSeconds(getPlaybackRange()),
    );
    renderPlaybackVisuals(currentSeconds);
    playbackMap.resize(state.mapContainer);
}
__r['m23'] = __r['m23'] || {};
__r['m23'].init = init;
__r['m23'].handleModalShown = handleModalShown;
__r['m23'].handleModalHidden = handleModalHidden;
__r['m23'].handleTabShown = handleTabShown;
__r['m23'].resize = resize;
__r['m23'].pause = pause;
__r['m23'].restoreAfterSharedReplayClose = restoreAfterSharedReplayClose;

// --- _js/radar/playback/index.js ---
__r['m24'] = __r['m24'] || {};
__r['m24'].controller = __r['m23'];
__r['m24'] = __r['m24'] || {};
__r['m24'].createPlaybackCategoryPreviewMarkup = __r['m19'].createPlaybackCategoryPreviewMarkup;
__r['m24'] = __r['m24'] || {};
__r['m24'].getPlaybackCategoryPresentation = __r['m19'].getPlaybackCategoryPresentation;
__r['m24'] = __r['m24'] || {};
__r['m24'].normalizePlaybackResponse = __r['m20'].normalizePlaybackResponse;



// --- _js/radar/fall-replay/trail.js ---
var resolveTrailTargetPersonIndex = function({ alarm, frames = [], alarmSeconds }) {
    if (
        alarm?.person_index !== null &&
        alarm?.person_index !== undefined &&
        alarm?.person_index !== ""
    ) {
        return Number(alarm.person_index);
    }

    if (!frames.length || alarmSeconds === null || alarmSeconds === undefined) {
        return null;
    }

    const candidatePostures = new Set([
        "Fall Confirmation",
        "Suspected Fall",
        "Confirmed Sitting on Ground",
    ]);
    let bestCandidate = null;

    frames.forEach((frame) => {
        frame.people.forEach((person) => {
            if (!candidatePostures.has(person.posture_state)) return;

            const distance = Math.abs(frame.seconds - alarmSeconds);
            if (!bestCandidate || distance < bestCandidate.distance) {
                bestCandidate = {
                    personIndex: person.person_index,
                    distance,
                };
            }
        });
    });

    return bestCandidate ? bestCandidate.personIndex : null;
}

var getTrailPoints = function({
    currentSeconds,
    frames = [],
    targetPersonIndex,
}) {
    if (targetPersonIndex === null || targetPersonIndex === undefined) {
        return [];
    }

    const points = [];
    const seen = new Set();

    frames.forEach((frame) => {
        if (frame.seconds > currentSeconds) return;

        const person = frame.people.find(
            (item) => Number(item.person_index) === Number(targetPersonIndex),
        );
        if (!person) return;

        const pointKey = `${person.x_position_dm}:${person.y_position_dm}:${frame.seconds}`;
        if (seen.has(pointKey)) return;
        seen.add(pointKey);
        points.push(person);
    });

    return points;
}
__r['m25'] = __r['m25'] || {};
__r['m25'].resolveTrailTargetPersonIndex = resolveTrailTargetPersonIndex;
__r['m25'].getTrailPoints = getTrailPoints;

// --- _js/radar/fall-replay/modal-ui.js ---
var setReplayModalHeader = function({ alarm, range, formatClock }) {
    const subtitleEl = document.getElementById("fall-replay-modal-subtitle");
    const titleEl = document.getElementById("fallReplayModalLabel");
    if (!subtitleEl || !titleEl || !alarm || !range) return;

    titleEl.textContent = "Reprodução de queda confirmada";
    const radarName = alarm.device_name || alarm.device_code;
    subtitleEl.textContent = `${radarName} | Alarme em ${alarm.criado_em} | Janela ${formatClock(range.startSeconds, true)} - ${formatClock(range.endSeconds, true)}`;
}

var ensureReplayBackdrop = function(modal, currentBackdropEl) {
    if (!modal || currentBackdropEl) return currentBackdropEl || null;

    const backdropEl = document.createElement("div");
    backdropEl.className = "modal-backdrop fade show";
    backdropEl.style.zIndex = "1055";
    modal.style.zIndex = "1060";

    document.body.appendChild(backdropEl);
    return backdropEl;
}

var removeReplayBackdrop = function(modal, backdropEl) {
    if (backdropEl?.parentNode) {
        backdropEl.parentNode.removeChild(backdropEl);
    }

    if (modal) {
        modal.style.zIndex = "";
    }
}
__r['m26'] = __r['m26'] || {};
__r['m26'].setReplayModalHeader = setReplayModalHeader;
__r['m26'].ensureReplayBackdrop = ensureReplayBackdrop;
__r['m26'].removeReplayBackdrop = removeReplayBackdrop;

// --- _js/radar/fall-replay/main.js ---
var grid = __r['m4'].grid;
var createPlaybackCategoryPreviewMarkup = __r['m24'].createPlaybackCategoryPreviewMarkup, getPlaybackCategoryPresentation = __r['m24'].getPlaybackCategoryPresentation, normalizeSharedPlaybackResponse = __r['m24'].normalizePlaybackResponse;
var getReplayFrameAtSeconds = __r['m8'].getReplayFrameAtSeconds, getReplayLayoutForSeconds = __r['m8'].getReplayLayoutForSeconds, getReplaySegmentAtSeconds = __r['m8'].getReplaySegmentAtSeconds, getReplayTimelineColorValue = __r['m8'].getReplayTimelineColorValue, getVisibleReplaySegments = __r['m8'].getVisibleReplaySegments;
var buildSharedReplayDateTime = __r['m8'].buildReplayDateTime, buildReplayRangeFromAlarm = __r['m8'].buildReplayRangeFromAlarm, formatSharedClock = __r['m8'].formatClock, formatSharedLocalDate = __r['m8'].formatLocalDate, formatSharedLocalDateTime = __r['m8'].formatLocalDateTime, parseSharedMysqlDateTimeLocal = __r['m8'].parseMysqlDateTimeLocal;
var getReplaySecondsFromClientX = __r['m8'].getReplaySecondsFromClientX, positionSharedReplayTimelineOverlay = __r['m8'].positionReplayTimelineOverlay, renderSharedReplayCurrentPeople = __r['m8'].renderReplayCurrentPeople;
var getReplayTrailPoints = __r['m25'].getTrailPoints, resolveTrailTargetPersonIndex = __r['m25'].resolveTrailTargetPersonIndex;
var ensureReplayBackdrop = __r['m26'].ensureReplayBackdrop, removeReplayBackdrop = __r['m26'].removeReplayBackdrop, setReplayModalHeader = __r['m26'].setReplayModalHeader;
var playbackMap = __r['m12'].playbackMap;
var restoreParentModalScrollState = __r['m14'].restoreParentModalScrollState;









var SPEED_OPTIONS = {
    "0.5x": 0.5,
    "1x": 1,
    "2x": 2,
    "4x": 4,
};

var TIMELINE_COLORS = {
    primary: "#5867dd",
    success: "#1dc9b7",
    info: "#5578eb",
    warning: "#ffb822",
    danger: "#fd397a",
    secondary: "#74788d",
    purple: "#6f42c1",
};

var state = {
    modal: null,
    mapContainer: null,
    backdropEl: null,
    timerId: null,
    lastTickMs: null,
    isPlaying: false,
    data: null,
    layouts: [],
    layoutWindow: null,
    range: null,
    alarm: null,
    pendingAlarm: null,
    targetPersonIndex: null,
    isScrubbing: false,
    isHoveringTimeline: false,
    previewSeconds: null,
    requestToken: 0,
};

var renderReplayCurrentPeople = function(elementId, people = []) {
    return renderSharedReplayCurrentPeople(elementId, people);
}

var parseMysqlDateTimeLocal = function(value) {
    return parseSharedMysqlDateTimeLocal(value);
}

var formatLocalDate = function(date) {
    return formatSharedLocalDate(date);
}

var formatLocalDateTime = function(date) {
    return formatSharedLocalDateTime(date);
}

var formatClock = function(totalSeconds, includeSeconds = false) {
    return formatSharedClock(totalSeconds, includeSeconds);
}

var buildRangeFromAlarm = function(alarmTimestamp) { return buildReplayRangeFromAlarm(alarmTimestamp); }
var buildReplayDateTime = function(dateValue, totalSeconds) { return buildSharedReplayDateTime(dateValue, totalSeconds); }

var getTimelineColorValue = function(color) {
    return getReplayTimelineColorValue(color);
}

var getSpeedMultiplier = function() {
    const speedEl = document.getElementById("fall-replay-speed");
    return SPEED_OPTIONS[speedEl?.value] || 1;
}

var normalizePlaybackResponse = function(data, dateValue, range) {
    return normalizeSharedPlaybackResponse(data, dateValue, range, formatClock);
}

var getVisibleSegments = function(segments = state.data?.segments || []) {
    return getVisibleReplaySegments(segments);
}

var getCurrentSeconds = function() {
    if (!state.range) return 0;
    const timelineEl = document.getElementById("fall-replay-timeline");
    if (!timelineEl) return state.range.startSeconds;

    const progress = Number(timelineEl.value || 0) / 100;
    return state.range.startSeconds + state.range.totalSeconds * progress;
}

var getSegmentAtSeconds = function(currentSeconds) {
    return getReplaySegmentAtSeconds(state.data?.segments || [], currentSeconds);
}

var getFrameAtSeconds = function(currentSeconds) {
    return getReplayFrameAtSeconds(state.data?.positionFrames || [], currentSeconds);
}

var updateCurrentTimeLabel = function(currentSeconds) {
    const currentTimeEl = document.getElementById("fall-replay-current-time");
    if (!currentTimeEl || !state.range) return;

    currentTimeEl.innerHTML = `<i class="fa fa-play-circle mr-1"></i> A reproduzir: ${state.range.dateValue} ${formatClock(currentSeconds, true)}`;
}

var hideScrubPreview = function() {
    const previewTimeEl = document.getElementById(
        "fall-replay-timeline-preview-time",
    );
    const previewCardEl = document.getElementById(
        "fall-replay-timeline-preview-card",
    );

    if (previewTimeEl) previewTimeEl.classList.add("d-none");
    if (previewCardEl) previewCardEl.classList.add("d-none");
}

var getSecondsFromClientX = function(clientX) {
    if (!state.range) return 0;

    return getReplaySecondsFromClientX({
        clientX,
        timelineEl: document.getElementById("fall-replay-timeline"),
        range: state.range,
    });
}

var positionTimelineOverlay = function(element, progressPercent) {
    return positionSharedReplayTimelineOverlay({
        element,
        progressPercent,
        wrapperEl: document.getElementById("fall-replay-timeline-wrapper"),
        timelineEl: document.getElementById("fall-replay-timeline"),
        previewTimeEl: document.getElementById(
            "fall-replay-timeline-preview-time",
        ),
    });
}

var updateScrubPreview = function(currentSeconds) {
    if ((!state.isScrubbing && !state.isHoveringTimeline) || !state.range) {
        hideScrubPreview();
        return;
    }

    const previewTimeEl = document.getElementById(
        "fall-replay-timeline-preview-time",
    );
    const previewCardEl = document.getElementById(
        "fall-replay-timeline-preview-card",
    );
    if (!previewTimeEl || !previewCardEl) return;

    const progress =
        ((currentSeconds - state.range.startSeconds) /
            Math.max(state.range.totalSeconds, 1)) *
        100;
    const segment = getSegmentAtSeconds(currentSeconds) || {
        key: "unknown",
        label: "Sem dados",
        start: currentSeconds,
        end: currentSeconds,
        timeLabel: formatClock(currentSeconds, true),
    };

    previewTimeEl.textContent = formatClock(currentSeconds, true);
    previewTimeEl.classList.remove("d-none");
    positionTimelineOverlay(previewTimeEl, progress);

    if (segment.key === "unknown") {
        previewCardEl.classList.add("d-none");
        previewCardEl.innerHTML = "";
        return;
    }

    previewCardEl.innerHTML = createPlaybackCategoryPreviewMarkup(segment);
    previewCardEl.classList.remove("d-none");
    positionTimelineOverlay(previewCardEl, progress);
}

var updateTimelineUI = function() {
    if (!state.range) return;

    const startLabel = document.getElementById("fall-replay-timeline-start");
    const currentLabel = document.getElementById(
        "fall-replay-timeline-current",
    );
    const endLabel = document.getElementById("fall-replay-timeline-end");
    const currentSeconds = Math.round(getCurrentSeconds());

    if (startLabel)
        startLabel.textContent = formatClock(state.range.startSeconds);
    if (currentLabel)
        currentLabel.textContent = formatClock(currentSeconds, true);
    if (endLabel) endLabel.textContent = formatClock(state.range.endSeconds);

    updateCurrentTimeLabel(currentSeconds);

    const previewSeconds =
        (state.isScrubbing || state.isHoveringTimeline) &&
        state.previewSeconds !== null
            ? state.previewSeconds
            : currentSeconds;
    updateScrubPreview(previewSeconds);

    if (state.data) {
        renderVisuals(currentSeconds);
    }
}

var renderTimelineSections = function() {
    const sectionsEl = document.getElementById("fall-replay-timeline-sections");
    if (!sectionsEl || !state.range) return;

    const visibleSegments = getVisibleSegments(state.data?.segments || []);

    sectionsEl.innerHTML =
        '<div class="position-relative w-100 h-100 border rounded-pill overflow-hidden bg-light"></div>';

    const container = sectionsEl.firstElementChild;
    if (!container) return;

    visibleSegments.forEach((segment) => {
        const presentation = getPlaybackCategoryPresentation(segment);
        const startPercent =
            ((segment.start - state.range.startSeconds) /
                Math.max(state.range.totalSeconds, 1)) *
            100;
        const widthPercent =
            ((segment.end - segment.start) /
                Math.max(state.range.totalSeconds, 1)) *
            100;
        const section = document.createElement("span");

        section.className = "position-absolute h-100";
        section.style.left = `${Math.max(startPercent, 0)}%`;
        section.style.width = `${Math.max(widthPercent, 1)}%`;
        section.style.backgroundColor = getTimelineColorValue(
            presentation.color,
        );
        section.style.opacity = "0.45";
        container.appendChild(section);
    });

    updateTimelineUI();
}

var renderLoadingState = function() {
    const sectionsEl = document.getElementById("fall-replay-timeline-sections");
    if (!sectionsEl) return;

    sectionsEl.innerHTML =
        '<div class="w-100 h-100 border rounded-pill bg-light"></div>';
    hideScrubPreview();
}

var updateButtonState = function() {
    const toggleButton = document.getElementById("fall-replay-toggle");
    if (!toggleButton) return;

    toggleButton.classList.remove("btn-outline-primary");
    toggleButton.classList.add("btn-primary", "text-white");
    toggleButton.title = state.isPlaying ? "Pausar" : "Reproduzir";
    toggleButton.innerHTML = state.isPlaying
        ? '<i class="fa fa-pause pr-0"></i><span class="sr-only">Pausar</span>'
        : '<i class="fa fa-play pr-0"></i><span class="sr-only">Reproduzir</span>';
}

var setTimelineBySeconds = function(targetSeconds, forceCenter = false) {
    const timelineEl = document.getElementById("fall-replay-timeline");
    if (!timelineEl || !state.range) return;

    const bounded = Math.min(
        Math.max(targetSeconds, state.range.startSeconds),
        state.range.endSeconds,
    );
    const progress =
        ((bounded - state.range.startSeconds) /
            Math.max(state.range.totalSeconds, 1)) *
        100;

    timelineEl.step = "any";
    timelineEl.value = String(progress);
    if (forceCenter && (state.isScrubbing || state.isHoveringTimeline)) {
        state.previewSeconds = bounded;
    }
    updateTimelineUI();
}

var setPlaying = function(shouldPlay) {
    if (state.timerId) {
        window.clearInterval(state.timerId);
        state.timerId = null;
    }

    state.lastTickMs = null;
    state.isPlaying = shouldPlay;
    updateButtonState();

    if (!shouldPlay || !state.range) return;

    if (Math.round(getCurrentSeconds()) >= state.range.endSeconds) {
        setTimelineBySeconds(state.range.startSeconds);
    }

    state.lastTickMs = window.performance?.now
        ? window.performance.now()
        : Date.now();

    state.timerId = window.setInterval(() => {
        const now = window.performance?.now
            ? window.performance.now()
            : Date.now();
        const previousTickMs = state.lastTickMs || now;
        const elapsedSeconds = Math.max((now - previousTickMs) / 1000, 0);

        state.lastTickMs = now;

        const currentSeconds = getCurrentSeconds();
        const nextSeconds =
            currentSeconds + elapsedSeconds * getSpeedMultiplier();

        if (nextSeconds >= state.range.endSeconds) {
            setTimelineBySeconds(state.range.endSeconds);
            setPlaying(false);
            return;
        }

        setTimelineBySeconds(nextSeconds);
    }, 100);
}

var getLayoutForSeconds = function(currentSeconds) {
    return getReplayLayoutForSeconds({
        layouts: state.layouts,
        dateValue: state.range?.dateValue,
        currentSeconds,
    });
}

var ensureLayoutForSeconds = function(currentSeconds) {
    if (!state.mapContainer || !state.data) return;

    const layout = getLayoutForSeconds(currentSeconds);
    if (!layout) {
        state.layoutWindow = null;
        state.mapContainer.innerHTML = "";
        playbackMap.init(state.mapContainer);
        playbackMap.renderPlaceholder(state.mapContainer);
        return;
    }

    const startMs = parseMysqlDateTimeLocal(layout.valido_de)?.getTime() || 0;
    const endMs = layout.valido_ate
        ? parseMysqlDateTimeLocal(layout.valido_ate)?.getTime() || null
        : null;
    const cached = state.layoutWindow;

    if (cached && cached.startMs === startMs && cached.endMs === endMs) {
        return;
    }

    state.layoutWindow = {
        startMs,
        endMs,
        data: layout,
    };

    state.mapContainer.innerHTML = "";
    playbackMap.init(state.mapContainer);
    playbackMap.renderRoom(layout.rectangle, layout.declare_area, layout);
}

var resolveTargetPersonIndex = function() {
    return resolveTrailTargetPersonIndex({
        alarm: state.alarm,
        frames: state.data?.positionFrames || [],
        alarmSeconds: state.range?.alarmSeconds,
    });
}

var getTrailPoints = function(currentSeconds) {
    return getReplayTrailPoints({
        currentSeconds,
        frames: state.data?.positionFrames || [],
        targetPersonIndex: state.targetPersonIndex,
    });
}

var clearTrail = function() {
    playbackMap.clearTrail();
}

var renderVisuals = function(currentSeconds) {
    if (!state.data || !state.mapContainer) return;

    const activeSegment = getSegmentAtSeconds(currentSeconds);
    const frame = getFrameAtSeconds(currentSeconds);
    renderReplayCurrentPeople(
        "fall-replay-current-people",
        frame?.people || [],
    );
    ensureLayoutForSeconds(currentSeconds);

    if (!state.layoutWindow?.data) return;

    if (activeSegment?.key === "unknown") {
        playbackMap.clearPeople();
    } else {
        playbackMap.updatePeople(frame?.people || []);
    }

    const trailPoints = getTrailPoints(currentSeconds);
    if (trailPoints.length > 1) {
        playbackMap.setTrail(trailPoints, {
            stroke: "#5867dd",
            strokeWidth: 1,
            showEndpoint: false,
        });
        return;
    }

    clearTrail();
}

var fetchReplayData = async function() {
    if (!state.alarm?.device_code || !state.range) return false;

    const start = buildReplayDateTime(
        state.range.dateValue,
        state.range.startSeconds,
    );
    const end = buildReplayDateTime(
        state.range.dateValue,
        state.range.endSeconds,
    );
    const requestToken = ++state.requestToken;

    renderLoadingState();

    try {
        const [playbackResponse, layoutsResponse] = await Promise.all([
            fetch(
                `/modulos/radares/_ajax/radar-data/playback.php?uid=${encodeURIComponent(state.alarm.device_code)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
            ),
            fetch(
                `/modulos/radares/_ajax/layouts/read.php?uid=${encodeURIComponent(state.alarm.device_code)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
            ),
        ]);

        if (!playbackResponse.ok) {
            throw new Error(
                `Playback request failed with ${playbackResponse.status}`,
            );
        }

        if (!layoutsResponse.ok) {
            throw new Error(
                `Playback layout request failed with ${layoutsResponse.status}`,
            );
        }

        const [data, layoutsPayload] = await Promise.all([
            playbackResponse.json(),
            layoutsResponse.json(),
        ]);

        if (requestToken !== state.requestToken) return false;
        if (data?.error) throw new Error(data.error);
        if (layoutsPayload?.error) throw new Error(layoutsPayload.error);

        state.data = normalizePlaybackResponse(
            data,
            state.range.dateValue,
            state.range,
        );
        state.layouts = Array.isArray(layoutsPayload?.layouts)
            ? layoutsPayload.layouts
            : [];
        state.layoutWindow = null;
        state.targetPersonIndex = resolveTargetPersonIndex();
        renderTimelineSections();
        return true;
    } catch (error) {
        console.error("Failed to load fall replay data:", error);
        state.data = null;
        state.layouts = [];
        state.layoutWindow = null;
        state.targetPersonIndex = null;
        renderLoadingState();
        if (state.mapContainer) {
            state.mapContainer.innerHTML = "";
            playbackMap.init(state.mapContainer);
            playbackMap.renderPlaceholder(state.mapContainer);
        }
        return false;
    }
}

var resetModalState = function(destroySharedMap = false) {
    setPlaying(false);
    state.requestToken += 1;
    state.data = null;
    state.layouts = [];
    state.layoutWindow = null;
    state.range = null;
    state.alarm = null;
    state.pendingAlarm = null;
    state.targetPersonIndex = null;
    state.isScrubbing = false;
    state.isHoveringTimeline = false;
    state.previewSeconds = null;
    hideScrubPreview();

    const timelineEl = document.getElementById("fall-replay-timeline");
    if (timelineEl) timelineEl.value = 0;

    const subtitleEl = document.getElementById("fall-replay-modal-subtitle");
    if (subtitleEl) {
        subtitleEl.textContent =
            "Selecione um alarme de queda para reproduzir.";
    }

    const titleEl = document.getElementById("fallReplayModalLabel");
    if (titleEl) {
        titleEl.textContent = "Reprodução de queda confirmada";
    }

    const currentTimeEl = document.getElementById("fall-replay-current-time");
    if (currentTimeEl) {
        currentTimeEl.innerHTML =
            '<i class="fa fa-play-circle mr-1"></i> A reproduzir: --:--:--';
    }

    const startLabel = document.getElementById("fall-replay-timeline-start");
    const currentLabel = document.getElementById(
        "fall-replay-timeline-current",
    );
    const endLabel = document.getElementById("fall-replay-timeline-end");
    if (startLabel) startLabel.textContent = "--:--";
    if (currentLabel) currentLabel.textContent = "--:--:--";
    if (endLabel) endLabel.textContent = "--:--";

    renderLoadingState();
    updateButtonState();
    clearTrail();
    renderReplayCurrentPeople("fall-replay-current-people", []);

    if (destroySharedMap && state.mapContainer) {
        playbackMap.destroy();
        state.mapContainer.innerHTML = "";
    }
}

var loadAlarmReplay = async function(alarmRow) {
    if (!alarmRow?.device_code || alarmRow.tipo !== "fall_confirmed") return;

    const range = buildRangeFromAlarm(alarmRow.criado_em);
    if (!range) return;

    setPlaying(false);
    state.alarm = { ...alarmRow };
    state.range = range;
    state.targetPersonIndex = null;
    state.previewSeconds = null;
    state.isScrubbing = false;
    state.isHoveringTimeline = false;

    const timelineEl = document.getElementById("fall-replay-timeline");
    if (timelineEl) {
        timelineEl.step = "any";
        timelineEl.value = 0;
    }

    setReplayModalHeader({
        alarm: state.alarm,
        range: state.range,
        formatClock,
    });
    renderLoadingState();
    updateTimelineUI();

    if (state.mapContainer) {
        playbackMap.destroy();
        state.mapContainer.innerHTML = "";
        playbackMap.init(state.mapContainer);
        playbackMap.renderPlaceholder(state.mapContainer);
    }

    const loaded = await fetchReplayData();
    if (!loaded || !$(state.modal).hasClass("show")) return;

    setTimelineBySeconds(state.range.startSeconds);
    setPlaying(true);
}

var openFallReplay = function(alarmRow) {
    if (!state.modal || alarmRow?.tipo !== "fall_confirmed") return;

    document.dispatchEvent(new CustomEvent("radar:pauseGenericPlayback"));

    if ($(state.modal).hasClass("show")) {
        loadAlarmReplay(alarmRow);
        return;
    }

    state.pendingAlarm = alarmRow;
    $(state.modal).modal({
        backdrop: false,
        show: true,
    });
}

var bindControl = function(id, handler) {
    const element = document.getElementById(id);
    if (!element || element.dataset.bound === "1") return;
    handler(element);
    element.dataset.bound = "1";
}

var setupUI = function() {
    bindControl("fall-replay-speed", (el) => {
        el.addEventListener("change", function () {
            if (state.isPlaying) {
                setPlaying(true);
            }
        });
    });

    bindControl("fall-replay-toggle", (el) => {
        el.addEventListener("click", function () {
            setPlaying(!state.isPlaying);
        });
    });

    bindControl("fall-replay-step-prev", (el) => {
        el.addEventListener("click", function () {
            const currentSeconds = getCurrentSeconds();
            const segments = getVisibleSegments(state.data?.segments || [])
                .map((segment) => Number(segment.start))
                .filter((value) => value < currentSeconds - 1)
                .sort((a, b) => a - b);

            const target = segments.length
                ? segments[segments.length - 1]
                : state.range?.startSeconds || 0;

            setPlaying(false);
            setTimelineBySeconds(target, true);
        });
    });

    bindControl("fall-replay-step-next", (el) => {
        el.addEventListener("click", function () {
            const currentSeconds = getCurrentSeconds();
            const segments = getVisibleSegments(state.data?.segments || [])
                .map((segment) => Number(segment.start))
                .filter((value) => value > currentSeconds + 1)
                .sort((a, b) => a - b);

            const target = segments.length
                ? segments[0]
                : state.range?.endSeconds || 0;

            setPlaying(false);
            setTimelineBySeconds(target, true);
        });
    });

    bindControl("fall-replay-timeline", (el) => {
        el.addEventListener("input", function () {
            state.previewSeconds = getCurrentSeconds();
            updateTimelineUI();
        });
        el.addEventListener("mouseenter", function (event) {
            state.isHoveringTimeline = true;
            state.previewSeconds = getSecondsFromClientX(event.clientX);
            updateScrubPreview(state.previewSeconds);
        });
        el.addEventListener("mousemove", function (event) {
            if (!state.isHoveringTimeline && !state.isScrubbing) return;

            state.previewSeconds = getSecondsFromClientX(event.clientX);
            updateScrubPreview(state.previewSeconds);
        });
        el.addEventListener("mouseleave", function () {
            state.isHoveringTimeline = false;
            if (!state.isScrubbing) {
                state.previewSeconds = null;
                hideScrubPreview();
            }
        });
        el.addEventListener("mousedown", function () {
            state.isScrubbing = true;
            state.previewSeconds = getCurrentSeconds();
            updateTimelineUI();
        });
        el.addEventListener("touchstart", function () {
            state.isScrubbing = true;
            state.previewSeconds = getCurrentSeconds();
            updateTimelineUI();
        });
        el.addEventListener("change", function () {
            state.isScrubbing = false;
            if (!state.isHoveringTimeline) {
                state.previewSeconds = null;
                hideScrubPreview();
            }
            updateTimelineUI();
        });
        el.addEventListener("blur", function () {
            state.isScrubbing = false;
            state.isHoveringTimeline = false;
            state.previewSeconds = null;
            hideScrubPreview();
        });
    });

    $(document)
        .off("mouseup.fallReplayScrub touchend.fallReplayScrub")
        .on("mouseup.fallReplayScrub touchend.fallReplayScrub", function () {
            if (!state.isScrubbing) return;
            state.isScrubbing = false;
            if (!state.isHoveringTimeline) {
                state.previewSeconds = null;
                hideScrubPreview();
            }
        });
}

var handleModalShown = function() {
    state.backdropEl = ensureReplayBackdrop(state.modal, state.backdropEl);
    if (!state.pendingAlarm) return;
    loadAlarmReplay(state.pendingAlarm);
    state.pendingAlarm = null;
}

var handleModalHidden = function() {
    removeReplayBackdrop(state.modal, state.backdropEl);
    state.backdropEl = null;
    resetModalState(true);
    restoreParentModalScrollState("radarModal");
    document.dispatchEvent(new CustomEvent("radar:fallReplayClosed"));
}

var initFallReplayModal = function() {
    state.modal = document.getElementById("fallReplayModal");
    state.mapContainer = document.getElementById("fall-replay-map");
    if (!state.modal || !state.mapContainer) return;

    setupUI();
    resetModalState(false);
    grid.onFallReplay(openFallReplay);

    $(state.modal).on("shown.bs.modal", handleModalShown);
    $(state.modal).on("hidden.bs.modal", handleModalHidden);
    window.addEventListener("resize", () => {
        if (state.modal?.classList.contains("show") && state.mapContainer) {
            playbackMap.resize(state.mapContainer);
        }
    });
}
__r['m27'] = __r['m27'] || {};
__r['m27'].initFallReplayModal = initFallReplayModal;

// --- _js/radar/sleep-report/date-picker.js ---
var calendarInstance = null;
var daysWithData = [];
var onMonthChangeCallback = null;

var el = "#pick-date-field";

var initCalendar = (onMonthChange) => {
    onMonthChangeCallback = onMonthChange;
    const isRTL =
        typeof KTUtil !== "undefined" &&
        typeof KTUtil.isRTL === "function" &&
        KTUtil.isRTL();

    if (typeof $(el).datepicker !== "function") {
        return;
    }

    let arrows;
    if (isRTL) {
        arrows = {
            leftArrow: '<i class="la la-angle-right"></i>',
            rightArrow: '<i class="la la-angle-left"></i>',
        };
    } else {
        arrows = {
            leftArrow: '<i class="la la-angle-left"></i>',
            rightArrow: '<i class="la la-angle-right"></i>',
        };
    }

    calendarInstance = $(el).datepicker({
        rtl: isRTL,
        todayHighlight: true,
        format: "yyyy-mm-dd",
        autoclose: true,
        templates: arrows,
        language: "pt-PT",
        defaultViewDate: new Date(),
        updateViewDate: false,
        beforeShowDay: function (date) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const day = date.getDate().toString().padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;
            if (daysWithData.includes(dateStr)) {
                return { classes: "has-data-dot" };
            }
            return;
        },
    });

    $(el).on("changeMonth", function (e) {
        const newDate = e.date;
        const firstDayOfMonth = `${newDate.getFullYear()}-${(newDate.getMonth() + 1).toString().padStart(2, "0")}-01`;

        if (onMonthChangeCallback) {
            onMonthChangeCallback(firstDayOfMonth);
        }
    });
};

var updateCalendar = (data) => {
    daysWithData = data || [];
    if (calendarInstance) calendarInstance.datepicker("update");
};
__r['m28'] = __r['m28'] || {};
__r['m28'].initCalendar = initCalendar;
__r['m28'].updateCalendar = updateCalendar;

// --- _js/radar/sleep-report/suggestions.js ---
var escapeHtml = (value) =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

var normalizeSuggestions = (data) => {
    if (Array.isArray(data)) {
        return data
            .map((item) => String(item || "").trim())
            .filter((item) => item.length > 0);
    }

    if (typeof data === "string") {
        return data
            .split(/<br\s*\/?>/i)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
    }

    return [];
};

var updateSuggestions = (data, el, color = "primary") => {
    const container = document.getElementById(el);
    if (!container) return;

    const suggestions = normalizeSuggestions(data);
    if (!suggestions.length) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = suggestions
        .map(
            (suggestion) => `
                <div class="d-flex align-items-start gap-2 py-1">
                    <span class="badge bg-${color} rounded-circle mt-1" style="--size: 8px; width: var(--size); height: var(--size); flex: 0 0 var(--size);"></span>
                    <span class="text-muted">${escapeHtml(suggestion)}</span>
                </div>`,
        )
        .join("");
};
__r['m29'] = __r['m29'] || {};
__r['m29'].updateSuggestions = updateSuggestions;

// --- _js/radar/sleep-report/kpis.js ---
var animateNumber = __r['m14'].animateNumber;

var elements = {};
var previousValues = new WeakMap();

var renderEvaluation = (status) => {
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

var setMetaValue = (el, html) => {
    if (el) el.innerHTML = html;
};

var formatDurationMinutes = (minutes) => {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (hours > 0) {
        return `${hours} H ${remainingMinutes} Min`;
    }

    return `${remainingMinutes} Min`;
};

var formatKPI = (value, unit) => {
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

var setValue = (el, value, unit) => {
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

var initKPIElements = () => {
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

var updateKPIs = (data) => {
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
__r['m30'] = __r['m30'] || {};
__r['m30'].initKPIElements = initKPIElements;
__r['m30'].updateKPIs = updateKPIs;

// --- _js/radar/sleep-report/charts/breathe.js ---
var root, chart, xAxis, yAxis, series;

var ANOMALY_TYPES = {
    apnea: { shape: "circle", color: "#ffc107", label: "Apnea" },
    bradypnea: { shape: "rectangle", color: "#EB8142", label: "Bradypnea" },
    tachypnea: { shape: "triangle", color: "#dc3545", label: "Tachypnea" },
};

var SHAPE_SIZES = {
    circle: { radius: 6 },
    rectangle: { width: 9, height: 9, cornerRadius: 2 },
    triangle: { width: 11, height: 11, rotation: 180 },
};

var THRESHOLDS = [8, 24];

var formatIsoTimeLabel = (value) => {
    const match = String(value || "")
        .trim()
        .match(/T(\d{2}):(\d{2})/);

    if (match) {
        return `${match[1]}:${match[2]}`;
    }

    return "";
};

var initBreatheChart = (containerId = "breathe-chart") => {
    root = am5.Root.new(containerId);
    root._logo?.dispose();

    chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: "none",
            wheelY: "none",
            cursor: am5xy.XYCursor.new(root, {}),
        }),
    );

    chart.get("cursor").lineX.set("visible", false);
    chart.get("cursor").lineY.set("visible", false);

    xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "time",
            renderer: am5xy.AxisRendererX.new(root, {}),
        }),
    );

    xAxis.get("renderer").labels.template.setAll({
        forceHidden: true,
    });
    xAxis.get("renderer").grid.template.setAll({
        forceHidden: true,
    });

    yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 0,
            max: 32,
            strictMinMax: true,
            maxPrecision: 0,
            renderer: am5xy.AxisRendererY.new(root, {
                minGridDistance: 40,
            }),
        }),
    );

    yAxis.get("renderer").labels.template.setAll({
        textAlign: "right",
        fontSize: 12,
        fill: am5.color("#67b7dc"),
    });

    series = chart.series.push(
        am5xy.LineSeries.new(root, {
            name: "Breath Rate",
            xAxis,
            yAxis,
            valueYField: "value",
            categoryXField: "time",
            strokeWidth: 2,
            connect: false,
            tooltip: am5.Tooltip.new(root, {
                labelText: "{timeLabel}\n[bold]{valueY} BPM[/]",
            }),
        }),
    );

    THRESHOLDS.forEach((value) => {
        const rangeDataItem = yAxis.makeDataItem({ value, endValue: value });
        const range = yAxis.createAxisRange(rangeDataItem);
        range.get("grid").setAll({
            strokeOpacity: 0.6,
            strokeDasharray: [4, 4],
        });
        range.get("label").setAll({
            text: value.toString(),
            location: 1,
            centerX: am5.p100,
        });
    });

    series.bullets.push((root, series, dataItem) => {
        const anomaly = dataItem.dataContext?.anomaly;
        if (!anomaly || !ANOMALY_TYPES[anomaly]) return undefined;
        const config = ANOMALY_TYPES[anomaly];
        const sizeConfig = SHAPE_SIZES[config.shape];
        let shape;
        if (config.shape === "circle") {
            shape = am5.Circle.new(root, { ...sizeConfig });
        } else if (config.shape === "rectangle") {
            shape = am5.Rectangle.new(root, { ...sizeConfig });
        } else if (config.shape === "triangle") {
            shape = am5.Triangle.new(root, { ...sizeConfig });
        }
        if (!shape) return undefined;
        shape.setAll({
            fill: am5.color(config.color),
            fillOpacity: 0.95,
            stroke: am5.color("#ffffff"),
            strokeWidth: 1.5,
            shadowOpacity: 0.25,
            shadowBlur: 4,
            shadowOffsetY: 2,
        });
        return am5.Bullet.new(root, {
            sprite: shape,
            locationY: 0,
        });
    });

    return { root, chart, series, xAxis };
};

var updateBreatheChart = (data) => {
    const values = data.charts?.breathingRate?.values ?? [];
    const timestamps = data.charts?.timestamps ?? [];

    if (values.length !== timestamps.length) {
        console.warn(
            "Breath data length mismatch between values and timestamps",
        );
    }

    let chartData = [];
    let bradypneaEvents = 0;
    let apneaEvents = 0;
    let tachypneaEvents = 0;
    let prevValidValue = null;

    let inBradypnea = false;

    for (let i = 0; i < values.length; i++) {
        const rawValue = values[i];
        const raw =
            rawValue === null || rawValue === undefined ? -1 : Number(rawValue);
        const time = timestamps[i];
        const timeLabel = formatIsoTimeLabel(time);

        const value = raw === -1 ? null : raw;
        let anomaly = null;

        if (raw !== -1) {
            if (raw === 0) {
                anomaly = "apnea";
                apneaEvents++;
                inBradypnea = false;
            } else if (
                !inBradypnea &&
                prevValidValue !== null &&
                prevValidValue > 8 &&
                raw <= 8
            ) {
                anomaly = "bradypnea";
                bradypneaEvents++;
                inBradypnea = true;
            } else if (inBradypnea && raw > 8) {
                inBradypnea = false;
            } else if (raw > 24) {
                anomaly = "tachypnea";
                tachypneaEvents++;
                inBradypnea = false;
            }

            prevValidValue = raw;
        } else {
            inBradypnea = false;
        }

        chartData.push({ time, timeLabel, value, anomaly });
    }

    xAxis.data.setAll(chartData);
    series.data.setAll(chartData);

    return {
        bradypneaEvents,
        apneaEvents,
        tachypneaEvents,
    };
};
__r['m31'] = __r['m31'] || {};
__r['m31'].initBreatheChart = initBreatheChart;
__r['m31'].updateBreatheChart = updateBreatheChart;

// --- _js/radar/sleep-report/charts/heart-rate.js ---
var root, chart, xAxis, yAxis, series;

var ANOMALY_TYPES = {
    weakVitals: {
        shape: "circle",
        color: "#ffc107",
        label: "Weak Vital Signs",
    },
    polycardia: { shape: "rectangle", color: "#EB8142", label: "Polycardia" },
    bradycardia: { shape: "triangle", color: "#dc3545", label: "Bradycardia" },
};

var SHAPE_SIZES = {
    circle: { radius: 6 },
    rectangle: { width: 9, height: 9, cornerRadius: 2 },
    triangle: { width: 11, height: 11, rotation: 180 },
};

var THRESHOLDS = [50, 90];

var formatIsoTimeLabel = (value) => {
    const match = String(value || "")
        .trim()
        .match(/T(\d{2}):(\d{2})/);

    if (match) {
        return `${match[1]}:${match[2]}`;
    }

    return "";
};

var initHeartRateChart = (containerId = "heart-rate-chart") => {
    root = am5.Root.new(containerId);
    root._logo?.dispose();

    chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: "none",
            wheelY: "none",
            cursor: am5xy.XYCursor.new(root, {}),
        }),
    );

    chart.get("cursor").lineX.set("visible", false);
    chart.get("cursor").lineY.set("visible", false);

    xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "time",
            renderer: am5xy.AxisRendererX.new(root, {}),
        }),
    );

    xAxis.get("renderer").labels.template.setAll({
        forceHidden: true,
    });
    xAxis.get("renderer").grid.template.setAll({
        forceHidden: true,
    });

    yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 0,
            max: 180,
            strictMinMax: true,
            maxPrecision: 0,
            renderer: am5xy.AxisRendererY.new(root, { minGridDistance: 40 }),
        }),
    );

    yAxis.get("renderer").labels.template.setAll({
        textAlign: "right",
        fontSize: 12,
        fill: am5.color("#90ee90"),
    });

    series = chart.series.push(
        am5xy.LineSeries.new(root, {
            name: "Heart Rate",
            xAxis,
            yAxis,
            valueYField: "value",
            categoryXField: "time",
            strokeWidth: 2,
            stroke: am5.color("#90ee90"),
            connect: false,
            tooltip: am5.Tooltip.new(root, {
                labelText: "{timeLabel}\n[bold]{valueY} BPM[/]",
                background: am5.Rectangle.new(root, {
                    fill: am5.color("#90ee90"),
                    fillOpacity: 0.2,
                    stroke: am5.color("#90ee90"),
                }),
                label: am5.Label.new(root, {
                    fill: am5.color("#90ee90"),
                    fontSize: 12,
                }),
            }),
        }),
    );

    THRESHOLDS.forEach((value) => {
        const rangeDataItem = yAxis.makeDataItem({ value, endValue: value });
        const range = yAxis.createAxisRange(rangeDataItem);
        range
            .get("grid")
            .setAll({ strokeOpacity: 0.6, strokeDasharray: [4, 4] });
        range
            .get("label")
            .setAll({ text: value.toString(), location: 1, centerX: am5.p100 });
    });

    series.bullets.push((root, series, dataItem) => {
        const anomaly = dataItem.dataContext?.anomaly;
        if (!anomaly || !ANOMALY_TYPES[anomaly]) return undefined;

        const config = ANOMALY_TYPES[anomaly];
        const sizeConfig = SHAPE_SIZES[config.shape];
        let shape;

        if (config.shape === "circle")
            shape = am5.Circle.new(root, { ...sizeConfig });
        else if (config.shape === "rectangle")
            shape = am5.Rectangle.new(root, { ...sizeConfig });
        else if (config.shape === "triangle")
            shape = am5.Triangle.new(root, { ...sizeConfig });
        if (!shape) return undefined;

        shape.setAll({
            fill: am5.color(config.color),
            fillOpacity: 0.95,
            stroke: am5.color("#ffffff"),
            strokeWidth: 1.5,
            shadowOpacity: 0.25,
            shadowBlur: 4,
            shadowOffsetY: 2,
        });

        return am5.Bullet.new(root, { sprite: shape, locationY: 0 });
    });

    return { root, chart, series, xAxis };
};

var updateHeartRateChart = (data) => {
    const values = data.charts?.heartRate?.values ?? [];
    const timestamps = data.charts?.timestamps ?? [];

    if (values.length !== timestamps.length) {
        console.warn(
            "Heart rate data length mismatch between values and timestamps",
        );
    }

    let chartData = [];
    let weakVitalsEvents = 0;
    let polycardiaEvents = 0;
    let bradycardiaEvents = 0;
    let prevValidValue = null;

    let inBradycardia = false;

    for (let i = 0; i < values.length; i++) {
        const rawValue = values[i];
        const raw =
            rawValue === null || rawValue === undefined ? -1 : Number(rawValue);
        const time = timestamps[i];
        const timeLabel = formatIsoTimeLabel(time);
        const value = raw === -1 ? null : raw;
        let anomaly = null;

        if (raw !== -1) {
            if (raw === 0) {
                anomaly = "weakVitals";
                weakVitalsEvents++;
                inBradycardia = false;
            } else if (
                !inBradycardia &&
                prevValidValue !== null &&
                prevValidValue > 50 &&
                raw <= 50
            ) {
                anomaly = "bradycardia";
                bradycardiaEvents++;
                inBradycardia = true;
            } else if (inBradycardia && raw > 50) {
                inBradycardia = false;
            } else if (raw > 90) {
                anomaly = "polycardia";
                polycardiaEvents++;
                inBradycardia = false;
            }

            prevValidValue = raw;
        } else {
            inBradycardia = false;
        }

        chartData.push({ time, timeLabel, value, anomaly });
    }

    xAxis.data.setAll(chartData);
    series.data.setAll(chartData);

    return {
        weakVitalsEvents,
        bradycardiaEvents,
        polycardiaEvents,
    };
};
__r['m32'] = __r['m32'] || {};
__r['m32'].initHeartRateChart = initHeartRateChart;
__r['m32'].updateHeartRateChart = updateHeartRateChart;

// --- _js/radar/sleep-report/charts/health-score.js ---
var healthScoreSeries;
var healthScoreCenterLabel;
var healthScoreRoot;
var scoreSlice;
var remainingSlice;

var labelTranslations = {
    Poor: translations.i18n["fraco_score"],
    "Below average": translations.i18n["abaixo_da_media"],
    Average: translations.i18n["media"],
    Good: translations.i18n["bom_score"],
    Excellent: translations.i18n["excelente"],
    "Very good": translations.i18n["muito_bom"],
};

var initHealthScoreChart = () => {
    healthScoreRoot = am5.Root.new("health-score-pie");
    healthScoreRoot._logo?.dispose();

    const chart = healthScoreRoot.container.children.push(
        am5percent.PieChart.new(healthScoreRoot, {
            layout: healthScoreRoot.verticalLayout,
            innerRadius: am5.percent(75),
        }),
    );

    const series = chart.series.push(
        am5percent.PieSeries.new(healthScoreRoot, {
            valueField: "value",
            categoryField: "category",
            alignLabels: false,
        }),
    );

    series.labels.template.set("forceHidden", true);
    series.ticks.template.set("forceHidden", true);
    series.slices.template.setAll({ cornerRadius: 10, strokeWidth: 0 });

    series.data.setAll([
        {
            category: translations.i18n["restante"],
            value: 100,
            fill: am5.color(0xe9ecef),
        },
        {
            category: translations.i18n["pontuacao"],
            value: 0,
            fill: am5.color(0x198754),
        },
    ]);

    [remainingSlice, scoreSlice] = series.dataItems;

    const centerLabel = chart.seriesContainer.children.push(
        am5.Container.new(healthScoreRoot, {
            centerX: am5.percent(50),
            centerY: am5.percent(50),
            layout: healthScoreRoot.verticalLayout,
            textAlign: "center",
        }),
    );

    const scoreLabel = centerLabel.children.push(
        am5.Label.new(healthScoreRoot, {
            text: "0",
            fontSize: 32,
            fontWeight: "700",
            centerX: am5.percent(50),
            textAlign: "center",
        }),
    );

    const gradeLabel = centerLabel.children.push(
        am5.Label.new(healthScoreRoot, {
            text: "-",
            fontSize: 20,
            fill: am5.color(0x6c757d),
            centerX: am5.percent(50),
        }),
    );

    centerLabel.children.push(
        am5.Label.new(healthScoreRoot, {
            text: translations.i18n["pontuacao_de_saude"],
            fontSize: 12,
            fill: am5.color(0xadb5bd),
            centerX: am5.percent(50),
        }),
    );

    series.appear(1000, 100);
    chart.appear(1000, 100);

    healthScoreSeries = series;
    healthScoreCenterLabel = { scoreLabel, gradeLabel };
};

var updateHealthScoreChart = (score, grade) => {
    if (!healthScoreSeries || !healthScoreCenterLabel) return;

    const numericScore = Math.max(0, Math.min(Number(score), 100));

    let fillColor = am5.color(0x198754);
    if (numericScore < 60) fillColor = am5.color(0xf5c518);
    if (numericScore < 40) fillColor = am5.color(0xdc3545);

    healthScoreSeries.data.setAll([
        {
            category: translations.i18n["restante"],
            value: 100 - numericScore,
        },
        {
            category: translations.i18n["pontuacao"],
            value: numericScore,
        },
    ]);

    const scoreSlice = healthScoreSeries.dataItems[1];
    scoreSlice.set("fill", fillColor);

    const remainingSlice = healthScoreSeries.dataItems[0];
    remainingSlice.set("fill", am5.color(0xe9ecef));

    const translatedGrade = labelTranslations[grade] || grade;

    healthScoreCenterLabel.scoreLabel.set("text", `${numericScore}`);
    healthScoreCenterLabel.gradeLabel.set("text", translatedGrade);
};
__r['m33'] = __r['m33'] || {};
__r['m33'].initHealthScoreChart = initHealthScoreChart;
__r['m33'].updateHealthScoreChart = updateHealthScoreChart;

// --- _js/radar/sleep-report/charts/daytime.js ---
var daytimeChart = null;
var daytimeSeries = null;
var centerLabel = null;

var formatTime = (seconds) => {
    const totalSeconds = Number(seconds) || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

var initDaytimeActivityChart = (
    container = "daytime-activity-chart",
) => {
    const root = am5.Root.new(container);
    root._logo?.dispose();

    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
        am5percent.PieChart.new(root, {
            layout: root.verticalLayout,
            innerRadius: am5.percent(60),
        }),
    );

    const series = chart.series.push(
        am5percent.PieSeries.new(root, {
            valueField: "value",
            categoryField: "category",
            alignLabels: false,
        }),
    );

    series.labels.template.setAll({
        text: "{category}: {duration}",
        radius: 10,
    });

    const legend = chart.children.push(
        am5.Legend.new(root, {
            centerX: am5.percent(50),
            x: am5.percent(50),
            layout: root.horizontalLayout,
        }),
    );

    legend.data.setAll(series.dataItems);

    centerLabel = chart.seriesContainer.children.push(
        am5.Label.new(root, {
            text: "",
            centerX: am5.percent(50),
            centerY: am5.percent(50),
            textAlign: "center",
            fontSize: 20,
            fontWeight: "500",
        }),
    );

    daytimeChart = chart;
    daytimeSeries = series;
};

var updateDaytimeActivityChart = (data) => {
    if (!data || !data.activity) return;

    const activity = data.activity;
    const durations = activity.durations || {};
    const percentages = activity.percentages || {};

    const chartData = [
        {
            category: translations.i18n["andar"],
            value: Number(percentages.walking),
            duration: formatTime(durations.walkingSeconds),
        },
        {
            category: translations.i18n["parado"],
            value: Number(percentages.static),
            duration: formatTime(durations.staticSeconds),
        },
        {
            category: translations.i18n["outro"],
            value: Number(percentages.other),
            duration: formatTime(durations.otherSeconds),
        },
    ];

    daytimeSeries.data.setAll(chartData);

    daytimeChart.children.values.forEach((child) => {
        if (child instanceof am5.Legend) {
            child.data.setAll(daytimeSeries.dataItems);
        }
    });

    const formattedInRoom = formatTime(durations.inRoomSeconds);
    if (centerLabel) {
        centerLabel.set(
            "text",
            `${translations.i18n["no_quarto"]}\n${formattedInRoom}`,
        );
    }
};
__r['m34'] = __r['m34'] || {};
__r['m34'].initDaytimeActivityChart = initDaytimeActivityChart;
__r['m34'].updateDaytimeActivityChart = updateDaytimeActivityChart;

// --- _js/radar/sleep-report/charts/sleep.js ---
var SLEEP_STATUS = {
    3: { label: translations.i18n["saida_da_cama_chart"], color: 0x003366 },
    2: { label: translations.i18n["acordado"], color: 0xc0c0c0 },
    7: { label: translations.i18n["rem"], color: 0xff9933 },
    1: { label: translations.i18n["sono_leve"], color: 0x80c0ff },
    0: {
        label: translations.i18n["sono_profundo"],
        color: 0x744596,
    },
};

var STATUS_TO_Y = {
    3: 4,
    2: 3,
    7: 2,
    1: 1,
    0: 0,
};

var parseReportWallClockDate = (value) => {
    const match = String(value || "")
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);

    if (!match) return null;

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6] || 0),
        0,
    );
};

var chartComponents = null;
var sleepSeries = null;
var transitionSeries = null;
var chartContainer = null;
var hoverOverlay = null;
var hoverTooltip = null;
var SEGMENT_VERTICAL_PADDING = 0.2;
var SLEEP_TOOLTIP_OFFSET_PX = 12;

var escapeHtml = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

var colorToHex = (color) => {
    if (!color) return "#212529";

    if (typeof color === "string") return color;

    if (typeof color === "number") {
        return `#${color.toString(16).padStart(6, "0")}`;
    }

    if (typeof color.toCSSHex === "function") {
        return color.toCSSHex();
    }

    return "#212529";
};

var getReadableTextColor = (hexColor) => {
    const normalized = String(hexColor || "")
        .replace("#", "")
        .trim();

    if (normalized.length !== 6) {
        return "#ffffff";
    }

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.62 ? "#212529" : "#ffffff";
};

var ensureHoverOverlay = (containerId) => {
    chartContainer = document.getElementById(containerId);
    if (!chartContainer) return;

    if (getComputedStyle(chartContainer).position === "static") {
        chartContainer.style.position = "relative";
    }

    hoverOverlay?.remove();

    hoverOverlay = document.createElement("div");
    hoverOverlay.className = "sleep-chart-hover-overlay";
    hoverOverlay.style.position = "absolute";
    hoverOverlay.style.inset = "0";
    hoverOverlay.style.pointerEvents = "none";
    hoverOverlay.style.zIndex = "5";

    hoverTooltip = document.createElement("div");
    hoverTooltip.className = "sleep-chart-hover-tooltip";
    hoverTooltip.style.position = "absolute";
    hoverTooltip.style.display = "none";
    hoverTooltip.style.pointerEvents = "none";
    hoverTooltip.style.padding = "6px 10px";
    hoverTooltip.style.borderRadius = "6px";
    hoverTooltip.style.fontSize = "12px";
    hoverTooltip.style.lineHeight = "1.4";
    hoverTooltip.style.whiteSpace = "nowrap";
    hoverTooltip.style.boxShadow = "0 6px 18px rgba(0, 0, 0, 0.18)";
    hoverTooltip.style.transform = "translate(-50%, calc(-100% - 8px))";

    hoverOverlay.appendChild(hoverTooltip);
    chartContainer.appendChild(hoverOverlay);
};

var hideHoverTooltip = () => {
    if (hoverTooltip) {
        hoverTooltip.style.display = "none";
    }
};

var updateHoverTooltipPosition = (event) => {
    if (!hoverOverlay || !hoverTooltip) return;

    const bounds = hoverOverlay.getBoundingClientRect();
    const nextLeft = Math.min(
        Math.max(event.clientX - bounds.left, 18),
        Math.max(bounds.width - 18, 18),
    );
    const nextTop = Math.max(
        event.clientY - bounds.top - SLEEP_TOOLTIP_OFFSET_PX,
        8,
    );

    hoverTooltip.style.left = `${nextLeft}px`;
    hoverTooltip.style.top = `${nextTop}px`;
};

var showHoverTooltip = (event, item) => {
    if (!hoverTooltip) return;

    const backgroundColor = colorToHex(item?.fill ?? item?.color);
    const textColor = getReadableTextColor(backgroundColor);

    hoverTooltip.innerHTML = escapeHtml(item?.tooltipLabel).replaceAll(
        "\n",
        "<br>",
    );
    hoverTooltip.style.display = "block";
    hoverTooltip.style.background = backgroundColor;
    hoverTooltip.style.color = textColor;
    updateHoverTooltipPosition(event);
};

var getSpriteCoordinate = (sprite, key) => {
    if (!sprite) return 0;

    const directValue = sprite.get?.(key);
    if (Number.isFinite(directValue)) {
        return directValue;
    }

    const privateValue = sprite.getPrivate?.(key);
    if (Number.isFinite(privateValue)) {
        return privateValue;
    }

    const method = sprite[key];
    if (typeof method === "function") {
        const methodValue = method.call(sprite);
        if (Number.isFinite(methodValue)) {
            return methodValue;
        }
    }

    return 0;
};

var syncHoverOverlay = () => {
    if (!hoverOverlay || !chartComponents?.chart || !sleepSeries) {
        return;
    }

    Array.from(hoverOverlay.querySelectorAll(".sleep-chart-hit-area")).forEach(
        (node) => node.remove(),
    );

    const dataItems = sleepSeries.dataItems || [];
    if (!dataItems.length) {
        hideHoverTooltip();
        return;
    }

    const chart = chartComponents.chart;
    const plotContainer = chart.plotContainer;
    const leftAxesContainer = chart.leftAxesContainer;
    const topAxesContainer = chart.topAxesContainer;
    const chartPaddingLeft = Number(chart.get("paddingLeft") || 0);
    const chartPaddingTop = Number(chart.get("paddingTop") || 0);

    hoverOverlay.style.inset = "auto";
    hoverOverlay.style.left = `${getSpriteCoordinate(leftAxesContainer, "width") + chartPaddingLeft}px`;
    hoverOverlay.style.top = `${getSpriteCoordinate(topAxesContainer, "height") + chartPaddingTop}px`;
    hoverOverlay.style.width = `${getSpriteCoordinate(plotContainer, "width")}px`;
    hoverOverlay.style.height = `${getSpriteCoordinate(plotContainer, "height")}px`;

    dataItems.forEach((dataItem) => {
        const item = dataItem.dataContext;
        const graphics = dataItem.get("graphics");
        if (!graphics || !item) {
            return;
        }

        const left = getSpriteCoordinate(graphics, "x");
        const top = getSpriteCoordinate(graphics, "y");
        const width = getSpriteCoordinate(graphics, "width");
        const height = getSpriteCoordinate(graphics, "height");

        if (
            !Number.isFinite(left) ||
            !Number.isFinite(top) ||
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width <= 0 ||
            height <= 0
        ) {
            return;
        }

        const hitArea = document.createElement("div");
        hitArea.className = "sleep-chart-hit-area";
        hitArea.style.position = "absolute";
        hitArea.style.left = `${left}px`;
        hitArea.style.top = `${top}px`;
        hitArea.style.width = `${width}px`;
        hitArea.style.height = `${height}px`;
        hitArea.style.pointerEvents = "auto";
        hitArea.style.background = "transparent";

        hitArea.addEventListener("mouseenter", (event) => {
            showHoverTooltip(event, item);
        });
        hitArea.addEventListener("mousemove", (event) => {
            showHoverTooltip(event, item);
        });
        hitArea.addEventListener("mouseleave", () => {
            hideHoverTooltip();
        });

        hoverOverlay.appendChild(hitArea);
    });
};

var buildTransitionGradient = (root, topColor, bottomColor) => {
    return am5.LinearGradient.new(root, {
        rotation: 90,
        stops: [
            { color: topColor, opacity: 1, offset: 0 },
            { color: topColor, opacity: 1, offset: 0.28 },
            { color: bottomColor, opacity: 1, offset: 0.72 },
            { color: bottomColor, opacity: 1, offset: 1 },
        ],
    });
};

var getTransitionHalfWidth = (current, next) => {
    const currentDuration = current.endTime - current.startTime;
    const nextDuration = next.endTime - next.startTime;

    return Math.max(
        4000,
        Math.min(
            18000,
            Math.floor(Math.min(currentDuration, nextDuration) / 5),
        ),
    );
};

var buildSleepTransitionData = (segments, root) => {
    const transitions = [];

    for (let index = 0; index < segments.length - 1; index++) {
        const current = segments[index];
        const next = segments[index + 1];

        if (!current || !next || current.status === next.status) {
            continue;
        }

        const boundaryTime = current.endTime;
        const gapMs = Math.abs(next.startTime - boundaryTime);

        if (gapMs > 1000) {
            continue;
        }

        const halfWidth = getTransitionHalfWidth(current, next);
        const fromY = current.y1 + 0.5;
        const toY = next.y1 + 0.5;
        const topSegment = fromY >= toY ? current : next;
        const bottomSegment = fromY >= toY ? next : current;

        transitions.push({
            startTime: boundaryTime - halfWidth,
            endTime: boundaryTime + halfWidth,
            y1: Math.min(fromY, toY),
            y2: Math.max(fromY, toY),
            fill: current.fill,
            fillGradient: buildTransitionGradient(
                root,
                topSegment.fill,
                bottomSegment.fill,
            ),
        });
    }

    return transitions;
};

var initSleepChart = function() {
    if (chartComponents) return;

    ensureHoverOverlay("sleep-chart");
    const root = am5.Root.new("sleep-chart");
    root._logo?.dispose();

    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            layout: root.verticalLayout,
        }),
    );

    const xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(root, {
            baseInterval: { timeUnit: "minute", count: 1 },
            endLocation: 0.1,
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 50,
            }),
        }),
    );

    const yRenderer = am5xy.AxisRendererY.new(root, {
        strokeOpacity: 0.1,
        minGridDistance: 1,
        inside: false,
    });

    yRenderer.grid.template.setAll({
        forceHidden: true,
    });

    yRenderer.labels.template.setAll({
        forceHidden: true,
    });

    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 0,
            max: 5,
            strictMinMax: true,
            renderer: yRenderer,
        }),
    );

    const stageLabels = [
        { value: 4.5, text: SLEEP_STATUS[3].label, color: 0x003366 },
        { value: 3.5, text: SLEEP_STATUS[2].label, color: 0x555555 },
        { value: 2.5, text: SLEEP_STATUS[7].label, color: 0xcc7700 },
        { value: 1.5, text: SLEEP_STATUS[1].label, color: 0x4070cc },
        { value: 0.5, text: SLEEP_STATUS[0].label, color: 0x744596 },
    ];

    stageLabels.forEach((stage) => {
        const rangeDataItem = yAxis.makeDataItem({ value: stage.value });
        const range = yAxis.createAxisRange(rangeDataItem);

        range.get("label").setAll({
            text: stage.text,
            fill: am5.color(stage.color),
            fontSize: "12px",
            fontWeight: "bold",
            centerX: am5.p100,
            paddingRight: 15,
            visible: true,
            forceHidden: false,
        });

        range.get("grid").setAll({
            strokeOpacity: 0.2,
            strokeDasharray: [3, 3],
            location: 1,
            visible: true,
            forceHidden: false,
        });
    });

    transitionSeries = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            xAxis: xAxis,
            yAxis: yAxis,
            openValueYField: "y1",
            valueYField: "y2",
            openValueXField: "startTime",
            valueXField: "endTime",
        }),
    );

    transitionSeries.columns.template.setAll({
        strokeOpacity: 0,
        interactive: false,
        forceInactive: true,
    });

    transitionSeries.columns.template.adapters.add("fill", (fill, target) => {
        return target.dataItem?.dataContext?.fill ?? fill;
    });

    transitionSeries.columns.template.adapters.add(
        "fillGradient",
        (fillGradient, target) => {
            return target.dataItem?.dataContext?.fillGradient ?? fillGradient;
        },
    );

    sleepSeries = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            xAxis: xAxis,
            yAxis: yAxis,
            openValueYField: "y1",
            valueYField: "y2",
            openValueXField: "startTime",
            valueXField: "endTime",
        }),
    );

    sleepSeries.columns.template.setAll({
        strokeOpacity: 0,
        width: am5.percent(100),
        interactive: false,
        forceInactive: true,
    });

    sleepSeries.columns.template.adapters.add("fill", (fill, target) => {
        return target.dataItem?.dataContext?.fill ?? fill;
    });

    chartComponents = { root, chart, xAxis, yAxis };
    return chartComponents;
}

var updateSleepChart = function(data, window) {
    if (!sleepSeries || !transitionSeries) return;

    if (!data?.length) {
        sleepSeries.data.setAll([]);
        transitionSeries.data.setAll([]);
        syncHoverOverlay();
        return;
    }

    const chartData = data
        .map((item) => {
            const statusKey = Number.parseInt(item.code ?? item.status, 10);
            const yPos = STATUS_TO_Y[statusKey] ?? 0;
            const config = SLEEP_STATUS[statusKey] || {
                label: translations.i18n["desconhecido_simples"],
                color: 0x999999,
            };

            const start = parseReportWallClockDate(item.start);
            const end = parseReportWallClockDate(item.end);

            if (!start || !end || end <= start) {
                return null;
            }

            return {
                status: statusKey,
                statusText: config.label,
                startTime: start.getTime(),
                endTime: end.getTime(),
                startTimeFormatted: chartComponents.root.dateFormatter.format(
                    start,
                    "HH:mm",
                ),
                endTimeFormatted: chartComponents.root.dateFormatter.format(
                    end,
                    "HH:mm",
                ),
                tooltipLabel: `${config.label}: ${chartComponents.root.dateFormatter.format(
                    start,
                    "HH:mm",
                )} - ${chartComponents.root.dateFormatter.format(end, "HH:mm")}`,
                y1: yPos + SEGMENT_VERTICAL_PADDING,
                y2: yPos + 1 - SEGMENT_VERTICAL_PADDING,
                fill: am5.color(config.color),
            };
        })
        .filter(Boolean);

    const transitionData = buildSleepTransitionData(
        chartData,
        chartComponents.root,
    );

    transitionSeries.data.setAll(transitionData);
    sleepSeries.data.setAll(chartData);

    const minDate = parseReportWallClockDate(window?.start);
    const maxDate = parseReportWallClockDate(window?.end);

    if (minDate && maxDate) {
        chartComponents.xAxis.set("min", minDate.getTime());
        chartComponents.xAxis.set("max", maxDate.getTime());
    }

    chartComponents.root.events.once("frameended", () => {
        syncHoverOverlay();
    });
}
__r['m35'] = __r['m35'] || {};
__r['m35'].initSleepChart = initSleepChart;
__r['m35'].updateSleepChart = updateSleepChart;

// --- _js/radar/sleep-report/charts/timeline-sleep.js ---
var root;
var chart;
var xAxis;
var yAxis;
var rangeSeries;
var chartContainer;
var hoverOverlay;
var hoverTooltip;
var MIN_LABEL_WIDTH_PX = 28;
var LABEL_HORIZONTAL_PADDING_PX = 14;
var TIMELINE_TOOLTIP_OFFSET_PX = 12;

var ROW_CATEGORY = "sleep-session";
var SEGMENT_LABELS = {
    inBed: translations.i18n["tempo_na_cama"],
    latency: translations.i18n["latencia_de_sono"],
    sleep: translations.i18n["sono"],
    awake: translations.i18n["acordado"],
    outOfBed: translations.i18n["saida_da_cama_chart"],
};
var INTERVAL_CATEGORY_CONFIG = {
    sleep_latency: {
        label: SEGMENT_LABELS.latency,
        color: 0x6c757d,
    },
    sleeping: {
        label: SEGMENT_LABELS.sleep,
        color: 0x0d6efd,
    },
    just_in_bed: {
        label: SEGMENT_LABELS.awake,
        color: 0xffc107,
    },
    out_of_bed: {
        label: SEGMENT_LABELS.outOfBed,
        color: 0x003366,
    },
};

var formatDuration = (ms) => {
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

var formatTime = (date) => {
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
};

var buildDisplayLabel = (title, durationLabel) =>
    `${title} • ${durationLabel}`;

var getColumnPixelWidth = (target) => {
    const column = target?.dataItem?.get("graphics");
    return Number(column?.getPrivate("width") || 0);
};

var escapeHtml = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

var colorToHex = (color) => {
    if (!color) return "#212529";

    if (typeof color === "string") return color;

    if (typeof color === "number") {
        return `#${color.toString(16).padStart(6, "0")}`;
    }

    if (typeof color.toCSSHex === "function") {
        return color.toCSSHex();
    }

    return "#212529";
};

var getReadableTextColor = (hexColor) => {
    const normalized = String(hexColor || "")
        .replace("#", "")
        .trim();

    if (normalized.length !== 6) {
        return "#ffffff";
    }

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.62 ? "#212529" : "#ffffff";
};

var ensureHoverOverlay = (containerId) => {
    chartContainer = document.getElementById(containerId);
    if (!chartContainer) return;

    if (getComputedStyle(chartContainer).position === "static") {
        chartContainer.style.position = "relative";
    }

    hoverOverlay?.remove();

    hoverOverlay = document.createElement("div");
    hoverOverlay.className = "timeline-sleep-hover-overlay";
    hoverOverlay.style.position = "absolute";
    hoverOverlay.style.inset = "0";
    hoverOverlay.style.pointerEvents = "none";
    hoverOverlay.style.zIndex = "5";

    hoverTooltip = document.createElement("div");
    hoverTooltip.className = "timeline-sleep-hover-tooltip";
    hoverTooltip.style.position = "absolute";
    hoverTooltip.style.display = "none";
    hoverTooltip.style.pointerEvents = "none";
    hoverTooltip.style.padding = "6px 10px";
    hoverTooltip.style.borderRadius = "6px";
    hoverTooltip.style.background = "rgba(33, 37, 41, 0.95)";
    hoverTooltip.style.color = "#fff";
    hoverTooltip.style.fontSize = "12px";
    hoverTooltip.style.lineHeight = "1.4";
    hoverTooltip.style.whiteSpace = "nowrap";
    hoverTooltip.style.boxShadow = "0 6px 18px rgba(0, 0, 0, 0.18)";
    hoverTooltip.style.transform = "translate(-50%, calc(-100% - 8px))";

    hoverOverlay.appendChild(hoverTooltip);
    chartContainer.appendChild(hoverOverlay);
};

var hideHoverTooltip = () => {
    if (hoverTooltip) {
        hoverTooltip.style.display = "none";
    }
};

var updateHoverTooltipPosition = (event) => {
    if (!hoverOverlay || !hoverTooltip) return;

    const bounds = hoverOverlay.getBoundingClientRect();
    const nextLeft = Math.min(
        Math.max(event.clientX - bounds.left, 18),
        Math.max(bounds.width - 18, 18),
    );
    const nextTop = Math.max(event.clientY - bounds.top - TIMELINE_TOOLTIP_OFFSET_PX, 8);

    hoverTooltip.style.left = `${nextLeft}px`;
    hoverTooltip.style.top = `${nextTop}px`;
};

var showHoverTooltip = (event, item) => {
    if (!hoverTooltip) return;

    const backgroundColor = colorToHex(item?.color);
    const textColor = getReadableTextColor(backgroundColor);

    hoverTooltip.innerHTML = escapeHtml(item?.tooltipLabel).replaceAll(
        "\n",
        "<br>",
    );
    hoverTooltip.style.display = "block";
    hoverTooltip.style.background = backgroundColor;
    hoverTooltip.style.color = textColor;
    updateHoverTooltipPosition(event);
};

var syncHoverOverlay = (timelineData) => {
    if (!hoverOverlay || !hoverTooltip || !xAxis) return;

    Array.from(hoverOverlay.querySelectorAll(".timeline-sleep-hit-area")).forEach(
        (node) => node.remove(),
    );

    if (!timelineData.length) {
        hideHoverTooltip();
        return;
    }

    const renderer = xAxis.get("renderer");
    if (!renderer?.positionToCoordinate) {
        hideHoverTooltip();
        return;
    }

    timelineData.forEach((item) => {
        const startPosition = xAxis.valueToPosition(item.start);
        const endPosition = xAxis.valueToPosition(item.end);
        const left = renderer.positionToCoordinate(startPosition);
        const right = renderer.positionToCoordinate(endPosition);

        if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left) {
            return;
        }

        const hitArea = document.createElement("div");
        hitArea.className = "timeline-sleep-hit-area";
        hitArea.style.position = "absolute";
        hitArea.style.left = `${left}px`;
        hitArea.style.top = "0";
        hitArea.style.width = `${right - left}px`;
        hitArea.style.height = "100%";
        hitArea.style.pointerEvents = "auto";
        hitArea.style.background = "transparent";

        hitArea.addEventListener("mouseenter", (event) => {
            showHoverTooltip(event, item);
        });
        hitArea.addEventListener("mousemove", (event) => {
            showHoverTooltip(event, item);
        });
        hitArea.addEventListener("mouseleave", () => {
            hideHoverTooltip();
        });

        hoverOverlay.appendChild(hitArea);
    });
};

var parseReportWallClockDate = (value) => {
    const match = String(value || "")
        .trim()
        .match(
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
        );

    if (!match) return null;

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6] || 0),
        0,
    );
};

var buildTimelineData = (
    getBed,
    sleepStart,
    sleepEnd,
    leaveBed,
    hasSleepData,
) => {
    if (!hasSleepData) {
        const totalMs = leaveBed - getBed;
        if (totalMs <= 0 || totalMs >= 172800000) return [];
        const durationLabel = formatDuration(totalMs);
        const categoryLabel = translations.i18n["tempo_na_cama"];
        const labelText = `${translations.i18n["tempo_na_cama"]}\n${formatTime(getBed)} - ${formatTime(leaveBed)} (${formatDuration(totalMs)})`;
        return [
            {
                category: ROW_CATEGORY,
                start: getBed.getTime(),
                end: leaveBed.getTime(),
                color: am5.color(0x0d6efd),
                label: buildDisplayLabel(categoryLabel, durationLabel),
                tooltipLabel: labelText,
            },
        ];
    }

    const latencyMs = sleepStart - getBed;
    const sleepMs = sleepEnd - sleepStart;
    const awakeMs = leaveBed.getTime() - sleepEnd.getTime();

    const categories = [];

    if (latencyMs > 0) {
        const durationLabel = formatDuration(latencyMs);
        categories.push({
            category: ROW_CATEGORY,
            start: getBed.getTime(),
            end: sleepStart.getTime(),
            color: am5.color(0x6c757d),
            label: buildDisplayLabel(SEGMENT_LABELS.latency, durationLabel),
            tooltipLabel: `${SEGMENT_LABELS.latency}\n${formatTime(getBed)} - ${formatTime(sleepStart)} (${durationLabel})`,
        });
    }

    if (sleepMs > 0) {
        const durationLabel = formatDuration(sleepMs);
        categories.push({
            category: ROW_CATEGORY,
            start: sleepStart.getTime(),
            end: sleepEnd.getTime(),
            color: am5.color(0x0d6efd),
            label: buildDisplayLabel(SEGMENT_LABELS.sleep, durationLabel),
            tooltipLabel: `${SEGMENT_LABELS.sleep}\n${formatTime(sleepStart)} - ${formatTime(sleepEnd)} (${durationLabel})`,
        });
    }

    if (
        awakeMs > 0 &&
        (sleepEnd.getHours() !== leaveBed.getHours() ||
            sleepEnd.getMinutes() !== leaveBed.getMinutes())
    ) {
        const durationLabel = formatDuration(awakeMs);
        categories.push({
            category: ROW_CATEGORY,
            start: sleepEnd.getTime(),
            end: leaveBed.getTime(),
            color: am5.color(0xffc107),
            label: buildDisplayLabel(SEGMENT_LABELS.awake, durationLabel),
            tooltipLabel: `${SEGMENT_LABELS.awake}\n${formatTime(sleepEnd)} - ${formatTime(leaveBed)} (${durationLabel})`,
        });
    }

    return categories;
};

var buildTimelineDataFromIntervals = (intervals = []) => {
    if (!Array.isArray(intervals) || !intervals.length) return [];

    return intervals
        .map((interval) => {
            const start = parseReportWallClockDate(interval?.start);
            const end = parseReportWallClockDate(interval?.end);

            if (!start || !end || end <= start) {
                return null;
            }

            const config =
                INTERVAL_CATEGORY_CONFIG[interval?.category] ||
                INTERVAL_CATEGORY_CONFIG.just_in_bed;
            const durationMs = end.getTime() - start.getTime();
            const durationLabel = formatDuration(durationMs);

            return {
                category: ROW_CATEGORY,
                start: start.getTime(),
                end: end.getTime(),
                color: am5.color(config.color),
                label: buildDisplayLabel(config.label, durationLabel),
                tooltipLabel: `${config.label}\n${formatTime(start)} - ${formatTime(end)} (${durationLabel})`,
            };
        })
        .filter(Boolean);
};

var initSleepTimelineChart = function(containerId = "timeline-sleep-chart") {
    if (root) root.dispose();

    ensureHoverOverlay(containerId);
    root = am5.Root.new(containerId);
    root._logo?.dispose();

    chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            wheelX: "none",
            layout: root.verticalLayout,
            paddingLeft: 0,
        }),
    );

    xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(root, {
            baseInterval: { timeUnit: "minute", count: 1 },
            startLocation: -0.1,
            endLocation: 0.1,
            extraMin: 0.01,
            extraMax: 0.01,
            renderer: am5xy.AxisRendererX.new(root, {
                minGridDistance: 70,
            }),
            dateFormats: {
                day: "HH:mm",
                hour: "HH:mm",
                minute: "HH:mm",
            },
            periodChangeDateFormats: {
                day: "HH:mm",
                hour: "HH:mm",
                minute: "HH:mm",
            },
        }),
    );

    yAxis = chart.yAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "category",
            renderer: am5xy.AxisRendererY.new(root, {
                inversed: true,
            }),
        }),
    );

    const yRenderer = yAxis.get("renderer");

    yRenderer.labels.template.set("forceHidden", true);
    yRenderer.grid.template.setAll({
        forceHidden: true,
    });
    const baseGrid = yRenderer.get("baseGrid");
    if (baseGrid) {
        baseGrid.setAll({
            forceHidden: true,
            visible: false,
            strokeOpacity: 0,
        });
    }

    rangeSeries = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            xAxis,
            yAxis,
            openValueXField: "start",
            valueXField: "end",
            categoryYField: "category",
            sequencedInterpolation: true,
        }),
    );

    rangeSeries.columns.template.setAll({
        height: am5.percent(60),
        cornerRadiusTL: 4,
        cornerRadiusTR: 4,
        cornerRadiusBL: 4,
        cornerRadiusBR: 4,
        strokeOpacity: 0,
        interactive: false,
        forceInactive: true,
    });

    rangeSeries.columns.template.adapters.add("fill", (fill, target) => {
        return target.dataItem.dataContext.color || fill;
    });

    rangeSeries.bullets.push(() => {
        const label = am5.Label.new(root, {
            text: "{label}",
            fill: am5.color(0xffffff),
            centerX: am5.p50,
            centerY: am5.p50,
            fontSize: 11,
            populateText: true,
            textAlign: "center",
            interactive: false,
            oversizedBehavior: "truncate",
            ellipsis: "...",
            maxWidth: 160,
            paddingLeft: 4,
            paddingRight: 4,
        });

        label.adapters.add("maxWidth", (maxWidth, target) => {
            const columnWidth = getColumnPixelWidth(target);
            if (columnWidth <= 0) return maxWidth;

            return Math.max(0, columnWidth - LABEL_HORIZONTAL_PADDING_PX);
        });

        label.adapters.add("visible", (visible, target) => {
            const columnWidth = getColumnPixelWidth(target);
            return visible && columnWidth >= MIN_LABEL_WIDTH_PX;
        });

        return am5.Bullet.new(root, {
            locationX: 0.5,
            sprite: label,
        });
    });

}

var updateSleepTimeline = function(session, window) {
    if (!root) return;

    const bedStartIso = session?.bedTime?.start;
    const bedEndIso = session?.bedTime?.end;
    const sleepStartIso = session?.sleep?.start;
    const sleepEndIso = session?.sleep?.end;

    if (!bedStartIso || !bedEndIso) {
        rangeSeries.data.setAll([]);
        syncHoverOverlay([]);
        return;
    }

    const getBed = parseReportWallClockDate(bedStartIso);
    const leaveBed = parseReportWallClockDate(bedEndIso);

    if (!getBed || !leaveBed) {
        rangeSeries.data.setAll([]);
        syncHoverOverlay([]);
        return;
    }

    const hasSleepData = Boolean(sleepStartIso && sleepEndIso);

    let sleepStart = getBed;
    let sleepEnd = leaveBed;

    if (hasSleepData) {
        sleepStart = parseReportWallClockDate(sleepStartIso) || getBed;
        sleepEnd = parseReportWallClockDate(sleepEndIso) || leaveBed;
    }

    const timelineIntervals = buildTimelineDataFromIntervals(session?.intervals);
    const timelineData = timelineIntervals.length
        ? timelineIntervals
        : buildTimelineData(
              getBed,
              sleepStart,
              sleepEnd,
              leaveBed,
              hasSleepData,
          );

    yAxis.data.setAll([{ category: ROW_CATEGORY }]);
    rangeSeries.data.setAll(timelineData);

    if (window?.start && window?.end && xAxis) {
        const minDate = parseReportWallClockDate(window.start);
        const maxDate = parseReportWallClockDate(window.end);

        if (minDate && maxDate) {
            xAxis.set("min", minDate.getTime());
            xAxis.set("max", maxDate.getTime());
        }
    }

    root.events.once("frameended", () => {
        syncHoverOverlay(timelineData);
    });

    rangeSeries.appear(1000);
    chart.appear(1000, 100);
}
__r['m36'] = __r['m36'] || {};
__r['m36'].initSleepTimelineChart = initSleepTimelineChart;
__r['m36'].updateSleepTimeline = updateSleepTimeline;

// --- _js/radar/sleep-report/main.js ---
var Breathe = __r['m31'];
var Daytime = __r['m34'];
var HealthScore = __r['m33'];
var HeartRate = __r['m32'];
var Sleep = __r['m35'];
var Timeline = __r['m36'];
var Suggestion = __r['m29'];
var DatePicker = __r['m28'];
var initKPIElements = __r['m30'].initKPIElements, updateKPIs = __r['m30'].updateKPIs;
var ensureNestedModalBackdrop = __r['m14'].ensureNestedModalBackdrop, removeNestedModalBackdrop = __r['m14'].removeNestedModalBackdrop, restoreParentModalScrollState = __r['m14'].restoreParentModalScrollState;
var toast = __r['m4'].toast;









var DOM = {
    modal: document.getElementById("sleepReportModal"),
    container: document.querySelector("#sleepReportModal .modal-body"),
    dateField: document.getElementById("pick-date-field"),
    periodPickers: document.querySelectorAll("[data-sleep-report-period-picker]"),
    noDataState: document.getElementById("no-data-state"),
    reportContent: document.getElementById("report-content-wrapper"),
};

var currentDevice = { id: null, name: null };
var sleepReportBackdropEl = null;
var isDueMessage = translations.i18n["relatorio_de_hoje_apos_8h"];
var SLEEP_REPORT_URL = "/modulos/radares/_ajax/sleep-reports.php";

var parseIsoWallClockParts = (value) => {
    const match = String(value || "")
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);

    if (!match) return null;

    return {
        date: `${match[1]}-${match[2]}-${match[3]}`,
        hour: Number.parseInt(match[4], 10),
    };
};

var getCurrentLocalDateParts = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return {
        date: `${year}-${month}-${day}`,
        hour: now.getHours(),
    };
};

var getSleepReportNowContext = (data) => {
    const generatedParts = parseIsoWallClockParts(data?.report?.generatedAt);
    if (generatedParts) {
        return generatedParts;
    }

    return getCurrentLocalDateParts();
};

var getToday = () => getCurrentLocalDateParts().date;

var setReportVisibility = (hasData) => {
    if (DOM.noDataState) DOM.noDataState.classList.toggle("d-none", hasData);
    if (DOM.reportContent)
        DOM.reportContent.classList.toggle("d-none", !hasData);
};

var syncPeriodPickerVisibility = (activePane = "#sleep-report-daily-pane") => {
    const activePeriod =
        activePane === "#sleep-report-monthly-pane" ? "monthly" : "daily";

    DOM.periodPickers.forEach((picker) => {
        picker.classList.toggle(
            "d-none",
            picker.dataset.sleepReportPeriodPicker !== activePeriod,
        );
    });
};

var hasRenderableReport = (data) =>
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

var requestJson = async (url) => {
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

var fetchLocalSleepReport = async (uid, date) => {
    const url = new URL(SLEEP_REPORT_URL, window.location.origin);
    url.searchParams.set("period", "daily");
    url.searchParams.set("view", "report");
    url.searchParams.set("uid", uid);
    url.searchParams.set("date", date);
    // url.searchParams.set("debug", 1);

    return requestJson(url);
};

var fetchStoredSleepReport = async (uid, date) => {
    const url = new URL(SLEEP_REPORT_URL, window.location.origin);
    url.searchParams.set("period", "daily");
    url.searchParams.set("view", "stored");
    url.searchParams.set("uid", uid);
    url.searchParams.set("date", date);

    return requestJson(url);
};

var fetchStoredSleepReportDays = async (uid, date) => {
    const url = new URL(SLEEP_REPORT_URL, window.location.origin);
    url.searchParams.set("period", "daily");
    url.searchParams.set("view", "calendar");
    url.searchParams.set("uid", uid);
    url.searchParams.set("date", date);

    return requestJson(url);
};

var refreshStoredReportDays = async (uid, monthDate) => {
    if (!uid || !monthDate) return;

    const daysData = await fetchStoredSleepReportDays(uid, monthDate);
    DatePicker.updateCalendar(Array.isArray(daysData) ? daysData : []);
};

var refreshData = (data) => {
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

var loadSleepReportData = async (uid, date) => {
    const storedResponse = await fetchStoredSleepReport(uid, date);
    if (storedResponse?.found && hasRenderableReport(storedResponse.data)) {
        return storedResponse.data;
    }

    return fetchLocalSleepReport(uid, date);
};

var fetchReport = async (uid, name, date) => {
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

var handleCalendarMonthChange = (firstDayOfMonth) => {
    if (!currentDevice.id) return;

    refreshStoredReportDays(currentDevice.id, firstDayOfMonth).catch(
        (error) => {
            console.warn("Could not refresh stored report days:", error);
        },
    );
};

var handleModalOpen = (e) => {
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

var handleDateChange = () => {
    if (currentDevice.id) {
        fetchReport(currentDevice.id, currentDevice.name, DOM.dateField.value);
    }
};

var renderLoading = (container) => {
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

var removeLoading = (container) => {
    if (!container) return;
    const overlay = container.querySelector(".loading-overlay");
    if (overlay) overlay.remove();
};

var initSleepReportModal = function() {
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
__r['m37'] = __r['m37'] || {};
__r['m37'].initSleepReportModal = initSleepReportModal;

// --- _js/radar/monthly-sleep-report/service.js ---
var SLEEP_REPORT_URL = "/modulos/radares/_ajax/sleep-reports.php";

var requestJson = async (url) => {
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
        } catch (error) {
            payload = null;
        }
    }

    if (!response.ok) {
        const error = new Error(
            payload?.message || `Request failed with status ${response.status}`,
        );
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload;
};

var fetchMonthlySleepReport = (uid, month) => {
    const url = new URL(SLEEP_REPORT_URL, window.location.origin);
    url.searchParams.set("period", "monthly");
    url.searchParams.set("view", "report");
    url.searchParams.set("uid", uid);
    url.searchParams.set("month", month);

    return requestJson(url);
};
__r['m38'] = __r['m38'] || {};
__r['m38'].fetchMonthlySleepReport = fetchMonthlySleepReport;

// --- _js/radar/monthly-sleep-report/charts/helpers.js ---
var DEFAULT_EMPTY_TEXT = translations.i18n["monthly_sleep_sem_dados"];
var DEFAULT_INFO_TEXT = translations.i18n["monthly_sleep_sem_dados"];

var MESSAGE_IMPACTS = {
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

var STACKED_SERIES_COLORS = [0x34bfa3, 0x3699ff, 0xffb822, 0x7e8299];

var CHART_DEFAULTS = {
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

var LABEL_TRANSLATIONS = {
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

var hasAmCharts = () =>
    typeof am5 !== "undefined" && typeof am5xy !== "undefined";

var toArray = (value) => (Array.isArray(value) ? value : []);

var toNumber = (value, fallback = 0) => {
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : fallback;
};

var toNullableNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : null;
};

var hasNumericValue = (rows, key = "value") =>
    rows.some((row) => Number.isFinite(row?.[key]));

var getFirstDefined = (...values) =>
    values.find((value) => value !== undefined && value !== null);

var translateUiLabel = (value) => {
    const label = String(value || "");
    return LABEL_TRANSLATIONS[label] || label;
};

var resolveConfig = (config = {}) => ({
    ...(CHART_DEFAULTS[config.chartKey] || {}),
    ...config,
});

var usesPercentScale = (config = {}) => config.unit === "%";

var getCategory = (item, index) =>
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

var formatDateAxisLabel = (category) => {
    const value = String(category || "");
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(5) : value;
};

var formatNumber = (value) =>
    Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));

var formatSleepWindowTimeValue = (value) => {
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

var normalizeSuffix = (value) => String(value || "").trim();

var formatIntervalAxisLabel = (value, suffix) => {
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

var axisValueKey = (value) =>
    String(Math.round(Number(value) * 100000) / 100000);

var parseIntervalCategory = (category) => {
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

var decorateRows = (rows) => rows.map((row) => ({ ...row }));

var withDisplayCategory = (category) => ({
    category,
    categoryLabel: formatDateAxisLabel(category),
    tooltipCategory: String(category),
});

var normalizeSeriesRows = (payload = {}, config = {}) => {
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

var normalizeIntervalRows = (payload = {}, config = {}) =>
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

var normalizeStackedRows = (payload = {}) => {
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

var normalizeBubbleRows = (payload = {}, config = {}) => {
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

var uniqueCategoryRows = (rows) => {
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

var buildRoot = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container || !hasAmCharts()) return null;

    const root = am5.Root.new(containerId);
    root._logo?.dispose();
    root.setThemes([am5themes_Animated.new(root)]);
    return root;
};

var buildTooltip = (root, labelText) =>
    am5.Tooltip.new(root, {
        labelText,
        pointerOrientation: "horizontal",
    });

var applyTooltipDataColor = (tooltip, fallbackColor) => {
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

var buildNoDataLabel = (root, chart, text) =>
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

var toggleNoData = (label, hasData) => {
    if (label) label.set("visible", !hasData);
};

var addCursor = (root, chart, xAxis, yAxis) => {
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

var applyCategoryLabelAdapter = (axis) => {
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

var getValueUnit = (config) => (config.unit ? ` ${config.unit}` : "");

var buildValueTooltipText = (config, valueField = "valueY") =>
    `{tooltipCategory}\n${config.valueLabel || translateUiLabel(config.title) || translations.i18n["valor"]}: {${valueField}}${getValueUnit(config)}`;

var createXYContainer = (containerId, config = {}) => {
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

var createIntervalColumnChart = (containerId, config = {}) => {
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

var createBarChart = (containerId, rawConfig = {}) => {
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

var createStackedColumnChart = (containerId, rawConfig = {}) => {
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

var createBubbleTimelineChart = (containerId, rawConfig = {}) => {
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

var getChartPayload = (payload, sectionKey, chartKey) => {
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

var getChartMessage = (payload, sectionKey, chartKey, fallback) =>
    payload?.sections?.[sectionKey]?.charts?.[chartKey]?.message ||
    payload?.sections?.[sectionKey]?.messages?.[chartKey] ||
    fallback || { text: DEFAULT_INFO_TEXT, impact: "neutral" };

var normalizeMessage = (message) => {
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

var updateInfoMessage = (messageId, message) => {
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

var updateSectionMessageAlert = (messageId, message) => {
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

var createMonthlyChartModule = (config, chartFactory) => {
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
__r['m39'] = __r['m39'] || {};
__r['m39'].createBarChart = createBarChart;
__r['m39'].createStackedColumnChart = createStackedColumnChart;
__r['m39'].createBubbleTimelineChart = createBubbleTimelineChart;
__r['m39'].getChartPayload = getChartPayload;
__r['m39'].getChartMessage = getChartMessage;
__r['m39'].updateInfoMessage = updateInfoMessage;
__r['m39'].updateSectionMessageAlert = updateSectionMessageAlert;
__r['m39'].createMonthlyChartModule = createMonthlyChartModule;

// --- _js/radar/monthly-sleep-report/charts/sections/activity-status.js ---
var createBarChart = __r['m39'].createBarChart, createMonthlyChartModule = __r['m39'].createMonthlyChartModule, createStackedColumnChart = __r['m39'].createStackedColumnChart;

var sectionKey = "activityStatus";

var createBarSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

var createStackedSectionChart = (config) =>
    createMonthlyChartModule(
        { sectionKey, ...config },
        createStackedColumnChart,
    );

var charts = [
    createBarSectionChart({
        containerId: "monthly-room-in-out-statistics-chart",
        messageId: "monthly-room-in-out-statistics-message",
        chartKey: "roomInOutStatistics",
        title: "In/out room",
        min: 0,
    }),
    createStackedSectionChart({
        containerId: "monthly-indoor-duration-chart",
        messageId: "monthly-indoor-duration-message",
        chartKey: "indoorDuration",
        title: "Indoor duration",
        min: 0,
    }),
    createBarSectionChart({
        containerId: "monthly-walking-steps-chart",
        messageId: "monthly-walking-steps-message",
        chartKey: "walkingSteps",
        title: "Walking steps",
        min: 0,
    }),
    createBarSectionChart({
        containerId: "monthly-walking-speed-chart",
        messageId: "monthly-walking-speed-message",
        chartKey: "walkingSpeed",
        title: "Walking speed",
        min: 0,
    }),
];
__r['m40'] = __r['m40'] || {};
__r['m40'].charts = charts;

// --- _js/radar/monthly-sleep-report/charts/sections/body-movement-condition.js ---
var createBarChart = __r['m39'].createBarChart, createMonthlyChartModule = __r['m39'].createMonthlyChartModule;

var sectionKey = "bodyMovementCondition";

var createSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

var charts = [
    createSectionChart({
        containerId: "monthly-body-movement-index-statistics-chart",
        messageId: "monthly-body-movement-index-statistics-message",
        chartKey: "bodyMovementIndexStatistics",
        title: "Body movement index statistics",
        min: 0,
        max: 250,
        fallbackMessage:
            "50% of the mobility index was concentrated between 0 and 80, and the overall performance was normal.",
    }),
    createSectionChart({
        containerId: "monthly-body-movement-index-distribution-chart",
        messageId: "monthly-body-movement-index-distribution-message",
        chartKey: "bodyMovementIndexDistribution",
        title: "Body movement index distribution",
        min: 0,
        fallbackMessage:
            "50% of the mobility index was concentrated between 0 and 80, and the overall performance was normal.",
    }),
];
__r['m41'] = __r['m41'] || {};
__r['m41'].charts = charts;

// --- _js/radar/monthly-sleep-report/charts/sections/breathing-rate-condition.js ---
var createBarChart = __r['m39'].createBarChart, createMonthlyChartModule = __r['m39'].createMonthlyChartModule;

var sectionKey = "breathingRateCondition";

var createSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

var charts = [
    createSectionChart({
        containerId: "monthly-ahi-statistics-chart",
        messageId: "monthly-ahi-statistics-message",
        chartKey: "ahiStatistics",
        title: "AHI statistics",
        min: 0,
    }),
    createSectionChart({
        containerId: "monthly-ahi-distribution-chart",
        messageId: "monthly-ahi-distribution-message",
        chartKey: "ahiDistribution",
        title: "AHI distribution",
        min: 0,
        max: 100,
        fallbackMessage:
            "There was no anomaly in the AHI index over the past month.",
    }),
    createSectionChart({
        containerId: "monthly-breath-rate-distribution-chart",
        messageId: "monthly-breath-rate-distribution-message",
        chartKey: "breathRateDistribution",
        title: "Breath rate distribution",
        min: 0,
        fallbackMessage:
            "87% of the respiratory rate is concentrated between 12 and 23, with no abnormalities.",
    }),
];
__r['m42'] = __r['m42'] || {};
__r['m42'].charts = charts;

// --- _js/radar/monthly-sleep-report/charts/sections/daily-routine.js ---
var createBarChart = __r['m39'].createBarChart, createBubbleTimelineChart = __r['m39'].createBubbleTimelineChart, createMonthlyChartModule = __r['m39'].createMonthlyChartModule;

var sectionKey = "dailyRoutine";

var createBarSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

var createTimelineSectionChart = (config) =>
    createMonthlyChartModule(
        { sectionKey, ...config },
        createBubbleTimelineChart,
    );

var charts = [
    createBarSectionChart({
        containerId: "monthly-sleep-latency-statistics-chart",
        messageId: "monthly-sleep-latency-statistics-message",
        chartKey: "sleepLatencyStatistics",
        title: "Time to fall asleep statistics",
        min: 0,
        fallbackMessage:
            "The overall fluctuation of falling asleep time is large, and soaking your feet before going to bed can help you fall asleep.",
    }),
    createBarSectionChart({
        containerId: "monthly-sleep-latency-distribution-chart",
        messageId: "monthly-sleep-latency-distribution-message",
        chartKey: "sleepLatencyDistribution",
        title: "Distribution of time to fall asleep",
        min: 0,
        fallbackMessage:
            "57% of sleep time is more than 1 hour, try not to play mobile phones after bed to close your eyes can help sleep.",
    }),
    createTimelineSectionChart({
        containerId: "monthly-daily-routine-times-distribution-chart",
        messageId: "monthly-daily-routine-times-distribution-message",
        chartKey: "dailyRoutineTimesDistribution",
        title: "Distribution of daily routine times",
        fallbackMessage:
            "It's a little late going to bed,wake up time is normal,the sleep schedule fluctuates and is irregular,get up and work regularly.",
    }),
];
__r['m43'] = __r['m43'] || {};
__r['m43'].charts = charts;

// --- _js/radar/monthly-sleep-report/charts/sections/getting-out-of-bed-at-night.js ---
var createBarChart = __r['m39'].createBarChart, createBubbleTimelineChart = __r['m39'].createBubbleTimelineChart, createMonthlyChartModule = __r['m39'].createMonthlyChartModule;

var sectionKey = "gettingOutOfBedAtNight";

var createBarSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

var createTimelineSectionChart = (config) =>
    createMonthlyChartModule(
        { sectionKey, ...config },
        createBubbleTimelineChart,
    );

var charts = [
    createBarSectionChart({
        containerId: "monthly-bed-exit-count-statistics-chart",
        messageId: "monthly-bed-exit-count-statistics-message",
        chartKey: "bedExitCountStatistics",
        title: "Number of bed exits statistics",
        min: 0,
        fallbackMessage:
            "The overall frequency of leaving bed at night was normal.",
    }),
    createBarSectionChart({
        containerId: "monthly-bed-exit-frequency-distribution-chart",
        messageId: "monthly-bed-exit-frequency-distribution-message",
        chartKey: "bedExitFrequencyDistribution",
        title: "Distribution of bed exit frequency",
        min: 0,
        fallbackMessage:
            "No unusual length of time away from bed in the past month.",
    }),
    createBarSectionChart({
        containerId: "monthly-bed-exit-duration-statistics-chart",
        messageId: "monthly-bed-exit-duration-statistics-message",
        chartKey: "bedExitDurationStatistics",
        title: "Bed exit duration statistics",
        min: 0,
    }),
    createTimelineSectionChart({
        containerId: "monthly-bed-exit-times-distribution-chart",
        messageId: "monthly-bed-exit-times-distribution-message",
        chartKey: "bedExitTimesDistribution",
        title: "Distribution of bed exit times",
    }),
];
__r['m44'] = __r['m44'] || {};
__r['m44'].charts = charts;

// --- _js/radar/monthly-sleep-report/charts/sections/heart-rate-condition.js ---
var createBarChart = __r['m39'].createBarChart, createMonthlyChartModule = __r['m39'].createMonthlyChartModule;

var sectionKey = "heartRateCondition";

var createSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

var charts = [
    createSectionChart({
        containerId: "monthly-heart-rate-anomaly-statistics-chart",
        messageId: "monthly-heart-rate-anomaly-statistics-message",
        chartKey: "heartRateAnomalyStatistics",
        title: "Heart rate anomaly statistics",
        min: 0,
        fallbackMessage: "No abnormal heart rate in the past month.",
    }),
    createSectionChart({
        containerId: "monthly-heart-rate-distribution-chart",
        messageId: "monthly-heart-rate-distribution-message",
        chartKey: "heartRateDistribution",
        title: "Heart rate distribution",
        min: 0,
        fallbackMessage:
            "100% of heart rates were concentrated between 60 and 75, with no abnormalities.",
    }),
];
__r['m45'] = __r['m45'] || {};
__r['m45'].charts = charts;

// --- _js/radar/monthly-sleep-report/charts/sections/sleep-condition.js ---
var createBarChart = __r['m39'].createBarChart, createMonthlyChartModule = __r['m39'].createMonthlyChartModule;

var sectionKey = "sleepCondition";

var createSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

var charts = [
    createSectionChart({
        containerId: "monthly-sleep-duration-statistics-chart",
        messageId: "monthly-sleep-duration-statistics-message",
        chartKey: "sleepDurationStatistics",
        title: "Sleep duration statistics",
        min: 0,
        fallbackMessage:
            "The overall length of sleep is not stable, please relax and maintain a good mood.",
    }),
    createSectionChart({
        containerId: "monthly-sleep-duration-distribution-chart",
        messageId: "monthly-sleep-duration-distribution-message",
        chartKey: "sleepDurationDistribution",
        title: "Sleep duration distribution",
        min: 0,
        fallbackMessage:
            "80% of sleep duration is concentrated under of 6 hours, too short sleep time is not conducive to physical and mental health.",
    }),
    createSectionChart({
        containerId: "monthly-sleep-efficiency-statistics-chart",
        messageId: "monthly-sleep-efficiency-statistics-message",
        chartKey: "sleepEfficiencyStatistics",
        title: "Sleep efficiency statistics",
        min: 0,
        max: 100,
    }),
    createSectionChart({
        containerId: "monthly-sleep-efficiency-distribution-chart",
        messageId: "monthly-sleep-efficiency-distribution-message",
        chartKey: "sleepEfficiencyDistribution",
        title: "Sleep efficiency distribution",
        min: 0,
        max: 100,
        fallbackMessage:
            "The sleep efficiency concentration is less than 60%, should try not to play mobile phones after going to bed, and listening to music before going to bed can help sleep.",
    }),
    createSectionChart({
        containerId: "monthly-deep-sleep-percentage-statistics-chart",
        messageId: "monthly-deep-sleep-percentage-statistics-message",
        chartKey: "deepSleepPercentageStatistics",
        title: "Deep sleep percentage statistics",
        min: 0,
        max: 100,
        fallbackMessage:
            "The overall proportion of deep sleep is not stable, adjust the sleeping position to make yourself sleep comfortably.",
    }),
    createSectionChart({
        containerId: "monthly-deep-sleep-percentage-distribution-chart",
        messageId: "monthly-deep-sleep-percentage-distribution-message",
        chartKey: "deepSleepPercentageDistribution",
        title: "Deep sleep percentage distribution",
        min: 0,
        max: 100,
        fallbackMessage:
            "57% of deep sleep is concentrated in less than 20%, your deep sleep is less, sleep is not too stable.",
    }),
];
__r['m46'] = __r['m46'] || {};
__r['m46'].charts = charts;

// --- _js/radar/monthly-sleep-report/charts/sections/index.js ---
var activityStatusCharts = __r['m40'].charts;
var bodyMovementConditionCharts = __r['m41'].charts;
var breathingRateConditionCharts = __r['m42'].charts;
var dailyRoutineCharts = __r['m43'].charts;
var gettingOutOfBedAtNightCharts = __r['m44'].charts;
var heartRateConditionCharts = __r['m45'].charts;
var sleepConditionCharts = __r['m46'].charts;







var MONTHLY_SLEEP_REPORT_SECTIONS = [
    {
        sectionKey: "sleepCondition",
        messageId: "monthly-sleep-condition-section-message",
        charts: sleepConditionCharts,
    },
    {
        sectionKey: "breathingRateCondition",
        messageId: "monthly-breathing-rate-condition-section-message",
        charts: breathingRateConditionCharts,
    },
    {
        sectionKey: "heartRateCondition",
        messageId: "monthly-heart-rate-condition-section-message",
        charts: heartRateConditionCharts,
    },
    {
        sectionKey: "bodyMovementCondition",
        messageId: "monthly-body-movement-condition-section-message",
        charts: bodyMovementConditionCharts,
    },
    {
        sectionKey: "gettingOutOfBedAtNight",
        messageId: "monthly-getting-out-of-bed-at-night-section-message",
        charts: gettingOutOfBedAtNightCharts,
    },
    {
        sectionKey: "dailyRoutine",
        messageId: "monthly-daily-routine-section-message",
        charts: dailyRoutineCharts,
    },
    {
        sectionKey: "activityStatus",
        messageId: "monthly-activity-status-section-message",
        charts: activityStatusCharts,
    },
];
__r['m47'] = __r['m47'] || {};
__r['m47'].MONTHLY_SLEEP_REPORT_SECTIONS = MONTHLY_SLEEP_REPORT_SECTIONS;

// --- _js/radar/monthly-sleep-report/main.js ---
var updateSectionMessageAlert = __r['m39'].updateSectionMessageAlert;
var MONTHLY_SLEEP_REPORT_SECTIONS = __r['m47'].MONTHLY_SLEEP_REPORT_SECTIONS;
var fetchMonthlySleepReport = __r['m38'].fetchMonthlySleepReport;



var CHART_MODULES = MONTHLY_SLEEP_REPORT_SECTIONS.flatMap(
    (section) => section.charts,
);

var DOM = {
    modal: document.getElementById("sleepReportModal"),
    tab: document.getElementById("sleep-report-monthly-tab"),
    pane: document.getElementById("sleep-report-monthly-pane"),
    monthField: document.getElementById("monthly-sleep-report-month-field"),
    content: document.getElementById("monthly-sleep-report-content-wrapper"),
    noDataState: document.getElementById("monthly-sleep-report-no-data-state"),
};

var currentDevice = { id: null, name: null };
var chartsInitialized = false;
var lastLoadedKey = "";
var pendingLoadKey = "";

var getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

var getMonthPickerArrows = () => {
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

var isMonthlyTabActive = () =>
    DOM.pane?.classList.contains("active") || DOM.tab?.classList.contains("active");

var setVisibility = (hasData) => {
    if (DOM.noDataState) DOM.noDataState.classList.toggle("d-none", hasData);
    if (DOM.content) DOM.content.classList.toggle("d-none", !hasData);
};

var renderLoading = (container) => {
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

var removeLoading = (container) => {
    const overlay = container?.querySelector(".loading-overlay");
    if (overlay) overlay.remove();
};

var ensureChartsInitialized = () => {
    if (chartsInitialized) return;
    CHART_MODULES.forEach((chartModule) => chartModule.init());
    chartsInitialized = true;
};

var hasRenderableReport = (payload) =>
    payload?.report?.type === "monthly" && payload?.sections;

var updateCharts = (payload) => {
    ensureChartsInitialized();
    MONTHLY_SLEEP_REPORT_SECTIONS.forEach(({ sectionKey, messageId }) => {
        updateSectionMessageAlert(
            messageId,
            payload?.sections?.[sectionKey]?.message,
        );
    });
    CHART_MODULES.forEach((chartModule) => chartModule.update(payload));
};

var loadMonthlyReport = async () => {
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

var handleModalOpen = (event) => {
    const trigger = event.relatedTarget;
    currentDevice = {
        id: trigger?.dataset?.id || trigger?.getAttribute("data-id") || "",
        name: trigger?.dataset?.name || trigger?.getAttribute("data-name") || "",
    };

    if (isMonthlyTabActive()) {
        loadMonthlyReport();
    }
};

var initMonthlySleepReportModal = function() {
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
__r['m48'] = __r['m48'] || {};
__r['m48'].initMonthlySleepReportModal = initMonthlySleepReportModal;

// --- _js/radar/monthly-sleep-report/index.js ---
__r['m49'] = __r['m49'] || {};
__r['m49'].initMonthlySleepReportModal = __r['m48'].initMonthlySleepReportModal;

// --- _js/radar/main.js ---
var grid = __r['m4'].grid, poll = __r['m4'].poll, setLayoutCache = __r['m4'].setLayoutCache;
var liveModalController = __r['m18'].modalController, livePageUpdater = __r['m18'].pageUpdater;
var playbackController = __r['m24'].controller;
var initFallReplayModal = __r['m27'].initFallReplayModal;
var initSleepReportModal = __r['m37'].initSleepReportModal;
var initMonthlySleepReportModal = __r['m49'].initMonthlySleepReportModal;
var loadScript = __r['m14'].loadScript;
// main.js - Radar monitoring main entry point
// Composes polling, modal controllers, and auxiliary modals








var modal = null;
var isModalBound = false;
var isPollBound = false;
var isWindowBound = false;
var layoutCurrentUrl = "/modulos/radares/_ajax/layouts/current.php";

var runInitStep = function(name, fn) {
    try {
        fn();
    } catch (error) {
        console.error(`Radar init step failed (${name}):`, error);
    }
}

var showTabBySelector = function(selector) {
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

var getModalContext = function(event) {
    const target = event?.relatedTarget || modal;
    return {
        uid: target?.getAttribute("data-id") || modal?.dataset.id || "",
        name: target?.getAttribute("data-name") || modal?.dataset.name || "",
    };
}

var showLiveTab = function() {
    showTabBySelector("#radar-live-tab");
}

var handleModalShown = async function(event) {
    const context = getModalContext(event);
    if (!context.uid) return;

    showLiveTab();
    playbackController.handleModalShown({ uid: context.uid });
    await liveModalController.handleModalShown(context);
}

var handleModalHidden = function() {
    showLiveTab();
    playbackController.handleModalHidden();
    liveModalController.handleModalHidden();
}

var handleTabShown = function(event) {
    const targetId = $(event.target).attr("href");
    if (!targetId) return;

    liveModalController.handleTabShown(targetId);
    playbackController.handleTabShown(targetId);
}

var bindModalEvents = function() {
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

var bindWindowEvents = function() {
    if (isWindowBound) return;

    window.addEventListener("resize", () => {
        liveModalController.resize();
        playbackController.resize();
    });

    isWindowBound = true;
}

var setupPollCallbacks = function() {
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

var preloadDashboardLayouts = async function() {
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

var initModal = function() {
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

var init = async function() {
    // Load Konva + AMCharts early (removed from blocking HTML, loaded async now)
    await Promise.all([
        loadScript("https://unpkg.com/konva@9/konva.min.js"),
        loadScript("https://cdn.amcharts.com/lib/5/index.js"),
    ]);
    await Promise.all([
        loadScript("https://cdn.amcharts.com/lib/5/xy.js"),
        loadScript("https://cdn.amcharts.com/lib/5/percent.js"),
        loadScript("https://cdn.amcharts.com/lib/5/themes/Animated.js"),
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
__r['m50'] = __r['m50'] || {};
__r['m50'].initModal = initModal;
__r['m50'].init = init;

// --- Boot ---
(function() { var _init = __r['m50'].init || __r['m50'].default; if (typeof _init === 'function') _init(); })();
