import {
    createBarChart,
    createMonthlyChartModule,
} from "../helpers.js";

const sectionKey = "sleepCondition";

const createSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

export const charts = [
    createSectionChart({
        containerId: "monthly-sleep-duration-statistics-chart",
        messageId: "monthly-sleep-duration-statistics-message",
        chartKey: "sleepDurationStatistics",
        title: "Sleep duration statistics",
        min: 0,
        fallbackMessage:
            "The overall length of sleep is not stable, please relax and maintain a good mood.",
    }),
    createSectionChart({
        containerId: "monthly-sleep-duration-distribution-chart",
        messageId: "monthly-sleep-duration-distribution-message",
        chartKey: "sleepDurationDistribution",
        title: "Sleep duration distribution",
        min: 0,
        fallbackMessage:
            "80% of sleep duration is concentrated under of 6 hours, too short sleep time is not conducive to physical and mental health.",
    }),
    createSectionChart({
        containerId: "monthly-sleep-efficiency-statistics-chart",
        messageId: "monthly-sleep-efficiency-statistics-message",
        chartKey: "sleepEfficiencyStatistics",
        title: "Sleep efficiency statistics",
        min: 0,
        max: 100,
    }),
    createSectionChart({
        containerId: "monthly-sleep-efficiency-distribution-chart",
        messageId: "monthly-sleep-efficiency-distribution-message",
        chartKey: "sleepEfficiencyDistribution",
        title: "Sleep efficiency distribution",
        min: 0,
        max: 100,
        fallbackMessage:
            "The sleep efficiency concentration is less than 60%, should try not to play mobile phones after going to bed, and listening to music before going to bed can help sleep.",
    }),
    createSectionChart({
        containerId: "monthly-deep-sleep-percentage-statistics-chart",
        messageId: "monthly-deep-sleep-percentage-statistics-message",
        chartKey: "deepSleepPercentageStatistics",
        title: "Deep sleep percentage statistics",
        min: 0,
        max: 100,
        fallbackMessage:
            "The overall proportion of deep sleep is not stable, adjust the sleeping position to make yourself sleep comfortably.",
    }),
    createSectionChart({
        containerId: "monthly-deep-sleep-percentage-distribution-chart",
        messageId: "monthly-deep-sleep-percentage-distribution-message",
        chartKey: "deepSleepPercentageDistribution",
        title: "Deep sleep percentage distribution",
        min: 0,
        max: 100,
        fallbackMessage:
            "57% of deep sleep is concentrated in less than 20%, your deep sleep is less, sleep is not too stable.",
    }),
];
