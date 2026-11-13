<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/ImageStore.php';
require_once __DIR__ . '/../lib/Response.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Validator.php';
require_once __DIR__ . '/../lib/Router.php';

class AuthController
{
    public static function login(): void
    {
        $body = request_json();
        $errors = Validator::requireFields($body, ['email', 'password']);
        $emailErr = Validator::email((string) ($body['email'] ?? ''));
        if ($emailErr) {
            $errors['email'] = $emailErr;
        }
        if ($errors) {
            Response::validation($errors);
        }

        $email = strtolower(trim($body['email']));
        $stmt = db()->prepare(
            "SELECT * FROM users WHERE email = ? AND role IN ('Staff','Manager','Admin') LIMIT 1"
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || empty($user['password_hash']) || !password_verify((string) $body['password'], $user['password_hash'])) {
            Response::error('Invalid email or password.', 401);
        }
        if ($user['status'] === 'Blocked') {
            Response::error('This account is blocked.', 403);
        }

        $token = Auth::issueToken($user['id']);
        Response::ok([
            'token' => $token['token'],
            'expiresAt' => $token['expires_at'],
            'user' => Auth::publicUser($user),
        ], 'Signed in successfully.');
    }

    public static function logout(): void
    {
        Auth::requireAdmin();
        Auth::revokeToken();
        Response::ok(null, 'Signed out successfully.');
    }

    public static function me(): void
    {
        $user = Auth::requireAdmin();
        Response::ok(['user' => Auth::publicUser($user)]);
    }

    public static function updateProfile(): void
    {
        $user = Auth::requireAdmin();
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

        Response::ok(['user' => Auth::publicUser($updated)], 'Profile updated successfully.');
    }

    public static function changePassword(): void
    {
        $user = Auth::requireAdmin();
        $body = request_json();
        $errors = Validator::requireFields($body, ['currentPassword', 'newPassword']);
        if ($errors) Response::validation($errors);

        $stmt = db()->prepare("SELECT password_hash FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch();

        if (empty($row['password_hash']) || !password_verify((string) $body['currentPassword'], $row['password_hash'])) {
            Response::error('Current password is incorrect.', 422);
        }

        if (strlen((string) $body['newPassword']) < 6) {
            Response::error('New password must be at least 6 characters.', 422);
        }

        $newHash = password_hash((string) $body['newPassword'], PASSWORD_DEFAULT);
        $up = db()->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?");
        $up->execute([$newHash, $user['id']]);

        Response::ok(null, 'Password updated successfully.');
    }
}
