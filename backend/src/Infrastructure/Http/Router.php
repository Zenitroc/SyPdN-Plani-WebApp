<?php
declare(strict_types=1);

final class Router
{
    /** @var list<array{string, string, callable, bool}> */
    private array $routes = [];

    public function add(string $method, string $path, callable $handler, bool $public = false): void
    {
        $this->routes[] = [strtoupper($method), $path, $handler, $public];
    }

    public function dispatch(): void
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $path = '/' . ltrim($path, '/');

        foreach ($this->routes as [$routeMethod, $pattern, $handler, $public]) {
            $params = $this->match($pattern, $path);
            if ($routeMethod !== $method || $params === null) {
                continue;
            }
            if (!$public) {
                auth_require();
            }
            try {
                $handler($params);
            } catch (Throwable $exception) {
                json_error('Server error: ' . $exception->getMessage(), 500);
            }
            return;
        }
        json_error('Not found', 404);
    }

    /** @return array<string, string>|null */
    private function match(string $pattern, string $path): ?array
    {
        $names = [];
        $regex = preg_replace_callback('/\{([A-Za-z][A-Za-z0-9_]*)\}/', static function (array $match) use (&$names): string {
            $names[] = $match[1];
            return '([^/]+)';
        }, $pattern);
        if (!preg_match('#^' . $regex . '$#', $path, $values)) {
            return null;
        }
        $params = [];
        foreach ($names as $index => $name) {
            $params[$name] = urldecode($values[$index + 1]);
        }
        return $params;
    }
}
