<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Validator.php';
require_once __DIR__ . '/../lib/Router.php';
require_once __DIR__ . '/../lib/ProductMapper.php';

class VariantController
{
    public static function create(): void
    {
        $body = request_json();
        $variant = $body['variant'] ?? $body;
        $errors = Validator::requireFields($variant, ['id', 'productHandle', 'size', 'sku', 'price']);
        if ($err = Validator::positiveNumber($variant['price'] ?? null, 'price')) {
            $errors['price'] = $err;
        }
        if ($err = Validator::integer($variant['stock'] ?? 0, 'stock')) {
            $errors['stock'] = $err;
        }
        if ($errors) {
            Response::validation($errors);
        }

        $check = db()->prepare('SELECT handle FROM products WHERE handle = ? LIMIT 1');
        $check->execute([$variant['productHandle']]);
        if (!$check->fetch()) {
            Response::validation(['productHandle' => 'Product not found.']);
        }

        try {
            $stmt = db()->prepare(
                'INSERT INTO variants (id, product_handle, size, color, sku, price, compare_at, stock, low_stock_at)
                 VALUES (?,?,?,?,?,?,?,?,?)'
            );
            $stmt->execute([
                $variant['id'],
                $variant['productHandle'],
                $variant['size'],
                $variant['color'] ?? '—',
                $variant['sku'],
                (int) $variant['price'],
                isset($variant['compareAt']) ? (int) $variant['compareAt'] : null,
                (int) ($variant['stock'] ?? 0),
                (int) ($variant['lowStockAt'] ?? 8),
            ]);
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000) {
                Response::validation(['id' => 'A variant with this id already exists.']);
            }
            throw $e;
        }

        $row = db()->prepare('SELECT * FROM variants WHERE id = ?');
        $row->execute([$variant['id']]);
        Response::ok(['variant' => ProductMapper::rowToVariant($row->fetch())], 'Variant created successfully.', 201);
    }

    public static function update(array $params): void
    {
        $id = $params['id'] ?? '';
        $body = request_json();
        $patch = $body['patch'] ?? $body;

        $stmt = db()->prepare('SELECT * FROM variants WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('Variant not found.', 404);
        }

        $map = [
            'size' => 'size',
            'color' => 'color',
            'sku' => 'sku',
            'price' => 'price',
            'compareAt' => 'compare_at',
            'stock' => 'stock',
            'lowStockAt' => 'low_stock_at',
        ];
        $fields = [];
        $values = [];
        foreach ($map as $js => $col) {
            if (array_key_exists($js, $patch)) {
                $fields[] = "$col = ?";
                $values[] = $patch[$js];
            }
        }
        if (!$fields) {
            Response::validation(['size' => 'Nothing to update.']);
        }
        $values[] = $id;
        db()->prepare('UPDATE variants SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

        $fresh = db()->prepare('SELECT * FROM variants WHERE id = ?');
        $fresh->execute([$id]);
        Response::ok(['variant' => ProductMapper::rowToVariant($fresh->fetch())], 'Variant updated successfully.');
    }

    public static function delete(array $params): void
    {
        $id = $params['id'] ?? '';
        $stmt = db()->prepare('UPDATE variants SET deleted_at = NOW() WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            Response::error('Variant not found.', 404);
        }
        Response::ok(['id' => $id], 'Variant archived successfully.');
    }

    public static function restore(array $params): void
    {
        $id = $params['id'] ?? '';
        $stmt = db()->prepare('UPDATE variants SET deleted_at = NULL WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            Response::error('Variant not found.', 404);
        }
        $fresh = db()->prepare('SELECT * FROM variants WHERE id = ?');
        $fresh->execute([$id]);
        Response::ok(['variant' => ProductMapper::rowToVariant($fresh->fetch())], 'Variant restored successfully.');
    }
}

class StockController
{
    public static function adjust(): void
    {
        $body = request_json();
        $errors = Validator::requireFields($body, ['id', 'delta']);
        if ($err = Validator::integer($body['delta'] ?? null, 'delta')) {
            $errors['delta'] = $err;
        }
        if ($errors) {
            Response::validation($errors);
        }

        $stmt = db()->prepare('SELECT * FROM variants WHERE id = ? LIMIT 1');
        $stmt->execute([$body['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('Variant not found.', 404);
        }

        $stock = max(0, (int) $row['stock'] + (int) $body['delta']);
        db()->prepare('UPDATE variants SET stock = ? WHERE id = ?')->execute([$stock, $body['id']]);

        $fresh = db()->prepare('SELECT * FROM variants WHERE id = ?');
        $fresh->execute([$body['id']]);
        Response::ok(['variant' => ProductMapper::rowToVariant($fresh->fetch())], 'Stock updated successfully.');
    }

    public static function set(): void
    {
        $body = request_json();
        $errors = Validator::requireFields($body, ['id', 'stock']);
        if ($err = Validator::integer($body['stock'] ?? null, 'stock')) {
            $errors['stock'] = $err;
        }
        if (($body['stock'] ?? 0) < 0) {
            $errors['stock'] = 'Stock cannot be negative.';
        }
        if ($errors) {
            Response::validation($errors);
        }

        $stmt = db()->prepare('SELECT * FROM variants WHERE id = ? LIMIT 1');
        $stmt->execute([$body['id']]);
        if (!$stmt->fetch()) {
            Response::error('Variant not found.', 404);
        }

        db()->prepare('UPDATE variants SET stock = ? WHERE id = ?')->execute([(int) $body['stock'], $body['id']]);
        $fresh = db()->prepare('SELECT * FROM variants WHERE id = ?');
        $fresh->execute([$body['id']]);
        Response::ok(['variant' => ProductMapper::rowToVariant($fresh->fetch())], 'Stock updated successfully.');
    }

    public static function index(): void
    {
        $includeDeleted = !empty($_GET['include_deleted']);
        $sql = 'SELECT * FROM variants ' . ($includeDeleted ? '' : 'WHERE deleted_at IS NULL ') . 'ORDER BY product_handle ASC, id ASC';
        $rows = db()->query($sql)->fetchAll();
        $variants = array_map([ProductMapper::class, 'rowToVariant'], $rows);
        Response::ok(['variants' => $variants]);
    }
}
