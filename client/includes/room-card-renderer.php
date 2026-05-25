<?php

function renderMonitoringRadarButton(array $radar, string $roomName, array $i18n): string
{
    $radarUid = trim((string)$radar['uid']);
    $quarto = !empty($i18n["quarto"]) ? $i18n["quarto"] : "Quarto";

    return sprintf(
        '<button
            type="button"
            class="btn btn-sm btn-icon btn-icon-md radar-link-button rounded-circle bg-danger text-white border-0"
            style="--size: 2rem; max-width: var(--size); max-height: var(--size);"
            data-toggle="modal" data-bs-toggle="modal" data-target="#radarModal" data-bs-target="#radarModal" data-id="%1$s" data-wc="%2$d" data-name="%3$s">
                <i class="fas fa-wifi estado-dispositivo text-white"></i>
        </button>',
        htmlspecialchars($radarUid, ENT_QUOTES, 'UTF-8'),
        (int)$radar['wc'],
        htmlspecialchars($quarto . " " . $roomName . ' (' . $radarUid . ')', ENT_QUOTES, 'UTF-8')
    );
}

function renderMonitoringFallAlert(array $i18n): void
{ ?>
    <div class="item-alerta flex-fill text-center d-none">
        <h6><?= $i18n['queda'] ?></h6>
        <svg style="height: 50px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path fill="#fd397a" d="M288 64C305.7 64 320 78.3 320 96L320 101.4C320 156.6 296.3 208.4 256.1 244.5L319 320L408 320C423.1 320 437.3 327.1 446.4 339.2L489.6 396.8C500.2 410.9 497.3 431 483.2 441.6C469.1 452.2 449 449.3 438.4 435.2L400 384L295.2 384L408.8 523.8C419.9 537.5 417.9 557.7 404.1 568.8C390.3 579.9 370.2 577.9 359.1 564.1L169.4 330.6C163.3 345.6 160 361.9 160 378.6L160 448C160 465.7 145.7 480 128 480C110.3 480 96 465.7 96 448L96 378.6C96 311.2 131.4 248.7 189.2 214L193.8 211.2C232.4 188 256 146.4 256 101.4L256 96C256 78.3 270.3 64 288 64zM48 152C48 121.1 73.1 96 104 96C134.9 96 160 121.1 160 152C160 182.9 134.9 208 104 208C73.1 208 48 182.9 48 152zM424 144.1C424 157.4 413.3 168.1 400 168.1C386.7 168.1 376 157.4 376 144.1L376 96.1C376 82.8 386.7 72.1 400 72.1C413.3 72.1 424 82.8 424 96.1L424 144.1zM528 296.1C514.7 296.1 504 285.4 504 272.1C504 258.8 514.7 248.1 528 248.1L576 248.1C589.3 248.1 600 258.8 600 272.1C600 285.4 589.3 296.1 576 296.1L528 296.1zM473.5 198.6C464.1 189.2 464.1 174 473.5 164.7L507.4 130.8C516.8 121.4 532 121.4 541.3 130.8C550.6 140.2 550.7 155.4 541.3 164.7L507.4 198.6C498 208 482.8 208 473.5 198.6z" />
        </svg>
    </div>
<?php }

function renderMonitoringBedItem(array $bed, array $bedRadarButtons, bool $hideIdentity): void
{
    $bedNameHtml = htmlspecialchars($bed['name'], ENT_QUOTES, 'UTF-8');
    $bedButtonsHtml = implode('', $bedRadarButtons[(int)$bed['id']] ?? []);
?>
        <div class="item-cama flex-fill text-center" data-cama="<?= (int)$bed['id'] ?>">
            <?php if (!$hideIdentity || $bedButtonsHtml !== '') { ?>
                <div class="item-cama-utente gap-2">
                    <?php if (!$hideIdentity) { ?>
                        <div class="item-cama-utente__pic">
                            <img src="<?= htmlspecialchars($bed['imagePath'], ENT_QUOTES, 'UTF-8') ?>" class="item-cama-avatar" alt="<?= $bedNameHtml ?>">
                        </div>
                        <div class="item-cama-utente__details">
                            <span class="item-cama-utente__nome"><?= $bedNameHtml ?></span>
                        </div>
                    <?php } ?>
                    <?php if ($bedButtonsHtml !== '') { ?>
                        <div class="item-cama-radares">
                            <?= $bedButtonsHtml ?>
                        </div>
                    <?php } ?>
                </div>
            <?php } ?>
            <i class="fas fa-bed estado-na-cama"></i>
        </div>
<?php }

function renderMonitoringRoomCard(array $room, array $i18n): void
{
    $roomName = trim((string)$room['name']);
    $floorName = trim((string)$room['floorName']);
    $roomRadarButtons = array_map(function ($radar) use ($roomName, $i18n) {
        return renderMonitoringRadarButton($radar, $roomName, $i18n);
    }, $room['roomRadars']);
    $wcRadarButtons = array_map(function ($radar) use ($roomName, $i18n) {
        return renderMonitoringRadarButton($radar, $roomName, $i18n);
    }, $room['wcRadars']);
    $bedRadarButtons = [];
    foreach ($room['bedRadarsByBedId'] as $bedId => $radars) {
        $bedRadarButtons[(int)$bedId] = array_map(function ($radar) use ($roomName, $i18n) {
            return renderMonitoringRadarButton($radar, $roomName, $i18n);
        }, $radars);
    }
?>
    <div class="item-radar radar" data-quarto="<?= (int)$room['id'] ?>" data-quarto-nome="<?= htmlspecialchars($roomName, ENT_QUOTES, 'UTF-8') ?>" data-piso="<?= htmlspecialchars($floorName, ENT_QUOTES, 'UTF-8') ?>">
        <div class="card h-100">
            <div class="card-header d-flex align-items-center justify-content-between py-2 px-3">
                <h5 class="mb-0 text-truncate">
                    <?= $i18n["quarto"] ?>: <?= htmlspecialchars($roomName, ENT_QUOTES, 'UTF-8') ?>
                </h5>
                <div class="d-flex align-items-center ms-2">
                    <?php if (!empty($roomRadarButtons)) { ?>
                        <div class="d-inline-flex gap-1">
                            <?= implode('', $roomRadarButtons) ?>
                        </div>
                    <?php } ?>
                </div>
            </div>

            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center w-100">
                    <div class="flex-fill text-center me-2">
                            <div class="radar-icon-info d-flex justify-content-between align-items-center mb-2 container-camas">
                                <?php renderMonitoringFallAlert($i18n); ?>
                                <?php
                                foreach ($room['beds'] as $bed) {
                                    $hideIdentity = empty($bed['hasPatient']);
                                    renderMonitoringBedItem($bed, $bedRadarButtons, $hideIdentity);
                                }
                                ?>
                            </div>
                        <div class="radar-descricao-info">
                            <?= $i18n['pessoas'] ?>: <span class="numero-pessoas-camas">0</span>
                        </div>
                    </div>

                    <?php if (!empty($room['hasWc'])) { ?>
                        <div class="flex-fill text-center ms-2">
                            <div class="radar-icon-info mb-2 container-wc">
                                <?php renderMonitoringFallAlert($i18n); ?>
                                <div class="item-wc flex-fill text-center">
                                    <div class="item-wc-header">
                                        <h6 class="mb-0"><?= $i18n["wc"] ?></h6>
                                        <?php if (!empty($wcRadarButtons)) { ?>
                                            <div class="item-wc-radares">
                                                <?= implode('', $wcRadarButtons) ?>
                                            </div>
                                        <?php } ?>
                                    </div>
                                    <i class="fas fa-toilet"></i>
                                </div>
                            </div>
                            <div class="radar-descricao-info">
                                <?= $i18n['pessoas'] ?>: <span class="numero-pessoas-wc">0</span>
                            </div>
                        </div>
                    <?php } ?>
                </div>
            </div>
        </div>
    </div>
<?php }
