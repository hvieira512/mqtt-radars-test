let daytimeChart = null;
let daytimeSeries = null;
let centerLabel = null;

const formatTime = (seconds) => {
    const totalSeconds = Number(seconds) || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

export const initDaytimeActivityChart = (
    container = "daytime-activity-chart",
) => {
    const root = am5.Root.new(container);
    root._logo?.dispose();

    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
        am5percent.PieChart.new(root, {
            layout: root.verticalLayout,
            innerRadius: am5.percent(60),
        }),
    );

    const series = chart.series.push(
        am5percent.PieSeries.new(root, {
            valueField: "value",
            categoryField: "category",
            alignLabels: false,
        }),
    );

    series.labels.template.setAll({
        text: "{category}: {duration}",
        radius: 10,
    });

    const legend = chart.children.push(
        am5.Legend.new(root, {
            centerX: am5.percent(50),
            x: am5.percent(50),
            layout: root.horizontalLayout,
        }),
    );

    legend.data.setAll(series.dataItems);

    centerLabel = chart.seriesContainer.children.push(
        am5.Label.new(root, {
            text: "",
            centerX: am5.percent(50),
            centerY: am5.percent(50),
            textAlign: "center",
            fontSize: 20,
            fontWeight: "500",
        }),
    );

    daytimeChart = chart;
    daytimeSeries = series;
};

export const updateDaytimeActivityChart = (data) => {
    if (!data || !data.activity) return;

    const activity = data.activity;
    const durations = activity.durations || {};
    const percentages = activity.percentages || {};

    const chartData = [
        {
            category: translations.i18n["andar"],
            value: Number(percentages.walking),
            duration: formatTime(durations.walkingSeconds),
        },
        {
            category: translations.i18n["parado"],
            value: Number(percentages.static),
            duration: formatTime(durations.staticSeconds),
        },
        {
            category: translations.i18n["outro"],
            value: Number(percentages.other),
            duration: formatTime(durations.otherSeconds),
        },
    ];

    daytimeSeries.data.setAll(chartData);

    daytimeChart.children.values.forEach((child) => {
        if (child instanceof am5.Legend) {
            child.data.setAll(daytimeSeries.dataItems);
        }
    });

    const formattedInRoom = formatTime(durations.inRoomSeconds);
    if (centerLabel) {
        centerLabel.set(
            "text",
            `${translations.i18n["no_quarto"]}\n${formattedInRoom}`,
        );
    }
};
