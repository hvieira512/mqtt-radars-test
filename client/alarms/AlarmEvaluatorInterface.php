<?php

interface AlarmEvaluatorInterface
{
    public function evaluate(array $parsed): array;
}
