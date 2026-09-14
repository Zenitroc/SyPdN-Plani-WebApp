<?php
declare(strict_types=1);

final class CourseService
{
    public function __construct(private CourseRepository $courses) {}

    public function listFor(array $user, string $scope): array
    {
        if ($scope === 'all') {
            require_role($user, ['GURU']);
            return $this->courses->all();
        }
        return $this->courses->forUser((int) $user['id']);
    }

    public function getFor(array $user, int $courseId): Course
    {
        ensure_course_access($courseId);
        $course = $this->courses->find($courseId);
        if ($course === null) json_error('Curso no encontrado', 404);
        return $course;
    }
}
