<?php

class Response
{
    public static function json($data = null, int $status = 200, ?string $message = null, $errors = null): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => $status >= 200 && $status < 300,
            'data' => $data,
            'message' => $message,
            'errors' => $errors,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function ok($data = null, ?string $message = null, int $status = 200): void
    {
        self::json($data, $status, $message, null);
    }

    public static function sendAndFinish($data = null, ?string $message = null, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        $json = json_encode([
            'success' => $status >= 200 && $status < 300,
            'data' => $data,
            'message' => $message,
            'errors' => null,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        header('Content-Length: ' . strlen($json));
        header('Connection: close');
        echo $json;

        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        } else {
            if (ob_get_level() > 0) {
                ob_end_flush();
            }
            flush();
        }
    }

    public static function error(string $message, int $status = 400, $errors = null): void
    {
        self::json(null, $status, $message, $errors);
    }

    public static function validation(array $errors, string $message = 'Validation failed'): void
    {
        self::json(null, 422, $message, $errors);
    }
}
