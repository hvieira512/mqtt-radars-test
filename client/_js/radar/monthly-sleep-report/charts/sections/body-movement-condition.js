import {
    createBarChart,
    createMonthlyChartModule,
} from "../helpers.js";

const sectionKey = "bodyMovementCondition";

const createSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

export const charts = [
    createSectionChart({
        containerId: "monthly-body-movement-index-statistics-chart",
        messageId: "monthly-body-movement-index-statistics-message",
        chartKey: "bodyMovementIndexStatistics",
        title: "Body movement index statistics",
        min: 0,
        max: 250,
        fallbackMessage:
            "50% of the mobility index was concentrated between 0 and 80, and the overall performance was normal.",
    }),
    createSectionChart({
        containerId: "monthly-body-movement-index-distribution-chart",
        messageId: "monthly-body-movement-index-distribution-message",
        chartKey: "bodyMovementIndexDistribution",
        title: "Body movement index distribution",
        min: 0,
        fallbackMessage:
            "50% of the mobility index was concentrated between 0 and 80, and the overall performance was normal.",
    }),
];
