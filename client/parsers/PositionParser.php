<?php

class PositionParser implements ParserInterface
{
    public function parse(string $base64, ?string $deviceCode): ?array
    {
        $raw = base64_decode($base64, true);
        if ($raw === false || strlen($raw) % 16 !== 0) {
            return null;
        }

        $people = [];
        $length = strlen($raw);
        $count = $length / 16;

        $postures = [
            0 => "Initialization",
            1 => "Walking",
            2 => "Suspected Fall",
            3 => "Squatting",
            4 => "Standing",
            5 => "Fall Confirmation",
            6 => "Lying Down",
            7 => "Suspected Sitting on Ground",
            8 => "Confirmed Sitting on Ground",
            9 => "Sitting Up Bed",
            10 => "Suspected Sitting Up Bed",
            11 => "Confirmed Sitting Up Bed",
        ];

        $events = [
            0 => "No Event",
            1 => "Enter Room",
            2 => "Leave Room",
            3 => "Enter Area",
            4 => "Leave Area",
        ];

        for ($i = 0; $i < $count; $i++) {
            $offset = $i * 16;
            $personIndex = ord($raw[$offset]);
            $xByte = ord($raw[$offset + 1]);
            $yByte = ord($raw[$offset + 2]);
            $x = $xByte > 127 ? $xByte - 256 : $xByte;
            $y = $yByte > 127 ? $yByte - 256 : $yByte;
            $postureCode = ord($raw[$offset + 13]);
            $eventCode = ord($raw[$offset + 14]);

            $people[] = [
                "person_index" => $personIndex,
                "x_position_dm" => $x,
                "y_position_dm" => $y,
                "z_position_cm" => ord($raw[$offset + 3]),
                "time_left_s" => ord($raw[$offset + 12]),
                "posture_state" => $postures[$postureCode] ?? "Unknown",
                "last_event" => $events[$eventCode] ?? "Unknown",
                "region_id" => ord($raw[$offset + 15]),
            ];
        }

        return ["type" => "position", "device_code" => $deviceCode, "people" => $people];
    }
}
