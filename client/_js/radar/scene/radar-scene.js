import {
    getAreaName,
    getAreaColor,
    getPostureStyle,
    reorderRect,
    getBounds,
    parseRectangle,
} from "../core/index.js";

function createTransform(bounds, cw, ch, padding = 30) {
    const scale = Math.min(
        (cw - 2 * padding) / bounds.width,
        (ch - 2 * padding) / bounds.height,
    );

    const offsetX = -bounds.minX;
    const offsetY = -bounds.minY;
    const scaledWidth = bounds.width * scale;
    const scaledHeight = bounds.height * scale;
    const centerOffsetX = (cw - scaledWidth) / 2;
    const centerOffsetY = (ch - scaledHeight) / 2;

    return function (coords) {
        const result = [];
        for (let i = 0; i < coords.length; i += 2) {
            const x = (coords[i] + offsetX) * scale + centerOffsetX;
            const y = ch - ((coords[i + 1] + offsetY) * scale + centerOffsetY);
            result.push(x, y);
        }
        return result;
    };
}

function parseAreas(areaStr) {
    if (!areaStr) return [];

    return areaStr
        .split("},")
        .map((area) => area.replace(/[{}]/g, "").trim())
        .filter(Boolean)
        .map((area) => {
            const values = area.split(",").map(Number);
            const key = values[0];
            const type = values[1];
            const coords = [];

            for (let index = 2; index < values.length; index += 2) {
                coords.push(values[index], values[index + 1]);
            }

            return { key, type, coords };
        });
}

function renderPlaceholderMarkup(container) {
    container.innerHTML = `<div class="text-center text-muted py-5"><i class="fa fa-map-marked-alt fa-3x mb-3"></i><p>${translations.i18n["mapa_nao_disponivel"]}</p><small>${translations.i18n["configure_layout_monitorizacao"]}</small></div>`;
}

function createPersonNode(peopleLayer, x, y, style) {
    const group = new Konva.Group({ x, y });
    const circle = new Konva.Circle({
        radius: 10,
        fill: "#0d6efd22",
        stroke: style.color,
        strokeWidth: 3,
    });
    const icon = new Konva.Text({
        text: style.icon || "\uf129",
        fontFamily: "Font Awesome 5 Pro",
        fontStyle: "900",
        fontSize: 12,
        fill: style.color,
    });

    icon.offsetX(icon.width() / 2);
    icon.offsetY(icon.height() / 2);

    const label = new Konva.Text({
        x: 14,
        y: -8,
        text: style.labelPT || translations.i18n["pessoa_label"],
        fontSize: 12,
        fontFamily: "Poppins",
        fontStyle: "bold",
        fill: style.color,
    });

    group.circle = circle;
    group.icon = icon;
    group.label = label;
    group.moveTween = null;

    group.add(circle, icon, label);
    peopleLayer.add(group);

    return group;
}

function drawTrail(state) {
    if (!state.showTrail || !state.trailLayer || !state.transformCoords) return;

    state.trailLayer.destroyChildren();

    if (!Array.isArray(state.currentTrail) || state.currentTrail.length < 2) {
        state.trailLayer.batchDraw();
        return;
    }

    const transformedPoints = [];

    state.currentTrail.forEach((point) => {
        const coords = state.transformCoords([
            point.x_position_dm,
            point.y_position_dm,
        ]);
        transformedPoints.push(coords[0], coords[1]);
    });

    if (transformedPoints.length < 4) {
        state.trailLayer.batchDraw();
        return;
    }

    const options = state.currentTrailOptions || {};
    const stroke = options.stroke || "#fd397a";
    const strokeWidth = options.strokeWidth || 4;
    const opacity = options.opacity || 0.9;
    const dash = Array.isArray(options.dash) ? options.dash : [6, 6];
    const showEndpoint = options.showEndpoint !== false;
    const lastPoint = transformedPoints.slice(-2);

    state.trailLayer.add(
        new Konva.Line({
            points: transformedPoints,
            stroke,
            strokeWidth,
            lineCap: "round",
            lineJoin: "round",
            dash,
            opacity,
        }),
    );

    if (showEndpoint) {
        state.trailLayer.add(
            new Konva.Circle({
                x: lastPoint[0],
                y: lastPoint[1],
                radius: 6,
                fill: stroke,
                opacity,
            }),
        );
    }

    state.trailLayer.batchDraw();
}

function emitPeopleCount(state) {
    if (typeof state.onPeopleCountChange !== "function") return;

    state.onPeopleCountChange(state.currentPeople.length, state.currentPeople);
}

function clearPeopleNodes(state) {
    state.peopleNodes.forEach((node) => {
        if (node.moveTween) node.moveTween.destroy();
        node.destroy();
    });

    state.peopleNodes.clear();
}

function syncPeople(state) {
    if (!state.stage || !state.peopleLayer || !state.transformCoords) return;

    const active = new Set();

    state.currentPeople.forEach((person) => {
        const coords = state.transformCoords([
            person.x_position_dm,
            person.y_position_dm,
        ]);
        const style = getPostureStyle(person.posture_state);

        let node = state.peopleNodes.get(person.person_index);
        active.add(person.person_index);

        if (!node) {
            node = createPersonNode(state.peopleLayer, coords[0], coords[1], style);
            state.peopleNodes.set(person.person_index, node);
        }

        node.circle.stroke(style.color);
        node.icon.text(style.icon);
        node.icon.fill(style.color);
        node.icon.offsetX(node.icon.width() / 2);
        node.icon.offsetY(node.icon.height() / 2);
        node.label.text(style.labelPT);
        node.label.fill(style.color);

        if (node.moveTween) node.moveTween.destroy();
        node.moveTween = new Konva.Tween({
            node,
            x: coords[0],
            y: coords[1],
            duration: 0.15,
            easing: Konva.Easings.Linear,
        });
        node.moveTween.play();
    });

    state.peopleNodes.forEach((node, index) => {
        if (!active.has(index)) {
            if (node.moveTween) node.moveTween.destroy();
            node.destroy();
            state.peopleNodes.delete(index);
        }
    });

    emitPeopleCount(state);
    state.peopleLayer.batchDraw();
}

function drawRoom(state, rectangle, declareArea, data) {
    if (!state.stage || !state.layer) return;

    const rect = reorderRect(parseRectangle(rectangle));
    const bounds = getBounds(rect);
    const cw = state.stage.width();
    const ch = state.stage.height();

    state.transformCoords = createTransform(bounds, cw, ch);

    state.layer.add(
        new Konva.Line({
            points: state.transformCoords(rect),
            stroke: "gray",
            strokeWidth: 3,
            closed: true,
        }),
    );

    parseAreas(declareArea).forEach((area) => {
        const color = getAreaColor(area.type);
        const coords = reorderRect(area.coords);
        const points = state.transformCoords(coords);
        const labelX =
            (Math.min(...coords.filter((_, index) => index % 2 === 0)) +
                Math.max(...coords.filter((_, index) => index % 2 === 0))) /
            2;
        const labelY =
            (Math.min(...coords.filter((_, index) => index % 2 === 1)) +
                Math.max(...coords.filter((_, index) => index % 2 === 1))) /
            2;
        const labelPos = state.transformCoords([labelX, labelY]);
        const areaName = getAreaName(data, area.key, area.type);

        state.layer.add(
            new Konva.Line({
                points,
                stroke: color,
                strokeWidth: 2.5,
                dash: [10, 10],
                fill: `${color}22`,
                closed: true,
            }),
        );

        state.layer.add(
            new Konva.Text({
                x: labelPos[0] - 60,
                y: labelPos[1] - 10,
                width: 120,
                align: "center",
                text: areaName,
                fontSize: 14,
                fontFamily: "Poppins",
                fill: color,
                shadowColor: "white",
                shadowBlur: 5,
            }),
        );
    });

    const radarPos = state.transformCoords([0, 0]);
    const radarIcon = new Konva.Text({
        text: "\uf8dd",
        fontFamily: "Font Awesome 5 Pro",
        fontStyle: "900",
        fontSize: 18,
        fill: "#20c997",
    });

    radarIcon.offsetX(radarIcon.width() / 2);
    radarIcon.offsetY(radarIcon.height() / 2);
    radarIcon.position({ x: radarPos[0], y: radarPos[1] });

    state.layer.add(radarIcon);
    state.layer.add(
        new Konva.Text({
            x: radarPos[0] - 20,
            y: radarPos[1] + 12,
            text: translations.i18n["radar"],
            fontSize: 11,
            fontFamily: "Poppins",
            fill: "#20c997",
            fontStyle: "bold",
            align: "center",
            width: 40,
        }),
    );

    state.layer.draw();
}

export function createRadarScene(options = {}) {
    const state = {
        stage: null,
        layer: null,
        trailLayer: null,
        peopleLayer: null,
        transformCoords: null,
        currentLayout: null,
        currentPeople: [],
        currentTrail: [],
        currentTrailOptions: {},
        peopleNodes: new Map(),
        showTrail: options.showTrail === true,
        clearSentinelPersonIndex:
            options.clearSentinelPersonIndex === undefined
                ? 88
                : options.clearSentinelPersonIndex,
        onPeopleCountChange:
            typeof options.onPeopleCountChange === "function"
                ? options.onPeopleCountChange
                : null,
    };

    function init(container) {
        if (state.stage) state.stage.destroy();
        state.peopleNodes.clear();
        state.transformCoords = null;

        if (container.offsetHeight === 0) {
            container.style.height = "400px";
        }

        state.stage = new Konva.Stage({
            container: container.id,
            width: container.offsetWidth,
            height: container.offsetHeight,
        });
        state.layer = new Konva.Layer();
        state.peopleLayer = new Konva.Layer();
        state.stage.add(state.layer);

        if (state.showTrail) {
            state.trailLayer = new Konva.Layer();
            state.stage.add(state.trailLayer);
        } else {
            state.trailLayer = null;
        }

        state.stage.add(state.peopleLayer);
    }

    function renderRoom(rectangle, declareArea, data) {
        if (!state.stage) return;

        state.currentLayout = { rectangle, declare_area: declareArea, data };
        state.layer.destroyChildren();
        if (state.trailLayer) state.trailLayer.destroyChildren();
        if (state.peopleLayer) clearPeopleNodes(state);

        drawRoom(state, rectangle, declareArea, data);
        drawTrail(state);
        syncPeople(state);
    }

    function updatePeople(people) {
        const nextPeople = Array.isArray(people) ? people.slice() : [];
        const shouldClear =
            nextPeople.length === 1 &&
            Number(nextPeople[0]?.person_index) ===
                Number(state.clearSentinelPersonIndex);

        state.currentPeople = shouldClear ? [] : nextPeople;

        if (!state.transformCoords) return;

        if (!state.currentPeople.length) {
            clearPeopleNodes(state);
            emitPeopleCount(state);
            state.peopleLayer?.batchDraw();
            return;
        }

        syncPeople(state);
    }

    function clearPeople() {
        state.currentPeople = [];
        clearPeopleNodes(state);
        emitPeopleCount(state);
        state.peopleLayer?.batchDraw();
    }

    function setTrail(points, trailOptions = {}) {
        if (!state.showTrail) return;

        state.currentTrail = Array.isArray(points) ? points.slice() : [];
        state.currentTrailOptions = trailOptions;

        if (!state.transformCoords) return;

        drawTrail(state);
    }

    function clearTrail() {
        if (!state.showTrail || !state.trailLayer) return;

        state.currentTrail = [];
        state.currentTrailOptions = {};
        state.trailLayer.destroyChildren();
        state.trailLayer.batchDraw();
    }

    function destroy() {
        clearPeopleNodes(state);

        if (state.stage) {
            state.stage.destroy();
        }

        state.stage = null;
        state.layer = null;
        state.trailLayer = null;
        state.peopleLayer = null;
        state.transformCoords = null;
        state.currentLayout = null;
        state.currentPeople = [];
        state.currentTrail = [];
        state.currentTrailOptions = {};
        emitPeopleCount(state);
    }

    function resize(container) {
        if (!state.stage || !container) return;

        state.stage.width(container.offsetWidth);
        state.stage.height(container.offsetHeight);

        if (!state.currentLayout) return;

        renderRoom(
            state.currentLayout.rectangle,
            state.currentLayout.declare_area,
            state.currentLayout.data,
        );
    }

    function renderPlaceholder(container) {
        renderPlaceholderMarkup(container);
    }

    return {
        init,
        renderRoom,
        updatePeople,
        clearPeople,
        setTrail,
        clearTrail,
        destroy,
        resize,
        renderPlaceholder,
    };
}
