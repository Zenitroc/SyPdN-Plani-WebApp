# Contratos de datos (API)

Este documento describe el shape esperado de las entidades principales expuestas por el backend.
Todos los endpoints responden **JSON**. Los errores usan:

```json
{ "error": "mensaje", "extra": {"opcional": true} }
```

## Curso (`course`)
Campos principales en listados de cursos (`GET /api/courses`):

```json
{
  "id": 123,
  "code": "A1",
  "name": "Algoritmos",
  "term": "2024-2",
  "is_active": 1
}
```

## Usuario (`user`)
Respuesta de login (`POST /api/auth/login`) y perfil (`GET /api/me`):

```json
{
  "id": 99,
  "name": "Ada",
  "last_name": "Lovelace",
  "username": "alovelace",
  "email": "ada@example.com",
  "personal_email": "ada.personal@example.com",
  "legajo": "1234",
  "phone": "555-0100",
  "photo_url": "data:image/png;base64,...",
  "roles": ["GURU"],
  "course_ids": [1, 2],
  "must_change_password": 0
}
```

## Estudiante / Inscripción (`student`)
Listado por curso (`GET /api/estudiantes`):

```json
{
  "id": 10,
  "course_id_seq": 5,
  "status": "ALTA",
  "person_id": 200,
  "apellido": "García",
  "nombre": "Ana",
  "legajo": "1222",
  "email_inst": "ana@uni.edu",
  "group_no": 3,
  "group_id": 40,
  "observaciones": ""
}
```

## Grupo (`group`)
Listado de grupos (`GET /api/grupos`):

```json
{
  "id": 40,
  "number": 3,
  "name": "Grupo 3",
  "conformity_submitted": 0,
  "conformity_url": "",
  "members": 5
}
```

Miembros de grupo (`GET /api/grupos/miembros`):

```json
{
  "enrollment_id": 10,
  "id_en_curso": 5,
  "apellido": "García",
  "nombre": "Ana",
  "legajo": "1222"
}
```

## Entrega (`assignment`)
Entregas (`GET /api/entregas`) devuelve un paquete con:

```json
{
  "groups": [
    { "id": 40, "number": 3, "name": "Grupo 3" }
  ],
  "assignments": [
    {
      "id": 7,
      "course_id": 1,
      "term": 1,
      "type": "TP",
      "number": 1,
      "topic": "ORG",
      "due_date": "2024-03-21",
      "name": "Trabajo 1",
      "returned": 0,
      "created_at": "2024-03-01 10:00:00"
    }
  ],
  "grades": [
    { "assignment_id": 7, "group_id": 40, "grade_code": "SAT" }
  ],
  "grade_options": ["A", "N_E", "SAT"],
  "approval": {
    "40": { "graded": 1, "approved": 1, "ratio": 100 }
  }
}
```

## Parciales (`partial`)
Parciales (`GET /api/parciales`):

```json
{
  "students": [
    {
      "enrollment_id": 10,
      "course_id_seq": 5,
      "status": "ALTA",
      "apellido": "García",
      "nombre": "Ana",
      "legajo": "1222",
      "group_no": 3,
      "p1": { "ORG": { "PA": null, "1R": null, "2R": null }, "MET": { "PA": null, "1R": null, "2R": null }, "TEO1": { "PA": null, "1R": null, "2R": null } },
      "p2": { "PLS": { "PA": null, "1R": null, "2R": null }, "CUR": { "PA": null, "1R": null, "2R": null }, "TEO2": { "PA": null, "1R": null, "2R": null } },
      "adeuda_p1": [],
      "adeuda_p2": []
    }
  ],
  "grade_options": ["A", "N_E", "SAT"],
  "topics": { "p1": ["ORG", "MET", "TEO1"], "p2": ["PLS", "CUR", "TEO2"] },
  "attempts": ["PA", "1R", "2R"]
}
```

## Asistencia (`attendance`)
Asistencia (`GET /api/asistencia`):

```json
{
  "students": [
    {
      "enrollment_id": 10,
      "course_id_seq": 5,
      "apellido": "García",
      "nombre": "Ana",
      "present": true,
      "topics": { "ORG": true, "MET": false, "TEO1": false }
    }
  ],
  "topics": ["ORG", "MET", "TEO1"]
}
```

## Planificación (`plan`)
Planificación (`GET /api/planificacion`):

```json
{
  "course": {
    "course_id": 1,
    "plan_url": "https://..."
  }
}
```

## Reportes (`report`)
Respuesta de `POST /api/reportes`:

```json
{ "ok": true }
```