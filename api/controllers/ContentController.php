<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Router.php';
require_once __DIR__ . '/../lib/ImageStore.php';

class ContentController
{
    /**
     * Fetch complete storefront content from database.
     * Auto-seeds from seed.json if not present in DB yet.
     */
    public static function getStorefront(): array
    {
        $stmt = db()->prepare('SELECT `value` FROM content_blocks WHERE `key` = ? LIMIT 1');
        $stmt->execute(['storefront']);
        $row = $stmt->fetch();
        if ($row && !empty($row['value'])) {
            $decoded = json_decode($row['value'], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        // Try reading from seed.json as initial default
        $seedFile = dirname(__DIR__) . '/data/seed.json';
        if (is_file($seedFile)) {
            $seed = json_decode(file_get_contents($seedFile), true);
            if (isset($seed['content']) && is_array($seed['content'])) {
                self::upsert('storefront', $seed['content']);
                return $seed['content'];
            }
        }

        return [];
    }

    public static function all(): void
    {
        $rows = db()->query('SELECT `key`, `value` FROM content_blocks')->fetchAll();
        $content = [];
        foreach ($rows as $row) {
            $decoded = json_decode($row['value'], true);
            $content[$row['key']] = $decoded;
        }

        $storefront = self::getStorefront();

        // Merge any top-level keys into storefront if not already present
        foreach ($content as $k => $v) {
            if ($k !== 'storefront' && !isset($storefront[$k])) {
                $storefront[$k] = $v;
            }
        }

        Response::ok(['content' => $storefront]);
    }

    public static function get(array $params): void
    {
        $key = $params['key'] ?? '';
        $stmt = db()->prepare('SELECT `value` FROM content_blocks WHERE `key` = ? LIMIT 1');
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        if (!$row) {
            // Check if key is a sub-section in storefront
            $sf = self::getStorefront();
            if (isset($sf[$key])) {
                Response::ok(['key' => $key, 'value' => $sf[$key]]);
            }
            Response::error('Content block not found.', 404);
        }
        Response::ok(['key' => $key, 'value' => json_decode($row['value'], true)]);
    }

    public static function setStorefront(): void
    {
        $body = request_json();
        $content = $body['content'] ?? $body;
        if (!is_array($content)) {
            Response::validation(['content' => 'Content must be an object.']);
        }
        self::upsert('storefront', $content);
        Response::ok(['content' => $content], 'Content saved successfully.');
    }

    public static function patchSection(): void
    {
        $body = request_json();
        $section = $body['section'] ?? null;
        $value = $body['value'] ?? null;
        if (!$section || $value === null) {
            Response::validation(['section' => 'Section and value are required.']);
        }

        $content = self::getStorefront();

        // Nested site/footer/pdp support matching reducer content/site/set
        if ($section === 'siteBundle' && is_array($value)) {
            if (isset($value['site'])) {
                $content['site'] = $value['site'];
            }
            if (isset($value['footer'])) {
                $content['footer'] = $value['footer'];
            }
            if (isset($value['pdp'])) {
                $content['pdp'] = $value['pdp'];
            }
        } elseif ($section === 'homepage' && is_array($value)) {
            foreach ($value as $k => $v) {
                $content[$k] = $v;
            }
        } else {
            $content[$section] = $value;
        }

        self::upsert('storefront', $content);

        // Also if section is invoice, save to invoice key as well for direct query compatibility
        if ($section === 'invoice') {
            self::upsert('invoice', $value);
        }

        Response::ok(['content' => $content], 'Content updated successfully.');
    }

    public static function upsert(string $key, $value): void
    {
        $value = ImageStore::normalizeDeep($value, $key);
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt = db()->prepare(
            'INSERT INTO content_blocks (`key`, `value`) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)'
        );
        $stmt->execute([$key, $json]);
    }
}

