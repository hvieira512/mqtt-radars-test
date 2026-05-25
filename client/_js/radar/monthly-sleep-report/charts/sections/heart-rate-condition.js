import {
    createBarChart,
    createMonthlyChartModule,
} from "../helpers.js";

const sectionKey = "heartRateCondition";

const createSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

export const charts = [
    createSectionChart({
        containerId: "monthly-heart-rate-anomaly-statistics-chart",
        messageId: "monthly-heart-rate-anomaly-statistics-message",
        chartKey: "heartRateAnomalyStatistics",
        title: "Heart rate anomaly statistics",
        min: 0,
        fallbackMessage: "No abnormal heart rate in the past month.",
    }),
    createSectionChart({
        containerId: "monthly-heart-rate-distribution-chart",
        messageId: "monthly-heart-rate-distribution-message",
        chartKey: "heartRateDistribution",
        title: "Heart rate distribution",
        min: 0,
        fallbackMessage:
            "100% of heart rates were concentrated between 60 and 75, with no abnormalities.",
    }),
];
