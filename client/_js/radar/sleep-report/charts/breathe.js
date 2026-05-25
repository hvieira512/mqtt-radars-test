let root, chart, xAxis, yAxis, series;

const ANOMALY_TYPES = {
    apnea: { shape: "circle", color: "#ffc107", label: "Apnea" },
    bradypnea: { shape: "rectangle", color: "#EB8142", label: "Bradypnea" },
    tachypnea: { shape: "triangle", color: "#dc3545", label: "Tachypnea" },
};

const SHAPE_SIZES = {
    circle: { radius: 6 },
    rectangle: { width: 9, height: 9, cornerRadius: 2 },
    triangle: { width: 11, height: 11, rotation: 180 },
};

const THRESHOLDS = [8, 24];

const formatIsoTimeLabel = (value) => {
    const match = String(value || "")
        .trim()
        .match(/T(\d{2}):(\d{2})/);

    if (match) {
        return `${match[1]}:${match[2]}`;
    }

    return "";
};

export const initBreatheChart = (containerId = "breathe-chart") => {
    root = am5.Root.new(containerId);
    root._logo?.dispose();

    chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: "none",
            wheelY: "none",
            cursor: am5xy.XYCursor.new(root, {}),
        }),
    );

    chart.get("cursor").lineX.set("visible", false);
    chart.get("cursor").lineY.set("visible", false);

    xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: "time",
            renderer: am5xy.AxisRendererX.new(root, {}),
        }),
    );

    xAxis.get("renderer").labels.template.setAll({
        forceHidden: true,
    });
    xAxis.get("renderer").grid.template.setAll({
        forceHidden: true,
    });

    yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 0,
            max: 32,
            strictMinMax: true,
            maxPrecision: 0,
            renderer: am5xy.AxisRendererY.new(root, {
                minGridDistance: 40,
            }),
        }),
    );

    yAxis.get("renderer").labels.template.setAll({
        textAlign: "right",
        fontSize: 12,
        fill: am5.color("#67b7dc"),
    });

    series = chart.series.push(
        am5xy.LineSeries.new(root, {
            name: "Breath Rate",
            xAxis,
            yAxis,
            valueYField: "value",
            categoryXField: "time",
            strokeWidth: 2,
            connect: false,
            tooltip: am5.Tooltip.new(root, {
                labelText: "{timeLabel}\n[bold]{valueY} BPM[/]",
            }),
        }),
    );

    THRESHOLDS.forEach((value) => {
        const rangeDataItem = yAxis.makeDataItem({ value, endValue: value });
        const range = yAxis.createAxisRange(rangeDataItem);
        range.get("grid").setAll({
            strokeOpacity: 0.6,
            strokeDasharray: [4, 4],
        });
        range.get("label").setAll({
            text: value.toString(),
            location: 1,
            centerX: am5.p100,
        });
    });

    series.bullets.push((root, series, dataItem) => {
        const anomaly = dataItem.dataContext?.anomaly;
        if (!anomaly || !ANOMALY_TYPES[anomaly]) return undefined;
        const config = ANOMALY_TYPES[anomaly];
        const sizeConfig = SHAPE_SIZES[config.shape];
        let shape;
        if (config.shape === "circle") {
            shape = am5.Circle.new(root, { ...sizeConfig });
        } else if (config.shape === "rectangle") {
            shape = am5.Rectangle.new(root, { ...sizeConfig });
        } else if (config.shape === "triangle") {
            shape = am5.Triangle.new(root, { ...sizeConfig });
        }
        if (!shape) return undefined;
        shape.setAll({
            fill: am5.color(config.color),
            fillOpacity: 0.95,
            stroke: am5.color("#ffffff"),
            strokeWidth: 1.5,
            shadowOpacity: 0.25,
            shadowBlur: 4,
            shadowOffsetY: 2,
        });
        return am5.Bullet.new(root, {
            sprite: shape,
            locationY: 0,
        });
    });

    return { root, chart, series, xAxis };
};

export const updateBreatheChart = (data) => {
    const values = data.charts?.breathingRate?.values ?? [];
    const timestamps = data.charts?.timestamps ?? [];

    if (values.length !== timestamps.length) {
        console.warn(
            "Breath data length mismatch between values and timestamps",
        );
    }

    let chartData = [];
    let bradypneaEvents = 0;
    let apneaEvents = 0;
    let tachypneaEvents = 0;
    let prevValidValue = null;

    let inBradypnea = false;

    for (let i = 0; i < values.length; i++) {
        const rawValue = values[i];
        const raw =
            rawValue === null || rawValue === undefined ? -1 : Number(rawValue);
        const time = timestamps[i];
        const timeLabel = formatIsoTimeLabel(time);

        const value = raw === -1 ? null : raw;
        let anomaly = null;

        if (raw !== -1) {
            if (raw === 0) {
                anomaly = "apnea";
                apneaEvents++;
                inBradypnea = false;
            } else if (
                !inBradypnea &&
                prevValidValue !== null &&
                prevValidValue > 8 &&
                raw <= 8
            ) {
                anomaly = "bradypnea";
                bradypneaEvents++;
                inBradypnea = true;
            } else if (inBradypnea && raw > 8) {
                inBradypnea = false;
            } else if (raw > 24) {
                anomaly = "tachypnea";
                tachypneaEvents++;
                inBradypnea = false;
            }

            prevValidValue = raw;
        } else {
            inBradypnea = false;
        }

        chartData.push({ time, timeLabel, value, anomaly });
    }

    xAxis.data.setAll(chartData);
    series.data.setAll(chartData);

    return {
        bradypneaEvents,
        apneaEvents,
        tachypneaEvents,
    };
};
