<?php

class Router
{
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler, bool $auth = false): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
            'auth' => $auth,
        ];
    }

    public function get(string $pattern, callable $handler, bool $auth = false): void
    {
        $this->add('GET', $pattern, $handler, $auth);
    }

    public function post(string $pattern, callable $handler, bool $auth = false): void
    {
        $this->add('POST', $pattern, $handler, $auth);
    }

    public function put(string $pattern, callable $handler, bool $auth = false): void
    {
        $this->add('PUT', $pattern, $handler, $auth);
    }

    public function patch(string $pattern, callable $handler, bool $auth = false): void
    {
        $this->add('PATCH', $pattern, $handler, $auth);
    }

    public function delete(string $pattern, callable $handler, bool $auth = false): void
    {
        $this->add('DELETE', $pattern, $handler, $auth);
    }

    public function dispatch(string $method, string $path): void
    {
        $method = strtoupper($method);
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            $regex = '#^' . preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $route['pattern']) . '$#';
            if (!preg_match($regex, $path, $matches)) {
                continue;
            }
            $params = array_filter(
                $matches,
                fn($k) => !is_int($k),
                ARRAY_FILTER_USE_KEY
            );
            if ($route['auth']) {
                Auth::requireAdmin();
            }
            ($route['handler'])($params);
            return;
        }
        Response::error('Endpoint not found.', 404);
    }
}

function request_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        Response::error('Invalid JSON body.', 400);
    }
    return $data;
}

function request_method(): string
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'POST') {
        $override = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '';
        if ($override) {
            return strtoupper($override);
        }
    }
    return strtoupper($method);
}

function apply_cors(): void
{
    $c = app_config();
    $origins = array_map('trim', explode(',', $c['cors_origins'] ?? ''));
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    $isAllowed = false;
    if ($origin) {
        if (in_array($origin, $origins, true) || preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#i', $origin)) {
            $isAllowed = true;
        }
    }

    if ($isAllowed && $origin) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
    } else {
        header('Access-Control-Allow-Origin: *');
    }
    
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-HTTP-Method-Override, Accept, Origin, X-Requested-With');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 86400');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
