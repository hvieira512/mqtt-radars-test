const escapeHtml = (value) =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const normalizeSuggestions = (data) => {
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

export const updateSuggestions = (data, el, color = "primary") => {
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
