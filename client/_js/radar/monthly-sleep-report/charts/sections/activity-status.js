import {
    createBarChart,
    createMonthlyChartModule,
    createStackedColumnChart,
} from "../helpers.js";

const sectionKey = "activityStatus";

const createBarSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

const createStackedSectionChart = (config) =>
    createMonthlyChartModule(
        { sectionKey, ...config },
        createStackedColumnChart,
    );

export const charts = [
    createBarSectionChart({
        containerId: "monthly-room-in-out-statistics-chart",
        messageId: "monthly-room-in-out-statistics-message",
        chartKey: "roomInOutStatistics",
        title: "In/out room",
        min: 0,
    }),
    createStackedSectionChart({
        containerId: "monthly-indoor-duration-chart",
        messageId: "monthly-indoor-duration-message",
        chartKey: "indoorDuration",
        title: "Indoor duration",
        min: 0,
    }),
    createBarSectionChart({
        containerId: "monthly-walking-steps-chart",
        messageId: "monthly-walking-steps-message",
        chartKey: "walkingSteps",
        title: "Walking steps",
        min: 0,
    }),
    createBarSectionChart({
        containerId: "monthly-walking-speed-chart",
        messageId: "monthly-walking-speed-message",
        chartKey: "walkingSpeed",
        title: "Walking speed",
        min: 0,
    }),
];
