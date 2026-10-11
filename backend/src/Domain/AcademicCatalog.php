<?php
declare(strict_types=1);

/**
 * Única fuente de verdad de las reglas académicas del sistema.
 * Los módulos de la API y el front (vía GET /api/catalog) leen de acá,
 * así un cambio de temas, instancias o umbrales se hace en un solo lugar.
 */
final class AcademicCatalog
{
    /** Códigos de nota que NO aprueban. Cualquier otro código cargado aprueba. */
    public const FAILING_GRADES = ['A', 'N_E', 'NO_SAT', 'N_S'];

    /** Escala usada si la tabla grade_lookup no está disponible. */
    public const DEFAULT_GRADES = ['A', 'N_E', 'NO_SAT', 'SAT-', 'SAT', 'SAT+', 'DIST-', 'DIST'];

    /** Instancias de cada parcial, en orden. */
    public const ATTEMPTS = ['PA', '1R', '2R'];
    public const ATTEMPT_LABELS = ['PA' => 'Parcial', '1R' => '1° Recuperatorio', '2R' => '2° Recuperatorio'];

    /** Temas evaluados en cada parcial. */
    public const PARTIAL_TOPICS = [1 => ['ORG', 'MET', 'TEO1'], 2 => ['PLS', 'CUR', 'TEO2']];

    public const TERMS = [1, 2];

    /** Tipos y temas válidos para los trabajos prácticos. */
    public const ASSIGNMENT_TYPES = ['TP', 'TPC', 'TPR'];
    public const ASSIGNMENT_TOPICS = ['ORG', 'MET', 'PLS', 'CUR'];
    /** Un TP también puede llevar un tema libre ("Otro"); el largo es el de la columna assignments.topic. */
    public const CUSTOM_TOPIC_MAX_LENGTH = 8;

    /** Notas que se cargan solas al cerrar la asistencia de una instancia. */
    public const ABSENT_GRADE = 'A';
    public const NOT_DELIVERED_GRADE = 'N_E';

    public const ENROLLMENT_STATUSES = ['ALTA', 'BAJA'];

    /** Condición final según la calificación (1 a 10). */
    public const FINAL_GRADE_MIN = 1;
    public const FINAL_GRADE_MAX = 10;
    public const FINAL_SIGN_FROM = 6;
    public const FINAL_PROMOTE_FROM = 8;
    public const FINAL_CONDITION_LABELS = ['DESERTO' => 'Ausente', 'RECURSA' => 'Recursa', 'FIRMA' => 'Firma', 'PROMOCIONA' => 'Promociona'];

    /** % de TPs aprobados a superar para considerar el cuatrimestre aprobado. */
    public const TP_APPROVAL_THRESHOLD = 60;

    public const REPORT_TYPES = ['bug' => 'Bug / Fallo', 'solicitud' => 'Solicitud', 'idea' => 'Idea', 'otro' => 'Otro'];

    /** Tamaño máximo de imágenes embebidas (fotos, íconos, novedades). */
    public const MAX_IMAGE_BYTES = 200 * 1024;

    public static function passed(?string $grade): bool
    {
        return $grade !== null && $grade !== '' && !in_array(strtoupper($grade), self::FAILING_GRADES, true);
    }

    /**
     * Tema de un TP ya normalizado (mayúsculas, sin espacios sobrantes), o null si no es válido.
     * Vale uno del catálogo o uno libre de letras, números, espacios y - _ +.
     */
    public static function assignmentTopic(mixed $value): ?string
    {
        if (!is_string($value)) return null;
        $topic = strtoupper(trim($value));
        if (in_array($topic, self::ASSIGNMENT_TOPICS, true)) return $topic;
        return preg_match('/^[A-Z0-9][A-Z0-9 _+\-]{0,' . (self::CUSTOM_TOPIC_MAX_LENGTH - 1) . '}$/', $topic) ? $topic : null;
    }

    /** @return list<string> */
    public static function topicsFor(int $partial): array
    {
        return self::PARTIAL_TOPICS[$partial] ?? [];
    }

    /** @return list<string> */
    public static function allTopics(): array
    {
        return array_merge(...array_values(self::PARTIAL_TOPICS));
    }

    public static function finalCondition(?int $finalGrade, bool $deserted): ?string
    {
        if ($deserted) return 'DESERTO';
        if ($finalGrade === null) return null;
        if ($finalGrade < self::FINAL_SIGN_FROM) return 'RECURSA';
        if ($finalGrade < self::FINAL_PROMOTE_FROM) return 'FIRMA';
        return 'PROMOCIONA';
    }

    /** @return list<string> */
    public static function gradeScale(PDO $pdo): array
    {
        try {
            $rows = $pdo->query('SELECT code FROM grade_lookup ORDER BY ordinal ASC')->fetchAll(PDO::FETCH_COLUMN);
            if ($rows) return array_values(array_unique(array_map('strval', $rows)));
        } catch (Throwable) {
            // sin tabla de lookup: se usa la escala por defecto
        }
        return self::DEFAULT_GRADES;
    }

    public static function toArray(PDO $pdo): array
    {
        $roles = [];
        try {
            $roles = $pdo->query('SELECT code, description FROM roles ORDER BY id')->fetchAll();
        } catch (Throwable) {
            // el catálogo sigue siendo útil sin la descripción de roles
        }
        return [
            'grades' => ['scale' => self::gradeScale($pdo), 'failing' => self::FAILING_GRADES],
            'attempts' => array_map(static fn(string $code): array => ['code' => $code, 'label' => self::ATTEMPT_LABELS[$code]], self::ATTEMPTS),
            'partials' => array_map(static fn(int $number): array => ['number' => $number, 'topics' => self::PARTIAL_TOPICS[$number]], array_keys(self::PARTIAL_TOPICS)),
            'terms' => self::TERMS,
            'assignments' => ['types' => self::ASSIGNMENT_TYPES, 'topics' => self::ASSIGNMENT_TOPICS, 'custom_topic_max_length' => self::CUSTOM_TOPIC_MAX_LENGTH],
            'attendance_close' => ['absent' => self::ABSENT_GRADE, 'not_delivered' => self::NOT_DELIVERED_GRADE],
            'enrollment_statuses' => self::ENROLLMENT_STATUSES,
            'final' => [
                'min' => self::FINAL_GRADE_MIN,
                'max' => self::FINAL_GRADE_MAX,
                'sign_from' => self::FINAL_SIGN_FROM,
                'promote_from' => self::FINAL_PROMOTE_FROM,
                'conditions' => self::FINAL_CONDITION_LABELS,
            ],
            'tp_approval_threshold' => self::TP_APPROVAL_THRESHOLD,
            'report_types' => self::REPORT_TYPES,
            'max_image_bytes' => self::MAX_IMAGE_BYTES,
            'roles' => $roles,
        ];
    }
}
