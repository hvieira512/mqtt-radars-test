export function resolveTrailTargetPersonIndex({ alarm, frames = [], alarmSeconds }) {
    if (
        alarm?.person_index !== null &&
        alarm?.person_index !== undefined &&
        alarm?.person_index !== ""
    ) {
        return Number(alarm.person_index);
    }

    if (!frames.length || alarmSeconds === null || alarmSeconds === undefined) {
        return null;
    }

    const candidatePostures = new Set([
        "Fall Confirmation",
        "Suspected Fall",
        "Confirmed Sitting on Ground",
    ]);
    let bestCandidate = null;

    frames.forEach((frame) => {
        frame.people.forEach((person) => {
            if (!candidatePostures.has(person.posture_state)) return;

            const distance = Math.abs(frame.seconds - alarmSeconds);
            if (!bestCandidate || distance < bestCandidate.distance) {
                bestCandidate = {
                    personIndex: person.person_index,
                    distance,
                };
            }
        });
    });

    return bestCandidate ? bestCandidate.personIndex : null;
}

export function getTrailPoints({
    currentSeconds,
    frames = [],
    targetPersonIndex,
}) {
    if (targetPersonIndex === null || targetPersonIndex === undefined) {
        return [];
    }

    const points = [];
    const seen = new Set();

    frames.forEach((frame) => {
        if (frame.seconds > currentSeconds) return;

        const person = frame.people.find(
            (item) => Number(item.person_index) === Number(targetPersonIndex),
        );
        if (!person) return;

        const pointKey = `${person.x_position_dm}:${person.y_position_dm}:${frame.seconds}`;
        if (seen.has(pointKey)) return;
        seen.add(pointKey);
        points.push(person);
    });

    return points;
}
