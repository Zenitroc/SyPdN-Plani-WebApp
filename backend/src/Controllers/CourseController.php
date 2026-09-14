<?php
declare(strict_types=1);

final class CourseController
{
    public function __construct(private CourseService $service) {}

    public function register(): void
    {
        route('GET', '/api/courses', fn() => $this->index());
        route('GET', '/api/courses/{id}', fn(array $params) => $this->show($params));
    }

    private function index(): void
    {
        $courses = $this->service->listFor(auth_user(), (string) ($_GET['scope'] ?? 'mine'));
        json_ok(array_map(static fn(Course $course): array => $course->toArray(), $courses));
    }

    private function show(array $params): void
    {
        $id = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id || $id < 1) json_error('Identificador de curso inválido', 422);
        json_ok(['data' => $this->service->getFor(auth_user(), $id)->toArray()]);
    }
}
