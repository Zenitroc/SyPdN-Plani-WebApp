<?php
declare(strict_types=1);

final class DashboardController
{
    public function __construct(private DashboardService $service) {}

    public function register(): void
    {
        route('GET', '/api/dashboard', fn() => $this->show());
    }

    private function show(): void
    {
        $courseId = filter_input(INPUT_GET, 'course_id', FILTER_VALIDATE_INT);
        if (!$courseId || $courseId < 1) json_error('course_id requerido', 422);
        json_ok(['data' => $this->service->summary($courseId, $_GET)]);
    }
}
