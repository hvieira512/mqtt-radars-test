import {
    createBarChart,
    createMonthlyChartModule,
} from "../helpers.js";

const sectionKey = "breathingRateCondition";

const createSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

export const charts = [
    createSectionChart({
        containerId: "monthly-ahi-statistics-chart",
        messageId: "monthly-ahi-statistics-message",
        chartKey: "ahiStatistics",
        title: "AHI statistics",
        min: 0,
    }),
    createSectionChart({
        containerId: "monthly-ahi-distribution-chart",
        messageId: "monthly-ahi-distribution-message",
        chartKey: "ahiDistribution",
        title: "AHI distribution",
        min: 0,
        max: 100,
        fallbackMessage:
            "There was no anomaly in the AHI index over the past month.",
    }),
    createSectionChart({
        containerId: "monthly-breath-rate-distribution-chart",
        messageId: "monthly-breath-rate-distribution-message",
        chartKey: "breathRateDistribution",
        title: "Breath rate distribution",
        min: 0,
        fallbackMessage:
            "87% of the respiratory rate is concentrated between 12 and 23, with no abnormalities.",
    }),
];
