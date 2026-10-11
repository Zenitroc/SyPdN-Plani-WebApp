<?php
declare(strict_types=1);

final class DashboardService
{
    private const FAILING_GRADES = AcademicCatalog::FAILING_GRADES;
    private const TOPICS = AcademicCatalog::PARTIAL_TOPICS;

    public function __construct(private DashboardRepository $repository) {}

    public function summary(int $courseId, array $filters): array
    {
        ensure_course_access($courseId);
        $term = in_array((string) ($filters['term'] ?? 'ALL'), ['1', '2'], true) ? (string) $filters['term'] : 'ALL';
        $topic = strtoupper((string) ($filters['topic'] ?? 'ALL'));
        $groupId = (int) ($filters['group_id'] ?? 0);
        $risk = max(0, min(100, (int) ($filters['risk'] ?? 60)));
        $termAssignments = $this->repository->assignments($courseId, $term);
        $assignments = array_values(array_filter($termAssignments, fn(array $item): bool => $topic === 'ALL' || $item['topic'] === $topic));
        $groups = $this->repository->groups($courseId);
        $selectedGroups = $groupId > 0 ? array_values(array_filter($groups, fn(array $group): bool => (int) $group['id'] === $groupId)) : $groups;
        $assignmentIds = array_map(fn(array $assignment): int => (int) $assignment['id'], $assignments);
        $grades = $this->indexAssignmentGrades($this->repository->assignmentGrades($assignmentIds));
        $students = $this->indexStudentGrades($this->repository->students($courseId), $this->repository->partialGrades($courseId));
        $topics = $this->filteredTopics($term, $topic);
        if ($groupId > 0) {
            $number = $selectedGroups[0]['number'] ?? null;
            $students = array_values(array_filter($students, fn(array $student): bool => (string) $student['group_no'] === (string) $number));
        }
        $groupPerformance = $this->groupPerformance($selectedGroups, $assignments, $grades);
        $partial = $this->partialStats($students, $topics);
        return [
            'filters' => ['groups' => $groups, 'topics' => array_values(array_unique(array_merge(AcademicCatalog::allTopics(), array_column($termAssignments, 'topic'))))],
            'tpStats' => $this->tpStats($selectedGroups, $assignments, $grades),
            'groupPerformance' => $groupPerformance,
            'topicStats' => $this->topicStats($selectedGroups, $assignments, $grades),
            'parcialStats' => $partial,
            'alerts' => $this->alerts($partial['detail'], $groupPerformance, $risk),
            'highlights' => $this->highlights($students, $topics, $this->repository->gradeOptions()),
            'upcoming' => $this->upcoming($assignments),
            'tpStatus' => $this->tpStatus($selectedGroups, $assignments, $grades),
            'tpHistory' => $this->history($selectedGroups, $assignments, $grades),
        ];
    }

    private function passed(?string $grade): bool { return $grade !== null && $grade !== '' && !in_array(strtoupper($grade), self::FAILING_GRADES, true); }
    private function percent(int $part, int $total): ?int { return $total > 0 ? (int) round($part * 100 / $total) : null; }
    private function filteredTopics(string $term, string $topic): array { $items = $term === 'ALL' ? array_merge(self::TOPICS[1], self::TOPICS[2]) : self::TOPICS[(int) $term]; return $topic === 'ALL' ? $items : array_values(array_filter($items, fn(string $item): bool => $item === $topic)); }
    private function indexAssignmentGrades(array $rows): array { $index = []; foreach ($rows as $row) $index[$row['assignment_id']][$row['group_id']] = $row['grade_code']; return $index; }
    private function indexStudentGrades(array $students, array $grades): array { $index = []; foreach ($grades as $grade) $index[$grade['enrollment_id']][(int) $grade['partial_no']][strtoupper($grade['topic'])][$grade['attempt']] = $grade['grade_code']; foreach ($students as &$student) $student['grades'] = $index[$student['enrollment_id']] ?? []; unset($student); return array_values(array_filter($students, fn(array $student): bool => $student['status'] !== 'BAJA')); }

    private function tpStats(array $groups, array $assignments, array $grades): array { $approved = 0; $graded = 0; foreach ($assignments as $assignment) foreach ($groups as $group) { $code = $grades[$assignment['id']][$group['id']] ?? null; if ($code === null || $code === '') continue; $graded++; if ($this->passed($code)) $approved++; } return ['approved' => $approved, 'graded' => $graded, 'ratio' => $this->percent($approved, $graded)]; }
    private function topicStats(array $groups, array $assignments, array $grades): array { $stats = []; foreach ($assignments as $assignment) foreach ($groups as $group) { $code = $grades[$assignment['id']][$group['id']] ?? null; if ($code === null || $code === '') continue; $key = $assignment['topic']; $stats[$key] ??= ['topic' => $key, 'approved' => 0, 'graded' => 0]; $stats[$key]['graded']++; if ($this->passed($code)) $stats[$key]['approved']++; } foreach ($stats as &$stat) { $stat['ratio'] = $this->percent($stat['approved'], $stat['graded']); unset($stat['approved']); } return array_values($stats); }
    private function groupPerformance(array $groups, array $assignments, array $grades): array { $result = []; foreach ($groups as $group) { $approved = 0; $graded = 0; foreach ($assignments as $assignment) { $code = $grades[$assignment['id']][$group['id']] ?? null; if ($code === null || $code === '') continue; $graded++; if ($this->passed($code)) $approved++; } $result[] = ['id' => (int) $group['id'], 'number' => (int) $group['number'], 'name' => $group['name'], 'graded' => $graded, 'ratio' => $this->percent($approved, $graded)]; } usort($result, fn(array $a, array $b): int => ($b['ratio'] ?? -1) <=> ($a['ratio'] ?? -1)); return $result; }
    private function bestPass(array $student, string $topic): bool { foreach ([1, 2] as $partial) foreach (AcademicCatalog::ATTEMPTS as $attempt) if ($this->passed($student['grades'][$partial][$topic][$attempt] ?? null)) return true; return false; }
    private function hasGrade(array $student, string $topic): bool { foreach ([1, 2] as $partial) foreach (AcademicCatalog::ATTEMPTS as $attempt) { $grade = $student['grades'][$partial][$topic][$attempt] ?? null; if ($grade !== null && $grade !== '') return true; } return false; }
    private function partialStats(array $students, array $topics): array { $passed = 0; $total = 0; $detail = []; foreach ($students as $student) { $adeuda = []; $missing = []; $any = false; foreach ($topics as $topic) { if (!$this->hasGrade($student, $topic)) { $missing[] = $topic; continue; } $any = true; if (!$this->bestPass($student, $topic)) $adeuda[] = $topic; } if ($any || $missing !== []) $total++; if ($any && $adeuda === [] && $missing === []) $passed++; $detail[] = ['student' => $student, 'adeuda' => $adeuda, 'missing' => $missing, 'hasAnyGrade' => $any]; } return ['ratio' => $this->percent($passed, $total), 'passed' => $passed, 'total' => $total, 'detail' => $detail]; }
    private function alerts(array $detail, array $groups, int $risk): array { $ratios = []; foreach ($groups as $group) $ratios[(string) $group['number']] = $group['ratio']; $items = []; foreach ($detail as $item) { $ratio = $ratios[(string) $item['student']['group_no']] ?? null; if ($item['adeuda'] !== [] || $item['missing'] !== [] || ($ratio !== null && $ratio <= $risk)) { $item['groupRatio'] = $ratio; $items[] = $item; } } usort($items, fn(array $a, array $b): int => count($b['adeuda']) <=> count($a['adeuda'])); return $items; }
    private function highlights(array $students, array $topics, array $options): array { $positions = array_flip(array_map('strval', $options)); $items = []; foreach ($students as $student) { $sum = 0; $count = 0; foreach ($topics as $topic) { $scores = []; foreach ([1, 2] as $partial) foreach (AcademicCatalog::ATTEMPTS as $attempt) { $grade = $student['grades'][$partial][$topic][$attempt] ?? null; if ($grade !== null && isset($positions[(string) $grade])) $scores[] = $positions[(string) $grade] + 1; } if ($scores !== []) { $sum += max($scores); $count++; } } if ($count > 0) $items[] = ['student' => $student, 'avg' => $sum / $count, 'count' => $count]; } usort($items, fn(array $a, array $b): int => $b['avg'] <=> $a['avg']); return array_slice($items, 0, 5); }
    private function tpStatus(array $groups, array $assignments, array $grades): array { $result = ['approved' => 0, 'failed' => 0, 'missing' => 0]; foreach ($assignments as $assignment) foreach ($groups as $group) { $code = $grades[$assignment['id']][$group['id']] ?? null; if ($code === null || $code === '') { $result['missing']++; } elseif ($this->passed($code)) { $result['approved']++; } else { $result['failed']++; } } return $result; }
    private function upcoming(array $assignments): array { $today = date('Y-m-d'); $items = array_values(array_filter($assignments, fn(array $assignment): bool => !((int) $assignment['returned']) && $assignment['due_date'] && $assignment['due_date'] >= $today)); usort($items, fn(array $a, array $b): int => strcmp($a['due_date'], $b['due_date'])); return array_slice($items, 0, 5); }
    private function history(array $groups, array $assignments, array $grades): array { $points = []; $missingDates = []; foreach ($assignments as $assignment) { $date = $assignment['due_date'] ?: substr((string) $assignment['created_at'], 0, 10); if (!$date) { $missingDates[] = ['assignment' => $assignment, 'reason' => 'Sin fecha']; continue; } $approved = 0; $graded = 0; foreach ($groups as $group) { $code = $grades[$assignment['id']][$group['id']] ?? null; if ($code === null || $code === '') continue; $graded++; if ($this->passed($code)) $approved++; } $points[] = ['date' => $date, 'ratio' => $this->percent($approved, $graded) ?? 0, 'graded' => $graded, 'approved' => $approved, 'label' => $assignment['name'] ?: $assignment['type'] . ' #' . $assignment['number'], 'topic' => $assignment['topic'], 'term' => $assignment['term']]; } usort($points, fn(array $a, array $b): int => strcmp($a['date'], $b['date'])); return ['points' => $points, 'missingDates' => $missingDates]; }
}
