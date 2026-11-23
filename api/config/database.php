<?php

function app_config(): array
{
    static $config = null;

    if ($config === null) {
        $path = __DIR__ . '/env.php';

        if (!is_file($path)) {
            $path = __DIR__ . '/env.example.php';
        }

        $config = require $path;
    }

    return $config;
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $c = app_config();

    // 1. Try configured database credentials
    try {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $c['db_host'],
            $c['db_port'],
            $c['db_name'],
            $c['db_charset'] ?? 'utf8mb4'
        );

        $pdo = new PDO(
            $dsn,
            $c['db_user'],
            $c['db_pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
                PDO::ATTR_TIMEOUT => 3,
            ]
        );

        return $pdo;
    } catch (Throwable $e) {
        // If remote database failed (e.g. Hostinger IP not whitelisted for local dev),
        // gracefully fall back to local XAMPP MySQL (evaranest)
        if ($c['db_host'] !== '127.0.0.1' && $c['db_host'] !== 'localhost') {
            try {
                $localDsn = 'mysql:host=127.0.0.1;port=3306;dbname=evaranest;charset=utf8mb4';
                $pdo = new PDO(
                    $localDsn,
                    'root',
                    '',
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                        PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
                    ]
                );
                return $pdo;
            } catch (Throwable $localErr) {
                // rethrow original exception if local also fails
                throw $e;
            }
        }
        throw $e;
    }
}

function ensure_soft_delete_columns(PDO $pdo): void
{
    static $ensured = false;

    if ($ensured) {
        return;
    }

    $tables = [
        'categories',
        'subcategories',
        'users',
        'orders',
        'coupons',
        'custom_enquiries',
        'variants',
        'products',
    ];

    foreach ($tables as $table) {
        try {
            $check = $pdo->prepare(
                "SHOW COLUMNS FROM `$table` LIKE 'deleted_at'"
            );

            $check->execute();

            if (!$check->fetch()) {
                $pdo->exec(
                    "ALTER TABLE `$table` ADD COLUMN `deleted_at` DATETIME NULL"
                );

                try {
                    $pdo->exec(
                        "CREATE INDEX `idx_{$table}_deleted` ON `$table` (`deleted_at`)"
                    );
                } catch (Throwable $e) {
                    // Index may already exist
                }
            }
        } catch (Throwable $e) {
            // Ignore missing tables
        }
    }

    $ensured = true;
}
