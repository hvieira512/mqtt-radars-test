import { createRadarScene } from "./radar-scene.js";

const scene = createRadarScene({ showTrail: true });

export function init(container) {
    scene.init(container);
}

export function renderRoom(rectangle, declare_area, data) {
    scene.renderRoom(rectangle, declare_area, data);
}

export function updatePeople(people) {
    scene.updatePeople(people);
}

export function setTrail(points, options = {}) {
    scene.setTrail(points, options);
}

export function clearPeople() {
    scene.clearPeople();
}

export function clearTrail() {
    scene.clearTrail();
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
