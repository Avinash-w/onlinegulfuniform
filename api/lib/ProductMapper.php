<?php

class ProductMapper
{
    private static ?array $reviewStats = null;

    /** Approved-review rating and count per product handle (loaded once per request). */
    private static function reviewStats(): array
    {
        if (self::$reviewStats === null) {
            self::$reviewStats = [];
            try {
                $rows = db()->query(
                    "SELECT product_handle, COUNT(*) AS c, AVG(rating) AS a
                     FROM reviews WHERE status = 'Approved' GROUP BY product_handle"
                )->fetchAll();
                foreach ($rows as $r) {
                    self::$reviewStats[$r['product_handle']] = [
                        'rating' => round((float) $r['a'], 1),
                        'reviews' => (int) $r['c'],
                    ];
                }
            } catch (Throwable $e) {
                // reviews table not created yet — no reviews.
            }
        }
        return self::$reviewStats;
    }

    public static function rowToProduct(array $row, array $images = [], array $variants = []): array
    {
        $payload = [];
        if (!empty($row['payload'])) {
            $decoded = json_decode($row['payload'], true);
            if (is_array($decoded)) {
                $payload = $decoded;
            }
        }

        $product = array_merge($payload, [
            'handle' => $row['handle'],
            'title' => $row['title'],
            'shortDescription' => $row['short_description'] ?? ($payload['shortDescription'] ?? ''),
            'description' => $row['description'] ?? ($payload['description'] ?? ''),
            'price' => (int) $row['price'],
            'compareAt' => (int) ($row['compare_at'] ?? $row['price']),
            'rating' => isset($row['rating']) ? (float) $row['rating'] : ($payload['rating'] ?? 0),
            'reviews' => isset($row['reviews']) ? (int) $row['reviews'] : ($payload['reviews'] ?? 0),
            'brand' => $row['brand'] ?? ($payload['brand'] ?? 'EvaraNest'),
            'status' => $row['status'] ?? 'active',
            'productType' => $row['product_type'] ?? ($payload['productType'] ?? 'candle'),
            'kind' => $row['kind'] ?? ($payload['kind'] ?? 'lifestyle'),
            'category' => $row['category'] ?? ($payload['category'] ?? ''),
            'sku' => $row['sku'] ?? ($payload['sku'] ?? ''),
            'featured' => (bool) ($row['featured'] ?? false),
            'soldOut' => (bool) ($row['sold_out'] ?? false),
            'deleted' => !empty($row['deleted_at']),
            'createdAt' => !empty($row['created_at']) ? date('c', strtotime($row['created_at'])) : null,
        ]);

        // Rating and review count always come from approved customer reviews.
        $stats = self::reviewStats()[$row['handle']] ?? null;
        $product['rating'] = $stats['rating'] ?? null;
        $product['reviews'] = $stats['reviews'] ?? 0;

        if ($images) {
            $product['images'] = array_values(array_map(fn($i) => $i['url'], $images));
        } elseif (!isset($product['images'])) {
            $product['images'] = [];
        }

        if ($variants) {
            $product['_variants'] = array_map([self::class, 'rowToVariant'], $variants);
        }

        // Ensure discount
        if (!isset($product['discount']) && ($product['compareAt'] ?? 0) > 0) {
            $product['discount'] = (int) round((1 - $product['price'] / $product['compareAt']) * 100);
        }

        return $product;
    }

    public static function rowToVariant(array $row): array
    {
        return [
            'id' => $row['id'],
            'productHandle' => $row['product_handle'],
            'size' => $row['size'],
            'color' => $row['color'] ?? '—',
            'sku' => $row['sku'],
            'price' => (int) $row['price'],
            'compareAt' => isset($row['compare_at']) ? (int) $row['compare_at'] : null,
            'stock' => (int) $row['stock'],
            'lowStockAt' => (int) ($row['low_stock_at'] ?? 8),
        ];
    }

    public static function productToColumns(array $p): array
    {
        $handle = $p['handle'] ?? '';
        return [
            'handle' => $handle,
            'title' => $p['title'] ?? '',
            'short_description' => $p['shortDescription'] ?? null,
            'description' => $p['description'] ?? null,
            'price' => (int) ($p['price'] ?? 0),
            'compare_at' => isset($p['compareAt']) ? (int) $p['compareAt'] : null,
            'rating' => isset($p['rating']) ? (float) $p['rating'] : 0,
            'reviews' => isset($p['reviews']) ? (int) $p['reviews'] : 0,
            'brand' => $p['brand'] ?? 'EvaraNest',
            'status' => $p['status'] ?? 'active',
            'product_type' => $p['productType'] ?? 'candle',
            'kind' => $p['kind'] ?? 'lifestyle',
            'category' => $p['category'] ?? null,
            'sku' => $p['sku'] ?? null,
            'featured' => !empty($p['featured']) ? 1 : 0,
            'sold_out' => !empty($p['soldOut']) ? 1 : 0,
            'payload' => json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ];
    }
}
