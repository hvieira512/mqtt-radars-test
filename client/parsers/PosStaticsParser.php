<?php

class PosStaticsParser implements ParserInterface
{
    public function parse(string $base64, ?string $deviceCode): ?array
    {
        $raw = base64_decode($base64, true);
        if ($raw === false || strlen($raw) !== 16) {
            return null;
        }

        $version = ord($raw[1]);
        $breathingActive = ($version >= 2) ? ((ord($raw[10]) & 0b00000001) !== 0) : false;

        return [
            "type" => "minute_stats",
            "device_code" => $deviceCode,
            "version" => $version,
            "people" => ord($raw[2]),
            "walking_distance" => (ord($raw[3]) << 8) + ord($raw[4]),
            "walking_time" => ord($raw[5]),
            "meditation_time" => ord($raw[6]),
            "in_bed_time" => ord($raw[7]),
            "standing_time" => ord($raw[8]),
            "multiplayer_time" => ord($raw[9]),
            "breathing_active" => $breathingActive,
        ];
    }
}
