<?php

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;

foreach ((array)getenv() as $key => $value) {
    if (!array_key_exists($key, $_ENV)) {
        $_ENV[$key] = (string)$value;
    }
}

if (file_exists(__DIR__ . '/.env')) {
    Dotenv::createImmutable(__DIR__)->load();
}

// Ensure runtime/container env vars take precedence for scripts using $_ENV.
foreach ((array)getenv() as $key => $value) {
    $_ENV[$key] = (string)$value;
}
