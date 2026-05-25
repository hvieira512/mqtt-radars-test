<?php
function component($path, $data = [])
{
    extract($data, EXTR_SKIP);
    include __DIR__ . "/components/$path.php";
}

function modal($path, $data = [])
{
    extract($data, EXTR_SKIP);
    include __DIR__ . "/modals/$path.php";
}

function radar_region_legend(array $i18n)
{
    $items = [
        ['color' => '#ffa500', 'label' => $i18n['porta']],
        ['color' => '#32cd32', 'label' => $i18n['cama_de_monitorizacao']],
        ['color' => '#ff4500', 'label' => $i18n['regiao_de_alarme']],
        ['color' => '#808080', 'label' => $i18n['interferencia']],
        ['color' => '#a9a9a9', 'label' => $i18n['outras_regioes']],
    ];
?>
    <div class="d-flex justify-content-center flex-wrap gap-3">
        <?php foreach ($items as $item) { ?>
            <div class="d-flex align-items-center">
                <span class="legend-color" style="background:<?= htmlspecialchars($item['color']) ?>"></span>
                <small class="ml-2"><?= htmlspecialchars($item['label']) ?></small>
            </div>
        <?php } ?>
    </div>
<?php
}
