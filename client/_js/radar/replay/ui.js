export function renderReplayCurrentPeople(elementId, people = []) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const safePeople = Array.isArray(people)
        ? people.filter((person) => Number(person.person_index) !== 88)
        : [];
    const count = safePeople.length;
    const tone =
        count <= 0
            ? "danger"
            : count === 1
              ? "success"
              : count <= 5
                ? "primary"
                : count <= 10
                  ? "warning"
                  : "danger";

    element.innerHTML = `<span class="me-2">${count}</span> ${
        count === 1
            ? translations.i18n["pessoa"]
            : `${translations.i18n["pessoa"]}s`
    }`;
    element.className = "d-flex justify-content-center align-items-center";

    const countEl = element.querySelector("span");
    if (!countEl) return;

    countEl.className = `h4 font-weight-bold mb-0 text-${tone} me-2`;
}

export function getReplaySecondsFromClientX({ clientX, timelineEl, range }) {
    if (!timelineEl || !range) return range?.startSeconds || 0;

    const timelineRect = timelineEl.getBoundingClientRect();
    const relativeX = Math.min(
        Math.max(clientX - timelineRect.left, 0),
        timelineRect.width,
    );
    const progress =
        timelineRect.width > 0 ? relativeX / timelineRect.width : 0;

    return range.startSeconds + range.totalSeconds * progress;
}

export function positionReplayTimelineOverlay({
    element,
    progressPercent,
    wrapperEl,
    timelineEl,
    previewTimeEl = null,
}) {
    if (!wrapperEl || !timelineEl || !element) return;

    const timelineRect = timelineEl.getBoundingClientRect();
    const wrapperRect = wrapperEl.getBoundingClientRect();
    const thumbX =
        timelineRect.left -
        wrapperRect.left +
        timelineRect.width *
            (Math.min(Math.max(progressPercent, 0), 100) / 100);
    const thumbY = timelineRect.top - wrapperRect.top + timelineRect.height / 2;

    element.style.left = `${thumbX}px`;

    if (element === previewTimeEl) {
        const timeHeight = element.offsetHeight || 0;
        element.style.top = `${thumbY - timeHeight - 10}px`;
        return;
    }

    const cardHeight = element.offsetHeight || 0;
    const timeHeight = previewTimeEl?.offsetHeight || 0;
    const timeTop = thumbY - timeHeight - 10;
    element.style.top = `${timeTop - cardHeight - 8}px`;
}
