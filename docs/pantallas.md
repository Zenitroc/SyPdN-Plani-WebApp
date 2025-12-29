# Pantallas y funcionamiento

Este documento resume las pantallas del front-end y su función principal.

## Navegación general
- El menú se renderiza con `public/assets/js/menu.js`.
- El curso seleccionado se persiste con `public/assets/js/course-context.js`.
- Varias pantallas requieren token: si no hay sesión, redirigen al login.

## Login
**Ruta:** `public/pages/login/index.html`
- Formulario de autenticación con usuario/contraseña y reCAPTCHA de prueba.
- Acciones extra: mostrar contraseña, recordar credenciales y mensaje de “olvidé mi contraseña”.
- Si el token existe, redirige a Home.

## Home
**Ruta:** `public/pages/home/index.html`
- Lista comisiones/cursos disponibles para el usuario.
- Permite seleccionar un curso y guardarlo como contexto global.
- Para rol **GURÚ** habilita: ver alumnos globales y administrar cursos; también permite asignar color a cursos.

## Estudiantes
**Ruta:** `public/pages/estudiantes/index.html`
- ABM de estudiantes por curso.
- Importación CSV con validación previa (dry-run).
- Edición masiva y reasignación de IDs.
- Eliminar estudiantes solo disponible para rol **GURÚ**.

## Grupos
**Ruta:** `public/pages/grupos/index.html`
- Crear/editar grupos y gestionar conformidad.
- Asignación de alumnos sin grupo y movimiento entre grupos.
- Vista rápida de miembros dentro de cada grupo.

## Entregas (Trabajos Prácticos)
**Ruta:** `public/pages/entregas/index.html`
- ABM de entregas por cuatrimestre con tipo, tema, fecha y nombre.
- Calificaciones por grupo y estado de “devuelto”.
- Sugerencia automática de número de entrega.

## Parciales
**Ruta:** `public/pages/parciales/index.html`
- Registro de notas por alumno, parcial y recuperatorios.
- Filtros por estado, búsqueda y vistas P1/P2/ALL.
- Coloreo de aprobados/desaprobados y resumen de adeudados.

## Asistencia a parciales
**Ruta:** `public/pages/asistencia/index.html`
- Marca presentes/ausentes y entrega de temas.
- Exportación a Excel o PDF de la selección actual.

## Reportes
**Ruta:** `public/pages/reportes/index.html`
- Formulario para enviar reportes (bug/solicitud/idea/otro).
- Permite adjuntar un link y una imagen (base64).

## Planificación
**Ruta:** `public/pages/planificacion/index.html`
- Muestra la planificación del curso en un iframe.
- Si el curso no tiene URL configurada, informa al usuario.

## Administración de cursos (solo GURÚ)
**Ruta:** `public/pages/cursos-admin/index.html`
- CRUD de cursos (código, nombre, cuatrimestre/año, URL de planificación, estado activo).
- Asignación y desasignación de usuarios a cursos.

## Alumnos global (solo GURÚ)
**Ruta:** `public/pages/alumnos-global/index.html`
- Vista consolidada de estudiantes de todos los cursos.
- Filtro por apellido, nombre, legajo, email o curso.

## Curso dashboard
**Ruta:** `public/pages/curso-dashboard/index.html`
- Pantalla reservada sin implementación actual.