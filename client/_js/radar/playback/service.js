import { normalizePlaybackResponse } from "./domain.js";
import {
    buildReplayDateTime,
    formatClock,
    formatLocalDate,
} from "../replay/index.js";
import { renderLoading, removeLoading } from "../../utils.js";

let activePlaybackLoadingToken = null;

function getDatepickerArrows() {
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

function getTimepickerSetTimeMethod(instance) {
    if (!instance) return null;
    if (typeof instance.timepicker === "function") return "timepicker";
    if (typeof instance.bootstrapTimepicker === "function") {
        return "bootstrapTimepicker";
    }
    return null;
}

export function getPlaybackFetchParams(uid, range) {
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

export async function loadPlaybackData({ uid, range, requestToken }) {
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

export function initializePlaybackDatepicker() {
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

export function initializePlaybackTimepickers() {
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

export function updatePlaybackTimepickerValues({
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
