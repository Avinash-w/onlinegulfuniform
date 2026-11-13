<?php

/**
 * Extend Auth for customers + staff (shared token table).
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Response.php';

class Auth
{
    public static function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';
        if (!$header && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $k => $v) {
                if (strtolower($k) === 'authorization') {
                    $header = $v;
                    break;
                }
            }
        }
        if (preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
            return $m[1];
        }

        // Check for session/auth token in cookie
        if (!empty($_COOKIE['evaranest_token'])) {
            return (string) $_COOKIE['evaranest_token'];
        }
        if (!empty($_COOKIE['evaranest_admin_token'])) {
            return (string) $_COOKIE['evaranest_admin_token'];
        }
        if (!empty($_COOKIE['evaranest_customer_token'])) {
            return (string) $_COOKIE['evaranest_customer_token'];
        }

        return null;
    }

    public static function setAuthCookie(string $token, int $ttl = 604800, string $cookieName = 'evaranest_token'): void
    {
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 80) == 443;
        setcookie($cookieName, $token, [
            'expires' => time() + $ttl,
            'path' => '/',
            'httponly' => false, // Accessible for client-side API headers if needed
            'secure' => $secure,
            'samesite' => 'Lax',
        ]);
    }

    public static function clearAuthCookie(string $cookieName = 'evaranest_token'): void
    {
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 80) == 443;
        setcookie($cookieName, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => false,
            'secure' => $secure,
            'samesite' => 'Lax',
        ]);
        setcookie('evaranest_admin_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => false,
            'secure' => $secure,
            'samesite' => 'Lax',
        ]);
        setcookie('evaranest_customer_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => false,
            'secure' => $secure,
            'samesite' => 'Lax',
        ]);
    }

    public static function user(): ?array
    {
        $token = self::bearerToken();
        if (!$token) {
            return null;
        }

        $stmt = db()->prepare(
            'SELECT u.*, t.token, t.expires_at AS token_expires_at
             FROM admin_tokens t
             INNER JOIN users u ON u.id = t.user_id
             WHERE t.token = ? AND t.expires_at > NOW()
             LIMIT 1'
        );
        $stmt->execute([$token]);
        $row = $stmt->fetch();
        if (!$row || $row['status'] === 'Blocked') {
            return null;
        }

        unset($row['password_hash'], $row['token'], $row['token_expires_at']);
        return $row;
    }

    public static function requireUser(): array
    {
        $user = self::user();
        if (!$user) {
            Response::error('Authentication required.', 401);
        }
        return $user;
    }

    public static function requireAdmin(): array
    {
        $user = self::requireUser();
        if (!in_array($user['role'], ['Staff', 'Manager', 'Admin'], true)) {
            Response::error('Admin access required.', 403);
        }
        return $user;
    }

    public static function requireCustomer(): array
    {
        return self::requireUser();
    }

    public static function issueToken(string $userId): array
    {
        $c = app_config();
        $token = bin2hex(random_bytes(32));
        $ttl = (int) ($c['token_ttl'] ?? 604800);
        $expires = (new DateTimeImmutable("+{$ttl} seconds"))->format('Y-m-d H:i:s');

        $stmt = db()->prepare(
            'INSERT INTO admin_tokens (token, user_id, expires_at, created_at) VALUES (?, ?, ?, NOW())'
        );
        $stmt->execute([$token, $userId, $expires]);

        self::setAuthCookie($token, $ttl);

        return ['token' => $token, 'expires_at' => $expires];
    }

    public static function revokeToken(?string $token = null): void
    {
        $token = $token ?? self::bearerToken();
        if ($token) {
            $stmt = db()->prepare('DELETE FROM admin_tokens WHERE token = ?');
            $stmt->execute([$token]);
        }
        self::clearAuthCookie();
    }

    public static function publicUser(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'avatar' => $row['avatar'] ?? '',
            'role' => $row['role'],
            'status' => $row['status'],
            'createdAt' => isset($row['created_at'])
                ? (strtotime($row['created_at']) * 1000)
                : null,
            'notes' => $row['notes'] ?? '',
        ];
    }

    public static function loadAddresses(string $userId): array
    {
        try {
            $stmt = db()->prepare(
                'SELECT * FROM customer_addresses 
                 WHERE user_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) 
                 ORDER BY is_default DESC, created_at ASC'
            );
            $stmt->execute([$userId]);
            $out = [];
            foreach ($stmt->fetchAll() as $a) {
                $out[] = [
                    'id' => $a['id'],
                    'label' => $a['label'] ?? 'Home',
                    'isDefault' => (bool) ($a['is_default'] ?? 0),
                    'name' => $a['recipient_name'] ?? ($a['name'] ?? ''),
                    'recipientName' => $a['recipient_name'] ?? ($a['name'] ?? ''),
                    'phone' => $a['phone'] ?? '',
                    'recipientPhone' => $a['phone'] ?? '',
                    'email' => $a['email'] ?? '',
                    'line1' => $a['line1'] ?? '',
                    'line2' => $a['line2'] ?? '',
                    'city' => $a['city'] ?? '',
                    'state' => $a['state'] ?? '',
                    'pin' => $a['pin'] ?? '',
                    'country' => $a['country'] ?? 'India',
                    'createdAt' => isset($a['created_at']) ? (strtotime($a['created_at']) * 1000) : null,
                    'updatedAt' => isset($a['updated_at']) ? (strtotime($a['updated_at']) * 1000) : null,
                ];
            }
            return $out;
        } catch (\Throwable $e) {
            return [];
        }
    }
}
