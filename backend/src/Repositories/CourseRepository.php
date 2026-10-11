<?php
declare(strict_types=1);

final class CourseRepository
{
    public function __construct(private PDO $pdo) {}

    public function all(): array
    {
        return $this->mapMany($this->pdo->query('SELECT id, code, name, term, is_active FROM courses ORDER BY name')->fetchAll());
    }

    public function forUser(int $userId): array
    {
        $statement = $this->pdo->prepare('SELECT c.id, c.code, c.name, c.term, c.is_active FROM courses c JOIN user_courses uc ON uc.course_id=c.id WHERE uc.user_id=? ORDER BY c.name');
        $statement->execute([$userId]);
        return $this->mapMany($statement->fetchAll());
    }

    public function find(int $id): ?Course
    {
        $statement = $this->pdo->prepare('SELECT id, code, name, term, is_active FROM courses WHERE id=?');
        $statement->execute([$id]);
        $row = $statement->fetch();
        return $row ? $this->map($row) : null;
    }

    private function mapMany(array $rows): array { return array_map(fn(array $row): Course => $this->map($row), $rows); }
    private function map(array $row): Course { return new Course((int) $row['id'], (string) $row['code'], (string) $row['name'], (string) $row['term'], (bool) $row['is_active']); }
}
