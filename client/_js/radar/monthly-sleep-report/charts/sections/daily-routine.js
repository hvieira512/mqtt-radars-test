import {
    createBarChart,
    createBubbleTimelineChart,
    createMonthlyChartModule,
} from "../helpers.js";

const sectionKey = "dailyRoutine";

const createBarSectionChart = (config) =>
    createMonthlyChartModule({ sectionKey, ...config }, createBarChart);

const createTimelineSectionChart = (config) =>
    createMonthlyChartModule(
        { sectionKey, ...config },
        createBubbleTimelineChart,
    );

export const charts = [
    createBarSectionChart({
        containerId: "monthly-sleep-latency-statistics-chart",
        messageId: "monthly-sleep-latency-statistics-message",
        chartKey: "sleepLatencyStatistics",
        title: "Time to fall asleep statistics",
        min: 0,
        fallbackMessage:
            "The overall fluctuation of falling asleep time is large, and soaking your feet before going to bed can help you fall asleep.",
    }),
    createBarSectionChart({
        containerId: "monthly-sleep-latency-distribution-chart",
        messageId: "monthly-sleep-latency-distribution-message",
        chartKey: "sleepLatencyDistribution",
        title: "Distribution of time to fall asleep",
        min: 0,
        fallbackMessage:
            "57% of sleep time is more than 1 hour, try not to play mobile phones after bed to close your eyes can help sleep.",
    }),
    createTimelineSectionChart({
        containerId: "monthly-daily-routine-times-distribution-chart",
        messageId: "monthly-daily-routine-times-distribution-message",
        chartKey: "dailyRoutineTimesDistribution",
        title: "Distribution of daily routine times",
        fallbackMessage:
            "It's a little late going to bed,wake up time is normal,the sleep schedule fluctuates and is irregular,get up and work regularly.",
    }),
];
