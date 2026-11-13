<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Validator.php';
require_once __DIR__ . '/../lib/Router.php';
require_once __DIR__ . '/../lib/ProductMapper.php';

class CategoryController
{
    public static function tree(bool $includeDeleted = false): array
    {
        $catSql = 'SELECT * FROM categories ' . ($includeDeleted ? '' : 'WHERE deleted_at IS NULL ') . 'ORDER BY sort_order ASC, name ASC';
        $subSql = 'SELECT * FROM subcategories ' . ($includeDeleted ? '' : 'WHERE deleted_at IS NULL ') . 'ORDER BY sort_order ASC, name ASC';
        $cats = db()->query($catSql)->fetchAll();
        $subs = db()->query($subSql)->fetchAll();
        $byCat = [];
        foreach ($subs as $s) {
            $byCat[$s['category_id']][] = [
                'id' => $s['id'],
                'name' => $s['name'],
                'slug' => $s['slug'],
                'active' => (bool) $s['active'],
                'deleted_at' => $s['deleted_at'] ?? null,
            ];
        }
        $out = [];
        foreach ($cats as $c) {
            $out[] = [
                'id' => $c['id'],
                'name' => $c['name'],
                'slug' => $c['slug'],
                'active' => (bool) $c['active'],
                'deleted_at' => $c['deleted_at'] ?? null,
                'children' => $byCat[$c['id']] ?? [],
            ];
        }
        return $out;
    }

    public static function index(): void
    {
        Response::ok(['categories' => self::tree()]);
    }

    public static function create(): void
    {
        $body = request_json();
        $errors = Validator::requireFields($body, ['name', 'slug']);
        if ($err = Validator::slug((string) ($body['slug'] ?? ''))) {
            $errors['slug'] = $err;
        }
        if ($errors) {
            Response::validation($errors);
        }

        $id = $body['id'] ?? ('cat-' . $body['slug']);
        $max = (int) db()->query('SELECT COALESCE(MAX(sort_order), -1) FROM categories')->fetchColumn();
        try {
            $stmt = db()->prepare(
                'INSERT INTO categories (id, name, slug, active, sort_order) VALUES (?,?,?,?,?)'
            );
            $stmt->execute([
                $id,
                trim($body['name']),
                $body['slug'],
                array_key_exists('active', $body) ? (!empty($body['active']) ? 1 : 0) : 1,
                $max + 1,
            ]);
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000) {
                Response::validation(['slug' => 'A category with this slug already exists.']);
            }
            throw $e;
        }

        Response::ok(['categories' => self::tree()], 'Category created successfully.', 201);
    }

    public static function update(array $params): void
    {
        $id = $params['id'] ?? '';
        $body = request_json();
        $stmt = db()->prepare('SELECT * FROM categories WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            Response::error('Category not found.', 404);
        }

        $fields = [];
        $values = [];
        foreach (['name', 'slug', 'active'] as $key) {
            if (array_key_exists($key, $body)) {
                if ($key === 'active') {
                    $fields[] = 'active = ?';
                    $values[] = !empty($body['active']) ? 1 : 0;
                } else {
                    $fields[] = "$key = ?";
                    $values[] = $body[$key];
                }
            }
        }
        if (!$fields) {
            Response::validation(['name' => 'Nothing to update.']);
        }
        if (isset($body['slug']) && ($err = Validator::slug((string) $body['slug']))) {
            Response::validation(['slug' => $err]);
        }
        $values[] = $id;
        db()->prepare('UPDATE categories SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);
        Response::ok(['categories' => self::tree()], 'Category updated successfully.');
    }

    public static function delete(array $params): void
    {
        $id = $params['id'] ?? '';
        $stmt = db()->prepare('UPDATE categories SET deleted_at = NOW() WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            Response::error('Category not found.', 404);
        }
        try {
            db()->prepare('UPDATE subcategories SET deleted_at = NOW() WHERE category_id = ?')->execute([$id]);
        } catch (Throwable $e) {}

        Response::ok(['categories' => self::tree()], 'Category archived successfully.');
    }

    public static function restore(array $params): void
    {
        $id = $params['id'] ?? '';
        $stmt = db()->prepare('UPDATE categories SET deleted_at = NULL WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            Response::error('Category not found.', 404);
        }
        try {
            db()->prepare('UPDATE subcategories SET deleted_at = NULL WHERE category_id = ?')->execute([$id]);
        } catch (Throwable $e) {}

        Response::ok(['categories' => self::tree()], 'Category restored successfully.');
    }

    public static function move(array $params): void
    {
        $id = $params['id'] ?? '';
        $body = request_json();
        $delta = (int) ($body['delta'] ?? 0);
        if (!in_array($delta, [-1, 1], true)) {
            Response::validation(['delta' => 'Delta must be -1 or 1.']);
        }

        $cats = db()->query('SELECT id, sort_order FROM categories ORDER BY sort_order ASC, name ASC')->fetchAll();
        $index = null;
        foreach ($cats as $i => $c) {
            if ($c['id'] === $id) {
                $index = $i;
                break;
            }
        }
        if ($index === null) {
            Response::error('Category not found.', 404);
        }
        $swap = $index + $delta;
        if ($swap < 0 || $swap >= count($cats)) {
            Response::ok(['categories' => self::tree()]);
        }

        $a = $cats[$index];
        $b = $cats[$swap];
        $pdo = db();
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE categories SET sort_order = ? WHERE id = ?')->execute([$b['sort_order'], $a['id']]);
        $pdo->prepare('UPDATE categories SET sort_order = ? WHERE id = ?')->execute([$a['sort_order'], $b['id']]);
        // normalize orders
        $ordered = $pdo->query('SELECT id FROM categories ORDER BY sort_order ASC, name ASC')->fetchAll();
        $upd = $pdo->prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
        foreach ($ordered as $i => $row) {
            $upd->execute([$i, $row['id']]);
        }
        $pdo->commit();
        Response::ok(['categories' => self::tree()], 'Category order updated.');
    }

    public static function createSub(): void
    {
        $body = request_json();
        $errors = Validator::requireFields($body, ['categoryId', 'name', 'slug']);
        if ($err = Validator::slug((string) ($body['slug'] ?? ''))) {
            $errors['slug'] = $err;
        }
        if ($errors) {
            Response::validation($errors);
        }

        $catId = $body['categoryId'];
        $check = db()->prepare('SELECT id FROM categories WHERE id = ?');
        $check->execute([$catId]);
        if (!$check->fetch()) {
            Response::validation(['categoryId' => 'Parent category not found.']);
        }

        $id = $body['id'] ?? ('sub-' . $body['slug']);
        $maxStmt = db()->prepare('SELECT COALESCE(MAX(sort_order), -1) FROM subcategories WHERE category_id = ?');
        $maxStmt->execute([$catId]);
        $max = (int) $maxStmt->fetchColumn();

        try {
            $stmt = db()->prepare(
                'INSERT INTO subcategories (id, category_id, name, slug, active, sort_order) VALUES (?,?,?,?,?,?)'
            );
            $stmt->execute([
                $id,
                $catId,
                trim($body['name']),
                $body['slug'],
                array_key_exists('active', $body) ? (!empty($body['active']) ? 1 : 0) : 1,
                $max + 1,
            ]);
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000) {
                Response::validation(['slug' => 'A subcategory with this slug already exists.']);
            }
            throw $e;
        }

        Response::ok(['categories' => self::tree()], 'Subcategory created successfully.', 201);
    }

    public static function updateSub(array $params): void
    {
        $id = $params['id'] ?? '';
        $body = request_json();
        $stmt = db()->prepare('SELECT * FROM subcategories WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            Response::error('Subcategory not found.', 404);
        }

        $fields = [];
        $values = [];
        foreach (['name', 'slug', 'active'] as $key) {
            if (array_key_exists($key, $body)) {
                if ($key === 'active') {
                    $fields[] = 'active = ?';
                    $values[] = !empty($body['active']) ? 1 : 0;
                } else {
                    $fields[] = "$key = ?";
                    $values[] = $body[$key];
                }
            }
        }
        if (!$fields) {
            Response::validation(['name' => 'Nothing to update.']);
        }
        $values[] = $id;
        db()->prepare('UPDATE subcategories SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);
        Response::ok(['categories' => self::tree()], 'Subcategory updated successfully.');
    }

    public static function deleteSub(array $params): void
    {
        $id = $params['id'] ?? '';
        $stmt = db()->prepare('UPDATE subcategories SET deleted_at = NOW() WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            Response::error('Subcategory not found.', 404);
        }
        Response::ok(['categories' => self::tree()], 'Subcategory archived successfully.');
    }

    public static function restoreSub(array $params): void
    {
        $id = $params['id'] ?? '';
        $stmt = db()->prepare('UPDATE subcategories SET deleted_at = NULL WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            Response::error('Subcategory not found.', 404);
        }
        Response::ok(['categories' => self::tree()], 'Subcategory restored successfully.');
    }

    public static function moveSub(array $params): void
    {
        $id = $params['id'] ?? '';
        $body = request_json();
        $delta = (int) ($body['delta'] ?? 0);

        $stmt = db()->prepare('SELECT * FROM subcategories WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $current = $stmt->fetch();
        if (!$current) {
            Response::error('Subcategory not found.', 404);
        }

        $listStmt = db()->prepare(
            'SELECT id, sort_order FROM subcategories WHERE category_id = ? ORDER BY sort_order ASC, name ASC'
        );
        $listStmt->execute([$current['category_id']]);
        $list = $listStmt->fetchAll();
        $index = null;
        foreach ($list as $i => $row) {
            if ($row['id'] === $id) {
                $index = $i;
                break;
            }
        }
        $swap = $index + $delta;
        if ($index === null || $swap < 0 || $swap >= count($list)) {
            Response::ok(['categories' => self::tree()]);
        }

        $a = $list[$index];
        $b = $list[$swap];
        $pdo = db();
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE subcategories SET sort_order = ? WHERE id = ?')->execute([$b['sort_order'], $a['id']]);
        $pdo->prepare('UPDATE subcategories SET sort_order = ? WHERE id = ?')->execute([$a['sort_order'], $b['id']]);
        $pdo->commit();
        Response::ok(['categories' => self::tree()], 'Subcategory order updated.');
    }
}
