<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Validator.php';
require_once __DIR__ . '/../lib/Router.php';
require_once __DIR__ . '/../lib/OrderMapper.php';
require_once __DIR__ . '/../lib/Mailer.php';
require_once __DIR__ . '/OrderController.php';

class PaymentController
{
    public static function update(array $params): void
    {
        Auth::requireAdmin();
        $id = $params['id'] ?? '';
        $body = request_json();
        $status = $body['status'] ?? '';
        $allowed = ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially refunded', 'Refund Pending'];
        if (!in_array($status, $allowed, true)) {
            Response::validation(['status' => 'Invalid payment status.']);
        }
        $stmt = db()->prepare('SELECT * FROM payments WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            Response::error('Payment not found.', 404);
        }
        $prevStatus = $existing['status'] ?? '';
        db()->prepare('UPDATE payments SET status = ? WHERE id = ?')->execute([$status, $id]);
        $row = db()->prepare('SELECT * FROM payments WHERE id = ?');
        $row->execute([$id]);
        $updatedPayment = $row->fetch();

        $orderId = $existing['order_id'] ?? '';

        // If status transitioned to Refunded, manage order status
        if ($status === 'Refunded' && $orderId) {
            $oStmt = db()->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
            $oStmt->execute([$orderId]);
            $ord = $oStmt->fetch();
            if ($ord && $ord['status'] !== 'Refunded') {
                $prevOrdStatus = $ord['status'];
                $timeline = json_decode($ord['timeline_json'] ?? '[]', true) ?: [];
                $timeline[] = [
                    'at' => time() * 1000,
                    'label' => 'Status → Refunded',
                    'note' => 'Payment marked as Refunded',
                ];
                db()->prepare('UPDATE orders SET status = ?, timeline_json = ? WHERE id = ?')
                    ->execute(['Refunded', json_encode($timeline, JSON_UNESCAPED_UNICODE), $orderId]);

                // Restock items if previous state was sellable
                if (!in_array($prevOrdStatus, ['Cancelled', 'Returned', 'Refunded'], true)) {
                    $lines = db()->prepare('SELECT variant_id, qty FROM order_lines WHERE order_id = ?');
                    $lines->execute([$orderId]);
                    $upd = db()->prepare('UPDATE variants SET stock = stock + ? WHERE id = ?');
                    foreach ($lines->fetchAll() as $l) {
                        $upd->execute([(int) $l['qty'], $l['variant_id']]);
                    }
                }
            }
        }

        // If status transitioned to Paid, send payment confirmation / invoice email
        if ($status === 'Paid' && $prevStatus !== 'Paid') {
            try {
                if ($orderId) {
                    $full = OrderController::loadFull($orderId);
                    if ($full) {
                        Mailer::sendOrderPaid($full, OrderMapper::payment($updatedPayment));
                    }
                }
            } catch (Throwable $mailEx) {
                error_log('[PaymentController Email Error] ' . $mailEx->getMessage());
            }
        }

        // If status transitioned to Refunded, send refund processed email
        if ($status === 'Refunded' && $prevStatus !== 'Refunded') {
            try {
                if ($orderId) {
                    $full = OrderController::loadFull($orderId);
                    if ($full) {
                        $lastRefund = !empty($full['_refunds'][0]) ? $full['_refunds'][0] : null;
                        Mailer::sendRefundProcessed($full, $lastRefund, OrderMapper::payment($updatedPayment));
                    }
                }
            } catch (Throwable $mailEx) {
                error_log('[PaymentController Refund Email Error] ' . $mailEx->getMessage());
            }
        }

        $full = $orderId ? OrderController::loadFull($orderId) : null;
        Response::ok([
            'payment' => OrderMapper::payment($updatedPayment),
            'order' => $full,
        ], 'Payment updated successfully.');
    }
}

class RefundController
{
    public static function create(): void
    {
        Auth::requireAdmin();
        $body = request_json();
        $errors = Validator::requireFields($body, ['orderId', 'amount', 'reason']);
        if ($errors) {
            Response::validation($errors);
        }
        $orderId = $body['orderId'];
        $amount = (int) $body['amount'];
        if ($amount <= 0) {
            Response::validation(['amount' => 'Amount must be positive.']);
        }

        $order = db()->prepare('SELECT * FROM orders WHERE id = ?');
        $order->execute([$orderId]);
        if (!$order->fetch()) {
            Response::error('Order not found.', 404);
        }

        $sum = db()->prepare(
            "SELECT COALESCE(SUM(amount),0) FROM refunds WHERE order_id = ? AND status <> 'Rejected'"
        );
        $sum->execute([$orderId]);
        $already = (int) $sum->fetchColumn();
        $pay = db()->prepare('SELECT * FROM payments WHERE order_id = ? LIMIT 1');
        $pay->execute([$orderId]);
        $payment = $pay->fetch();
        $max = (int) ($payment['amount'] ?? 0);
        if ($already + $amount > $max) {
            Response::error('Refund exceeds refundable amount.', 400);
        }

        $id = 'RF-' . $orderId . '-' . substr(bin2hex(random_bytes(2)), 0, 4);
        db()->prepare(
            'INSERT INTO refunds (id, order_id, amount, reason, status, created_at) VALUES (?,?,?,?,?,NOW())'
        )->execute([$id, $orderId, $amount, trim($body['reason']), 'Pending']);

        $row = db()->prepare('SELECT * FROM refunds WHERE id = ?');
        $row->execute([$id]);
        Response::ok(['refund' => OrderMapper::refund($row->fetch())], 'Refund created successfully.', 201);
    }

    public static function updateStatus(array $params): void
    {
        Auth::requireAdmin();
        $id = $params['id'] ?? '';
        $body = request_json();
        $status = $body['status'] ?? '';
        if (!in_array($status, ['Pending', 'Processed', 'Rejected'], true)) {
            Response::validation(['status' => 'Invalid refund status.']);
        }
        $stmt = db()->prepare('SELECT * FROM refunds WHERE id = ?');
        $stmt->execute([$id]);
        $refund = $stmt->fetch();
        if (!$refund) {
            Response::error('Refund not found.', 404);
        }
        db()->prepare('UPDATE refunds SET status = ? WHERE id = ?')->execute([$status, $id]);

        if ($status === 'Processed') {
            $pay = db()->prepare('SELECT * FROM payments WHERE order_id = ? LIMIT 1');
            $pay->execute([$refund['order_id']]);
            $payment = $pay->fetch();
            if ($payment) {
                $sum = db()->prepare(
                    "SELECT COALESCE(SUM(amount),0) FROM refunds WHERE order_id = ? AND status = 'Processed'"
                );
                $sum->execute([$refund['order_id']]);
                $totalRefunded = (int) $sum->fetchColumn();
                $newStatus = $totalRefunded >= (int) $payment['amount'] ? 'Refunded' : 'Partially refunded';
                db()->prepare('UPDATE payments SET status = ? WHERE id = ?')->execute([$newStatus, $payment['id']]);

                // If fully refunded, also update order status to Refunded!
                if ($newStatus === 'Refunded') {
                    $oStmt = db()->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
                    $oStmt->execute([$refund['order_id']]);
                    $ord = $oStmt->fetch();
                    if ($ord && $ord['status'] !== 'Refunded') {
                        $prevOrdStatus = $ord['status'];
                        $timeline = json_decode($ord['timeline_json'] ?? '[]', true) ?: [];
                        $timeline[] = [
                            'at' => time() * 1000,
                            'label' => 'Order Status → Refunded',
                            'note' => 'Refund processed (₹' . $refund['amount'] . ')',
                        ];
                        db()->prepare('UPDATE orders SET status = ?, timeline_json = ? WHERE id = ?')
                            ->execute(['Refunded', json_encode($timeline, JSON_UNESCAPED_UNICODE), $refund['order_id']]);

                        // Restock if not already restocked
                        if (!in_array($prevOrdStatus, ['Cancelled', 'Returned', 'Refunded'], true)) {
                            $lines = db()->prepare('SELECT variant_id, qty FROM order_lines WHERE order_id = ?');
                            $lines->execute([$refund['order_id']]);
                            $upd = db()->prepare('UPDATE variants SET stock = stock + ? WHERE id = ?');
                            foreach ($lines->fetchAll() as $l) {
                                $upd->execute([(int) $l['qty'], $l['variant_id']]);
                            }
                        }
                    }
                }
            }
        }

        $row = db()->prepare('SELECT * FROM refunds WHERE id = ?');
        $row->execute([$id]);
        $refundData = OrderMapper::refund($row->fetch());
        $fullOrder = OrderController::loadFull($refund['order_id']);

        if ($status === 'Processed' && $fullOrder) {
            try {
                Mailer::sendRefundProcessed($fullOrder, $refundData, $fullOrder['_payment'] ?? null);
            } catch (Throwable $mailEx) {
                error_log('[Refund Email Error] ' . $mailEx->getMessage());
            }
        }

        Response::ok([
            'refund' => $refundData,
            'order' => $fullOrder,
            'payment' => $fullOrder['_payment'] ?? null,
        ], 'Refund updated successfully.');
    }
}

class CustomerController
{
    public static function index(): void
    {
        Auth::requireAdmin();
        $includeDeleted = !empty($_GET['include_deleted']);
        $sql = 'SELECT * FROM users ' . ($includeDeleted ? '' : 'WHERE deleted_at IS NULL ') . 'ORDER BY created_at DESC LIMIT 500';
        $rows = db()->query($sql)->fetchAll();
        $users = [];
        foreach ($rows as $u) {
            $users[] = array_merge(Auth::publicUser($u), [
                'addresses' => Auth::loadAddresses($u['id']),
                'notes' => $u['notes'] ?? '',
                'deleted_at' => $u['deleted_at'] ?? null,
            ]);
        }
        Response::ok(['users' => $users]);
    }

    public static function update(array $params): void
    {
        Auth::requireAdmin();
        $id = $params['id'] ?? '';
        $body = request_json();
        $patch = $body['patch'] ?? $body;
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            Response::error('User not found.', 404);
        }
        $map = [
            'name' => 'name',
            'email' => 'email',
            'phone' => 'phone',
            'role' => 'role',
            'status' => 'status',
            'notes' => 'notes',
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
            Response::validation(['name' => 'Nothing to update.']);
        }
        $values[] = $id;
        db()->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);
        $row = db()->prepare('SELECT * FROM users WHERE id = ?');
        $row->execute([$id]);
        $u = $row->fetch();
        Response::ok([
            'user' => array_merge(Auth::publicUser($u), [
                'addresses' => Auth::loadAddresses($u['id']),
                'notes' => $u['notes'] ?? '',
            ]),
        ], 'Customer updated successfully.');
    }

    public static function create(): void
    {
        Auth::requireAdmin();
        $body = request_json();
        $user = $body['user'] ?? $body;
        $errors = Validator::requireFields($user, ['name', 'email']);
        if ($err = Validator::email((string) ($user['email'] ?? ''))) {
            $errors['email'] = $err;
        }
        if ($errors) {
            Response::validation($errors);
        }
        $id = $user['id'] ?? ('u-' . bin2hex(random_bytes(4)));
        $email = strtolower(trim($user['email']));
        try {
            db()->prepare(
                'INSERT INTO users (id, name, email, phone, role, password_hash, status, notes, created_at)
                 VALUES (?,?,?,?,?,?,?,?,NOW())'
            )->execute([
                $id,
                trim($user['name']),
                $email,
                $user['phone'] ?? '',
                $user['role'] ?? 'Customer',
                !empty($user['password']) ? password_hash($user['password'], PASSWORD_DEFAULT) : null,
                $user['status'] ?? 'Active',
                $user['notes'] ?? '',
            ]);
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000) {
                Response::validation(['email' => 'Email already in use.']);
            }
            throw $e;
        }
        $row = db()->prepare('SELECT * FROM users WHERE id = ?');
        $row->execute([$id]);
        Response::ok(['user' => Auth::publicUser($row->fetch())], 'Customer created successfully.', 201);
    }

    public static function delete(array $params): void
    {
        Auth::requireAdmin();
        $id = $params['id'] ?? '';
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            Response::error('User not found.', 404);
        }

        $current = Auth::user();
        if ($current && ($current['id'] === $id || ($current['user_id'] ?? null) === $id)) {
            Response::error('You cannot delete your own logged-in account.', 400);
        }

        db()->prepare('UPDATE users SET deleted_at = NOW(), status = \'Blocked\' WHERE id = ?')->execute([$id]);

        Response::ok(['id' => $id], 'Customer archived successfully.');
    }

    public static function restore(array $params): void
    {
        Auth::requireAdmin();
        $id = $params['id'] ?? '';
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            Response::error('User not found.', 404);
        }

        db()->prepare('UPDATE users SET deleted_at = NULL, status = \'Active\' WHERE id = ?')->execute([$id]);

        $row = db()->prepare('SELECT * FROM users WHERE id = ?');
        $row->execute([$id]);
        $u = $row->fetch();
        Response::ok([
            'user' => array_merge(Auth::publicUser($u), [
                'addresses' => Auth::loadAddresses($u['id']),
                'notes' => $u['notes'] ?? '',
            ]),
        ], 'Customer restored successfully.');
    }
}
