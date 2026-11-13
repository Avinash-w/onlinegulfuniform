<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Validator.php';
require_once __DIR__ . '/../lib/Router.php';
require_once __DIR__ . '/../lib/ProductMapper.php';
require_once __DIR__ . '/../lib/ImageStore.php';

class ProductController
{
    private static function imagesFor(string $handle): array
    {
        $stmt = db()->prepare(
            'SELECT * FROM product_images WHERE product_handle = ? ORDER BY sort_order ASC, id ASC'
        );
        $stmt->execute([$handle]);
        return $stmt->fetchAll();
    }

    private static function variantsFor(string $handle): array
    {
        $stmt = db()->prepare(
            'SELECT * FROM variants WHERE product_handle = ? ORDER BY id ASC'
        );
        $stmt->execute([$handle]);
        return $stmt->fetchAll();
    }

    private static function findRow(string $handle, bool $includeDeleted = false): ?array
    {
        $sql = 'SELECT * FROM products WHERE handle = ?';
        if (!$includeDeleted) {
            $sql .= ' AND deleted_at IS NULL';
        }
        $sql .= ' LIMIT 1';
        $stmt = db()->prepare($sql);
        $stmt->execute([$handle]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function index(): void
    {
        $includeDeleted = isset($_GET['include_deleted']) && $_GET['include_deleted'] === '1';
        $q = trim((string) ($_GET['q'] ?? ''));
        $category = trim((string) ($_GET['category'] ?? ''));
        $collection = trim((string) ($_GET['collection'] ?? ''));
        $featured = $_GET['featured'] ?? null;
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int) ($_GET['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];
        if (!$includeDeleted) {
            $where[] = 'deleted_at IS NULL';
        }
        if ($q !== '') {
            $where[] = '(title LIKE ? OR handle LIKE ? OR category LIKE ? OR sku LIKE ?)';
            $like = '%' . $q . '%';
            array_push($params, $like, $like, $like, $like);
        }
        if ($category !== '') {
            $where[] = 'category = ?';
            $params[] = $category;
        }
        if ($featured === '1' || $featured === 'true') {
            $where[] = 'featured = 1';
        }
        if ($collection !== '') {
            $where[] = 'JSON_CONTAINS(payload, ?, \'$.collections\')';
            $params[] = json_encode($collection);
        }

        $sqlWhere = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        $countStmt = db()->prepare("SELECT COUNT(*) FROM products $sqlWhere");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = db()->prepare(
            "SELECT * FROM products $sqlWhere ORDER BY created_at DESC, featured DESC, title ASC LIMIT $limit OFFSET $offset"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $products = [];
        foreach ($rows as $row) {
            $products[] = ProductMapper::rowToProduct(
                $row,
                self::imagesFor($row['handle']),
                self::variantsFor($row['handle'])
            );
        }

        Response::ok([
            'products' => $products,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public static function show(array $params): void
    {
        $handle = $params['handle'] ?? '';
        $row = self::findRow($handle, true);
        if (!$row || ($row['deleted_at'] && !isset($_GET['include_deleted']))) {
            Response::error('Product not found.', 404);
        }
        $product = ProductMapper::rowToProduct(
            $row,
            self::imagesFor($handle),
            self::variantsFor($handle)
        );
        Response::ok(['product' => $product, 'variants' => $product['_variants'] ?? []]);
    }

    public static function create(): void
    {
        $body = request_json();
        $product = $body['product'] ?? $body;
        $errors = Validator::requireFields($product, ['handle', 'title', 'price']);
        if ($err = Validator::slug((string) ($product['handle'] ?? ''))) {
            $errors['handle'] = $err;
        }
        if ($err = Validator::positiveNumber($product['price'] ?? null, 'price')) {
            $errors['price'] = $err;
        }
        if ($errors) {
            Response::validation($errors);
        }

        $handle = $product['handle'];
        if (self::findRow($handle, true)) {
            Response::validation(['handle' => 'A product with this handle already exists.']);
        }
        $product['images'] = self::storeImages($product['images'] ?? [], $handle);

        $cols = ProductMapper::productToColumns($product);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO products
                (handle, title, short_description, description, price, compare_at, rating, reviews,
                 brand, status, product_type, kind, category, sku, featured, sold_out, payload)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            );
            $stmt->execute([
                $cols['handle'], $cols['title'], $cols['short_description'], $cols['description'],
                $cols['price'], $cols['compare_at'], $cols['rating'], $cols['reviews'],
                $cols['brand'], $cols['status'], $cols['product_type'], $cols['kind'],
                $cols['category'], $cols['sku'], $cols['featured'], $cols['sold_out'], $cols['payload'],
            ]);

            self::syncImages($pdo, $handle, $product['images'] ?? []);
            self::syncVariantsFromProduct($pdo, $product);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log($e->getMessage());
            Response::error('Unable to create the product. Please check the information and try again.', 500);
        }

        $row = self::findRow($handle, true);
        $out = ProductMapper::rowToProduct($row, self::imagesFor($handle), self::variantsFor($handle));
        Response::ok(['product' => $out, 'variants' => $out['_variants'] ?? []], 'Product created successfully.', 201);
    }

    public static function update(array $params): void
    {
        $handle = $params['handle'] ?? '';
        $row = self::findRow($handle, true);
        if (!$row) {
            Response::error('Product not found.', 404);
        }

        $body = request_json();
        $patch = $body['product'] ?? $body['patch'] ?? $body;
        $existing = ProductMapper::rowToProduct($row, self::imagesFor($handle));
        unset($existing['_variants'], $existing['deleted']);
        $merged = array_merge($existing, $patch);
        $merged['handle'] = $handle;
        $merged['images'] = self::storeImages($merged['images'] ?? [], $handle);

        if ($err = Validator::positiveNumber($merged['price'] ?? null, 'price')) {
            Response::validation(['price' => $err]);
        }
        if (empty($merged['title'])) {
            Response::validation(['title' => 'Title is required.']);
        }

        $cols = ProductMapper::productToColumns($merged);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'UPDATE products SET title=?, short_description=?, description=?, price=?, compare_at=?,
                 rating=?, reviews=?, brand=?, status=?, product_type=?, kind=?, category=?, sku=?,
                 featured=?, sold_out=?, payload=? WHERE handle=?'
            );
            $stmt->execute([
                $cols['title'], $cols['short_description'], $cols['description'], $cols['price'], $cols['compare_at'],
                $cols['rating'], $cols['reviews'], $cols['brand'], $cols['status'], $cols['product_type'],
                $cols['kind'], $cols['category'], $cols['sku'], $cols['featured'], $cols['sold_out'],
                $cols['payload'], $handle,
            ]);

            if (array_key_exists('images', $patch)) {
                self::syncImages($pdo, $handle, $merged['images'] ?? []);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log($e->getMessage());
            Response::error('Unable to save the product. Please check the information and try again.', 500);
        }

        $fresh = self::findRow($handle, true);
        $out = ProductMapper::rowToProduct($fresh, self::imagesFor($handle), self::variantsFor($handle));
        Response::ok(['product' => $out, 'variants' => $out['_variants'] ?? []], 'Product updated successfully.');
    }

    public static function delete(array $params): void
    {
        $handle = $params['handle'] ?? '';
        $row = self::findRow($handle, true);
        if (!$row) {
            Response::error('Product not found.', 404);
        }
        $stmt = db()->prepare('UPDATE products SET deleted_at = NOW() WHERE handle = ?');
        $stmt->execute([$handle]);
        Response::ok(['handle' => $handle], 'Product deleted successfully.');
    }

    public static function restore(array $params): void
    {
        $handle = $params['handle'] ?? '';
        $row = self::findRow($handle, true);
        if (!$row) {
            Response::error('Product not found.', 404);
        }
        $stmt = db()->prepare('UPDATE products SET deleted_at = NULL WHERE handle = ?');
        $stmt->execute([$handle]);
        $fresh = self::findRow($handle, true);
        $out = ProductMapper::rowToProduct($fresh, self::imagesFor($handle), self::variantsFor($handle));
        Response::ok(['product' => $out], 'Product restored successfully.');
    }

    /** Convert any base64 images to files named after the product handle. */
    private static function storeImages(array $images, string $handle): array
    {
        return array_map(fn($src) => ImageStore::normalize($src, $handle), array_values($images));
    }

    private static function syncImages(PDO $pdo, string $handle, array $images): void
    {
        $pdo->prepare('DELETE FROM product_images WHERE product_handle = ?')->execute([$handle]);
        $ins = $pdo->prepare(
            'INSERT INTO product_images (product_handle, url, sort_order) VALUES (?, ?, ?)'
        );
        foreach (array_values($images) as $i => $url) {
            if (!$url) {
                continue;
            }
            // Never store base64 in the DB: save as <handle>-xxxx.<ext> and keep only the URL.
            $url = ImageStore::normalize($url, $handle);
            $ins->execute([$handle, $url, $i]);
        }
    }

    private static function syncVariantsFromProduct(PDO $pdo, array $product): void
    {
        $handle = $product['handle'];
        $sizes = $product['sizes'] ?? [];
        if (!$sizes) {
            $sizes = ['One size'];
        }
        $del = $pdo->prepare('DELETE FROM variants WHERE product_handle = ?');
        $del->execute([$handle]);

        $ins = $pdo->prepare(
            'INSERT INTO variants (id, product_handle, size, color, sku, price, compare_at, stock, low_stock_at)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        foreach ($sizes as $size) {
            $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $size));
            $slug = trim($slug, '-');
            $id = $handle . '::' . $slug;
            $skuBase = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $product['sku'] ?? $handle));
            $skuBase = substr($skuBase, 0, 10);
            $ins->execute([
                $id,
                $handle,
                $size,
                $product['color'] ?? '—',
                $skuBase . '-' . strtoupper($slug),
                (int) ($product['price'] ?? 0),
                isset($product['compareAt']) ? (int) $product['compareAt'] : null,
                !empty($product['soldOut']) ? 0 : 20,
                8,
            ]);
        }
    }
}
