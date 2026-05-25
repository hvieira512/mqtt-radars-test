const SLEEP_REPORT_URL = "/modulos/radares/_ajax/sleep-reports.php";

const requestJson = async (url) => {
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

export const fetchMonthlySleepReport = (uid, month) => {
    const url = new URL(SLEEP_REPORT_URL, window.location.origin);
    url.searchParams.set("period", "monthly");
    url.searchParams.set("view", "report");
    url.searchParams.set("uid", uid);
    url.searchParams.set("month", month);

    return requestJson(url);
};
