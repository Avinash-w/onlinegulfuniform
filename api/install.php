<?php
/**
 * CLI / browser installer: creates schema and seeds from api/data/seed.json
 *
 * Usage:
 *   php api/install.php
 *   http://localhost/juneberry/api/install.php?key=evaranest-install
 */

declare(strict_types=1);

$isCli = PHP_SAPI === 'cli';
if (!$isCli) {
    $key = $_GET['key'] ?? '';
    if ($key !== 'evaranest-install') {
        http_response_code(403);
        echo 'Forbidden';
        exit;
    }
    header('Content-Type: text/plain; charset=utf-8');
}

function out(string $msg): void
{
    echo $msg . PHP_EOL;
}

$configPath = __DIR__ . '/config/env.php';
if (!is_file($configPath)) {
    $configPath = __DIR__ . '/config/env.example.php';
}
$config = require $configPath;

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $config['db_host'],
        $config['db_port'],
        $config['db_name'],
        $config['db_charset']
    );
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (Throwable $e) {
    // Fallback: try connecting without dbname if database needs to be created on local dev
    try {
        $dsnFallback = sprintf(
            'mysql:host=%s;port=%s;charset=%s',
            $config['db_host'],
            $config['db_port'],
            $config['db_charset']
        );
        $pdo = new PDO($dsnFallback, $config['db_user'], $config['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        $pdo->exec('CREATE DATABASE IF NOT EXISTS `' . str_replace('`', '``', $config['db_name']) . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $pdo->exec('USE `' . str_replace('`', '``', $config['db_name']) . '`');
    } catch (Throwable $e2) {
        out('DB connection failed: ' . $e->getMessage());
        exit(1);
    }
}

$schema = file_get_contents(__DIR__ . '/sql/schema.sql');
foreach (array_filter(array_map('trim', explode(';', $schema))) as $stmt) {
    if ($stmt === '' || str_starts_with($stmt, '--')) {
        continue;
    }
    // Skip raw CREATE DATABASE / USE statements if already connected to target database
    if (stripos($stmt, 'CREATE DATABASE') === 0 || stripos($stmt, 'USE ') === 0) {
        continue;
    }
    try {
        $pdo->exec($stmt);
    } catch (Throwable $e) {
        // Ignore drop table non-existent errors
    }
}
out('Schema applied.');

$schema2 = file_get_contents(__DIR__ . '/sql/schema_phase2.sql');
foreach (array_filter(array_map('trim', explode(';', $schema2))) as $stmt) {
    if ($stmt === '' || str_starts_with($stmt, '--')) {
        continue;
    }
    if (stripos($stmt, 'USE ') === 0) {
        continue;
    }
    try {
        $pdo->exec($stmt);
    } catch (Throwable $e) {
        // Tables may already exist on re-run
        if (strpos($e->getMessage(), 'already exists') === false) {
            // ignore USE / CREATE IF NOT EXISTS noise
        }
    }
}
out('Phase 2 schema applied.');

$seedFile = __DIR__ . '/data/seed.json';
if (!is_file($seedFile)) {
    out('Missing api/data/seed.json — run: node scripts/export-seed.mjs');
    exit(1);
}

$seed = json_decode(file_get_contents($seedFile), true);
if (!is_array($seed)) {
    out('Invalid seed.json');
    exit(1);
}

$pdo->exec('USE `' . str_replace('`', '``', $config['db_name']) . '`');

// Clear commerce tables first (FK order)
foreach ([
    'wishlists', 'refunds', 'shipments', 'payments', 'order_lines', 'orders',
    'customer_addresses', 'otp_challenges', 'coupons', 'admin_tokens',
    'product_images', 'variants', 'products', 'subcategories', 'categories',
    'content_blocks', 'users',
] as $table) {
    try {
        $pdo->exec("DELETE FROM `$table`");
    } catch (Throwable $e) {
        /* table may not exist yet on first run before phase2 */
    }
}

// Users
$userStmt = $pdo->prepare(
    'INSERT INTO users (id, name, email, phone, role, password_hash, status, notes, created_at)
     VALUES (?,?,?,?,?,?,?,?,FROM_UNIXTIME(?))'
);
foreach ($seed['users'] ?? [] as $u) {
    $hash = null;
    if (!empty($u['password'])) {
        $hash = password_hash($u['password'], PASSWORD_DEFAULT);
    }
    $userStmt->execute([
        $u['id'],
        $u['name'],
        $u['email'],
        $u['phone'] ?? null,
        $u['role'],
        $hash,
        $u['status'] ?? 'Active',
        $u['notes'] ?? '',
        isset($u['createdAt']) ? (int) floor($u['createdAt'] / 1000) : time(),
    ]);
}
out('Users seeded: ' . count($seed['users'] ?? []));

// Addresses
$addrStmt = $pdo->prepare(
    'INSERT INTO customer_addresses (id, user_id, label, is_default, line1, city, state, pin, country)
     VALUES (?,?,?,?,?,?,?,?,?)'
);
foreach ($seed['addresses'] ?? [] as $a) {
    try {
        $addrStmt->execute([
            $a['id'],
            $a['userId'],
            $a['label'] ?? 'Home',
            !empty($a['isDefault']) ? 1 : 0,
            $a['line1'],
            $a['city'],
            $a['state'],
            $a['pin'],
            $a['country'] ?? 'India',
        ]);
    } catch (Throwable $e) {
        /* skip bad rows */
    }
}
out('Addresses seeded: ' . count($seed['addresses'] ?? []));

// Coupons
$couponStmt = $pdo->prepare(
    'INSERT INTO coupons (code, type, value, active, min_cart) VALUES (?,?,?,?,?)'
);
foreach ($seed['coupons'] ?? [] as $c) {
    $couponStmt->execute([
        strtoupper($c['code']),
        $c['type'],
        (int) $c['value'],
        !empty($c['active']) ? 1 : 0,
        (int) ($c['minCart'] ?? 0),
    ]);
}
out('Coupons seeded: ' . count($seed['coupons'] ?? []));

// Categories
$catStmt = $pdo->prepare(
    'INSERT INTO categories (id, name, slug, active, sort_order) VALUES (?,?,?,?,?)'
);
$subStmt = $pdo->prepare(
    'INSERT INTO subcategories (id, category_id, name, slug, active, sort_order) VALUES (?,?,?,?,?,?)'
);
foreach ($seed['categories'] ?? [] as $i => $c) {
    $catStmt->execute([$c['id'], $c['name'], $c['slug'], !empty($c['active']) ? 1 : 0, $i]);
    foreach ($c['children'] ?? [] as $j => $s) {
        $subStmt->execute([
            $s['id'],
            $c['id'],
            $s['name'],
            $s['slug'],
            !empty($s['active']) ? 1 : 0,
            $j,
        ]);
    }
}
out('Categories seeded: ' . count($seed['categories'] ?? []));

// Products
$prodStmt = $pdo->prepare(
    'INSERT INTO products
    (handle, title, short_description, description, price, compare_at, rating, reviews,
     brand, status, product_type, kind, category, sku, featured, sold_out, payload)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
);
$imgStmt = $pdo->prepare(
    'INSERT INTO product_images (product_handle, url, sort_order) VALUES (?,?,?)'
);
$varStmt = $pdo->prepare(
    'INSERT INTO variants (id, product_handle, size, color, sku, price, compare_at, stock, low_stock_at)
     VALUES (?,?,?,?,?,?,?,?,?)'
);

foreach ($seed['products'] ?? [] as $p) {
    $payload = json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $prodStmt->execute([
        $p['handle'],
        $p['title'],
        $p['shortDescription'] ?? null,
        $p['description'] ?? null,
        (int) ($p['price'] ?? 0),
        isset($p['compareAt']) ? (int) $p['compareAt'] : null,
        (float) ($p['rating'] ?? 0),
        (int) ($p['reviews'] ?? 0),
        $p['brand'] ?? 'EvaraNest',
        $p['status'] ?? 'active',
        $p['productType'] ?? 'candle',
        $p['kind'] ?? 'lifestyle',
        $p['category'] ?? null,
        $p['sku'] ?? null,
        !empty($p['featured']) ? 1 : 0,
        !empty($p['soldOut']) ? 1 : 0,
        $payload,
    ]);
    foreach (array_values($p['images'] ?? []) as $i => $url) {
        $imgStmt->execute([$p['handle'], $url, $i]);
    }
}
out('Products seeded: ' . count($seed['products'] ?? []));

foreach ($seed['variants'] ?? [] as $v) {
    $varStmt->execute([
        $v['id'],
        $v['productHandle'],
        $v['size'],
        $v['color'] ?? '—',
        $v['sku'],
        (int) $v['price'],
        isset($v['compareAt']) ? (int) $v['compareAt'] : null,
        (int) ($v['stock'] ?? 0),
        (int) ($v['lowStockAt'] ?? 8),
    ]);
}
out('Variants seeded: ' . count($seed['variants'] ?? []));

// Content
$contentStmt = $pdo->prepare(
    'INSERT INTO content_blocks (`key`, `value`) VALUES (?, ?)'
);
$contentStmt->execute([
    'storefront',
    json_encode($seed['content'] ?? new stdClass(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
]);
out('Content seeded.');

out('Install complete.');
