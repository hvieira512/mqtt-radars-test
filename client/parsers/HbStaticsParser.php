<?php

class HbStaticsParser implements ParserInterface
{
    public function parse(string $base64, ?string $deviceCode): ?array
    {
        $raw = base64_decode($base64, true);
        if ($raw === false || strlen($raw) !== 16) {
            return null;
        }

        $status_byte = ord($raw[13]);

        $breathing_status_map = [0b00 => "Normal", 0b01 => "Hypopnea", 0b10 => "Hyperpnea", 0b11 => "Apnea"];
        $heart_rate_status_map = [0b00 => "Normal", 0b01 => "Low", 0b10 => "High", 0b11 => "Undefined"];
        $vital_signs_map = [0b00 => "Normal", 0b01 => "Undefined", 0b10 => "Undefined", 0b11 => "Weak"];
        $sleep_states_map = [0b00 => "Undefined", 0b01 => "Light Sleep", 0b10 => "Deep Sleep", 0b11 => "Awake"];

        return [
            "type" => "hbstatics",
            "device_code" => $deviceCode,
            "real_time_breathing" => ord($raw[1]),
            "real_time_heart_rate" => ord($raw[2]),
            "avg_breathing_per_minute" => ord($raw[5]),
            "avg_heart_rate_per_minute" => ord($raw[6]),
            "breathing_status_per_minute" => $breathing_status_map[$status_byte & 0b00000011] ?? "unknown",
            "heart_rate_status_per_minute" => $heart_rate_status_map[($status_byte & 0b00001100) >> 2] ?? "unknown",
            "vital_signs_status" => $vital_signs_map[($status_byte & 0b00110000) >> 4] ?? "unknown",
            "sleep_state_status" => $sleep_states_map[($status_byte & 0b11000000) >> 6] ?? "unknown",
        ];
    }
}
