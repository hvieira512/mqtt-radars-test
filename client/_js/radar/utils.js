import { removeLoading as coreRemoveLoading, renderLoading as coreRenderLoading, loadScript as coreLoadScript } from "./core/utils.js";

export function animateNumber({
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

export function ensureNestedModalBackdrop(_modalEl, currentBackdropEl) {
    if (currentBackdropEl?.isConnected) return currentBackdropEl;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop fade show nested-modal-backdrop";
    backdrop.style.zIndex = "1055";
    document.body.appendChild(backdrop);
    return backdrop;
}

export function removeNestedModalBackdrop(_modalEl, backdropEl) {
    if (backdropEl?.isConnected) backdropEl.remove();
}

export function restoreParentModalScrollState(parentModalId) {
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

export function renderLoading(container) {
    coreRenderLoading(container);
}

export function removeLoading(container) {
    coreRemoveLoading(container);
}

export function loadScript(url) {
    return coreLoadScript(url);
}
