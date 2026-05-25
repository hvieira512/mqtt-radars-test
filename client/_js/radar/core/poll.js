// radar-poll.js - Database polling system for radar data

let pollInterval = null;
let afterId = 0;
let afterDetectionId = 0;
let isPolling = false;
const pollUrl = "/modulos/radares/_ajax/radar-data/poll.php";
let pollDelay = 1000;

const callbacks = {
    onPosition: null,
    onVitals: null,
    onAlarm: null,
    onPollComplete: null,
    onOnlineDevices: null,
};

export function onPosition(cb) {
    callbacks.onPosition = cb;
}

export function onVitals(cb) {
    callbacks.onVitals = cb;
}

export function onAlarm(cb) {
    callbacks.onAlarm = cb;
}

export function onPollComplete(cb) {
    callbacks.onPollComplete = cb;
}

export function onOnlineDevices(cb) {
    callbacks.onOnlineDevices = cb;
}

export function start(delay) {
    if (pollInterval) return;
    pollDelay = delay || pollDelay;
    pollInterval = setInterval(fetchPollData, pollDelay);
    fetchPollData();
}

function fetchPollData() {
    if (isPolling) return;
    isPolling = true;

    const dataParams = {
        after_id: afterId,
        after_detection_id: afterDetectionId,
        limit: 50,
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

function processPollData(data) {
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
