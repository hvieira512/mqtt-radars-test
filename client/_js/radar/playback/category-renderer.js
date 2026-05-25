const PLAYBACK_FALL_SVG_PATH =
    "M288 64C305.7 64 320 78.3 320 96L320 101.4C320 156.6 296.3 208.4 256.1 244.5L319 320L408 320C423.1 320 437.3 327.1 446.4 339.2L489.6 396.8C500.2 410.9 497.3 431 483.2 441.6C469.1 452.2 449 449.3 438.4 435.2L400 384L295.2 384L408.8 523.8C419.9 537.5 417.9 557.7 404.1 568.8C390.3 579.9 370.2 577.9 359.1 564.1L169.4 330.6C163.3 345.6 160 361.9 160 378.6L160 448C160 465.7 145.7 480 128 480C110.3 480 96 465.7 96 448L96 378.6C96 311.2 131.4 248.7 189.2 214L193.8 211.2C232.4 188 256 146.4 256 101.4L256 96C256 78.3 270.3 64 288 64zM48 152C48 121.1 73.1 96 104 96C134.9 96 160 121.1 160 152C160 182.9 134.9 208 104 208C73.1 208 48 182.9 48 152zM424 144.1C424 157.4 413.3 168.1 400 168.1C386.7 168.1 376 157.4 376 144.1L376 96.1C376 82.8 386.7 72.1 400 72.1C413.3 72.1 424 82.8 424 96.1L424 144.1zM528 296.1C514.7 296.1 504 285.4 504 272.1C504 258.8 514.7 248.1 528 248.1L576 248.1C589.3 248.1 600 258.8 600 272.1C600 285.4 589.3 296.1 576 296.1L528 296.1zM473.5 198.6C464.1 189.2 464.1 174 473.5 164.7L507.4 130.8C516.8 121.4 532 121.4 541.3 130.8C550.6 140.2 550.7 155.4 541.3 164.7L507.4 198.6C498 208 482.8 208 473.5 198.6z";

const CATEGORY_APPEARANCE = {
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

export function getPlaybackCategoryPresentation(category) {
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

export function getPlaybackIconMarkup(presentation, sizeClass = "fa-4x") {
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

export function createPlaybackCategoryPreviewMarkup(segment) {
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
