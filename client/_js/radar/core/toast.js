const themes = {
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

export function toast({
    title = "",
    text = "",
    theme = "info",
    timer = null,
    ...options
}) {
    const themeConfig = themes[theme] || themes.info;
    const defaultTimer = theme === "perigo" || theme === "danger" ? 8000 : 5000;
    const finalTimer = timer !== null ? timer : defaultTimer;

    if (typeof Swal === "undefined" || typeof Swal.fire !== "function") {
        const message = [title, text].filter(Boolean).join(" - ");
        const level =
            theme === "danger" || theme === "perigo" ? "error" : "warn";
        console[level](`[toast:${theme}] ${message}`);
        return;
    }

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

export default toast;
