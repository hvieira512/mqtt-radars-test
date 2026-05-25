import { charts as activityStatusCharts } from "./activity-status.js";
import { charts as bodyMovementConditionCharts } from "./body-movement-condition.js";
import { charts as breathingRateConditionCharts } from "./breathing-rate-condition.js";
import { charts as dailyRoutineCharts } from "./daily-routine.js";
import { charts as gettingOutOfBedAtNightCharts } from "./getting-out-of-bed-at-night.js";
import { charts as heartRateConditionCharts } from "./heart-rate-condition.js";
import { charts as sleepConditionCharts } from "./sleep-condition.js";

export const MONTHLY_SLEEP_REPORT_SECTIONS = [
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
