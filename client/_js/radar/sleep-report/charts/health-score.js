let healthScoreSeries;
let healthScoreCenterLabel;
let healthScoreRoot;
let scoreSlice;
let remainingSlice;

const labelTranslations = {
    Poor: translations.i18n["fraco_score"],
    "Below average": translations.i18n["abaixo_da_media"],
    Average: translations.i18n["media"],
    Good: translations.i18n["bom_score"],
    Excellent: translations.i18n["excelente"],
    "Very good": translations.i18n["muito_bom"],
};

export const initHealthScoreChart = () => {
    healthScoreRoot = am5.Root.new("health-score-pie");
    healthScoreRoot._logo?.dispose();

    const chart = healthScoreRoot.container.children.push(
        am5percent.PieChart.new(healthScoreRoot, {
            layout: healthScoreRoot.verticalLayout,
            innerRadius: am5.percent(75),
        }),
    );

    const series = chart.series.push(
        am5percent.PieSeries.new(healthScoreRoot, {
            valueField: "value",
            categoryField: "category",
            alignLabels: false,
        }),
    );

    series.labels.template.set("forceHidden", true);
    series.ticks.template.set("forceHidden", true);
    series.slices.template.setAll({ cornerRadius: 10, strokeWidth: 0 });

    series.data.setAll([
        {
            category: translations.i18n["restante"],
            value: 100,
            fill: am5.color(0xe9ecef),
        },
        {
            category: translations.i18n["pontuacao"],
            value: 0,
            fill: am5.color(0x198754),
        },
    ]);

    [remainingSlice, scoreSlice] = series.dataItems;

    const centerLabel = chart.seriesContainer.children.push(
        am5.Container.new(healthScoreRoot, {
            centerX: am5.percent(50),
            centerY: am5.percent(50),
            layout: healthScoreRoot.verticalLayout,
            textAlign: "center",
        }),
    );

    const scoreLabel = centerLabel.children.push(
        am5.Label.new(healthScoreRoot, {
            text: "0",
            fontSize: 32,
            fontWeight: "700",
            centerX: am5.percent(50),
            textAlign: "center",
        }),
    );

    const gradeLabel = centerLabel.children.push(
        am5.Label.new(healthScoreRoot, {
            text: "-",
            fontSize: 20,
            fill: am5.color(0x6c757d),
            centerX: am5.percent(50),
        }),
    );

    centerLabel.children.push(
        am5.Label.new(healthScoreRoot, {
            text: translations.i18n["pontuacao_de_saude"],
            fontSize: 12,
            fill: am5.color(0xadb5bd),
            centerX: am5.percent(50),
        }),
    );

    series.appear(1000, 100);
    chart.appear(1000, 100);

    healthScoreSeries = series;
    healthScoreCenterLabel = { scoreLabel, gradeLabel };
};

export const updateHealthScoreChart = (score, grade) => {
    if (!healthScoreSeries || !healthScoreCenterLabel) return;

    const numericScore = Math.max(0, Math.min(Number(score), 100));

    let fillColor = am5.color(0x198754);
    if (numericScore < 60) fillColor = am5.color(0xf5c518);
    if (numericScore < 40) fillColor = am5.color(0xdc3545);

    healthScoreSeries.data.setAll([
        {
            category: translations.i18n["restante"],
            value: 100 - numericScore,
        },
        {
            category: translations.i18n["pontuacao"],
            value: numericScore,
        },
    ]);

    const scoreSlice = healthScoreSeries.dataItems[1];
    scoreSlice.set("fill", fillColor);

    const remainingSlice = healthScoreSeries.dataItems[0];
    remainingSlice.set("fill", am5.color(0xe9ecef));

    const translatedGrade = labelTranslations[grade] || grade;

    healthScoreCenterLabel.scoreLabel.set("text", `${numericScore}`);
    healthScoreCenterLabel.gradeLabel.set("text", translatedGrade);
};
