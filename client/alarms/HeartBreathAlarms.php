<?php

require_once __DIR__ . '/AlarmEvaluatorInterface.php';

class HeartBreathAlarms implements AlarmEvaluatorInterface
{
    public function evaluate(array $parsed): array
    {
        $alarms = [];
        $hr = $parsed['heart_rate'] ?? null;
        $br = $parsed['breathing'] ?? null;
        $ss = $parsed['sleep_state'] ?? null;

        $this->applyRuleSet($alarms, $hr, [
            [$hr > 140, 'heart_rate_high_critical', 'perigo', "Frequência cardíaca muito alta: {$hr} bpm"],
            [$hr > 110, 'heart_rate_high', 'aviso', "Frequência cardíaca elevada: {$hr} bpm"],
            [$hr < 30, 'heart_rate_low_critical', 'perigo', "Frequência cardíaca muito baixa: {$hr} bpm"],
            [$hr < 40, 'heart_rate_low', 'aviso', "Frequência cardíaca baixa: {$hr} bpm"],
        ]);

        if ($this->isSleeping($ss) && $this->isInvalidBreathing($br)) {
            $alarms[] = $this->makeAlarm('apnea', 'perigo', "Possível apneia durante o sono");
        }

        $this->applyRuleSet($alarms, $br, [
            [$br > 25, 'breathing_high', 'aviso', "Frequência respiratória elevada: {$br} rpm"],
            [$br < 8 && $br > 0, 'breathing_low', 'perigo', "Frequência respiratória baixa: {$br} rpm"],
        ]);

        if ($hr === -1 && $br === -1) {
            $alarms[] = $this->makeAlarm('vitals_signal_lost', 'aviso', "Sem leitura de sinais vitais");
        }

        return $alarms;
    }

    private function applyRuleSet(array &$alarms, $value, array $rules): void
    {
        if ($value === null) return;
        foreach ($rules as [$condition, $type, $level, $message]) {
            if ($condition) {
                $alarms[] = $this->makeAlarm($type, $level, $message);
                break;
            }
        }
    }

    private function isSleeping(?string $sleepState): bool
    {
        return in_array($sleepState, ['Light Sleep', 'Deep Sleep'], true);
    }

    private function isInvalidBreathing($br): bool
    {
        return in_array($br, [-1, 0, null], true);
    }

    private function makeAlarm(string $type, string $level, ?string $message = null): array
    {
        $entry = [
            'category' => 'alarm',
            'alarm_type' => $type,
            'level' => $level,
            'source' => 'heartbreath',
        ];
        if ($message !== null) $entry['message'] = $message;
        return $entry;
    }
}
