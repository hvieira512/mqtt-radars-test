<?php
/**
 * Build script: concatenates all radar JS modules into _js/radar-all.js
 * Run: php scripts/build-js.php
 */

$base = __DIR__ . '/../client';

$order = [
    '_js/radar/core/utils.js',
    '_js/radar/core/poll.js',
    '_js/radar/core/toast.js',
    '_js/radar/core/grid.js',
    '_js/radar/core/index.js',
    '_js/radar/replay/time.js',
    '_js/radar/replay/core.js',
    '_js/radar/replay/ui.js',
    '_js/radar/replay/index.js',
    '_js/radar/scene/radar-scene.js',
    '_js/radar/scene/live-map.js',
    '_js/radar/scene/playback-map.js',
    '_js/radar/scene/index.js',
    '_js/radar/utils.js',
    '_js/utils.js',
    '_js/radar/live/info-panel.js',
    '_js/radar/live/modal-controller.js',
    '_js/radar/live/page-updater.js',
    '_js/radar/live/index.js',
    '_js/radar/playback/category-renderer.js',
    '_js/radar/playback/domain.js',
    '_js/radar/playback/view.js',
    '_js/radar/playback/service.js',
    '_js/radar/playback/controller.js',
    '_js/radar/playback/index.js',
    '_js/radar/fall-replay/trail.js',
    '_js/radar/fall-replay/modal-ui.js',
    '_js/radar/fall-replay/main.js',
    '_js/radar/sleep-report/date-picker.js',
    '_js/radar/sleep-report/suggestions.js',
    '_js/radar/sleep-report/kpis.js',
    '_js/radar/sleep-report/charts/breathe.js',
    '_js/radar/sleep-report/charts/heart-rate.js',
    '_js/radar/sleep-report/charts/health-score.js',
    '_js/radar/sleep-report/charts/daytime.js',
    '_js/radar/sleep-report/charts/sleep.js',
    '_js/radar/sleep-report/charts/timeline-sleep.js',
    '_js/radar/sleep-report/main.js',
    '_js/radar/monthly-sleep-report/service.js',
    '_js/radar/monthly-sleep-report/charts/helpers.js',
    '_js/radar/monthly-sleep-report/charts/sections/activity-status.js',
    '_js/radar/monthly-sleep-report/charts/sections/body-movement-condition.js',
    '_js/radar/monthly-sleep-report/charts/sections/breathing-rate-condition.js',
    '_js/radar/monthly-sleep-report/charts/sections/daily-routine.js',
    '_js/radar/monthly-sleep-report/charts/sections/getting-out-of-bed-at-night.js',
    '_js/radar/monthly-sleep-report/charts/sections/heart-rate-condition.js',
    '_js/radar/monthly-sleep-report/charts/sections/sleep-condition.js',
    '_js/radar/monthly-sleep-report/charts/sections/index.js',
    '_js/radar/monthly-sleep-report/main.js',
    '_js/radar/monthly-sleep-report/index.js',
    '_js/radar/main.js',
];

$module_keys = [];
foreach ($order as $i => $p) {
    $module_keys[$p] = 'm' . $i;
}

function resolve_rel($from_rel, $import_path) {
    $dir = dirname($from_rel);
    $parts = explode('/', $dir . '/' . $import_path);
    $out = [];
    foreach ($parts as $p) {
        if ($p === '.' || $p === '') continue;
        if ($p === '..') { array_pop($out); continue; }
        $out[] = $p;
    }
    return implode('/', $out);
}

function process_mod($code, $rel, $module_keys) {
    $mk = $module_keys[$rel];
    $import_assign = [];

    // import * as X from "..."
    $code = preg_replace_callback(
        '/^import\s+\*\s+as\s+(\w+)\s+from\s*["\']([^"\']+)["\'];?\s*$/m',
        function($m) use ($rel, $module_keys, &$import_assign) {
            $src = resolve_rel($rel, $m[2]);
            $sk = $module_keys[$src] ?? ('x_' . md5($src));
            $import_assign[] = "var {$m[1]} = __r['$sk'];";
            return '';
        },
        $code
    );

    // import { X as Y, Z } from "..."
    $code = preg_replace_callback(
        '/^import\s*\{([^}]+)\}\s*from\s*["\']([^"\']+)["\'];?\s*$/m',
        function($m) use ($rel, $module_keys, &$import_assign) {
            $src = resolve_rel($rel, $m[2]);
            $sk = $module_keys[$src] ?? ('x_' . md5($src));
            $items = explode(',', $m[1]);
            $vars = [];
            foreach ($items as $item) {
                $item = trim($item);
                if (!$item) continue;
                if (preg_match('/^(\w+)\s+as\s+(\w+)$/', $item, $p)) {
                    $vars[] = "{$p[2]} = __r['$sk'].{$p[1]}";
                } else {
                    $vars[] = "$item = __r['$sk'].$item";
                }
            }
            $import_assign[] = 'var ' . implode(', ', $vars) . ';';
            return '';
        },
        $code
    );

    // import X from "..."
    $code = preg_replace('/^import\s+\w+\s+from\s*["\'][^"\']+["\'];?\s*$/m', '', $code);

    // Handle re-exports: export * as X from "..."
    $reexport_code = [];
    $code = preg_replace_callback(
        '/^export\s+\*\s+as\s+(\w+)\s+from\s*["\']([^"\']+)["\'];?\s*$/m',
        function($m) use ($rel, $module_keys, $mk, &$reexport_code) {
            $src = resolve_rel($rel, $m[2]);
            $sk = $module_keys[$src] ?? ('x_' . md5($src));
            $reexport_code[] = "__r['$mk'] = __r['$mk'] || {};";
            $reexport_code[] = "__r['$mk'].{$m[1]} = __r['$sk'];";
            return '';
        },
        $code
    );

    // export * from "..."
    $code = preg_replace_callback(
        '/^export\s+\*\s+from\s*["\']([^"\']+)["\'];?\s*$/m',
        function($m) use ($rel, $module_keys, $mk, &$reexport_code) {
            $src = resolve_rel($rel, $m[1]);
            $sk = $module_keys[$src] ?? ('x_' . md5($src));
            $reexport_code[] = "__r['$mk'] = __r['$mk'] || {};";
            $reexport_code[] = "for(var k in __r['$sk']) __r['$mk'][k] = __r['$sk'][k];";
            return '';
        },
        $code
    );

    // export { X as Y, Z } from "..."
    $code = preg_replace_callback(
        '/^export\s*\{([^}]+)\}\s*from\s*["\']([^"\']+)["\'];?\s*$/m',
        function($m) use ($rel, $module_keys, $mk, &$reexport_code) {
            $src = resolve_rel($rel, $m[2]);
            $sk = $module_keys[$src] ?? ('x_' . md5($src));
            $items = explode(',', $m[1]);
            foreach ($items as $item) {
                $item = trim($item);
                if (!$item) continue;
                if (preg_match('/^(\w+)\s+as\s+(\w+)$/', $item, $p)) {
                    $orig = $p[1]; $alias = $p[2];
                } else {
                    $orig = $alias = $item;
                }
                $reexport_code[] = "__r['$mk'] = __r['$mk'] || {};";
                $reexport_code[] = "__r['$mk'].$alias = __r['$sk'].$orig;";
            }
            return '';
        },
        $code
    );

    // Extract named exports
    $named = [];
    preg_match_all('/^export\s+(?:async\s+)?function\s+(\w+)/m', $code, $m);
    $named = array_merge($named, $m[1]);
    preg_match_all('/^export\s+(?:const|let|var)\s+(\w+)/m', $code, $m);
    $named = array_merge($named, $m[1]);
    preg_match_all('/^export\s+class\s+(\w+)/m', $code, $m);
    $named = array_merge($named, $m[1]);
    preg_match_all('/^export\s*\{([^}]+)\};?\s*$/m', $code, $m);
    foreach ($m[1] as $list) {
        foreach (explode(',', $list) as $item) {
            $item = trim($item);
            if (!$item) continue;
            $parts = preg_split('/\s+as\s+/', $item);
            $named[] = trim($parts[0]);
        }
    }
    $named = array_unique($named);

    $default_name = null;
    if (preg_match('/^export\s+default\s+(?:(?:async\s+)?function\s+(\w+))/m', $code, $m)) {
        $default_name = $m[1];
    } elseif (preg_match('/^export\s+default\s+(class\s+(\w+))/m', $code, $m)) {
        $default_name = $m[2];
    } elseif (preg_match('/^export\s+default\s+(\w+)/m', $code, $m)) {
        $default_name = $m[1];
    }

    // Strip export keywords
    $code = preg_replace('/^export\s+default\s+/m', '', $code);
    $code = preg_replace('/^export\s+((?:async\s+)?(?:function|const|let|var|class)\s)/m', '$1', $code);
    $code = preg_replace('/^export\s*\{[^}]*\};\s*$/m', '', $code);

    // Convert top-level const/let to var to avoid conflicts when other modules import the same name
    $code = preg_replace('/^(const|let)\s/m', 'var ', $code);

    // Convert top-level function declarations to var assignments to avoid hoisting conflicts
    // (e.g. two modules defining `function loadScript` — hoisting makes the last one win, breaking imports)
    $code = preg_replace_callback(
        '/^((?:async\s+)?)function\s+(\w+)\s*\(/m',
        function($m) {
            $async = trim($m[1]);
            $name = $m[2];
            $prefix = $async ? "{$async} " : "";
            return "var {$name} = {$prefix}function(";
        },
        $code
    );

    // Build export registration
    $export_reg = '';
    if (!empty($named)) {
        $export_reg .= "__r['$mk'] = __r['$mk'] || {};\n";
        foreach ($named as $n) {
            $export_reg .= "__r['$mk'].$n = $n;\n";
        }
    }
    if ($default_name) {
        $export_reg .= "__r['$mk'] = __r['$mk'] || {};\n";
        $export_reg .= "__r['$mk'].default = $default_name;\n";
    }

    $preamble = implode("\n", $import_assign);
    if ($preamble) $preamble .= "\n";
    $re_body = implode("\n", $reexport_code);
    if ($re_body) $re_body .= "\n";

    return "{$preamble}{$re_body}{$code}{$export_reg}";
}

// Build
$combined = "var __r = {};\n";
$count = 0;

foreach ($order as $rel) {
    $full = $base . '/' . $rel;
    if (!file_exists($full)) {
        echo "WARNING: $rel not found\n";
        continue;
    }
    $code = file_get_contents($full);
    $processed = process_mod($code, $rel, $module_keys);
    $combined .= "\n// --- $rel ---\n" . $processed;
    $count++;
}

// Boot: call init
$last_mk = $module_keys[$order[count($order) - 1]];
$combined .= "\n// --- Boot ---\n";
$combined .= "(function() { var _init = __r['$last_mk'].init || __r['$last_mk'].default; if (typeof _init === 'function') _init(); })();\n";

$outFile = $base . '/_js/radar-all.js';
file_put_contents($outFile, $combined);

$kb = round(strlen($combined) / 1024, 1);
echo "Done: $count files -> $outFile ($kb KB)\n";
