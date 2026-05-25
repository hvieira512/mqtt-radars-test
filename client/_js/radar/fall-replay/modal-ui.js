export function setReplayModalHeader({ alarm, range, formatClock }) {
    const subtitleEl = document.getElementById("fall-replay-modal-subtitle");
    const titleEl = document.getElementById("fallReplayModalLabel");
    if (!subtitleEl || !titleEl || !alarm || !range) return;

    titleEl.textContent = "Reprodução de queda confirmada";
    const radarName = alarm.device_name || alarm.device_code;
    subtitleEl.textContent = `${radarName} | Alarme em ${alarm.criado_em} | Janela ${formatClock(range.startSeconds, true)} - ${formatClock(range.endSeconds, true)}`;
}

export function ensureReplayBackdrop(modal, currentBackdropEl) {
    if (!modal || currentBackdropEl) return currentBackdropEl || null;

    const backdropEl = document.createElement("div");
    backdropEl.className = "modal-backdrop fade show";
    backdropEl.style.zIndex = "1055";
    modal.style.zIndex = "1060";

    document.body.appendChild(backdropEl);
    return backdropEl;
}

export function removeReplayBackdrop(modal, backdropEl) {
    if (backdropEl?.parentNode) {
        backdropEl.parentNode.removeChild(backdropEl);
    }

    if (modal) {
        modal.style.zIndex = "";
    }
}
