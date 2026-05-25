import {
    createBarChart,
    createBubbleTimelineChart,
    createMonthlyChartModule,
} from "../helpers.js";

const sectionKey = "gettingOutOfBedAtNight";

const createBarSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

const createTimelineSectionChart = (config) =>
    createMonthlyChartModule(
        { sectionKey, ...config },
        createBubbleTimelineChart,
    );

export const charts = [
    createBarSectionChart({
        containerId: "monthly-bed-exit-count-statistics-chart",
        messageId: "monthly-bed-exit-count-statistics-message",
        chartKey: "bedExitCountStatistics",
        title: "Number of bed exits statistics",
        min: 0,
        fallbackMessage:
            "The overall frequency of leaving bed at night was normal.",
    }),
    createBarSectionChart({
        containerId: "monthly-bed-exit-frequency-distribution-chart",
        messageId: "monthly-bed-exit-frequency-distribution-message",
        chartKey: "bedExitFrequencyDistribution",
        title: "Distribution of bed exit frequency",
        min: 0,
        fallbackMessage:
            "No unusual length of time away from bed in the past month.",
    }),
    createBarSectionChart({
        containerId: "monthly-bed-exit-duration-statistics-chart",
        messageId: "monthly-bed-exit-duration-statistics-message",
        chartKey: "bedExitDurationStatistics",
        title: "Bed exit duration statistics",
        min: 0,
    }),
    createTimelineSectionChart({
        containerId: "monthly-bed-exit-times-distribution-chart",
        messageId: "monthly-bed-exit-times-distribution-message",
        chartKey: "bedExitTimesDistribution",
        title: "Distribution of bed exit times",
    }),
];
