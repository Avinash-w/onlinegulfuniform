<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Router.php';

/**
 * Product reviews. Customers submit (logged in); admins approve / reject / delete.
 * Only approved reviews are public.
 */
class ReviewController
{
    private static bool $ready = false;

    private static function ensureTable(): void
    {
        if (self::$ready) {
            return;
        }
        db()->exec(
            "CREATE TABLE IF NOT EXISTS reviews (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                product_handle VARCHAR(191) NOT NULL,
                user_id VARCHAR(64) NOT NULL,
                name VARCHAR(120) NOT NULL,
                rating TINYINT UNSIGNED NOT NULL,
                title VARCHAR(160) NOT NULL DEFAULT '',
                body TEXT NOT NULL,
                status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_product_status (product_handle, status),
                UNIQUE KEY uniq_user_product (user_id, product_handle)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        self::$ready = true;
    }

    private static function shape(array $r, bool $admin = false): array
    {
        $out = [
            'id' => (int) $r['id'],
            'productHandle' => $r['product_handle'],
            'name' => $r['name'],
            'rating' => (int) $r['rating'],
            'title' => $r['title'],
            'body' => $r['body'],
            'status' => $r['status'],
            'createdAt' => $r['created_at'],
        ];
        if ($admin) {
            $out['userId'] = $r['user_id'];
            $out['productTitle'] = $r['product_title'] ?? $r['product_handle'];
        }
        return $out;
    }

    /** GET /products/{handle}/reviews — approved reviews + rating summary (public). */
    public static function forProduct(array $params): void
    {
        self::ensureTable();
        $handle = $params['handle'] ?? '';
        $stmt = db()->prepare(
            "SELECT * FROM reviews WHERE product_handle = ? AND status = 'Approved' ORDER BY created_at DESC, id DESC"
        );
        $stmt->execute([$handle]);
        $rows = $stmt->fetchAll();

        $total = count($rows);
        $counts = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
        $sum = 0;
        foreach ($rows as $r) {
            $counts[(int) $r['rating']] = ($counts[(int) $r['rating']] ?? 0) + 1;
            $sum += (int) $r['rating'];
        }
        $distribution = [];
        foreach ($counts as $stars => $count) {
            $distribution[] = [
                'stars' => $stars,
                'count' => $count,
                'pct' => $total ? (int) round($count * 100 / $total) : 0,
            ];
        }

        // Has the signed-in customer already reviewed this product?
        $mine = null;
        $user = Auth::user();
        if ($user) {
            $m = db()->prepare('SELECT * FROM reviews WHERE product_handle = ? AND user_id = ? LIMIT 1');
            $m->execute([$handle, $user['id']]);
            $row = $m->fetch();
            $mine = $row ? ['status' => $row['status']] : null;
        }

        Response::ok([
            'total' => $total,
            'average' => $total ? round($sum / $total, 1) : 0,
            'distribution' => $distribution,
            'items' => array_map(fn($r) => self::shape($r), $rows),
            'mine' => $mine,
        ]);
    }

    /** POST /products/{handle}/reviews — logged-in customer; goes to moderation. */
    public static function create(array $params): void
    {
        self::ensureTable();
        $user = Auth::requireCustomer();
        $handle = $params['handle'] ?? '';
        $body = request_json();

        $exists = db()->prepare('SELECT handle FROM products WHERE handle = ? AND deleted_at IS NULL LIMIT 1');
        $exists->execute([$handle]);
        if (!$exists->fetch()) {
            Response::error('Product not found.', 404);
        }

        $rating = (int) ($body['rating'] ?? 0);
        $title = trim((string) ($body['title'] ?? ''));
        $text = trim((string) ($body['body'] ?? ''));
        $errors = [];
        if ($rating < 1 || $rating > 5) {
            $errors['rating'] = 'Please choose a rating from 1 to 5.';
        }
        if (mb_strlen($text) < 10) {
            $errors['body'] = 'Please write at least 10 characters.';
        }
        if (mb_strlen($text) > 2000) {
            $errors['body'] = 'Review is too long (max 2000 characters).';
        }
        if (mb_strlen($title) > 160) {
            $errors['title'] = 'Title is too long.';
        }
        if ($errors) {
            Response::validation($errors);
        }

        $name = trim((string) ($user['name'] ?? '')) ?: 'Customer';
        try {
            db()->prepare(
                "INSERT INTO reviews (product_handle, user_id, name, rating, title, body, status)
                 VALUES (?,?,?,?,?,?, 'Pending')"
            )->execute([$handle, $user['id'], $name, $rating, $title, $text]);
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000) {
                Response::error('You have already reviewed this product.', 409);
            }
            throw $e;
        }

        Response::ok(['status' => 'Pending'], 'Thank you! Your review will appear once it is approved.', 201);
    }

    /** GET /reviews?status=Pending|Approved|Rejected (admin). */
    public static function adminIndex(): void
    {
        self::ensureTable();
        $status = $_GET['status'] ?? '';
        $sql = 'SELECT r.*, p.title AS product_title FROM reviews r LEFT JOIN products p ON p.handle = r.product_handle';
        $args = [];
        if (in_array($status, ['Pending', 'Approved', 'Rejected'], true)) {
            $sql .= ' WHERE r.status = ?';
            $args[] = $status;
        }
        $sql .= ' ORDER BY r.created_at DESC, r.id DESC LIMIT 500';
        $stmt = db()->prepare($sql);
        $stmt->execute($args);
        $counts = db()->query('SELECT status, COUNT(*) c FROM reviews GROUP BY status')->fetchAll();
        $byStatus = ['Pending' => 0, 'Approved' => 0, 'Rejected' => 0];
        foreach ($counts as $c) {
            $byStatus[$c['status']] = (int) $c['c'];
        }
        Response::ok([
            'reviews' => array_map(fn($r) => self::shape($r, true), $stmt->fetchAll()),
            'counts' => $byStatus,
        ]);
    }

    /** PATCH /reviews/{id} — { status } (admin). */
    public static function updateStatus(array $params): void
    {
        self::ensureTable();
        $body = request_json();
        $status = (string) ($body['status'] ?? '');
        if (!in_array($status, ['Pending', 'Approved', 'Rejected'], true)) {
            Response::validation(['status' => 'Invalid status.']);
        }
        $stmt = db()->prepare('UPDATE reviews SET status = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$status, (int) ($params['id'] ?? 0)]);
        Response::ok(['id' => (int) $params['id'], 'status' => $status], "Review marked as {$status}.");
    }

    /** DELETE /reviews/{id} (admin). */
    public static function delete(array $params): void
    {
        self::ensureTable();
        $stmt = db()->prepare('DELETE FROM reviews WHERE id = ?');
        $stmt->execute([(int) ($params['id'] ?? 0)]);
        if ($stmt->rowCount() === 0) {
            Response::error('Review not found.', 404);
        }
        Response::ok(['id' => (int) $params['id']], 'Review deleted.');
    }
}
