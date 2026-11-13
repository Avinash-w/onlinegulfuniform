
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

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $c['db_host'],
        $c['db_port'],
        $c['db_name'],
        $c['db_charset']
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
        ]
    );

    return $pdo;
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
