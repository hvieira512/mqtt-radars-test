<?php

interface ParserInterface
{
    public function parse(string $base64, ?string $deviceCode): ?array;
}
