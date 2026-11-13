<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Validator.php';
require_once __DIR__ . '/../lib/Router.php';
require_once __DIR__ . '/../lib/OrderMapper.php';

class CouponController
{
    public static function index(): void
    {
        $includeDeleted = !empty($_GET['include_deleted']);
        $sql = 'SELECT * FROM coupons ' . ($includeDeleted ? '' : 'WHERE deleted_at IS NULL ') . 'ORDER BY code ASC';
        $rows = db()->query($sql)->fetchAll();
        Response::ok(['coupons' => array_map([OrderMapper::class, 'coupon'], $rows)]);
    }

    public static function validate(): void
    {
        $body = request_json();
        $code = strtoupper(trim((string) ($body['code'] ?? '')));
        $subtotal = (int) ($body['subtotal'] ?? 0);
        if ($code === '') {
            Response::validation(['code' => 'Enter a coupon code.']);
        }
        $stmt = db()->prepare('SELECT * FROM coupons WHERE code = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$code]);
        $coupon = $stmt->fetch();
        if (!$coupon) {
            Response::error('Invalid coupon code.', 404);
        }
        if (!(int) $coupon['active']) {
            Response::error('This coupon is inactive.', 400);
        }
        if ($subtotal < (int) $coupon['min_cart']) {
            Response::error(
                'Minimum cart ₹' . number_format((int) $coupon['min_cart']) . ' required for ' . $coupon['code'] . '.',
                400
            );
        }
        $discount = $coupon['type'] === 'percent'
            ? (int) round($subtotal * ((int) $coupon['value']) / 100)
            : min($subtotal, (int) $coupon['value']);

        Response::ok([
            'coupon' => OrderMapper::coupon($coupon),
            'discount' => $discount,
        ], 'Coupon applied successfully.');
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        $body = request_json();
        $coupon = $body['coupon'] ?? $body;
        $errors = Validator::requireFields($coupon, ['code', 'type', 'value']);
        if (!in_array($coupon['type'] ?? '', ['percent', 'flat'], true)) {
            $errors['type'] = 'Type must be percent or flat.';
        }
        if ($errors) {
            Response::validation($errors);
        }
        $code = strtoupper(trim($coupon['code']));
        try {
            db()->prepare(
                'INSERT INTO coupons (code, type, value, active, min_cart, deleted_at) VALUES (?,?,?,?,?,NULL)'
            )->execute([
                $code,
                $coupon['type'],
                (int) $coupon['value'],
                array_key_exists('active', $coupon) ? (!empty($coupon['active']) ? 1 : 0) : 1,
                (int) ($coupon['minCart'] ?? 0),
            ]);
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000) {
                // If it was soft-deleted, revive it
                $stmt = db()->prepare('UPDATE coupons SET type = ?, value = ?, active = ?, min_cart = ?, deleted_at = NULL WHERE code = ?');
                $stmt->execute([
                    $coupon['type'],
                    (int) $coupon['value'],
                    array_key_exists('active', $coupon) ? (!empty($coupon['active']) ? 1 : 0) : 1,
                    (int) ($coupon['minCart'] ?? 0),
                    $code,
                ]);
                if ($stmt->rowCount() > 0) {
                    $row = db()->prepare('SELECT * FROM coupons WHERE code = ?');
                    $row->execute([$code]);
                    Response::ok(['coupon' => OrderMapper::coupon($row->fetch())], 'Coupon created successfully.', 201);
                }
                Response::validation(['code' => 'Coupon code already exists.']);
            }
            throw $e;
        }
        $row = db()->prepare('SELECT * FROM coupons WHERE code = ?');
        $row->execute([$code]);
        Response::ok(['coupon' => OrderMapper::coupon($row->fetch())], 'Coupon created successfully.', 201);
    }

    public static function update(array $params): void
    {
        Auth::requireAdmin();
        $code = strtoupper($params['code'] ?? '');
        $body = request_json();
        $patch = $body['patch'] ?? $body;
        $stmt = db()->prepare('SELECT * FROM coupons WHERE code = ?');
        $stmt->execute([$code]);
        if (!$stmt->fetch()) {
            Response::error('Coupon not found.', 404);
        }
        $fields = [];
        $values = [];
        $map = ['type' => 'type', 'value' => 'value', 'active' => 'active', 'minCart' => 'min_cart'];
        foreach ($map as $js => $col) {
            if (array_key_exists($js, $patch)) {
                $fields[] = "$col = ?";
                $values[] = $js === 'active' ? (!empty($patch[$js]) ? 1 : 0) : $patch[$js];
            }
        }
        if (!$fields) {
            Response::validation(['code' => 'Nothing to update.']);
        }
        $values[] = $code;
        db()->prepare('UPDATE coupons SET ' . implode(', ', $fields) . ' WHERE code = ?')->execute($values);
        $row = db()->prepare('SELECT * FROM coupons WHERE code = ?');
        $row->execute([$code]);
        Response::ok(['coupon' => OrderMapper::coupon($row->fetch())], 'Coupon updated successfully.');
    }

    public static function delete(array $params): void
    {
        Auth::requireAdmin();
        $code = strtoupper($params['code'] ?? '');
        $stmt = db()->prepare('UPDATE coupons SET deleted_at = NOW() WHERE code = ?');
        $stmt->execute([$code]);
        if ($stmt->rowCount() === 0) {
            Response::error('Coupon not found.', 404);
        }
        Response::ok(['code' => $code], 'Coupon archived successfully.');
    }

    public static function restore(array $params): void
    {
        Auth::requireAdmin();
        $code = strtoupper($params['code'] ?? '');
        $stmt = db()->prepare('UPDATE coupons SET deleted_at = NULL WHERE code = ?');
        $stmt->execute([$code]);
        if ($stmt->rowCount() === 0) {
            Response::error('Coupon not found.', 404);
        }
        $row = db()->prepare('SELECT * FROM coupons WHERE code = ?');
        $row->execute([$code]);
        Response::ok(['coupon' => OrderMapper::coupon($row->fetch())], 'Coupon restored successfully.');
    }
}

class WishlistController
{
    private static function ensureTable(): void
    {
        static $ensured = false;
        if ($ensured) return;
        $ensured = true;
        try {
            db()->exec("CREATE TABLE IF NOT EXISTS wishlists (
                user_id VARCHAR(64) NOT NULL,
                product_handle VARCHAR(160) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, product_handle)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } catch (\Throwable $e) {}
    }

    public static function index(): void
    {
        $user = Auth::requireCustomer();
        self::ensureTable();
        try {
            $stmt = db()->prepare('SELECT product_handle FROM wishlists WHERE user_id = ? ORDER BY created_at DESC');
            $stmt->execute([$user['id']]);
            $handles = array_column($stmt->fetchAll(), 'product_handle');
            Response::ok(['wishlist' => $handles]);
        } catch (\Throwable $e) {
            Response::ok(['wishlist' => []]);
        }
    }

    public static function toggle(): void
    {
        $user = Auth::requireCustomer();
        self::ensureTable();
        $body = request_json();
        $handle = trim((string) ($body['handle'] ?? ''));
        if ($handle === '') {
            Response::validation(['handle' => 'Product handle is required.']);
        }
        $check = db()->prepare('SELECT 1 FROM wishlists WHERE user_id = ? AND product_handle = ?');
        $check->execute([$user['id'], $handle]);
        if ($check->fetch()) {
            db()->prepare('DELETE FROM wishlists WHERE user_id = ? AND product_handle = ?')
                ->execute([$user['id'], $handle]);
            $added = false;
        } else {
            db()->prepare('INSERT INTO wishlists (user_id, product_handle) VALUES (?, ?)')
                ->execute([$user['id'], $handle]);
            $added = true;
        }
        $stmt = db()->prepare('SELECT product_handle FROM wishlists WHERE user_id = ?');
        $stmt->execute([$user['id']]);
        Response::ok([
            'wishlist' => array_column($stmt->fetchAll(), 'product_handle'),
            'added' => $added,
        ], $added ? 'Added to wishlist.' : 'Removed from wishlist.');
    }

    public static function clear(): void
    {
        $user = Auth::requireCustomer();
        self::ensureTable();
        db()->prepare('DELETE FROM wishlists WHERE user_id = ?')->execute([$user['id']]);
        Response::ok(['wishlist' => []], 'Wishlist cleared.');
    }
}
