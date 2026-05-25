<?php
/**
 * Simulates 500 radars publishing MQTT messages.
 *
 * Each radar sends:
 *   - position: ~1 msg/s (16-byte binary, base64 encoded)
 *   - heartbreath: every 3s
 *
 * Total: ~500 position + ~167 vitals = ~667 msg/s
 *
 * Usage: php simulate-radars.php [--count=500] [--license=9999] [--vitals-only]
 */

error_reporting(E_ALL & ~E_DEPRECATED);

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/bootstrap.php';

$options = getopt('', ['count:', 'license:', 'vitals-only', 'help']);
if (isset($options['help'])) {
    echo "Usage: php simulate-radars.php [options]\n";
    echo "  --count=N     Number of radars to simulate (default: 500)\n";
    echo "  --license=N   License ID to use (default: 9999)\n";
    echo "  --vitals-only Only send heartbreath data\n";
    exit(0);
}

$radarCount = isset($options['count']) ? (int)$options['count'] : 500;
$license = isset($options['license']) ? (int)$options['license'] : 9999;
$vitalsOnly = isset($options['vitals-only']);
$radarCount = max(1, min(5000, $radarCount));

// ─── MQTT helpers ──────────────────────────────────────────

function encodeRemainingLen(int $len): string
{
    $result = '';
    do {
        $digit = $len % 128;
        $len = intdiv($len, 128);
        if ($len > 0) $digit |= 0x80;
        $result .= chr($digit);
    } while ($len > 0);
    return $result;
}

function buildConnectPacket(string $clientId): string
{
    $protocol = 'MQIsdp';
    $protocolLevel = 3;
    $flags = 0xC0;

    $payload = pack('n', strlen($protocol)) . $protocol . chr($protocolLevel);
    $payload .= chr($flags);
    $payload .= pack('n', 60);
    $payload .= pack('n', strlen($clientId)) . $clientId;

    return chr(0x10) . encodeRemainingLen(strlen($payload)) . $payload;
}

function buildPublishPacket(string $topic, string $payload, int $qos = 0): string
{
    $topicLen = pack('n', strlen($topic)) . $topic;
    $flags = $qos << 1;
    $packet = $topicLen . $payload;
    return chr(0x30 | $flags) . encodeRemainingLen(strlen($packet)) . $packet;
}

// ─── Sim data generators ───────────────────────────────────

$postures = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
$events = [0, 1, 2, 3, 4];
$sleepStates = [0b00, 0b01, 0b10, 0b11];

function generatePositionData(int $personIndex, int $x, int $y, int $z, int $posture, int $event, int $region): string
{
    $raw = chr($personIndex) . chr($x & 0xFF) . chr($y & 0xFF) . chr($z & 0xFF);
    $raw .= chr(rand(0, 255)) . chr(0) . chr(0) . chr(0) . chr(0) . chr(0) . chr(0) . chr(0);
    $raw .= chr(rand(0, 60)) . chr($posture) . chr($event) . chr($region);
    return base64_encode($raw);
}

function generateHeartBreathData(int $breathing, int $heartRate, int $sleepState): string
{
    $raw = chr(0) . chr($breathing) . chr($heartRate) . chr(0);
    $raw .= chr(0) . chr(0) . chr(0) . chr(0) . chr(0) . chr(0) . chr(0) . chr(0);
    $raw .= chr(0) . chr($sleepState << 6) . chr(0) . chr(0);
    return base64_encode($raw);
}

// ─── Load or generate radar UIDs ────────────────────────────

$radars = [];

// Try to load UIDs from radares that have esquema entries (for dashboard online detection)
try {
    $dbHost = $_ENV['DB_HOST'] ?? '127.0.0.1';
    $dbPort = (int)($_ENV['DB_PORT'] ?? 3306);
    $dbName = $_ENV['DB_DATABASE'] ?? 'radar_test';
    $dbUser = $_ENV['DB_USERNAME'] ?? 'radar_user';
    $dbPass = $_ENV['DB_PASSWORD'] ?? 'radar_pass';

    $dbConn = mysqli_connect($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
    if ($dbConn && !mysqli_connect_error()) {
        $result = mysqli_query($dbConn, "
            SELECT DISTINCT r.uid
            FROM radares r
            INNER JOIN radares_esquema re ON re.id_radar = r.id
            LIMIT " . (int)$radarCount
        );
        if ($result) {
            while ($row = mysqli_fetch_assoc($result)) {
                $radars[] = ['license' => $license, 'uid' => $row['uid']];
            }
            mysqli_free_result($result);
        }
        mysqli_close($dbConn);
    }
    } catch (Throwable $e) {
        fwrite(STDERR, "DB load error: " . $e->getMessage() . " [" . get_class($e) . "]\n");
    }

// Fallback: generate random UIDs if DB query returned fewer than requested
$needed = $radarCount - count($radars);
if ($needed > 0) {
    echo "Adding $needed random UIDs (DB had " . count($radars) . ")\n";
    for ($i = 0; $i < $needed; $i++) {
        $uid = strtoupper(bin2hex(random_bytes(6)));
        $radars[] = ['license' => $license, 'uid' => $uid];
    }
}

echo "Using " . count($radars) . " radar UIDs\n";

// ─── Connect to MQTT ───────────────────────────────────────

$mqttServer = $_ENV['MQTT_SERVER'] ?? '127.0.0.1';
$mqttPort = (int)($_ENV['MQTT_PORT'] ?? 1883);

$socket = @fsockopen($mqttServer, $mqttPort, $errno, $errstr, 5);
if (!$socket) {
    die("Failed to connect to MQTT $mqttServer:$mqttPort: $errstr ($errno)\n");
}

$username = ($_ENV['MQTT_USERNAME'] ?? '') !== '' ? $_ENV['MQTT_USERNAME'] : null;
$password = ($_ENV['MQTT_PASSWORD'] ?? '') !== '' ? $_ENV['MQTT_PASSWORD'] : null;
$connPacket = buildConnectPacket('sim-' . $license . '-' . getmypid());
fwrite($socket, $connPacket);
$connAck = fread($socket, 4);
if (strlen($connAck) < 4) {
    die("Failed to receive MQTT CONNACK\n");
}
echo "Connected to MQTT $mqttServer:$mqttPort\n\n";

// ─── Per-radar state ───────────────────────────────────────

echo "Initializing radar states...\n";
$states = [];
for ($i = 0; $i < $radarCount; $i++) {
    $states[] = [
        'x' => rand(-30, 30),
        'y' => rand(-30, 30),
        'z' => rand(220, 280),
        'targetX' => rand(-30, 30),
        'targetY' => rand(-30, 30),
        'targetZ' => rand(220, 280),
        'state' => 'idle',
        'stateTimer' => rand(3, 8),
        'posture' => $postures[array_rand($postures)],
        'lastVitals' => 0,
        'personIndex' => 0,
        'regionId' => rand(1, 4),
    ];
}

// ─── Main loop ─────────────────────────────────────────────

$messageCount = 0;
$lastReport = time();
$cycleTime = 0;
$maxSendPerSecond = 1000;

echo "Starting simulation: $radarCount radars, license $license\n";
if ($vitalsOnly) echo "[vitals-only mode]\n";
echo str_repeat('-', 60) . "\n";

while (true) {
    $cycleStart = microtime(true);

    for ($i = 0; $i < $radarCount; $i++) {
        $radar = $radars[$i];
        $state = &$states[$i];
        $topic = "radar/{$radar['license']}/{$radar['uid']}";

        // Update movement
        if (!$vitalsOnly) {
            $state['stateTimer']--;
            if ($state['stateTimer'] <= 0) {
                $nextStates = ['idle', 'walking', 'standing', 'idle', 'walking', 'sitting'];
                $state['state'] = $nextStates[array_rand($nextStates)];
                $state['stateTimer'] = rand(4, 15);
                $dx = $state['targetX'] - $state['x'];
                $dy = $state['targetY'] - $state['y'];
                $dist = sqrt($dx * $dx + $dy * $dy);
                if ($dist > 5 || $state['state'] === 'idle') {
                    $state['targetX'] = $state['x'] + rand(-8, 8);
                    $state['targetY'] = $state['y'] + rand(-8, 8);
                }
                $state['targetX'] = max(-35, min(35, $state['targetX']));
                $state['targetY'] = max(-35, min(35, $state['targetY']));
                $state['targetZ'] = $state['state'] === 'sitting' ? rand(150, 180) : rand(220, 280);
                if (rand(1, 10) <= 3) {
                    $state['posture'] = $postures[array_rand($postures)];
                }
            }

            $speed = match ($state['state']) {
                'idle' => 0.2,
                'standing' => 0.1,
                'sitting' => 0.1,
                'walking' => 0.8,
                default => 0.3,
            };

            $dx = $state['targetX'] - $state['x'];
            $dy = $state['targetY'] - $state['y'];
            $dz = $state['targetZ'] - $state['z'];
            $dist = sqrt($dx * $dx + $dy * $dy + $dz * $dz);
            if ($dist > 0.5) {
                $state['x'] += ($dx / $dist) * $speed;
                $state['y'] += ($dy / $dist) * $speed;
                $state['z'] += ($dz / $dist) * $speed * 0.3;
            }
            $state['x'] = max(-45, min(45, $state['x']));
            $state['y'] = max(-45, min(45, $state['y']));
            $state['z'] = max(150, min(300, $state['z']));

            // Send position
            $payload = json_encode([
                'payload' => [
                    'deviceCode' => $radar['uid'],
                    'position' => generatePositionData(
                        $state['personIndex'],
                        (int)round($state['x']),
                        (int)round($state['y']),
                        (int)round($state['z']),
                        $state['posture'],
                        $events[array_rand($events)],
                        $state['regionId'],
                    ),
                ]
            ]);
            fwrite($socket, buildPublishPacket($topic, $payload, 0));
            $messageCount++;
        }

        // Vitals every ~3 cycles
        $now = time();
        if ($now - $state['lastVitals'] >= 3) {
            $vitalsPayload = json_encode([
                'payload' => [
                    'deviceCode' => $radar['uid'],
                    'heartbreath' => generateHeartBreathData(
                        rand(10, 25),
                        rand(60, 100),
                        $sleepStates[array_rand($sleepStates)]
                    ),
                ]
            ]);
            fwrite($socket, buildPublishPacket($topic, $vitalsPayload, 0));
            $messageCount++;
            $state['lastVitals'] = $now;
        }
    }

    $cycleElapsed = (microtime(true) - $cycleStart) * 1000;

    // Rate control: target 1 cycle per second for position-only, 0.75s with vitals
    $targetCycleMs = $vitalsOnly ? 300 : 1000;
    if ($cycleElapsed < $targetCycleMs) {
        usleep((int)(($targetCycleMs - $cycleElapsed) * 1000));
    }

    $totalElapsed = (microtime(true) - $cycleStart) * 1000;

    if (time() - $lastReport >= 5) {
        $rate = round($messageCount / max(1, time() - $lastReport));
        echo "[" . date('H:i:s') . "] "
            . "sent: $messageCount "
            . "rate: {$rate} msg/s "
            . "cycle: " . round($totalElapsed) . "ms"
            . ($vitalsOnly ? " [vitals-only]" : " [pos+vitals]")
            . "\n";
        $lastReport = time();
    }
}
