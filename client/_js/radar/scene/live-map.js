// radar-map.js - Map rendering for radar positions using Konva.js

import { createRadarScene } from "./radar-scene.js";

const scene = createRadarScene({
    onPeopleCountChange(count) {
        updateCurrentPeople(count);
    },
});

export function init(container) {
    scene.init(container);
}

export function renderRoom(rectangle, declare_area, data) {
    scene.renderRoom(rectangle, declare_area, data);
}

export function updatePeople(people) {
    scene.updatePeople(people);
}

function updateCurrentPeople(count) {
    const el = document.getElementById("current-people");
    if (!el) return;

    el.innerHTML = `<span id="people-count" class="me-2">${count}</span> ${
        count === 1
            ? translations.i18n["pessoa"]
            : `${translations.i18n["pessoa"]}s`
    }`;
    el.className = "d-flex justify-content-center align-items-center";

    const countEl = document.getElementById("people-count");
    if (!countEl) return;
    countEl.className = "";

    const colorClasses = [
        { max: 0, class: "danger" },
        { max: 1, class: "success" },
        { max: 5, class: "primary" },
        { max: 10, class: "warning" },
        { max: Infinity, class: "danger" },
    ];

    const colorClass =
        colorClasses.find((c) => count <= c.max)?.class || "secondary";
    countEl.className = `h4 font-weight-bold mb-0 text-${colorClass} me-2`;
}

export function destroy() {
    scene.destroy();
}

export function resize(container) {
    scene.resize(container);
}

export function renderPlaceholder(container) {
    scene.renderPlaceholder(container);
}
