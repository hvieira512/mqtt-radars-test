// radar-utils.js - Shared utilities and constants for radar polling system

const RADAR_AREA_COLORS = {
    4: "#ffa500",
    5: "#32cd32",
    6: "#ff4500",
    3: "#808080",
    default: "#a9a9a9",
};

const RADAR_AREA_LABELS = {
    0: "-",
    1: translations.i18n["customizado"],
    2: translations.i18n["cama"],
    3: translations.i18n["interferencia"],
    4: translations.i18n["porta"],
    5: translations.i18n["cama_de_monitorizacao"],
    6: translations.i18n["regiao_de_alarme"],
};

const RADAR_POSTURE_STATES = {
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

export const BED_POSTURES = new Set([
    "Lying Down",
    "Sitting Up Bed",
    "Suspected Sitting Up Bed",
    "Confirmed Sitting Up Bed",
    "In Bed",
    "Squatting",
]);

const mapCache = {};

export function getAreaName(data, key, type) {
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

export function getAreaColor(areaType) {
    return RADAR_AREA_COLORS[areaType] || RADAR_AREA_COLORS.default;
}

export function getPostureStyle(state) {
    return (
        RADAR_POSTURE_STATES[state] || RADAR_POSTURE_STATES["Initialization"]
    );
}

export function reorderRect(coords) {
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

export function getBounds(coords) {
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

export function parseRectangle(rectangle) {
    if (!rectangle) return [];
    return rectangle
        .replace(/[{}]/g, "")
        .split(";")
        .map((p) => p.trim().split(",").map(Number))
        .flat();
}

const layoutCache = {};

export function setLayoutCache(deviceCode, data) {
    layoutCache[deviceCode] = data;
}

export function getLayoutCache(deviceCode) {
    return layoutCache[deviceCode] || null;
}

export function renderLoading(container) {
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

export function removeLoading(container) {
    if (!container) return;
    const overlay = container.querySelector(".loading-overlay");
    if (overlay) overlay.remove();
}

export const typeConfig = {
    fall_confirmed: {
        icon: "fa-exclamation-triangle",
        badgeClass: "bg-danger text-white",
        label:
            translations.i18n["queda_confirmada_label"] || "Queda Confirmada",
    },
    room_entry: {
        icon: "fa-sign-in",
        badgeClass: "bg-success text-white",
        label: translations.i18n["entrou_na_sala"] || "Entrou na Sala",
    },
    room_exit: {
        icon: "fa-sign-out",
        badgeClass: "bg-warning text-dark",
        label: translations.i18n["saiu_na_sala"] || "Saiu da Sala",
    },
    area_entry: {
        icon: "fa-arrow-right",
        badgeClass: "bg-info text-white",
        label: translations.i18n["entrou_na_regiao"] || "Entrou na Região",
    },
    area_exit: {
        icon: "fa-arrow-left",
        badgeClass: "bg-info text-white",
        label: translations.i18n["saiu_na_regiao"] || "Saiu da Região",
    },
};

export function loadScript(url) {
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

export function calcularDuracao(inicio, fim) {
    if (!inicio || !fim) return "-";

    const start = new Date(inicio);
    const end = new Date(fim);
    const diffMs = end - start;

    return formatDuration(diffMs);
}

export function calcularTempo(inicio) {
    if (!inicio) return "-";

    const start = new Date(inicio);
    const now = new Date();
    const diffMs = now - start;

    return formatDuration(diffMs);
}

function formatDuration(ms) {
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
