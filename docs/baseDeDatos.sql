/*
    Para copiar la bd a mariadb:
    
    mariadb -u spn_user -p spn < /ruta/al/seed_spn.sql

*/

/* ============================================================
   SPN - Seed “vacío pero completo” (NO BORRA NADA)
   - Crea tablas si no existen
   - Mantiene y/o crea: usuario guru, roles, grade_lookup
   - No inserta cursos / alumnos / inscripciones / notas reales
   - Idempotente: se puede ejecutar varias veces
   ============================================================ */

SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS;
SET @OLD_SQL_MODE=@@SQL_MODE;

SET UNIQUE_CHECKS=0;
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

/* ============================================================
   TABLAS BASE
   ============================================================ */

CREATE TABLE IF NOT EXISTS `courses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(120) NOT NULL,
  `color_hex` char(7) DEFAULT NULL,
  `term` varchar(32) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `plan_url` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `people` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `last_name` varchar(80) NOT NULL,
  `first_name` varchar(80) NOT NULL,
  `legajo` varchar(10) NOT NULL,
  `email_inst` varchar(190) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_people_legajo` (`legajo`),
  UNIQUE KEY `uniq_people_email` (`email_inst`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `last_name` varchar(120) DEFAULT NULL,
  `email` varchar(190) NOT NULL,
  `personal_email` varchar(190) DEFAULT NULL,
  `legajo` varchar(60) DEFAULT NULL,
  `phone` varchar(60) DEFAULT NULL,
  `photo_data` longtext DEFAULT NULL,
  `photo_mime` varchar(120) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `username` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(16) NOT NULL,
  `description` varchar(120) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` bigint(20) unsigned NOT NULL,
  `role_id` tinyint(3) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `fk_user_roles_role` (`role_id`),
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_courses` (
  `user_id` bigint(20) unsigned NOT NULL,
  `course_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`course_id`),
  KEY `fk_user_courses_course` (`course_id`),
  CONSTRAINT `fk_user_courses_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_courses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `grade_lookup` (
  `code` varchar(8) NOT NULL,
  `ordinal` tinyint(4) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `groups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_id` bigint(20) unsigned NOT NULL,
  `number` int(11) NOT NULL,
  `name` varchar(120) DEFAULT NULL,
  `conformity_submitted` tinyint(1) NOT NULL DEFAULT 0,
  `conformity_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_group_per_course` (`course_id`,`number`),
  UNIQUE KEY `uniq_group_course_id` (`course_id`,`id`),
  CONSTRAINT `fk_groups_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_id` bigint(20) unsigned NOT NULL,
  `person_id` bigint(20) unsigned NOT NULL,
  `course_student_id` int(11) NOT NULL,
  `status` enum('ALTA','BAJA') NOT NULL DEFAULT 'ALTA',
  `group_id` bigint(20) unsigned DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_course_student` (`course_id`,`course_student_id`),
  UNIQUE KEY `uniq_course_person` (`course_id`,`person_id`),
  KEY `idx_enroll_person` (`person_id`),
  KEY `fk_enroll_group` (`group_id`),
  KEY `idx_enroll_person_status` (`person_id`,`status`),
  CONSTRAINT `fk_enroll_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_enroll_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `course_id` bigint(20) unsigned NOT NULL,
  `term` tinyint(4) NOT NULL,
  `type` varchar(8) NOT NULL,
  `number` int(11) NOT NULL,
  `topic` varchar(8) NOT NULL,
  `due_date` date DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `returned` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_assign_course_term_type_num` (`course_id`,`term`,`type`,`number`),
  KEY `ix_assign_course` (`course_id`),
  CONSTRAINT `fk_assign_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assignment_grades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assignment_id` int(11) NOT NULL,
  `group_id` bigint(20) unsigned NOT NULL,
  `grade_code` varchar(32) DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_ag_unique` (`assignment_id`,`group_id`),
  KEY `ix_ag_assign` (`assignment_id`),
  KEY `ix_ag_group` (`group_id`),
  CONSTRAINT `fk_ag_assign` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ag_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partial_attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `course_id` bigint(20) unsigned NOT NULL,
  `enrollment_id` bigint(20) unsigned NOT NULL,
  `partial_no` tinyint(4) NOT NULL,
  `attempt` enum('PA','1R','2R') NOT NULL,
  `present` tinyint(1) NOT NULL DEFAULT 0,
  `org` tinyint(1) NOT NULL DEFAULT 0,
  `met` tinyint(1) NOT NULL DEFAULT 0,
  `teo1` tinyint(1) NOT NULL DEFAULT 0,
  `pls` tinyint(1) NOT NULL DEFAULT 0,
  `cur` tinyint(1) NOT NULL DEFAULT 0,
  `teo2` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_pa_unique` (`enrollment_id`,`partial_no`,`attempt`),
  KEY `ix_pa_course` (`course_id`),
  CONSTRAINT `fk_pa_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pa_enroll` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `partial_grades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `course_id` bigint(20) unsigned NOT NULL,
  `enrollment_id` bigint(20) unsigned NOT NULL,
  `partial_no` tinyint(4) NOT NULL,
  `topic` varchar(8) NOT NULL,
  `attempt` enum('PA','1R','2R') NOT NULL,
  `grade_code` varchar(32) DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_pg_unique` (`enrollment_id`,`partial_no`,`topic`,`attempt`),
  KEY `ix_pg_course` (`course_id`),
  CONSTRAINT `fk_pg_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pg_enroll` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `planning` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_id` bigint(20) unsigned NOT NULL,
  `class_no` int(11) NOT NULL,
  `date` date NOT NULL,
  `mod1_teorico` varchar(255) DEFAULT NULL,
  `mod2_practico` varchar(255) DEFAULT NULL,
  `tarea_proxima` varchar(255) DEFAULT NULL,
  `entrega_hoy` varchar(255) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` enum('PLANEADA','EN_CURSO','DICTADA','CANCELADA') NOT NULL DEFAULT 'PLANEADA',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_planning_class` (`course_id`,`class_no`),
  KEY `idx_planning_date` (`course_id`,`date`),
  CONSTRAINT `fk_planning_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/* Reportes */
CREATE TABLE IF NOT EXISTS `reportes_resources` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(180) NOT NULL,
  `description` text DEFAULT NULL,
  `url` text NOT NULL,
  `icon_emoji` varchar(16) DEFAULT NULL,
  `icon_image` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reportes_news` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(180) NOT NULL,
  `preview` text DEFAULT NULL,
  `body` text DEFAULT NULL,
  `link` text DEFAULT NULL,
  `link_label` varchar(120) DEFAULT NULL,
  `image` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


/* ============================================================
   TRIGGERS (solo si NO existen)
   ============================================================ */

-- enroll_group_check_ins
SET @trg := (
  SELECT COUNT(*) FROM information_schema.TRIGGERS
  WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = 'enroll_group_check_ins'
);
SET @sql := IF(@trg = 0,
'CREATE TRIGGER `enroll_group_check_ins` BEFORE INSERT ON `enrollments`
 FOR EACH ROW
 BEGIN
   IF NEW.group_id IS NOT NULL AND
      (SELECT g.course_id FROM groups g WHERE g.id = NEW.group_id) <> NEW.course_id THEN
     SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ''group_id no pertenece al course_id'';
   END IF;
 END',
'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- enroll_unique_active_ins
SET @trg := (
  SELECT COUNT(*) FROM information_schema.TRIGGERS
  WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = 'enroll_unique_active_ins'
);
SET @sql := IF(@trg = 0,
'CREATE TRIGGER `enroll_unique_active_ins` BEFORE INSERT ON `enrollments`
 FOR EACH ROW
 BEGIN
   IF NEW.status = ''ALTA'' AND
      EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.person_id = NEW.person_id
          AND e.status = ''ALTA''
          AND e.course_id <> NEW.course_id
      ) THEN
     SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ''La persona ya está ALTA en otro curso'';
   END IF;
 END',
'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- enroll_group_check_upd
SET @trg := (
  SELECT COUNT(*) FROM information_schema.TRIGGERS
  WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = 'enroll_group_check_upd'
);
SET @sql := IF(@trg = 0,
'CREATE TRIGGER `enroll_group_check_upd` BEFORE UPDATE ON `enrollments`
 FOR EACH ROW
 BEGIN
   IF NEW.group_id IS NOT NULL AND
      (SELECT g.course_id FROM groups g WHERE g.id = NEW.group_id) <> NEW.course_id THEN
     SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ''group_id no pertenece al course_id'';
   END IF;
 END',
'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- enroll_unique_active_upd
SET @trg := (
  SELECT COUNT(*) FROM information_schema.TRIGGERS
  WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = 'enroll_unique_active_upd'
);
SET @sql := IF(@trg = 0,
'CREATE TRIGGER `enroll_unique_active_upd` BEFORE UPDATE ON `enrollments`
 FOR EACH ROW
 BEGIN
   IF NEW.status = ''ALTA'' AND
      EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.person_id = NEW.person_id
          AND e.status = ''ALTA''
          AND e.course_id <> NEW.course_id
          AND e.id <> NEW.id
      ) THEN
     SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ''La persona ya está ALTA en otro curso'';
   END IF;
 END',
'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


/* ============================================================
   SEEDS MINIMOS (NO BORRA, NO PISA LO QUE YA EXISTE)
   ============================================================ */

-- Roles: si existen, actualiza description; si hay más roles, los deja
INSERT INTO `roles` (`code`,`description`) VALUES
  ('GURU','Administrador funcional total'),
  ('SENIOR','Operaciones avanzadas'),
  ('AYUDANTE','Operaciones acotadas')
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`);

-- Grade lookup: inserta faltantes, NO modifica ordinal si ya existe, NO borra extras
INSERT INTO `grade_lookup` (`code`,`ordinal`) VALUES
  ('A',0),
  ('N_E',1),
  ('NO_SAT',2),
  ('SAT-',3),
  ('SAT',4),
  ('SAT+',5),
  ('DIST-',6),
  ('DIST',7)
ON DUPLICATE KEY UPDATE
  `ordinal` = `ordinal`; -- no-op (deja tal cual si ya existe)

-- Usuario Gurú (sin foto en el insert). Password default (si se crea): admin123
-- Hash bcrypt PHP: $2y$10$l3RX28KEC9Rj3gYQNz0MRO5D8HRQgVZ68tqVHXAKTudeX5813FvjG
INSERT INTO `users`
  (`name`,`last_name`,`email`,`personal_email`,`legajo`,`phone`,`photo_data`,`photo_mime`,`password_hash`,`must_change_password`,`username`)
VALUES
  ('Gurú','admin','guru@example.com',NULL,'22222222','11111111111',NULL,NULL,
   '$2y$10$l3RX28KEC9Rj3gYQNz0MRO5D8HRQgVZ68tqVHXAKTudeX5813FvjG',
   1,
   'guru')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `last_name` = VALUES(`last_name`),
  `email` = VALUES(`email`),
  `personal_email` = COALESCE(`users`.`personal_email`, VALUES(`personal_email`)),
  `legajo` = VALUES(`legajo`),
  `phone` = VALUES(`phone`),
  -- NO pisa foto si ya existe
  `photo_data` = COALESCE(`users`.`photo_data`, VALUES(`photo_data`)),
  `photo_mime` = COALESCE(`users`.`photo_mime`, VALUES(`photo_mime`)),
  -- NO pisa password si ya existe (solo lo setea si estaba NULL/vacío)
  `password_hash` = IF(`users`.`password_hash` IS NULL OR `users`.`password_hash` = '',
                       VALUES(`password_hash`),
                       `users`.`password_hash`),
  -- si ya tenía password, respetá su flag; si estaba vacío, forzá cambio
  `must_change_password` = IF(`users`.`password_hash` IS NULL OR `users`.`password_hash` = '',
                              1,
                              `users`.`must_change_password`),
  `username` = VALUES(`username`);

-- Asegurar que el usuario "guru" tenga rol GURU (sin duplicar)
INSERT IGNORE INTO `user_roles` (`user_id`,`role_id`)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.code = 'GURU'
WHERE u.username = 'guru';


/* ============================================================
   RESTAURAR FLAGS
   ============================================================ */
SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
