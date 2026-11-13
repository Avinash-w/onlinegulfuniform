<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/ImageStore.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Validator.php';
require_once __DIR__ . '/../lib/Router.php';
require_once __DIR__ . '/../lib/Mailer.php';

class CustomerAuthController
{
    public static function requestOtp(): void
    {
        $body = request_json();
        $errors = Validator::requireFields($body, ['email']);
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        if ($err = Validator::email($email)) {
            $errors['email'] = $err;
        }
        if ($errors) {
            Response::validation($errors);
        }

        $stmt = db()->prepare("SELECT * FROM users WHERE LOWER(TRIM(email)) = ? AND role = 'Customer' LIMIT 1");
        $stmt->execute([$email]);
        $existing = $stmt->fetch();

        if ($existing && $existing['status'] === 'Blocked') {
            Response::error('This account has been suspended. Please contact support.', 403);
        }

        $requestedMode = $body['mode'] ?? '';
        $mode = $existing ? 'login' : ($requestedMode === 'signup' ? 'signup' : 'login');
        $code = (string) random_int(100000, 999999);

        db()->prepare('DELETE FROM otp_challenges WHERE LOWER(TRIM(email)) = ?')->execute([$email]);
        db()->prepare(
            'INSERT INTO otp_challenges (email, mode, code, expires_at, created_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW())'
        )->execute([$email, $mode, $code]);

        // Attempt sending OTP email via Gmail SMTP
        try {
            Mailer::sendOtp($email, $code, $existing ? 'login' : 'signup');
        } catch (Throwable $mailEx) {
            error_log('[CustomerAuthController OTP Email Error] ' . $mailEx->getMessage());
        }

        Response::ok([
            'email' => $email,
            'mode' => $mode,
            'isNewUser' => !$existing,
            'expiresIn' => 900,
        ], 'OTP sent successfully to your email.');
    }

    public static function verifyOtp(): void
    {
        $body = request_json();
        $errors = Validator::requireFields($body, ['email', 'code']);
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $code = trim((string) ($body['code'] ?? ''));
        if ($errors) {
            Response::validation($errors);
        }

        $stmt = db()->prepare(
            'SELECT * FROM otp_challenges WHERE LOWER(TRIM(email)) = ? AND (expires_at > NOW() OR created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)) ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$email]);
        $challenge = $stmt->fetch();

        if (!$challenge) {
            Response::error('OTP expired or not found. Please click "Resend OTP".', 400);
        }
        if ($challenge['code'] !== $code) {
            Response::error('Incorrect OTP code. Please check your email and try again.', 400);
        }

        $mode = $challenge['mode'] ?? ($body['mode'] ?? 'login');
        $validateOnly = !empty($body['validateOnly']);

        // If step 1 validation only (e.g. before collecting signup name)
        if ($validateOnly) {
            Response::ok([
                'valid' => true,
                'email' => $email,
                'mode' => $mode,
            ], 'OTP verified successfully.');
            return;
        }

        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            $parts = explode('@', $email);
            $name = ucwords(str_replace(['.', '_', '-'], ' ', $parts[0] ?? 'Customer'));
        }

        // Check if user already exists
        $checkStmt = db()->prepare("SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1");
        $checkStmt->execute([$email]);
        $existingUser = $checkStmt->fetch();

        if ($existingUser) {
            if ($existingUser['status'] === 'Blocked') {
                Response::error('This account has been blocked.', 403);
            }
            $user = $existingUser;
        } else {
            $id = 'u-' . bin2hex(random_bytes(4));
            db()->prepare(
                "INSERT INTO users (id, name, email, phone, role, password_hash, status, notes, created_at)
                 VALUES (?, ?, ?, '', 'Customer', NULL, 'Active', '', NOW())"
            )->execute([$id, $name, $email]);
            $userRow = db()->prepare('SELECT * FROM users WHERE id = ?');
            $userRow->execute([$id]);
            $user = $userRow->fetch();
        }

        if ($challenge) {
            db()->prepare('DELETE FROM otp_challenges WHERE id = ?')->execute([$challenge['id']]);
        }
        db()->prepare('DELETE FROM otp_challenges WHERE LOWER(TRIM(email)) = ?')->execute([$email]);

        $token = Auth::issueToken($user['id']);
        $addresses = Auth::loadAddresses($user['id']);

        Response::ok([
            'token' => $token['token'],
            'expiresAt' => $token['expires_at'],
            'user' => array_merge(Auth::publicUser($user), [
                'addresses' => $addresses,
                'address' => $addresses[0] ?? null,
            ]),
        ], $existingUser ? 'Signed in successfully.' : 'Account created & signed in successfully.');
    }

    public static function me(): void
    {
        $user = Auth::requireCustomer();
        $addresses = Auth::loadAddresses($user['id']);
        Response::ok([
            'user' => array_merge(Auth::publicUser($user), [
                'addresses' => $addresses,
                'address' => $addresses[0] ?? null,
            ]),
        ]);
    }

    public static function updateProfile(): void
    {
        $user = Auth::requireCustomer();
        $body = request_json();
        $errors = [];
        if (isset($body['email'])) {
            $emailErr = Validator::email((string) $body['email']);
            if ($emailErr) $errors['email'] = $emailErr;
        }
        if ($errors) Response::validation($errors);

        $name = isset($body['name']) ? trim((string) $body['name']) : $user['name'];
        $email = isset($body['email']) ? strtolower(trim((string) $body['email'])) : $user['email'];
        $phone = isset($body['phone']) ? trim((string) $body['phone']) : ($user['phone'] ?? '');
        $avatar = isset($body['avatar']) ? ImageStore::normalize(trim((string) $body['avatar']), 'avatar-' . $user['id']) : ($user['avatar'] ?? '');

        if ($email !== $user['email']) {
            $check = db()->prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1");
            $check->execute([$email, $user['id']]);
            if ($check->fetch()) {
                Response::error('Email is already in use by another user.', 422);
            }
        }

        try {
            db()->exec("ALTER TABLE users ADD COLUMN avatar LONGTEXT NULL AFTER phone");
        } catch (Throwable $e) {
            // Column already exists
        }

        $stmt = db()->prepare("UPDATE users SET name = ?, email = ?, phone = ?, avatar = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$name, $email, $phone, $avatar, $user['id']]);

        $stmt = db()->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$user['id']]);
        $updated = $stmt->fetch();
        $addresses = Auth::loadAddresses($user['id']);

        Response::ok([
            'user' => array_merge(Auth::publicUser($updated), [
                'addresses' => $addresses,
                'address' => $addresses[0] ?? null,
            ]),
        ], 'Profile updated successfully.');
    }

    public static function changePassword(): void
    {
        $user = Auth::requireCustomer();
        $body = request_json();
        $errors = Validator::requireFields($body, ['newPassword', 'confirmPassword']);
        if ($errors) {
            Response::validation($errors);
        }

        $newPassword = (string) $body['newPassword'];
        $confirmPassword = (string) $body['confirmPassword'];

        if (strlen($newPassword) < 6) {
            Response::validation(['newPassword' => 'Password must be at least 6 characters.']);
        }
        if ($newPassword !== $confirmPassword) {
            Response::validation(['confirmPassword' => 'Passwords do not match.']);
        }

        // Check current password if set
        $dbUser = db()->prepare("SELECT password_hash FROM users WHERE id = ? LIMIT 1");
        $dbUser->execute([$user['id']]);
        $row = $dbUser->fetch();
        if ($row && !empty($row['password_hash'])) {
            $current = (string) ($body['currentPassword'] ?? '');
            if (!$current || !password_verify($current, $row['password_hash'])) {
                Response::validation(['currentPassword' => 'Current password is incorrect.']);
            }
        }

        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = db()->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$hash, $user['id']]);

        Response::ok(null, 'Password updated successfully.');
    }

    public static function logout(): void
    {
        $token = Auth::bearerToken();
        if ($token) {
            Auth::revokeToken($token);
        }
        Response::ok(null, 'Signed out successfully.');
    }

    public static function ensureAddressSchema(): void
    {
        static $checked = false;
        if ($checked) return;
        $checked = true;

        try {
            $cols = [
                'recipient_name' => "ALTER TABLE customer_addresses ADD COLUMN recipient_name VARCHAR(160) NULL AFTER label",
                'phone' => "ALTER TABLE customer_addresses ADD COLUMN phone VARCHAR(40) NULL AFTER recipient_name",
                'email' => "ALTER TABLE customer_addresses ADD COLUMN email VARCHAR(190) NULL AFTER phone",
                'line2' => "ALTER TABLE customer_addresses ADD COLUMN line2 VARCHAR(255) NULL AFTER line1",
                'is_deleted' => "ALTER TABLE customer_addresses ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER country",
                'updated_at' => "ALTER TABLE customer_addresses ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
            ];
            
            $existing = [];
            $stmt = db()->query("SHOW COLUMNS FROM customer_addresses");
            foreach ($stmt->fetchAll() as $col) {
                $existing[$col['Field']] = true;
            }

            foreach ($cols as $colName => $sql) {
                if (!isset($existing[$colName])) {
                    try {
                        db()->exec($sql);
                    } catch (\Throwable $e) {
                        // ignore if exists
                    }
                }
            }
        } catch (\Throwable $e) {
            // table may not exist
        }
    }

    public static function addAddress(): void
    {
        self::ensureAddressSchema();
        $user = Auth::requireCustomer();
        $body = request_json();
        $errors = Validator::requireFields($body, ['line1', 'city', 'state', 'pin']);
        if ($errors) {
            Response::validation($errors);
        }

        $id = $body['id'] ?? ('addr-' . bin2hex(random_bytes(4)));
        $count = db()->prepare('SELECT COUNT(*) FROM customer_addresses WHERE user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)');
        $count->execute([$user['id']]);
        $isDefault = ((int) $count->fetchColumn() === 0) || !empty($body['isDefault']);

        if ($isDefault) {
            db()->prepare('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?')->execute([$user['id']]);
        }

        $stmt = db()->prepare(
            'INSERT INTO customer_addresses 
             (id, user_id, label, recipient_name, phone, email, is_default, line1, line2, city, state, pin, country, is_deleted, created_at, updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,NOW(),NOW())'
        );
        $stmt->execute([
            $id,
            $user['id'],
            trim((string) ($body['label'] ?? 'Home')) ?: 'Home',
            trim((string) ($body['name'] ?? ($body['recipientName'] ?? $user['name'] ?? ''))),
            trim((string) ($body['phone'] ?? ($body['recipientPhone'] ?? $user['phone'] ?? ''))),
            trim((string) ($body['email'] ?? $user['email'] ?? '')),
            $isDefault ? 1 : 0,
            trim((string) $body['line1']),
            trim((string) ($body['line2'] ?? '')),
            trim((string) $body['city']),
            trim((string) $body['state']),
            trim((string) $body['pin']),
            trim((string) ($body['country'] ?? 'India')) ?: 'India',
        ]);

        if (!empty($body['phone'])) {
            $phoneStmt = db()->prepare("UPDATE users SET phone = ? WHERE id = ? AND (phone IS NULL OR phone = '')");
            $phoneStmt->execute([trim((string) $body['phone']), $user['id']]);
        }

        $addresses = Auth::loadAddresses($user['id']);
        $defaultAddr = null;
        foreach ($addresses as $a) {
            if ($a['isDefault']) {
                $defaultAddr = $a;
                break;
            }
        }
        if (!$defaultAddr && !empty($addresses)) {
            $defaultAddr = $addresses[0];
        }

        Response::ok([
            'addresses' => $addresses,
            'user' => array_merge(Auth::publicUser($user), [
                'addresses' => $addresses,
                'address' => $defaultAddr,
            ]),
        ], 'Address saved successfully.', 201);
    }

    public static function updateAddress(array $params): void
    {
        self::ensureAddressSchema();
        $user = Auth::requireCustomer();
        $id = $params['id'] ?? '';
        if (!$id) {
            Response::error('Address ID required.', 400);
        }

        $body = request_json();
        $errors = Validator::requireFields($body, ['line1', 'city', 'state', 'pin']);
        if ($errors) {
            Response::validation($errors);
        }

        if (!empty($body['isDefault'])) {
            db()->prepare('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?')->execute([$user['id']]);
        }

        $stmt = db()->prepare(
            'UPDATE customer_addresses 
             SET label = ?, recipient_name = ?, phone = ?, email = ?, line1 = ?, line2 = ?, city = ?, state = ?, pin = ?, country = ?, 
                 is_default = CASE WHEN ? = 1 THEN 1 ELSE is_default END,
                 updated_at = NOW()
             WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([
            trim((string) ($body['label'] ?? 'Home')) ?: 'Home',
            trim((string) ($body['name'] ?? ($body['recipientName'] ?? ''))),
            trim((string) ($body['phone'] ?? ($body['recipientPhone'] ?? ''))),
            trim((string) ($body['email'] ?? '')),
            trim((string) $body['line1']),
            trim((string) ($body['line2'] ?? '')),
            trim((string) $body['city']),
            trim((string) $body['state']),
            trim((string) $body['pin']),
            trim((string) ($body['country'] ?? 'India')) ?: 'India',
            !empty($body['isDefault']) ? 1 : 0,
            $id,
            $user['id'],
        ]);

        $addresses = Auth::loadAddresses($user['id']);
        $defaultAddr = null;
        foreach ($addresses as $a) {
            if ($a['isDefault']) {
                $defaultAddr = $a;
                break;
            }
        }
        if (!$defaultAddr && !empty($addresses)) {
            $defaultAddr = $addresses[0];
        }

        Response::ok([
            'addresses' => $addresses,
            'user' => array_merge(Auth::publicUser($user), [
                'addresses' => $addresses,
                'address' => $defaultAddr,
            ]),
        ], 'Address updated successfully.');
    }

    public static function getAddresses(): void
    {
        $user = Auth::requireCustomer();
        Response::ok([
            'addresses' => Auth::loadAddresses($user['id']),
        ]);
    }

    public static function deleteAddress(array $params): void
    {
        self::ensureAddressSchema();
        $user = Auth::requireCustomer();
        $id = $params['id'] ?? '';
        if (!$id) {
            Response::error('Address ID required.', 400);
        }

        // Soft delete in database
        $stmt = db()->prepare('UPDATE customer_addresses SET is_deleted = 1, is_default = 0, updated_at = NOW() WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $user['id']]);

        $addrs = Auth::loadAddresses($user['id']);
        if (!empty($addrs)) {
            $hasDefault = false;
            foreach ($addrs as $a) {
                if ($a['isDefault']) {
                    $hasDefault = true;
                    break;
                }
            }
            if (!$hasDefault) {
                db()->prepare('UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)')->execute([$addrs[0]['id'], $user['id']]);
                $addrs = Auth::loadAddresses($user['id']);
            }
        }

        $defaultAddr = null;
        foreach ($addrs as $a) {
            if ($a['isDefault']) {
                $defaultAddr = $a;
                break;
            }
        }
        if (!$defaultAddr && !empty($addrs)) {
            $defaultAddr = $addrs[0];
        }

        Response::ok([
            'addresses' => $addrs,
            'user' => array_merge(Auth::publicUser($user), [
                'addresses' => $addrs,
                'address' => $defaultAddr,
            ]),
        ], 'Address deleted successfully.');
    }

    public static function setDefaultAddress(array $params): void
    {
        self::ensureAddressSchema();
        $user = Auth::requireCustomer();
        $id = $params['id'] ?? '';
        if (!$id) {
            Response::error('Address ID required.', 400);
        }

        db()->prepare('UPDATE customer_addresses SET is_default = 0, updated_at = NOW() WHERE user_id = ?')->execute([$user['id']]);
        db()->prepare('UPDATE customer_addresses SET is_default = 1, updated_at = NOW() WHERE id = ? AND user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)')->execute([$id, $user['id']]);

        $addresses = Auth::loadAddresses($user['id']);
        $defaultAddr = null;
        foreach ($addresses as $a) {
            if ($a['isDefault']) {
                $defaultAddr = $a;
                break;
            }
        }
        if (!$defaultAddr && !empty($addresses)) {
            $defaultAddr = $addresses[0];
        }

        Response::ok([
            'addresses' => $addresses,
            'user' => array_merge(Auth::publicUser($user), [
                'addresses' => $addresses,
                'address' => $defaultAddr,
            ]),
        ], 'Default address updated successfully.');
    }
}
