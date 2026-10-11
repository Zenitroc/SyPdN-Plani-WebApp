<?php
declare(strict_types=1);

final class DashboardRepository
{
    public function __construct(private PDO $pdo) {}

    public function assignments(int $courseId, string $term): array
    {
        $sql = 'SELECT id, course_id, term, type, number, topic, due_date, name, returned, created_at FROM assignments WHERE course_id=?';
        $params = [$courseId];
        if (in_array($term, ['1', '2'], true)) { $sql .= ' AND term=?'; $params[] = (int) $term; }
        $sql .= " ORDER BY term, FIELD(type,'TP','TPC','TPR'), number, due_date";
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll();
    }

    public function groups(int $courseId): array
    {
        $statement = $this->pdo->prepare('SELECT id, number, name FROM groups WHERE course_id=? ORDER BY number');
        $statement->execute([$courseId]);
        return $statement->fetchAll();
    }

    public function assignmentGrades(array $assignmentIds): array
    {
        if ($assignmentIds === []) return [];
        $placeholders = implode(',', array_fill(0, count($assignmentIds), '?'));
        $statement = $this->pdo->prepare("SELECT assignment_id, group_id, grade_code FROM assignment_grades WHERE assignment_id IN ($placeholders)");
        $statement->execute($assignmentIds);
        return $statement->fetchAll();
    }

    public function students(int $courseId): array
    {
        $statement = $this->pdo->prepare('SELECT e.id AS enrollment_id, e.status, p.last_name AS apellido, p.first_name AS nombre, g.number AS group_no FROM enrollments e JOIN people p ON p.id=e.person_id LEFT JOIN groups g ON g.id=e.group_id WHERE e.course_id=? ORDER BY e.course_student_id');
        $statement->execute([$courseId]);
        return $statement->fetchAll();
    }

    public function partialGrades(int $courseId): array
    {
        $statement = $this->pdo->prepare('SELECT enrollment_id, partial_no, topic, attempt, grade_code FROM partial_grades WHERE course_id=?');
        $statement->execute([$courseId]);
        return $statement->fetchAll();
    }

    public function gradeOptions(): array
    {
        return $this->pdo->query('SELECT code FROM grade_lookup ORDER BY ordinal')->fetchAll(PDO::FETCH_COLUMN);
    }
}
