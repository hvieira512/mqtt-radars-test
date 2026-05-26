function toInt(value) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
}

let alertasQuedaMesAtual = 0;

function interpolateTemplate(template, params = {}) {
    return String(template).replace(/\{(\w+)\}/g, function (match, key) {
        return Object.prototype.hasOwnProperty.call(params, key)
            ? params[key]
            : match;
    });
}

function t(key, fallback = key, params = {}) {
    if (globalThis.radarI18n?.t) {
        return globalThis.radarI18n.t(key, fallback, params);
    }

    const dictionary = globalThis.translations?.i18n || {};
    const hasValue =
        Object.prototype.hasOwnProperty.call(dictionary, key) &&
        dictionary[key] !== "";
    const value = hasValue ? dictionary[key] : fallback;

    return interpolateTemplate(value ?? fallback, params);
}

function formatQuantidade(total, singularKey, singularFallback) {
    const key = total === 1 ? singularKey : singularKey + "s";
    const fallback = total === 1 ? singularFallback : singularFallback + "s";

    let label = t(key, fallback);
    if (label === fallback && total !== 1) {
        label = t(singularKey, singularFallback);
    }

    return `${total} ${String(label).toLowerCase()}`;
}

function getMesAtualExtenso() {
    const lang = document.documentElement.lang || "pt-PT";
    try {
        return new Intl.DateTimeFormat(lang, { month: "long" }).format(
            new Date(),
        );
    } catch (error) {
        return new Intl.DateTimeFormat("pt-PT", { month: "long" }).format(
            new Date(),
        );
    }
}

function atualizarEstadoIcone(selector, ativo, alerta = false) {
    const $icon = $(selector);
    $icon.removeClass("icone-inativo text-success text-danger");

    if (ativo) {
        $icon.addClass(alerta ? "text-danger" : "text-success");
        return;
    }

    $icon.addClass("icone-inativo");
}

function atualizarIndicadoresResumo(resumo) {
    const camasTotal = $(".container-camas .item-cama").length;
    const monitorizadas = toInt(resumo.monitorizadas);
    const camasOcupadas = toInt(resumo.camasOcupadas);
    const camasVazias = Math.max(camasTotal - camasOcupadas, 0);
    const pessoasWc = toInt(resumo.pessoasWc);
    const alertasQuedaMes = toInt(resumo.alertasQuedaMes);
    const mesAtual = (resumo.mesAtual || getMesAtualExtenso()).toLowerCase();

    $("#indicador-pessoas-monitorizadas").text(
        formatQuantidade(monitorizadas, "pessoa", "pessoa"),
    );
    $("#indicador-camas-ocupadas").text(
        formatQuantidade(camasOcupadas, "cama", "cama"),
    );
    $("#indicador-camas-vazias").text(
        formatQuantidade(camasVazias, "cama", "cama"),
    );
    $("#indicador-pessoas-wc").text(
        formatQuantidade(pessoasWc, "pessoa", "pessoa"),
    );
    $("#indicador-alertas-queda-mes").text(
        formatQuantidade(alertasQuedaMes, "alerta", "alerta"),
    );
    $("#indicador-mes-atual").text(mesAtual);

    atualizarEstadoIcone("#icone-pessoas-monitorizadas", monitorizadas > 0);
    atualizarEstadoIcone("#icone-camas-ocupadas", camasOcupadas > 0);
    atualizarEstadoIcone("#icone-camas-vazias", camasVazias > 0);
    atualizarEstadoIcone("#icone-pessoas-wc", pessoasWc > 0);
    atualizarEstadoIcone("#icone-alertas-queda-mes", alertasQuedaMes > 0, true);
}

$("#indicador-mes-atual").text(getMesAtualExtenso().toLowerCase());

function canSilenceFallConfirmedAlarms() {
    return document.body?.dataset?.touchAppNfcAlertasRadares === "1";
}

function isFallConfirmedSos($sosEl) {
    const cardType = String($sosEl.attr("data-radar-sos-type") || "");
    if (cardType === "fall_confirmed") {
        return true;
    }

    let foundFallConfirmed = false;
    let hasTypedDetection = false;

    $sosEl.find("button[data-detection-type]").each(function () {
        hasTypedDetection = true;
        if (String($(this).attr("data-detection-type")) === "fall_confirmed") {
            foundFallConfirmed = true;
        }
    });

    if (foundFallConfirmed) {
        return true;
    }

    return !hasTypedDetection && $sosEl.find("button[data-detection-id]").length > 0;
}

$(document).on("click", ".radar-sos", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const $sosEl = $(this).closest(".radar-sos");

    if (isFallConfirmedSos($sosEl) && !canSilenceFallConfirmedAlarms()) {
        return false;
    }

    const detectionIds = [];
    $sosEl.find("button[data-detection-id]").each(function () {
        const id = parseInt($(this).attr("data-detection-id"), 10);
        if (id && !detectionIds.includes(id)) {
            detectionIds.push(id);
        }
    });

    if (detectionIds.length > 0) {
        fetch("/modulos/radares/_ajax/detections/resolve.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "silence",
                detection_ids: detectionIds,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === "ok") {
                    $sosEl.removeClass("radar-sos");
                    $sosEl.removeAttr("data-radar-sos-type");
                    $sosEl
                        .find("button[data-detection-id]")
                        .removeAttr("data-detection-id")
                        .removeAttr("data-detection-type");

                    $sosEl
                        .find(".container-camas .item-cama")
                        .removeClass("d-none");
                    $sosEl
                        .find(".container-camas .item-alerta")
                        .addClass("d-none");
                    $sosEl
                        .find(".container-wc .item-wc")
                        .removeClass("d-none");
                    $sosEl
                        .find(".container-wc .item-alerta")
                        .addClass("d-none");
                }
            })
            .catch((err) => console.error("Error silencing alarm:", err));
    }

    return false;
});

$(document).ready(function () {
    $("body").tooltip({ selector: "[data-toggle=tooltip], [data-bs-toggle=tooltip]" });
});
