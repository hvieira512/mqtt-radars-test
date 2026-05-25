<?php

require_once __DIR__ . '/AlarmEvaluatorInterface.php';
require_once __DIR__ . '/HeartBreathAlarms.php';
require_once __DIR__ . '/PositionAlarms.php';

class AlarmEngine
{
    private static $alarms = [
        'vitals' => HeartBreathAlarms::class,
        'position' => PositionAlarms::class,
    ];

    public static function evaluate(array $parsed): array
    {
        static $instances = [];

        $type = $parsed['type'] ?? null;
        if (!$type || !isset(self::$alarms[$type])) {
            return [];
        }

        $alarmClass = self::$alarms[$type];
        if (!isset($instances[$alarmClass])) {
            $instances[$alarmClass] = new $alarmClass();
        }
        $instance = $instances[$alarmClass];

        if (!$instance instanceof AlarmEvaluatorInterface) {
            throw new RuntimeException("Alarm evaluator must implement AlarmEvaluatorInterface: {$alarmClass}");
        }

        return $instance->evaluate($parsed);
    }
}
