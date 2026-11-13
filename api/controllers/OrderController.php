<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Validator.php';
require_once __DIR__ . '/../lib/Router.php';
require_once __DIR__ . '/../lib/OrderMapper.php';
require_once __DIR__ . '/../lib/Mailer.php';

class OrderController
{
    private static function nextOrderId(): string
    {
        $stmt = db()->query("SELECT id FROM orders WHERE id LIKE 'EN%' ORDER BY id DESC LIMIT 1");
        $last = $stmt->fetchColumn();
        if ($last && preg_match('/EN(\d+)/', $last, $m)) {
            return 'EN' . ((int) $m[1] + 1);
        }
        return 'EN11000';
    }

    public static function loadFull(string $id): ?array
    {
        $stmt = db()->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) {
            return null;
        }
        $lines = db()->prepare('SELECT * FROM order_lines WHERE order_id = ?');
        $lines->execute([$id]);
        $pay = db()->prepare('SELECT * FROM payments WHERE order_id = ? LIMIT 1');
        $pay->execute([$id]);
        $ship = db()->prepare('SELECT * FROM shipments WHERE order_id = ? LIMIT 1');
        $ship->execute([$id]);
        $refs = db()->prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC');
        $refs->execute([$id]);
        return OrderMapper::orderFromRows(
            $order,
            $lines->fetchAll(),
            $pay->fetch() ?: null,
            $ship->fetch() ?: null,
            $refs->fetchAll()
        );
    }

    public static function index(): void
    {
        $user = Auth::user();
        $admin = $user && in_array($user['role'], ['Staff', 'Manager', 'Admin'], true);
        if (!$user) {
            Response::error('Authentication required.', 401);
        }

        $includeDeleted = !empty($_GET['include_deleted']);
        $onlyDeleted = !empty($_GET['only_deleted']) || ($_GET['status'] ?? '') === 'Archived';

        if ($admin) {
            if ($onlyDeleted) {
                $rows = db()->query('SELECT * FROM orders WHERE deleted_at IS NOT NULL ORDER BY placed_at DESC LIMIT 200')->fetchAll();
            } elseif ($includeDeleted) {
                $rows = db()->query('SELECT * FROM orders ORDER BY placed_at DESC LIMIT 200')->fetchAll();
            } else {
                $rows = db()->query('SELECT * FROM orders WHERE deleted_at IS NULL ORDER BY placed_at DESC LIMIT 200')->fetchAll();
            }
        } else {
            $stmt = db()->prepare('SELECT * FROM orders WHERE user_id = ? AND deleted_at IS NULL ORDER BY placed_at DESC LIMIT 100');
            $stmt->execute([$user['id']]);
            $rows = $stmt->fetchAll();
        }

        $orders = [];
        $payments = [];
        $shipments = [];
        $refunds = [];
        foreach ($rows as $row) {
            try {
                $full = self::loadFull($row['id']);
                if (!$full) {
                    continue;
                }
                if (!empty($full['_payment'])) {
                    $payments[] = $full['_payment'];
                }
                if (!empty($full['_shipment'])) {
                    $shipments[] = $full['_shipment'];
                }
                if (!empty($full['_refunds'])) {
                    foreach ($full['_refunds'] as $r) {
                        $refunds[] = $r;
                    }
                }
                unset($full['_payment'], $full['_shipment'], $full['_refunds']);
                $orders[] = $full;
            } catch (\Throwable $e) {
                // skip broken order row
            }
        }

        Response::ok([
            'orders' => $orders,
            'payments' => $payments,
            'shipments' => $shipments,
            'refunds' => $refunds,
        ]);
    }

    public static function track(array $params): void
    {
        $q = trim($_GET['q'] ?? $params['query'] ?? $params['id'] ?? '');
        $q = ltrim($q, '#');
        if ($q === '') {
            Response::error('Please provide an order ID or tracking number.', 422);
        }

        // 1. Direct match on order ID
        $full = self::loadFull($q);

        // 2. Case-insensitive lookup on order ID
        if (!$full) {
            $stmt = db()->prepare('SELECT id FROM orders WHERE UPPER(id) = ? LIMIT 1');
            $stmt->execute([strtoupper($q)]);
            $row = $stmt->fetch();
            if ($row) {
                $full = self::loadFull($row['id']);
            }
        }

        // 3. Numeric ID matching e.g. 10001 -> EN10001
        if (!$full && is_numeric($q)) {
            $stmt = db()->prepare('SELECT id FROM orders WHERE id LIKE ? LIMIT 1');
            $stmt->execute(['%' . $q]);
            $row = $stmt->fetch();
            if ($row) {
                $full = self::loadFull($row['id']);
            }
        }

        // 4. Tracking number (AWB) or Shipment ID lookup in shipments table
        if (!$full) {
            $stmt = db()->prepare('SELECT order_id FROM shipments WHERE UPPER(awb) = ? OR UPPER(id) = ? LIMIT 1');
            $stmt->execute([strtoupper($q), strtoupper($q)]);
            $shipRow = $stmt->fetch();
            if ($shipRow) {
                $full = self::loadFull($shipRow['order_id']);
            }
        }

        if (!$full) {
            Response::error('No order or shipment found matching the provided details.', 404);
        }

        $payment = $full['_payment'] ?? null;
        $shipment = $full['_shipment'] ?? null;
        $refunds = $full['_refunds'] ?? [];
        unset($full['_payment'], $full['_shipment'], $full['_refunds']);

        Response::ok([
            'order' => $full,
            'payment' => $payment,
            'shipment' => $shipment,
            'refunds' => $refunds,
        ]);
    }

    public static function requestOtp(): void
    {
        $body = request_json();
        $q = trim((string) ($body['orderId'] ?? $body['query'] ?? $body['q'] ?? ''));
        $inputEmail = strtolower(trim((string) ($body['email'] ?? '')));
        $q = ltrim($q, '#');

        if ($q === '' && $inputEmail === '') {
            Response::error('Order ID or tracking number is required.', 422);
        }

        // Find order if in database
        $full = null;
        if ($q !== '') {
            $full = self::loadFull($q);
            if (!$full) {
                $stmt = db()->prepare('SELECT id FROM orders WHERE UPPER(id) = ? LIMIT 1');
                $stmt->execute([strtoupper($q)]);
                $row = $stmt->fetch();
                if ($row) {
                    $full = self::loadFull($row['id']);
                }
            }
            if (!$full && is_numeric($q)) {
                $stmt = db()->prepare('SELECT id FROM orders WHERE id LIKE ? LIMIT 1');
                $stmt->execute(['%' . $q]);
                $row = $stmt->fetch();
                if ($row) {
                    $full = self::loadFull($row['id']);
                }
            }
            if (!$full) {
                $stmt = db()->prepare('SELECT order_id FROM shipments WHERE UPPER(awb) = ? OR UPPER(id) = ? LIMIT 1');
                $stmt->execute([strtoupper($q), strtoupper($q)]);
                $shipRow = $stmt->fetch();
                if ($shipRow) {
                    $full = self::loadFull($shipRow['order_id']);
                }
            }
        }

        $email = $inputEmail;
        if ($full) {
            $dbEmail = strtolower(trim((string) ($full['email'] ?? $full['address']['email'] ?? $full['customerEmail'] ?? '')));
            if ($dbEmail && filter_var($dbEmail, FILTER_VALIDATE_EMAIL)) {
                $email = $dbEmail;
            }
        }

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = ($q !== '' ? strtolower($q) : 'customer') . '@example.com';
        }

        // Generate 4-digit OTP
        $code = (string) random_int(1000, 9999);
        $orderId = $full ? (string) $full['id'] : ($q ?: 'ORDER');

        // Clean previous challenges for this email / mode
        db()->prepare("DELETE FROM otp_challenges WHERE email = ? AND mode IN ('order_track', 'order_verify')")->execute([$email]);

        // Insert into database with 5 MINUTE expiry
        db()->prepare(
            "INSERT INTO otp_challenges (email, mode, code, expires_at) VALUES (?, 'order_track', ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))"
        )->execute([$email, $code]);

        // Mask email for privacy
        $parts = explode('@', $email);
        $namePart = $parts[0] ?? 'user';
        $maskedName = (strlen($namePart) > 2 ? substr($namePart, 0, 2) : substr($namePart, 0, 1)) . '***';
        $maskedEmail = $maskedName . '@' . ($parts[1] ?? 'example.com');

        // Send OTP email if email is valid
        if (filter_var($email, FILTER_VALIDATE_EMAIL) && !str_ends_with($email, '@example.com')) {
            try {
                Mailer::sendOtp($email, $code, 'Order Tracking');
            } catch (Throwable $mailEx) {
                error_log('[OrderController OTP Email Error] ' . $mailEx->getMessage());
            }
        }

        Response::ok([
            'orderId' => $orderId,
            'email' => $email,
            'maskedEmail' => $maskedEmail,
            'expiresIn' => 300,
        ], 'OTP sent successfully to registered email.');
    }

    public static function verifyOtp(): void
    {
        $body = request_json();
        $q = trim((string) ($body['orderId'] ?? $body['query'] ?? $body['q'] ?? ''));
        $code = trim((string) ($body['code'] ?? $body['otp'] ?? ''));
        $inputEmail = strtolower(trim((string) ($body['email'] ?? '')));
        $q = ltrim($q, '#');

        if ($code === '') {
            Response::error('Please enter the 4-digit OTP code.', 422);
        }

        $full = null;
        if ($q !== '') {
            $full = self::loadFull($q);
            if (!$full) {
                $stmt = db()->prepare('SELECT id FROM orders WHERE UPPER(id) = ? LIMIT 1');
                $stmt->execute([strtoupper($q)]);
                $row = $stmt->fetch();
                if ($row) {
                    $full = self::loadFull($row['id']);
                }
            }
            if (!$full && is_numeric($q)) {
                $stmt = db()->prepare('SELECT id FROM orders WHERE id LIKE ? LIMIT 1');
                $stmt->execute(['%' . $q]);
                $row = $stmt->fetch();
                if ($row) {
                    $full = self::loadFull($row['id']);
                }
            }
            if (!$full) {
                $stmt = db()->prepare('SELECT order_id FROM shipments WHERE UPPER(awb) = ? OR UPPER(id) = ? LIMIT 1');
                $stmt->execute([strtoupper($q), strtoupper($q)]);
                $shipRow = $stmt->fetch();
                if ($shipRow) {
                    $full = self::loadFull($shipRow['order_id']);
                }
            }
        }

        $email = $inputEmail;
        if ($full) {
            $dbEmail = strtolower(trim((string) ($full['email'] ?? $full['address']['email'] ?? $full['customerEmail'] ?? '')));
            if ($dbEmail && filter_var($dbEmail, FILTER_VALIDATE_EMAIL)) {
                $email = $dbEmail;
            }
        }

        // Check active challenge in database
        $challenge = null;
        if ($email) {
            $stmt = db()->prepare(
                "SELECT * FROM otp_challenges WHERE LOWER(TRIM(email)) = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1"
            );
            $stmt->execute([$email]);
            $challenge = $stmt->fetch();

            if (!$challenge) {
                $stmt = db()->prepare(
                    "SELECT * FROM otp_challenges WHERE LOWER(TRIM(email)) = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE) ORDER BY id DESC LIMIT 1"
                );
                $stmt->execute([$email]);
                $challenge = $stmt->fetch();
            }
        }

        // Fallback: search most recent active challenge
        if (!$challenge) {
            $stmt = db()->query(
                "SELECT * FROM otp_challenges WHERE created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE) ORDER BY id DESC LIMIT 1"
            );
            $challenge = $stmt->fetch();
        }

        if (!$challenge) {
            Response::error('OTP expired or not found. Please click "Resend Code" to get a new OTP.', 400);
        }

        if ($challenge['code'] !== $code) {
            Response::error('Incorrect OTP. Please check and try again.', 400);
        }

        // Delete used challenge from database
        if ($challenge) {
            db()->prepare("DELETE FROM otp_challenges WHERE id = ?")->execute([$challenge['id']]);
        }

        $payment = $full ? ($full['_payment'] ?? null) : null;
        $shipment = $full ? ($full['_shipment'] ?? null) : null;
        $refunds = $full ? ($full['_refunds'] ?? []) : [];
        if ($full) {
            unset($full['_payment'], $full['_shipment'], $full['_refunds']);
        }

        Response::ok([
            'order' => $full,
            'payment' => $payment,
            'shipment' => $shipment,
            'refunds' => $refunds,
            'verified' => true,
        ], 'OTP verified successfully.');
    }

    public static function show(array $params): void
    {
        $id = $params['id'] ?? '';
        $full = self::loadFull($id);
        if (!$full) {
            Response::error('Order not found.', 404);
        }

        $user = Auth::user();
        $admin = $user && in_array($user['role'], ['Staff', 'Manager', 'Admin'], true);
        if (!$admin) {
            if ($user && $user['id'] !== $full['userId'] && $user['role'] === 'Customer') {
                Response::error('Order not found.', 404);
            }
        }

        $payment = $full['_payment'] ?? null;
        $shipment = $full['_shipment'] ?? null;
        $refunds = $full['_refunds'] ?? [];
        unset($full['_payment'], $full['_shipment'], $full['_refunds']);

        Response::ok([
            'order' => $full,
            'payment' => $payment,
            'shipment' => $shipment,
            'refunds' => $refunds,
        ]);
    }

    private static function resolvePaymentMethodDetails(string $transactionId, string $fallbackMethod, string $fallbackNote): array
    {
        if (!preg_match('/^pay_[a-zA-Z0-9]+$/', $transactionId)) {
            return ['method' => $fallbackMethod, 'note' => $fallbackNote];
        }

        try {
            $env = file_exists(__DIR__ . '/../config/env.php') ? require __DIR__ . '/../config/env.php' : [];
            $keyId = $env['razorpay_key_id'] ?? 'rzp_test_SYaRfW9FWD0rjc';
            $keySecret = $env['razorpay_key_secret'] ?? '';

            $ch = curl_init("https://api.razorpay.com/v1/payments/{$transactionId}");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_USERPWD, "{$keyId}:{$keySecret}");
            curl_setopt($ch, CURLOPT_TIMEOUT, 1);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $res) {
                $data = json_decode($res, true);
                if (!empty($data['method'])) {
                    $m = strtolower($data['method']);
                    if ($m === 'card') {
                        $cardType = strtolower($data['card']['type'] ?? '');
                        $network = $data['card']['network'] ?? 'Card';
                        $last4 = $data['card']['last4'] ?? '';
                        $methodName = $cardType === 'credit' ? 'Credit Card' : ($cardType === 'debit' ? 'Debit Card' : 'Card');
                        $note = "Paid via {$network} {$methodName}" . ($last4 ? " (ending in {$last4})" : '') . " [{$transactionId}]";
                        return ['method' => $methodName, 'note' => $note];
                    }
                    if ($m === 'upi') {
                        $vpa = $data['vpa'] ?? '';
                        $note = "Paid via UPI" . ($vpa ? " ({$vpa})" : '') . " [{$transactionId}]";
                        return ['method' => 'UPI', 'note' => $note];
                    }
                    if ($m === 'netbanking') {
                        $bank = $data['bank'] ?? '';
                        $note = "Paid via Net Banking" . ($bank ? " ({$bank})" : '') . " [{$transactionId}]";
                        return ['method' => 'Net Banking', 'note' => $note];
                    }
                    if ($m === 'wallet') {
                        $wallet = $data['wallet'] ?? '';
                        $note = "Paid via Wallet" . ($wallet ? " ({$wallet})" : '') . " [{$transactionId}]";
                        return ['method' => 'Wallet', 'note' => $note];
                    }
                    if ($m === 'emi') {
                        return ['method' => 'EMI', 'note' => "Paid via EMI [{$transactionId}]"];
                    }
                }
            }
        } catch (\Throwable $e) {
            error_log('[Razorpay Method Fetch Error] ' . $e->getMessage());
        }

        return ['method' => $fallbackMethod, 'note' => $fallbackNote];
    }

    public static function create(): void
    {
        $user = Auth::requireCustomer();
        $body = request_json();
        $errors = Validator::requireFields($body, ['lines', 'contact', 'address', 'method']);
        if ($errors) {
            Response::validation($errors);
        }

        $lines = $body['lines'];
        if (!is_array($lines) || !count($lines)) {
            Response::validation(['lines' => 'Cart is empty.']);
        }

        $contact = $body['contact'];
        $address = $body['address'];
        $method = $body['method'];
        $payStatus = $body['payStatus'] ?? ($method === 'COD' ? 'Pending' : 'Paid');
        $orderStatus = $body['orderStatus'] ?? ($method === 'COD' ? 'Pending' : 'Confirmed');
        $transactionId = $body['transactionId'] ?? '—';
        $note = $body['note'] ?? ($method === 'COD' ? 'Cash on delivery' : 'Paid online');

        // Automatically resolve online payment method (Card / UPI / Netbanking / Wallet) from Razorpay
        if ($method !== 'COD' && !empty($transactionId) && str_starts_with($transactionId, 'pay_')) {
            $resolvedPayment = self::resolvePaymentMethodDetails($transactionId, $method, $note);
            $method = $resolvedPayment['method'];
            $note = $resolvedPayment['note'];
        }

        if (!empty($contact['phone'])) {
            $stmt = db()->prepare("UPDATE users SET phone = ? WHERE id = ? AND (phone IS NULL OR phone = '')");
            $stmt->execute([trim((string) $contact['phone']), $user['id']]);
        }
        if (!empty($contact['name'])) {
            $stmt = db()->prepare("UPDATE users SET name = ? WHERE id = ? AND (name IS NULL OR name = '')");
            $stmt->execute([trim((string) $contact['name']), $user['id']]);
        }

        // Recalculate totals server-side
        $subtotal = 0;
        $resolvedLines = [];
        foreach ($lines as $l) {
            $handle = $l['productHandle'] ?? $l['handle'] ?? '';
            $size = $l['size'] ?? 'One size';
            $qty = max(1, (int) ($l['qty'] ?? 1));
            $vStmt = db()->prepare(
                'SELECT * FROM variants WHERE product_handle = ? AND size = ? LIMIT 1'
            );
            $vStmt->execute([$handle, $size]);
            $variant = $vStmt->fetch();
            if (!$variant) {
                $vStmt = db()->prepare('SELECT * FROM variants WHERE product_handle = ? LIMIT 1');
                $vStmt->execute([$handle]);
                $variant = $vStmt->fetch();
            }
            if (!$variant) {
                Response::validation(['lines' => "Variant not found for {$handle}."]);
            }
            if ((int) $variant['stock'] < $qty) {
                Response::error("Insufficient stock for {$handle}.", 409);
            }
            $pStmt = db()->prepare('SELECT title, payload FROM products WHERE handle = ? AND deleted_at IS NULL');
            $pStmt->execute([$handle]);
            $prod = $pStmt->fetch();
            if (!$prod) {
                Response::error("Product {$handle} is unavailable.", 409);
            }
            $payload = json_decode($prod['payload'] ?? '{}', true) ?: [];
            $price = (int) $variant['price'];
            $subtotal += $price * $qty;
            $customNote = !empty($l['customNote']) ? trim((string) $l['customNote']) : (!empty($l['custom_note']) ? trim((string) $l['custom_note']) : null);
            $resolvedLines[] = [
                'variant' => $variant,
                'title' => $prod['title'],
                'image' => $l['image'] ?? (($payload['images'][0] ?? null)),
                'size' => $variant['size'],
                'color' => $variant['color'],
                'sku' => $variant['sku'],
                'price' => $price,
                'qty' => $qty,
                'handle' => $handle,
                'custom_note' => $customNote ?: null,
            ];
        }

        $shippingFlat = 49;
        $freeAt = 999;
        $content = db()->query("SELECT value FROM content_blocks WHERE `key`='storefront' LIMIT 1")->fetch();
        if ($content) {
            $c = json_decode($content['value'], true);
            $shippingFlat = (int) ($c['site']['shippingFlat'] ?? 49);
            $freeAt = (int) ($c['site']['freeShippingAt'] ?? 999);
        }
        $shipping = $subtotal >= $freeAt ? 0 : $shippingFlat;

        $discount = 0;
        $couponCode = null;
        if (!empty($body['coupon'])) {
            $cStmt = db()->prepare('SELECT * FROM coupons WHERE code = ? LIMIT 1');
            $cStmt->execute([strtoupper(trim($body['coupon']))]);
            $coupon = $cStmt->fetch();
            if ($coupon && (int) $coupon['active'] === 1 && $subtotal >= (int) $coupon['min_cart']) {
                $couponCode = $coupon['code'];
                $discount = $coupon['type'] === 'percent'
                    ? (int) round($subtotal * ((int) $coupon['value']) / 100)
                    : min($subtotal, (int) $coupon['value']);
            }
        }

        $total = max(0, $subtotal + $shipping - $discount);
        $id = self::nextOrderId();
        $at = time() * 1000;
        $timeline = [['at' => $at, 'label' => 'Order placed', 'note' => $note]];

        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'INSERT INTO orders
                (id, user_id, customer_name, email, phone, subtotal, shipping, discount, coupon, total, status, address_json, timeline_json, placed_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,FROM_UNIXTIME(?))'
            )->execute([
                $id,
                $user['id'],
                trim($contact['name'] ?? $user['name']),
                trim($contact['email'] ?? $user['email']),
                trim($contact['phone'] ?? $user['phone'] ?? ''),
                $subtotal,
                $shipping,
                $discount,
                $couponCode,
                $total,
                $orderStatus,
                json_encode($address, JSON_UNESCAPED_UNICODE),
                json_encode($timeline, JSON_UNESCAPED_UNICODE),
                (int) floor($at / 1000),
            ]);

            $lineIns = $pdo->prepare(
                'INSERT INTO order_lines
                (order_id, variant_id, product_handle, title, image, size, color, sku, price, qty, custom_note)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)'
            );
            $stockUpd = $pdo->prepare('UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?');
            foreach ($resolvedLines as $rl) {
                $lineIns->execute([
                    $id,
                    $rl['variant']['id'],
                    $rl['handle'],
                    $rl['title'],
                    $rl['image'],
                    $rl['size'],
                    $rl['color'],
                    $rl['sku'],
                    $rl['price'],
                    $rl['qty'],
                    $rl['custom_note'],
                ]);
                $stockUpd->execute([$rl['qty'], $rl['variant']['id'], $rl['qty']]);
                if ($stockUpd->rowCount() === 0) {
                    throw new RuntimeException('Stock race for ' . $rl['handle']);
                }
            }

            $pdo->prepare(
                'INSERT INTO payments (id, order_id, amount, method, status, transaction_id, paid_at)
                 VALUES (?,?,?,?,?,?,FROM_UNIXTIME(?))'
            )->execute([
                'PAY-' . $id,
                $id,
                $total,
                $method,
                $payStatus,
                $transactionId,
                (int) floor($at / 1000),
            ]);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log($e->getMessage());
            Response::error('Unable to place the order. Please try again.', 500);
        }

        $full = self::loadFull($id);
        $payment = $full['_payment'] ?? null;
        $orderForResponse = $full;
        unset($orderForResponse['_payment'], $orderForResponse['_shipment'], $orderForResponse['_refunds']);

        // Send instant response to frontend client so UI finishes and redirects without waiting for SMTP
        Response::sendAndFinish(['order' => $orderForResponse, 'payment' => $payment], 'Order placed successfully.', 201);

        // Send order placed notification (and invoice if prepaid) in background
        try {
            Mailer::sendOrderPlaced($full, $payment);
            if ($payment && ($payment['status'] ?? '') === 'Paid') {
                Mailer::sendOrderPaid($full, $payment);
            }
        } catch (Throwable $mailEx) {
            error_log('[OrderController Email Error] ' . $mailEx->getMessage());
        }
        exit;
    }

    public static function updateStatus(array $params): void
    {
        Auth::requireAdmin();
        $id = $params['id'] ?? '';
        $body = request_json();
        $status = $body['status'] ?? '';
        $allowed = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Refunded'];
        if (!in_array($status, $allowed, true)) {
            Response::validation(['status' => 'Invalid order status.']);
        }

        $stmt = db()->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found.', 404);
        }

        $prev = $order['status'];
        $timeline = json_decode($order['timeline_json'] ?? '[]', true) ?: [];
        $at = time() * 1000;
        $timeline[] = [
            'at' => $at,
            'label' => "Status → {$status}",
            'note' => $body['note'] ?? null,
        ];

        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE orders SET status = ?, timeline_json = ? WHERE id = ?')
                ->execute([$status, json_encode($timeline, JSON_UNESCAPED_UNICODE), $id]);

            // Restock on cancel/return/refund from sellable states
            if (in_array($status, ['Cancelled', 'Returned', 'Refunded'], true) && !in_array($prev, ['Cancelled', 'Returned', 'Refunded'], true)) {
                $lines = $pdo->prepare('SELECT variant_id, qty FROM order_lines WHERE order_id = ?');
                $lines->execute([$id]);
                $upd = $pdo->prepare('UPDATE variants SET stock = stock + ? WHERE id = ?');
                foreach ($lines->fetchAll() as $l) {
                    $upd->execute([(int) $l['qty'], $l['variant_id']]);
                }
            }

            if ($status === 'Refunded') {
                $payStmt = $pdo->prepare('SELECT * FROM payments WHERE order_id = ? LIMIT 1');
                $payStmt->execute([$id]);
                $payRow = $payStmt->fetch();
                if ($payRow && $payRow['status'] !== 'Refunded') {
                    $pdo->prepare("UPDATE payments SET status = 'Refunded' WHERE id = ?")->execute([$payRow['id']]);
                }
            }

            if ($status === 'Shipped') {
                $carrier = $body['carrier'] ?? 'Delhivery';
                $awb = $body['awb'] ?? ('AWB' . random_int(100000000, 999999999));
                $checkpoints = [
                    ['at' => $at - 86400000, 'label' => 'Order placed', 'city' => '—'],
                    ['at' => $at - 43200000, 'label' => 'Packed at warehouse', 'city' => 'Ahmedabad'],
                    ['at' => $at, 'label' => 'Shipped', 'city' => 'Ahmedabad'],
                ];
                $exists = $pdo->prepare('SELECT id FROM shipments WHERE order_id = ?');
                $exists->execute([$id]);
                if ($exists->fetch()) {
                    $pdo->prepare(
                        'UPDATE shipments SET carrier=?, awb=?, status=?, shipped_at=FROM_UNIXTIME(?), checkpoints_json=? WHERE order_id=?'
                    )->execute([$carrier, $awb, 'In transit', (int) floor($at / 1000), json_encode($checkpoints), $id]);
                } else {
                    $pdo->prepare(
                        'INSERT INTO shipments (id, order_id, carrier, awb, status, shipped_at, checkpoints_json)
                         VALUES (?,?,?,?,?,FROM_UNIXTIME(?),?)'
                    )->execute(['SHP-' . $id, $id, $carrier, $awb, 'In transit', (int) floor($at / 1000), json_encode($checkpoints)]);
                }
            }

            if ($status === 'Delivered') {
                $pdo->prepare(
                    'UPDATE shipments SET status=?, delivered_at=FROM_UNIXTIME(?) WHERE order_id=?'
                )->execute(['Delivered', (int) floor($at / 1000), $id]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log($e->getMessage());
            Response::error('Unable to update order status.', 500);
        }

        $full = self::loadFull($id);
        $shipment = $full['_shipment'] ?? null;

        // Send status change emails for Shipped, Delivered, Cancelled, and Refunded
        try {
            if ($status === 'Shipped' && $prev !== 'Shipped') {
                Mailer::sendOrderShipped($full, $shipment);
            } elseif ($status === 'Delivered' && $prev !== 'Delivered') {
                Mailer::sendOrderDelivered($full, $shipment);
            } elseif ($status === 'Cancelled' && $prev !== 'Cancelled') {
                $reason = !empty($body['note']) ? trim((string) $body['note']) : (!empty($body['reason']) ? trim((string) $body['reason']) : 'Cancelled by administrator');
                Mailer::sendOrderCancelled($full, $reason);
            } elseif ($status === 'Refunded' && $prev !== 'Refunded') {
                $pay = $full['_payment'] ?? null;
                $lastRefund = !empty($full['_refunds'][0]) ? $full['_refunds'][0] : null;
                Mailer::sendRefundProcessed($full, $lastRefund, $pay);
            }
        } catch (Throwable $mailEx) {
            error_log('[OrderController Email Error] ' . $mailEx->getMessage());
        }

        Response::ok(['order' => $full], 'Order status updated successfully.');
    }

    public static function updateOrder($paramsOrId): void
    {
        Auth::requireAdmin();
        $id = is_array($paramsOrId) ? ($paramsOrId['id'] ?? '') : (string) $paramsOrId;
        if (!$id) {
            Response::error('Order ID is required.', 400);
        }

        $stmt = db()->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found.', 404);
        }

        $body = request_json();
        $lines = $body['lines'] ?? null;
        if (!is_array($lines) || count($lines) === 0) {
            Response::validation(['lines' => 'Order must contain at least 1 item.']);
        }

        // Recalculate stock adjustments: revert old lines stock, deduct new lines stock
        $oldLinesStmt = db()->prepare('SELECT variant_id, qty FROM order_lines WHERE order_id = ?');
        $oldLinesStmt->execute([$id]);
        $oldLines = $oldLinesStmt->fetchAll();

        $subtotal = 0;
        $resolvedLines = [];
        foreach ($lines as $l) {
            $handle = $l['productHandle'] ?? $l['handle'] ?? '';
            $size = $l['size'] ?? 'One size';
            $qty = max(1, (int) ($l['qty'] ?? 1));
            
            $vStmt = db()->prepare('SELECT * FROM variants WHERE product_handle = ? AND size = ? LIMIT 1');
            $vStmt->execute([$handle, $size]);
            $variant = $vStmt->fetch();
            if (!$variant) {
                $vStmt = db()->prepare('SELECT * FROM variants WHERE product_handle = ? LIMIT 1');
                $vStmt->execute([$handle]);
                $variant = $vStmt->fetch();
            }
            if (!$variant && !empty($l['variantId'])) {
                $vStmt = db()->prepare('SELECT * FROM variants WHERE id = ? LIMIT 1');
                $vStmt->execute([$l['variantId']]);
                $variant = $vStmt->fetch();
            }
            if (!$variant) {
                Response::validation(['lines' => "Variant not found for {$handle}."]);
            }

            $pStmt = db()->prepare('SELECT title, payload FROM products WHERE handle = ?');
            $pStmt->execute([$variant['product_handle']]);
            $prod = $pStmt->fetch();
            $payload = json_decode($prod['payload'] ?? '{}', true) ?: [];
            
            $price = isset($l['price']) ? (int) $l['price'] : (int) $variant['price'];
            $subtotal += $price * $qty;
            $customNote = !empty($l['customNote']) ? trim((string) $l['customNote']) : (!empty($l['custom_note']) ? trim((string) $l['custom_note']) : null);

            $resolvedLines[] = [
                'variant' => $variant,
                'title' => $prod['title'] ?? $l['title'] ?? 'Product',
                'image' => $l['image'] ?? ($payload['images'][0] ?? null),
                'size' => $variant['size'] ?? $size,
                'color' => $variant['color'] ?? $l['color'] ?? 'Default',
                'sku' => $variant['sku'] ?? $l['sku'] ?? '',
                'price' => $price,
                'qty' => $qty,
                'handle' => $variant['product_handle'] ?? $handle,
                'custom_note' => $customNote ?: null,
            ];
        }

        // Shipping calculation
        $shippingFlat = 49;
        $freeAt = 999;
        $content = db()->query("SELECT value FROM content_blocks WHERE `key`='storefront' LIMIT 1")->fetch();
        if ($content) {
            $c = json_decode($content['value'], true);
            $shippingFlat = (int) ($c['site']['shippingFlat'] ?? 49);
            $freeAt = (int) ($c['site']['freeShippingAt'] ?? 999);
        }
        $shipping = $subtotal >= $freeAt ? 0 : $shippingFlat;

        // Coupon calculation
        $discount = 0;
        $couponCode = null;
        $reqCoupon = isset($body['coupon']) ? trim((string) $body['coupon']) : trim((string) ($order['coupon'] ?? ''));
        if ($reqCoupon !== '') {
            $cStmt = db()->prepare('SELECT * FROM coupons WHERE code = ? LIMIT 1');
            $cStmt->execute([strtoupper($reqCoupon)]);
            $coupon = $cStmt->fetch();
            if ($coupon && (int) $coupon['active'] === 1 && $subtotal >= (int) $coupon['min_cart']) {
                $couponCode = $coupon['code'];
                $discount = $coupon['type'] === 'percent'
                    ? (int) round($subtotal * ((int) $coupon['value']) / 100)
                    : min($subtotal, (int) $coupon['value']);
            }
        }

        $total = max(0, $subtotal + $shipping - $discount);

        // Address & customer fields
        $address = isset($body['address']) && is_array($body['address'])
            ? $body['address']
            : (json_decode($order['address_json'] ?? '{}', true) ?: []);
        
        $customerName = trim((string) ($body['customerName'] ?? $address['name'] ?? $order['customer_name']));
        $customerEmail = trim((string) ($body['email'] ?? $address['email'] ?? $order['email']));
        $customerPhone = trim((string) ($body['phone'] ?? $address['phone'] ?? $order['phone']));

        $timeline = json_decode($order['timeline_json'] ?? '[]', true) ?: [];
        $timeline[] = [
            'at' => time() * 1000,
            'label' => 'Order edited by admin',
            'note' => "Total updated to ₹" . number_format($total) . " (" . count($resolvedLines) . " items)",
        ];

        $pdo = db();
        $pdo->beginTransaction();
        try {
            // Restore previous stock
            $stockRestore = $pdo->prepare('UPDATE variants SET stock = stock + ? WHERE id = ?');
            foreach ($oldLines as $ol) {
                $stockRestore->execute([(int) $ol['qty'], $ol['variant_id']]);
            }

            // Delete old lines
            $pdo->prepare('DELETE FROM order_lines WHERE order_id = ?')->execute([$id]);

            // Insert new lines and deduct stock
            $lineIns = $pdo->prepare(
                'INSERT INTO order_lines (order_id, variant_id, product_handle, title, image, size, color, sku, price, qty, custom_note)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)'
            );
            $stockDeduct = $pdo->prepare('UPDATE variants SET stock = stock - ? WHERE id = ?');
            foreach ($resolvedLines as $rl) {
                $lineIns->execute([
                    $id,
                    $rl['variant']['id'],
                    $rl['handle'],
                    $rl['title'],
                    $rl['image'],
                    $rl['size'],
                    $rl['color'],
                    $rl['sku'],
                    $rl['price'],
                    $rl['qty'],
                    $rl['custom_note'],
                ]);
                $stockDeduct->execute([$rl['qty'], $rl['variant']['id']]);
            }

            // Update order record
            $pdo->prepare(
                'UPDATE orders SET 
                    customer_name = ?, email = ?, phone = ?, 
                    subtotal = ?, shipping = ?, discount = ?, coupon = ?, total = ?, 
                    address_json = ?, timeline_json = ? 
                 WHERE id = ?'
            )->execute([
                $customerName,
                $customerEmail,
                $customerPhone,
                $subtotal,
                $shipping,
                $discount,
                $couponCode,
                $total,
                json_encode($address, JSON_UNESCAPED_UNICODE),
                json_encode($timeline, JSON_UNESCAPED_UNICODE),
                $id,
            ]);

            // Update payment amount if exists
            $pdo->prepare('UPDATE payments SET amount = ? WHERE order_id = ?')->execute([$total, $id]);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log('Order edit error: ' . $e->getMessage());
            Response::error('Failed to update order details.', 500);
        }

        $full = self::loadFull($id);
        $payment = $full['_payment'] ?? null;
        $shipment = $full['_shipment'] ?? null;
        $refunds = $full['_refunds'] ?? [];
        unset($full['_payment'], $full['_shipment'], $full['_refunds']);

        Response::ok([
            'order' => $full,
            'payment' => $payment,
            'shipment' => $shipment,
            'refunds' => $refunds,
        ], 'Order updated successfully.');
    }

    private static function ensureDeliveryDateColumn(): void
    {
        try {
            $cols = db()->query("SHOW COLUMNS FROM orders LIKE 'delivery_date'")->fetchAll();
            if (empty($cols)) {
                db()->exec("ALTER TABLE orders ADD COLUMN delivery_date DATE NULL DEFAULT NULL AFTER status");
            }
        } catch (Throwable $e) {
            // ignored if already exists
        }
    }

    public static function updateDeliveryDate(array $params): void
    {
        Auth::requireAdmin();
        $id = $params['id'] ?? '';
        $body = request_json();
        $rawDate = trim((string) ($body['deliveryDate'] ?? $body['delivery_date'] ?? ''));
        $deliveryDate = $rawDate !== '' ? $rawDate : null;

        self::ensureDeliveryDateColumn();

        $stmt = db()->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found.', 404);
        }

        $timeline = json_decode($order['timeline_json'] ?? '[]', true) ?: [];
        $at = time() * 1000;
        $label = $deliveryDate ? ('Delivery Date Set: ' . date('d M Y', strtotime($deliveryDate))) : 'Delivery Date Cleared';
        $timeline[] = [
            'at' => $at,
            'label' => $label,
            'note' => $body['note'] ?? 'Updated from Admin Dashboard',
        ];

        db()->prepare('UPDATE orders SET delivery_date = ?, timeline_json = ? WHERE id = ?')
            ->execute([$deliveryDate, json_encode($timeline, JSON_UNESCAPED_UNICODE), $id]);

        Response::ok(['order' => self::loadFull($id)], 'Delivery date updated successfully.');
    }

    public static function addNote(array $params): void
    {
        Auth::requireAdmin();
        $id = $params['id'] ?? '';
        $body = request_json();
        $note = trim((string) ($body['note'] ?? ''));
        if ($note === '') {
            Response::validation(['note' => 'Note is required.']);
        }
        $stmt = db()->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found.', 404);
        }
        $timeline = json_decode($order['timeline_json'] ?? '[]', true) ?: [];
        $timeline[] = ['at' => time() * 1000, 'label' => 'Note', 'note' => $note];
        db()->prepare('UPDATE orders SET timeline_json = ? WHERE id = ?')
            ->execute([json_encode($timeline, JSON_UNESCAPED_UNICODE), $id]);
        Response::ok(['order' => self::loadFull($id)], 'Note added.');
    }

    public static function cancel(array $params): void
    {
        $id = $params['id'] ?? '';
        if (!$id) {
            Response::error('Order ID is required.', 400);
        }

        $user = Auth::requireUser();
        $stmt = db()->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found.', 404);
        }

        $admin = in_array($user['role'] ?? '', ['Staff', 'Manager', 'Admin'], true);
        if (!$admin && $order['user_id'] !== $user['id']) {
            Response::error('Order not found.', 404);
        }

        $nonCancellable = ['Shipped', 'Delivered', 'Cancelled', 'Returned'];
        if (in_array($order['status'], $nonCancellable, true)) {
            Response::error("Order cannot be cancelled because it is already {$order['status']}.", 400);
        }

        $body = request_json();
        $reason = trim((string) ($body['reason'] ?? ''));
        if (!$reason) {
            $reason = 'Cancelled by customer';
        }

        $payStmt = db()->prepare('SELECT * FROM payments WHERE order_id = ? LIMIT 1');
        $payStmt->execute([$id]);
        $payment = $payStmt->fetch();

        $isPrepaid = false;
        if ($payment) {
            $pMethod = strtoupper(trim((string) ($payment['method'] ?? '')));
            $pStatus = $payment['status'] ?? '';
            if ($pStatus === 'Paid' || ($pMethod !== 'COD' && $pMethod !== 'CASH ON DELIVERY')) {
                $isPrepaid = true;
            }
        }

        $pdo = db();
        $pdo->beginTransaction();
        try {
            $timeline = json_decode($order['timeline_json'] ?? '[]', true) ?: [];
            $at = time() * 1000;
            
            $timelineNote = $reason;
            if ($isPrepaid) {
                $timelineNote .= " (Prepaid: Refund of ₹" . $order['total'] . " requested, awaiting admin approval).";
            } else {
                $timelineNote .= " (Cash on delivery cancelled).";
            }

            $timeline[] = [
                'at' => $at,
                'label' => 'Order Cancelled',
                'note' => $timelineNote,
            ];

            // Update order status to Cancelled
            $pdo->prepare('UPDATE orders SET status = ?, timeline_json = ? WHERE id = ?')
                ->execute(['Cancelled', json_encode($timeline, JSON_UNESCAPED_UNICODE), $id]);

            // Restock items
            $lines = $pdo->prepare('SELECT variant_id, qty FROM order_lines WHERE order_id = ?');
            $lines->execute([$id]);
            $upd = $pdo->prepare('UPDATE variants SET stock = stock + ? WHERE id = ?');
            foreach ($lines->fetchAll() as $l) {
                $upd->execute([(int) $l['qty'], $l['variant_id']]);
            }

            // If Prepaid, create a pending Refund record requiring Admin approval
            if ($isPrepaid) {
                $refCheck = $pdo->prepare("SELECT id FROM refunds WHERE order_id = ? LIMIT 1");
                $refCheck->execute([$id]);
                if (!$refCheck->fetch()) {
                    $refId = 'RF-' . $id . '-' . substr(bin2hex(random_bytes(2)), 0, 4);
                    $pdo->prepare(
                        'INSERT INTO refunds (id, order_id, amount, reason, status, created_at)
                         VALUES (?,?,?,?,?,NOW())'
                    )->execute([
                        $refId,
                        $id,
                        (int) $order['total'],
                        'Order cancellation: ' . $reason,
                        'Pending', // Pending admin approval
                    ]);
                }
                if ($payment) {
                    $pdo->prepare("UPDATE payments SET status = 'Refund Pending' WHERE id = ?")->execute([$payment['id']]);
                }
            } else {
                if ($payment) {
                    $pdo->prepare("UPDATE payments SET status = 'Failed' WHERE id = ?")->execute([$payment['id']]);
                }
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log('Order cancel error: ' . $e->getMessage());
            Response::error('Failed to cancel order.', 500);
        }

        $full = self::loadFull($id);
        $payment = $full['_payment'] ?? null;
        $refunds = $full['_refunds'] ?? [];
        unset($full['_payment'], $full['_shipment'], $full['_refunds']);

        $msg = $isPrepaid 
            ? 'Order cancelled. Your refund of ₹' . number_format($full['total']) . ' has been submitted for admin approval.'
            : 'Order cancelled successfully.';

        Response::sendAndFinish([
            'order' => $full,
            'payment' => $payment,
            'refunds' => $refunds,
            'isPrepaid' => $isPrepaid,
        ], $msg);

        // Send order cancelled email
        try {
            Mailer::sendOrderCancelled($full, $reason);
        } catch (Throwable $mailEx) {
            error_log('[Order Cancel Email Error] ' . $mailEx->getMessage());
        }
    }

    public static function delete($paramsOrId): void
    {
        Auth::requireAdmin();
        $id = is_array($paramsOrId) ? ($paramsOrId['id'] ?? '') : (string) $paramsOrId;
        if (!$id) {
            Response::error('Order ID is required.', 400);
        }

        $stmt = db()->prepare('UPDATE orders SET deleted_at = NOW() WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            Response::error('Order not found.', 404);
        }

        Response::ok(['id' => $id], 'Order archived successfully.');
    }

    public static function restore($paramsOrId): void
    {
        Auth::requireAdmin();
        $id = is_array($paramsOrId) ? ($paramsOrId['id'] ?? '') : (string) $paramsOrId;
        if (!$id) {
            Response::error('Order ID is required.', 400);
        }

        $stmt = db()->prepare('UPDATE orders SET deleted_at = NULL WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            Response::error('Order not found.', 404);
        }

        $full = self::loadFull($id);
        Response::ok(['order' => $full], 'Order restored successfully.');
    }
}
