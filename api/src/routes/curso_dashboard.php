<?php
function register_curso_dashboard_routes(): void {
  $ensure_schema = function(PDO $pdo): void {
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS course_schedules (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        course_id BIGINT UNSIGNED NOT NULL,
        day_of_week ENUM('LUN','MAR','MIE','JUE','VIE','SAB','DOM') NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        modality ENUM('PRESENCIAL','VIRTUAL','HIBRIDA') NOT NULL DEFAULT 'PRESENCIAL',
        location VARCHAR(190) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        is_published TINYINT(1) NOT NULL DEFAULT 1,
        created_by BIGINT UNSIGNED DEFAULT NULL,
        updated_by BIGINT UNSIGNED DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY ix_course_schedules_course (course_id),
        KEY ix_course_schedules_day (course_id, day_of_week),
        KEY fk_course_schedules_created_by (created_by),
        KEY fk_course_schedules_updated_by (updated_by),
        CONSTRAINT fk_course_schedules_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_course_schedules_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_course_schedules_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS course_schedule_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        schedule_id BIGINT UNSIGNED DEFAULT NULL,
        course_id BIGINT UNSIGNED NOT NULL,
        action ENUM('CREATED','UPDATED','DELETED') NOT NULL,
        day_of_week ENUM('LUN','MAR','MIE','JUE','VIE','SAB','DOM') DEFAULT NULL,
        start_time TIME DEFAULT NULL,
        end_time TIME DEFAULT NULL,
        modality ENUM('PRESENCIAL','VIRTUAL','HIBRIDA') DEFAULT NULL,
        location VARCHAR(190) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        is_published TINYINT(1) DEFAULT NULL,
        changed_by BIGINT UNSIGNED DEFAULT NULL,
        changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY ix_course_schedule_history_course (course_id),
        KEY ix_course_schedule_history_schedule (schedule_id),
        KEY fk_course_schedule_history_changed_by (changed_by),
        CONSTRAINT fk_course_schedule_history_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_course_schedule_history_schedule FOREIGN KEY (schedule_id) REFERENCES course_schedules(id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_course_schedule_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS course_key_dates (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        course_id BIGINT UNSIGNED NOT NULL,
        term TINYINT DEFAULT NULL,
        topic VARCHAR(32) DEFAULT NULL,
        kind ENUM('PARCIAL','RECUPERATORIO','TP','TP_PRORROGA','CIERRE_NOTAS','PUBLICACION_NOTAS','OTRO') NOT NULL,
        title VARCHAR(180) NOT NULL,
        date DATE NOT NULL,
        time TIME DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        is_published TINYINT(1) NOT NULL DEFAULT 1,
        created_by BIGINT UNSIGNED DEFAULT NULL,
        updated_by BIGINT UNSIGNED DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY ix_course_key_dates_course (course_id),
        KEY ix_course_key_dates_date (course_id, date),
        KEY ix_course_key_dates_kind (course_id, kind),
        KEY fk_course_key_dates_created_by (created_by),
        KEY fk_course_key_dates_updated_by (updated_by),
        CONSTRAINT fk_course_key_dates_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_course_key_dates_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_course_key_dates_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS course_key_date_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        key_date_id BIGINT UNSIGNED DEFAULT NULL,
        course_id BIGINT UNSIGNED NOT NULL,
        action ENUM('CREATED','UPDATED','DELETED') NOT NULL,
        term TINYINT DEFAULT NULL,
        topic VARCHAR(32) DEFAULT NULL,
        kind ENUM('PARCIAL','RECUPERATORIO','TP','TP_PRORROGA','CIERRE_NOTAS','PUBLICACION_NOTAS','OTRO') DEFAULT NULL,
        title VARCHAR(180) DEFAULT NULL,
        date DATE DEFAULT NULL,
        time TIME DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        is_published TINYINT(1) DEFAULT NULL,
        changed_by BIGINT UNSIGNED DEFAULT NULL,
        changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY ix_course_key_date_history_course (course_id),
        KEY ix_course_key_date_history_key_date (key_date_id),
        KEY fk_course_key_date_history_changed_by (changed_by),
        CONSTRAINT fk_course_key_date_history_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_course_key_date_history_key_date FOREIGN KEY (key_date_id) REFERENCES course_key_dates(id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_course_key_date_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS course_announcements (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        course_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(180) NOT NULL,
        body TEXT DEFAULT NULL,
        is_pinned TINYINT(1) NOT NULL DEFAULT 0,
        reminder_at DATETIME DEFAULT NULL,
        starts_at DATETIME DEFAULT NULL,
        ends_at DATETIME DEFAULT NULL,
        status ENUM('DRAFT','PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
        created_by BIGINT UNSIGNED DEFAULT NULL,
        updated_by BIGINT UNSIGNED DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY ix_course_announcements_course (course_id),
        KEY ix_course_announcements_status (course_id, status),
        KEY ix_course_announcements_pinned (course_id, is_pinned),
        KEY fk_course_announcements_created_by (created_by),
        KEY fk_course_announcements_updated_by (updated_by),
        CONSTRAINT fk_course_announcements_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_course_announcements_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_course_announcements_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS course_topics (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        course_id BIGINT UNSIGNED NOT NULL,
        topic VARCHAR(32) NOT NULL,
        term TINYINT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY ux_course_topics (course_id, topic),
        KEY ix_course_topics_term (course_id, term),
        CONSTRAINT fk_course_topics_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS course_inquiries (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        course_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(180) NOT NULL,
        body TEXT DEFAULT NULL,
        status ENUM('PENDING','ANSWERED','CLOSED') NOT NULL DEFAULT 'PENDING',
        created_by BIGINT UNSIGNED DEFAULT NULL,
        updated_by BIGINT UNSIGNED DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY ix_course_inquiries_course (course_id),
        KEY ix_course_inquiries_status (course_id, status),
        CONSTRAINT fk_course_inquiries_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_course_inquiries_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_course_inquiries_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ");
  };

  $normalize_datetime = function(?string $value): ?string {
    if ($value === null) return null;
    $value = trim($value);
    if ($value === '') return null;
    $value = str_replace('T', ' ', $value);
    if (strlen($value) === 16) $value .= ':00';
    return $value;
  };

  route('GET', '/api/curso-dashboard/config', function () use ($ensure_schema): void {
    $pdo = db();
    $ensure_schema($pdo);

    $courseId = (int)($_GET['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);

    $user = auth_user();
    $isGuru = user_has_role($user, 'GURU');
    $isSenior = user_has_role($user, 'SENIOR');
    $isAyudante = user_has_role($user, 'AYUDANTE');
    $canEdit = $isGuru || $isSenior;
    $canDelete = $isGuru || $isSenior;
    $canPublish = $isGuru || $isSenior;

    $term = (int)($_GET['term'] ?? 0);
    $topic = trim((string)($_GET['topic'] ?? ''));

    $termValues = [1, 2];
    $topics = [];
    $topicSt = $pdo->prepare('SELECT topic FROM course_topics WHERE course_id=? ORDER BY term, topic');
    $topicSt->execute([$courseId]);
    foreach (array_column($topicSt->fetchAll(), 'topic') as $val) {
      $val = trim((string)$val);
      if ($val !== '' && !in_array($val, $topics, true)) $topics[] = $val;
    }

    $scheduleSql = "SELECT id, day_of_week, start_time, end_time, modality, location, notes, is_published, updated_at
                    FROM course_schedules WHERE course_id=?";
    $scheduleParams = [$courseId];
    if (!$canEdit) {
      $scheduleSql .= " AND is_published=1";
    }
    $scheduleSql .= " ORDER BY FIELD(day_of_week,'LUN','MAR','MIE','JUE','VIE','SAB','DOM'), start_time";
    $scheduleRows = $pdo->prepare($scheduleSql);
    $scheduleRows->execute($scheduleParams);
    $schedules = $scheduleRows->fetchAll();

    $keySql = "SELECT id, term, topic, kind, title, date, time, notes, is_published, updated_at
               FROM course_key_dates WHERE course_id=?";
    $keyParams = [$courseId];
    if (!$canEdit) {
      $keySql .= " AND is_published=1";
    }
    if ($term > 0) {
      $keySql .= " AND term=?";
      $keyParams[] = $term;
    }
    if ($topic !== '') {
      $keySql .= " AND topic=?";
      $keyParams[] = $topic;
    }
    $keySql .= " ORDER BY date ASC, time IS NULL, time ASC";
    $keyRows = $pdo->prepare($keySql);
    $keyRows->execute($keyParams);
    $keyDates = $keyRows->fetchAll();

    $annSql = "SELECT id, title, body, is_pinned, reminder_at, starts_at, ends_at, status, updated_at, created_by
               FROM course_announcements WHERE course_id=?";
    $annParams = [$courseId];
    if (!$canEdit) {
      $annSql .= " AND status='PUBLISHED' AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW())";
    }
    $annSql .= " ORDER BY is_pinned DESC, reminder_at DESC, created_at DESC";
    $annSt = $pdo->prepare($annSql);
    $annSt->execute($annParams);
    $announcements = $annSt->fetchAll();

    $teamSt = $pdo->prepare("
      SELECT u.id, u.name, u.last_name, u.email, u.personal_email, u.phone,
             u.photo_data, u.photo_mime,
             GROUP_CONCAT(DISTINCT r.code ORDER BY r.code SEPARATOR ',') AS roles,
             MIN(CASE r.code WHEN 'GURU' THEN 1 WHEN 'SENIOR' THEN 2 WHEN 'AYUDANTE' THEN 3 ELSE 4 END) AS role_rank
      FROM users u
      JOIN user_courses uc ON uc.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE uc.course_id = ?
      GROUP BY u.id
      ORDER BY COALESCE(MIN(CASE r.code WHEN 'GURU' THEN 1 WHEN 'SENIOR' THEN 2 WHEN 'AYUDANTE' THEN 3 ELSE 4 END), 99) ASC,
               u.name ASC,
               u.last_name ASC
    ");
    $teamSt->execute([$courseId]);
    $team = [];
    foreach ($teamSt->fetchAll() as $row) {
      $photoUrl = null;
      if (!empty($row['photo_data']) && !empty($row['photo_mime'])) {
        $photoUrl = 'data:' . $row['photo_mime'] . ';base64,' . $row['photo_data'];
      }
      $roles = array_filter(array_map('trim', explode(',', (string)($row['roles'] ?? ''))));
      $primaryRole = $roles[0] ?? '';
      foreach (['GURU', 'SENIOR', 'AYUDANTE'] as $preferred) {
        if (in_array($preferred, $roles, true)) {
          $primaryRole = $preferred;
          break;
        }
      }
      $team[] = [
        'id' => $row['id'],
        'name' => $row['name'],
        'last_name' => $row['last_name'],
        'email' => $row['email'],
        'personal_email' => $row['personal_email'],
        'phone' => $row['phone'],
        'photo_url' => $photoUrl,
        'roles' => implode(',', $roles),
        'primary_role' => $primaryRole,
      ];
    }

    $nextClass = null;
    $dayMap = ['LUN' => 1, 'MAR' => 2, 'MIE' => 3, 'JUE' => 4, 'VIE' => 5, 'SAB' => 6, 'DOM' => 7];
    $now = new DateTime('now');
    $todayDow = (int)$now->format('N');
    $closest = null;
    foreach ($schedules as $row) {
      if ((int)$row['is_published'] !== 1 && !$canEdit) continue;
      $dayCode = $row['day_of_week'] ?? '';
      $dayNum = $dayMap[$dayCode] ?? null;
      if (!$dayNum) continue;
      $startTime = $row['start_time'] ?? '00:00:00';
      $candidate = (clone $now);
      $candidate->setTime(0, 0, 0);
      $diff = ($dayNum - $todayDow + 7) % 7;
      $startParts = explode(':', $startTime);
      $startHour = (int)($startParts[0] ?? 0);
      $startMin = (int)($startParts[1] ?? 0);
      if ($diff === 0) {
        $compare = (clone $now);
        $compare->setTime($startHour, $startMin, 0);
        if ($compare <= $now) $diff = 7;
      }
      if ($diff > 0) $candidate->modify("+{$diff} days");
      $candidate->setTime($startHour, $startMin, 0);
      if ($closest === null || $candidate < $closest['date']) {
        $closest = ['date' => $candidate, 'row' => $row];
      }
    }
    if ($closest !== null) {
      $row = $closest['row'];
      $nextClass = [
        'day_of_week' => $row['day_of_week'],
        'start_time' => $row['start_time'],
        'end_time' => $row['end_time'],
        'modality' => $row['modality'],
        'location' => $row['location'],
        'next_date' => $closest['date']->format('Y-m-d'),
      ];
    }

    $nextKey = null;
    $nextKeySql = "SELECT kind, title, date, time FROM course_key_dates WHERE course_id=?";
    $nextKeyParams = [$courseId];
    if (!$canEdit) {
      $nextKeySql .= " AND is_published=1";
    }
    if ($term > 0) {
      $nextKeySql .= " AND term=?";
      $nextKeyParams[] = $term;
    }
    if ($topic !== '') {
      $nextKeySql .= " AND topic=?";
      $nextKeyParams[] = $topic;
    }
    $nextKeySql .= " AND date >= CURDATE() ORDER BY date ASC, time IS NULL, time ASC LIMIT 1";
    $nextKeySt = $pdo->prepare($nextKeySql);
    $nextKeySt->execute($nextKeyParams);
    $nextKey = $nextKeySt->fetch() ?: null;

    $approvalTotal = 0;
    $approvalPass = 0;
    $approvalSql = "
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN gl.ordinal >= 4 THEN 1 ELSE 0 END) AS passed
      FROM partial_grades pg
      JOIN grade_lookup gl ON gl.code = pg.grade_code
      JOIN enrollments e ON e.id = pg.enrollment_id
      WHERE pg.course_id=? AND pg.grade_code IS NOT NULL AND e.status='ALTA'
    ";
    $approvalParams = [$courseId];
    if ($topic !== '') {
      $approvalSql .= " AND pg.topic=?";
      $approvalParams[] = $topic;
    }
    $approvalSt = $pdo->prepare($approvalSql);
    $approvalSt->execute($approvalParams);
    $approvalRow = $approvalSt->fetch();
    if ($approvalRow) {
      $approvalTotal = (int)($approvalRow['total'] ?? 0);
      $approvalPass = (int)($approvalRow['passed'] ?? 0);
    }
    $approvalRate = $approvalTotal > 0 ? round(($approvalPass / $approvalTotal) * 100, 1) : null;

    $assignmentSql = "SELECT id FROM assignments WHERE course_id=? AND type LIKE 'TP%'";
    $assignmentParams = [$courseId];
    if ($term > 0) {
      $assignmentSql .= " AND term=?";
      $assignmentParams[] = $term;
    }
    if ($topic !== '') {
      $assignmentSql .= " AND topic=?";
      $assignmentParams[] = $topic;
    }
    $assignmentSt = $pdo->prepare($assignmentSql);
    $assignmentSt->execute($assignmentParams);
    $assignmentIds = array_map('intval', array_column($assignmentSt->fetchAll(), 'id'));

    $countSt = $pdo->prepare('SELECT COUNT(*) AS c FROM groups WHERE course_id=?');
    $countSt->execute([$courseId]);
    $groupCount = (int)($countSt->fetch()['c'] ?? 0);
    $totalExpected = count($assignmentIds) * $groupCount;
    $delivered = 0;
    if ($assignmentIds && $groupCount > 0) {
      $placeholders = implode(',', array_fill(0, count($assignmentIds), '?'));
      $deliveredSql = "
        SELECT COUNT(*) AS c
        FROM assignment_grades ag
        JOIN assignments a ON a.id = ag.assignment_id
        WHERE ag.assignment_id IN ($placeholders)
      ";
      $deliveredParams = $assignmentIds;
      $deliveredSt = $pdo->prepare($deliveredSql);
      $deliveredSt->execute($deliveredParams);
      $delivered = (int)($deliveredSt->fetch()['c'] ?? 0);
    }
    $pending = max($totalExpected - $delivered, 0);

    $inquirySt = $pdo->prepare("SELECT COUNT(*) AS c FROM course_inquiries WHERE course_id=? AND status='PENDING'");
    $inquirySt->execute([$courseId]);
    $pendingInquiries = (int)($inquirySt->fetch()['c'] ?? 0);

    json_ok([
      'filters' => [
        'terms' => $termValues,
        'topics' => $topics,
      ],
      'summary' => [
        'next_class' => $nextClass,
        'next_key_date' => $nextKey,
        'approval_rate' => $approvalRate,
        'tp_deliveries' => [
          'delivered' => $delivered,
          'pending' => $pending,
          'total' => $totalExpected,
        ],
        'pending_inquiries' => $pendingInquiries,
      ],
      'schedules' => $schedules,
      'key_dates' => $keyDates,
      'announcements' => $announcements,
      'team' => $team,
      'permissions' => [
        'can_edit' => $canEdit,
        'can_delete' => $canDelete,
        'can_publish' => $canPublish,
        'can_draft' => $isAyudante,
      ],
    ]);
  });

  route('GET', '/api/curso-dashboard/history', function () use ($ensure_schema): void {
    $pdo = db();
    $ensure_schema($pdo);
    $courseId = (int)($_GET['course_id'] ?? 0);
    $type = trim((string)($_GET['type'] ?? ''));
    $id = (int)($_GET['id'] ?? 0);
    if ($courseId <= 0 || $id <= 0) json_error('Parámetros inválidos', 422);
    ensure_course_access($courseId);

    if ($type === 'schedule') {
      $st = $pdo->prepare("
        SELECT h.*, u.name, u.last_name
        FROM course_schedule_history h
        LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.course_id=? AND h.schedule_id=?
        ORDER BY h.changed_at DESC
      ");
      $st->execute([$courseId, $id]);
      json_ok(['history' => $st->fetchAll()]);
    }
    if ($type === 'key_date') {
      $st = $pdo->prepare("
        SELECT h.*, u.name, u.last_name
        FROM course_key_date_history h
        LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.course_id=? AND h.key_date_id=?
        ORDER BY h.changed_at DESC
      ");
      $st->execute([$courseId, $id]);
      json_ok(['history' => $st->fetchAll()]);
    }
    json_error('Tipo inválido', 422);
  });

  route('POST', '/api/curso-dashboard/schedules/save', function () use ($ensure_schema): void {
    $pdo = db();
    $ensure_schema($pdo);
    $user = auth_user();
    $ensureRole = function() use ($user): void {
      require_role($user, ['GURU', 'SENIOR']);
    };
    $ensureRole();

    $in = read_json();
    $id = (int)($in['id'] ?? 0);
    $courseId = (int)($in['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);

    $day = strtoupper(trim((string)($in['day_of_week'] ?? '')));
    $start = trim((string)($in['start_time'] ?? ''));
    $end = trim((string)($in['end_time'] ?? ''));
    $modality = strtoupper(trim((string)($in['modality'] ?? 'PRESENCIAL')));
    $location = trim((string)($in['location'] ?? ''));
    $notes = trim((string)($in['notes'] ?? ''));
    $isPublished = isset($in['is_published']) ? ((int)!!$in['is_published']) : 1;

    $validDays = ['LUN','MAR','MIE','JUE','VIE','SAB','DOM'];
    $validModal = ['PRESENCIAL','VIRTUAL','HIBRIDA'];
    if (!in_array($day, $validDays, true)) json_error('Día inválido', 422);
    if ($start === '' || $end === '') json_error('Horario requerido', 422);
    if (!in_array($modality, $validModal, true)) $modality = 'PRESENCIAL';

    $userId = (int)($user['id'] ?? 0);
    if ($id > 0) {
      $st = $pdo->prepare("
        UPDATE course_schedules
        SET day_of_week=?, start_time=?, end_time=?, modality=?, location=?, notes=?, is_published=?, updated_by=?
        WHERE id=? AND course_id=?
      ");
      $st->execute([$day, $start, $end, $modality, $location ?: null, $notes ?: null, $isPublished, $userId, $id, $courseId]);
      $history = $pdo->prepare("
        INSERT INTO course_schedule_history
          (schedule_id, course_id, action, day_of_week, start_time, end_time, modality, location, notes, is_published, changed_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ");
      $history->execute([$id, $courseId, 'UPDATED', $day, $start, $end, $modality, $location ?: null, $notes ?: null, $isPublished, $userId]);
    } else {
      $st = $pdo->prepare("
        INSERT INTO course_schedules
          (course_id, day_of_week, start_time, end_time, modality, location, notes, is_published, created_by, updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?)
      ");
      $st->execute([$courseId, $day, $start, $end, $modality, $location ?: null, $notes ?: null, $isPublished, $userId, $userId]);
      $newId = (int)$pdo->lastInsertId();
      $history = $pdo->prepare("
        INSERT INTO course_schedule_history
          (schedule_id, course_id, action, day_of_week, start_time, end_time, modality, location, notes, is_published, changed_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ");
      $history->execute([$newId, $courseId, 'CREATED', $day, $start, $end, $modality, $location ?: null, $notes ?: null, $isPublished, $userId]);
    }
    json_ok(['ok' => true]);
  });

  route('POST', '/api/curso-dashboard/schedules/delete', function () use ($ensure_schema): void {
    $pdo = db();
    $ensure_schema($pdo);
    $user = auth_user();
    require_role($user, ['GURU', 'SENIOR']);
    $in = read_json();
    $id = (int)($in['id'] ?? 0);
    $courseId = (int)($in['course_id'] ?? 0);
    if ($id <= 0 || $courseId <= 0) json_error('Datos inválidos', 422);
    ensure_course_access($courseId);

    $row = db_one($pdo, 'SELECT * FROM course_schedules WHERE id=? AND course_id=?', [$id, $courseId]);
    if ($row) {
      $history = $pdo->prepare("
        INSERT INTO course_schedule_history
          (schedule_id, course_id, action, day_of_week, start_time, end_time, modality, location, notes, is_published, changed_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ");
      $history->execute([
        $id,
        $courseId,
        'DELETED',
        $row['day_of_week'],
        $row['start_time'],
        $row['end_time'],
        $row['modality'],
        $row['location'],
        $row['notes'],
        $row['is_published'],
        (int)($user['id'] ?? 0),
      ]);
    }
    $st = $pdo->prepare('DELETE FROM course_schedules WHERE id=? AND course_id=?');
    $st->execute([$id, $courseId]);
    json_ok(['ok' => true]);
  });

  route('POST', '/api/curso-dashboard/key-dates/save', function () use ($ensure_schema): void {
    $pdo = db();
    $ensure_schema($pdo);
    $user = auth_user();
    require_role($user, ['GURU', 'SENIOR']);

    $in = read_json();
    $id = (int)($in['id'] ?? 0);
    $courseId = (int)($in['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);

    $term = (int)($in['term'] ?? 0);
    $topic = trim((string)($in['topic'] ?? ''));
    $kind = strtoupper(trim((string)($in['kind'] ?? 'OTRO')));
    $title = trim((string)($in['title'] ?? ''));
    $date = trim((string)($in['date'] ?? ''));
    $time = trim((string)($in['time'] ?? ''));
    $notes = trim((string)($in['notes'] ?? ''));
    $isPublished = isset($in['is_published']) ? ((int)!!$in['is_published']) : 1;

    $validKind = ['PARCIAL','RECUPERATORIO','TP','TP_PRORROGA','CIERRE_NOTAS','PUBLICACION_NOTAS','OTRO'];
    if (!in_array($kind, $validKind, true)) $kind = 'OTRO';
    if ($title === '' || $date === '') json_error('Título y fecha requeridos', 422);
    if ($term <= 0) $term = null;
    if ($topic === '') $topic = null;
    if ($time === '') $time = null;

    $userId = (int)($user['id'] ?? 0);
    if ($id > 0) {
      $st = $pdo->prepare("
        UPDATE course_key_dates
        SET term=?, topic=?, kind=?, title=?, date=?, time=?, notes=?, is_published=?, updated_by=?
        WHERE id=? AND course_id=?
      ");
      $st->execute([$term, $topic, $kind, $title, $date, $time, $notes ?: null, $isPublished, $userId, $id, $courseId]);
      $history = $pdo->prepare("
        INSERT INTO course_key_date_history
          (key_date_id, course_id, action, term, topic, kind, title, date, time, notes, is_published, changed_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ");
      $history->execute([$id, $courseId, 'UPDATED', $term, $topic, $kind, $title, $date, $time, $notes ?: null, $isPublished, $userId]);
    } else {
      $st = $pdo->prepare("
        INSERT INTO course_key_dates
          (course_id, term, topic, kind, title, date, time, notes, is_published, created_by, updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ");
      $st->execute([$courseId, $term, $topic, $kind, $title, $date, $time, $notes ?: null, $isPublished, $userId, $userId]);
      $newId = (int)$pdo->lastInsertId();
      $history = $pdo->prepare("
        INSERT INTO course_key_date_history
          (key_date_id, course_id, action, term, topic, kind, title, date, time, notes, is_published, changed_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ");
      $history->execute([$newId, $courseId, 'CREATED', $term, $topic, $kind, $title, $date, $time, $notes ?: null, $isPublished, $userId]);
    }
    json_ok(['ok' => true]);
  });

  route('POST', '/api/curso-dashboard/key-dates/delete', function () use ($ensure_schema): void {
    $pdo = db();
    $ensure_schema($pdo);
    $user = auth_user();
    require_role($user, ['GURU', 'SENIOR']);
    $in = read_json();
    $id = (int)($in['id'] ?? 0);
    $courseId = (int)($in['course_id'] ?? 0);
    if ($id <= 0 || $courseId <= 0) json_error('Datos inválidos', 422);
    ensure_course_access($courseId);

    $row = db_one($pdo, 'SELECT * FROM course_key_dates WHERE id=? AND course_id=?', [$id, $courseId]);
    if ($row) {
      $history = $pdo->prepare("
        INSERT INTO course_key_date_history
          (key_date_id, course_id, action, term, topic, kind, title, date, time, notes, is_published, changed_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ");
      $history->execute([
        $id,
        $courseId,
        'DELETED',
        $row['term'],
        $row['topic'],
        $row['kind'],
        $row['title'],
        $row['date'],
        $row['time'],
        $row['notes'],
        $row['is_published'],
        (int)($user['id'] ?? 0),
      ]);
    }
    $st = $pdo->prepare('DELETE FROM course_key_dates WHERE id=? AND course_id=?');
    $st->execute([$id, $courseId]);
    json_ok(['ok' => true]);
  });

  route('POST', '/api/curso-dashboard/announcements/save', function () use ($ensure_schema, $normalize_datetime): void {
    $pdo = db();
    $ensure_schema($pdo);
    $user = auth_user();

    $in = read_json();
    $id = (int)($in['id'] ?? 0);
    $courseId = (int)($in['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);

    $title = trim((string)($in['title'] ?? ''));
    if ($title === '') json_error('Título requerido', 422);
    $body = trim((string)($in['body'] ?? ''));
    $isPinned = isset($in['is_pinned']) ? ((int)!!$in['is_pinned']) : 0;
    $reminderAt = $normalize_datetime($in['reminder_at'] ?? null);
    $startsAt = $normalize_datetime($in['starts_at'] ?? null);
    $endsAt = $normalize_datetime($in['ends_at'] ?? null);
    $status = strtoupper(trim((string)($in['status'] ?? 'PUBLISHED')));
    if (!in_array($status, ['DRAFT','PUBLISHED'], true)) $status = 'PUBLISHED';

    $isGuru = user_has_role($user, 'GURU');
    $isSenior = user_has_role($user, 'SENIOR');
    $isAyudante = user_has_role($user, 'AYUDANTE');
    if (!$isGuru && !$isSenior && !$isAyudante) json_error('Forbidden (role)', 403);

    if ($isAyudante) {
      $status = 'DRAFT';
      $isPinned = 0;
    }

    $userId = (int)($user['id'] ?? 0);
    if ($id > 0) {
      $existing = db_one($pdo, 'SELECT created_by FROM course_announcements WHERE id=? AND course_id=?', [$id, $courseId]);
      if (!$existing) json_error('Aviso no encontrado', 404);
      if ($isAyudante && (int)$existing['created_by'] !== $userId) {
        json_error('Forbidden (owner)', 403);
      }
      $st = $pdo->prepare("
        UPDATE course_announcements
        SET title=?, body=?, is_pinned=?, reminder_at=?, starts_at=?, ends_at=?, status=?, updated_by=?
        WHERE id=? AND course_id=?
      ");
      $st->execute([$title, $body ?: null, $isPinned, $reminderAt, $startsAt, $endsAt, $status, $userId, $id, $courseId]);
    } else {
      $st = $pdo->prepare("
        INSERT INTO course_announcements
          (course_id, title, body, is_pinned, reminder_at, starts_at, ends_at, status, created_by, updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?)
      ");
      $st->execute([$courseId, $title, $body ?: null, $isPinned, $reminderAt, $startsAt, $endsAt, $status, $userId, $userId]);
    }
    json_ok(['ok' => true]);
  });

  route('POST', '/api/curso-dashboard/announcements/delete', function () use ($ensure_schema): void {
    $pdo = db();
    $ensure_schema($pdo);
    $user = auth_user();

    $in = read_json();
    $id = (int)($in['id'] ?? 0);
    $courseId = (int)($in['course_id'] ?? 0);
    if ($id <= 0 || $courseId <= 0) json_error('Datos inválidos', 422);
    ensure_course_access($courseId);

    $isGuru = user_has_role($user, 'GURU');
    $isSenior = user_has_role($user, 'SENIOR');
    $isAyudante = user_has_role($user, 'AYUDANTE');
    if (!$isGuru && !$isSenior && !$isAyudante) json_error('Forbidden (role)', 403);

    if ($isAyudante) {
      $row = db_one($pdo, 'SELECT created_by, status FROM course_announcements WHERE id=? AND course_id=?', [$id, $courseId]);
      if (!$row) json_error('Aviso no encontrado', 404);
      if ((int)$row['created_by'] !== (int)($user['id'] ?? 0)) json_error('Forbidden (owner)', 403);
      if ($row['status'] !== 'DRAFT') json_error('Solo se pueden borrar borradores', 403);
    }

    $st = $pdo->prepare('DELETE FROM course_announcements WHERE id=? AND course_id=?');
    $st->execute([$id, $courseId]);
    json_ok(['ok' => true]);
  });
}