# Pantallas y funcionamiento

La interfaz es una SPA: una sola página que cambia de pantalla sin recargar. Las rutas viven bajo `/app/...` y se definen en `frontend/src/lib/nav.ts`; el componente de cada una está en `frontend/src/pages/`.

## Comportamiento general

- **Sesión:** sin token se muestra el login. Si la API rechaza el token, la sesión se cierra sola y el login avisa que expiró.
- **Curso de trabajo:** se elige en la barra lateral o en *Mis cursos* y queda guardado en el navegador. Las pantallas de curso se recargan al cambiarlo.
- **Roles:** el menú y los botones se adaptan al rol. Una pantalla sin permiso muestra un aviso aunque se entre por URL.
- **Datos:** lo consultado queda en memoria; al volver a una pantalla se ve al instante y se actualiza en segundo plano. Las notas, la asistencia y la conformidad se guardan al cambiarlas, sin botón.
- **Buscador (Ctrl/⌘ + K):** salta a cualquier pantalla, cambia de curso o busca un estudiante del curso actual.
- **Guía:** el botón *Guía* de la barra superior explica la pantalla actual paso a paso. Los textos están en `frontend/public/assets/data/tutorial-config.json`.
- **Tema claro/oscuro:** se cambia al pie del menú lateral, arriba del perfil. En teléfono el menú pasa a ser un cajón, el tema es su última opción y el perfil queda en la barra superior.

## Login — `/login`

Usuario y contraseña, con opción de recordar el usuario y mostrar la contraseña. *Olvidé mi contraseña* y *Solicitar cuenta* abren la plantilla del correo a soporte.
Un usuario nuevo (o con la contraseña reseteada) entra con su nombre de usuario como contraseña y es llevado a su perfil: no puede usar otra pantalla hasta cambiarla.

## General

| Pantalla | Ruta | Qué permite |
| --- | --- | --- |
| Dashboard | `/app/dashboard` | Indicadores del curso con filtros por cuatrimestre, tema y grupo: aprobación de TPs y parciales, evolución de las entregas, estado de los TPs, rendimiento por grupo, temas a reforzar, próximas entregas, alertas de seguimiento y mejores promedios. |
| Mis cursos | `/app/courses` | Cursos disponibles (todos para GURU, los asignados para el resto). Seleccionar uno lo deja como curso de trabajo. GURU puede asignarle un color. |
| Novedades | `/app/news` | Novedades y recursos comunes a todos los cursos (GURU los crea, edita y elimina, con imagen opcional) y formulario para enviar un reporte por correo (bug, solicitud, idea u otro) con enlace y captura. |

## Curso

| Pantalla | Ruta | Qué permite |
| --- | --- | --- |
| Estudiantes | `/app/students` | Padrón con búsqueda, filtro por estado y orden por columna. La columna N° numera la lista visible (1, 2, 3…) sin depender del ID. Alta y edición (GURU, SENIOR), importación CSV en formato estándar o SIU con revisión previa, acciones en lote sobre la selección (alta, baja, asignar grupo), reasignación de IDs por orden alfabético, exportación a CSV y eliminación con confirmación escrita (solo GURU). |
| Grupos | `/app/groups` | Tarjetas por grupo con sus integrantes (solo estudiantes en ALTA). Crear uno o varios grupos, editar nombre y enlace de conformidad, eliminar (GURU, SENIOR). Los integrantes se mueven arrastrando o con la selección. La conformidad se marca desde la tarjeta (también AYUDANTE). |
| Planificación | `/app/planning` | Muestra embebido el plan de clases del curso. GURU configura el enlace. |

## Evaluaciones

| Pantalla | Ruta | Qué permite |
| --- | --- | --- |
| Trabajos prácticos | `/app/assignments` | Matriz de entregas por grupo, separada por cuatrimestre. Alta con numeración automática, edición y baja de entregas; el tema puede ser uno de la lista u “Otro”, que despliega un campo para escribirlo (hasta 8 caracteres); nota por grupo; marca de “devuelta”; porcentaje de aprobación de cada grupo. |
| Parciales | `/app/partials` | Nota por estudiante en ALTA, tema e instancia (parcial y recuperatorios), con filtros por parcial, tema e instancia y encabezado fijo al bajar. Muestra qué temas adeuda cada uno y un resumen de cuántos adeudan cada tema (exámenes a imprimir). *Exportar* permite elegir temas, instancias y datos a incluir, o seleccionar todo. Edición para GURU y SENIOR; el resto solo consulta. |
| Asistencia | `/app/attendance` | Por parcial e instancia, solo estudiantes en ALTA: presentes y temas rendidos, con color según el tema esté aprobado o se rinda en esa instancia. En los recuperatorios lista por defecto solo a quienes adeudan algún tema (se puede ver a todos). *Cerrar asistencia* (GURU, SENIOR) carga en Parciales `A` a los ausentes y `N_E` a los temas no entregados, únicamente en los temas adeudados y sin pisar notas ya cargadas. Totales, exportación a CSV e impresión/PDF. |
| Calificación final | `/app/finals` | Solo GURU y SENIOR. Estado de parciales y TPs, nota final (o ausente), condición resultante, observaciones y marca de carga en SIU (solo GURU). Señala a quienes ya cumplen todo y falta cargar. Exportación a CSV. |

## Administración (solo GURU)

| Pantalla | Ruta | Qué permite |
| --- | --- | --- |
| Cursos | `/app/admin/courses` | Alta, edición y eliminación de cursos (código, nombre, comisión, enlace de planificación, activo) y asignación de docentes. |
| Usuarios | `/app/admin/users` | Alta, edición y eliminación de cuentas, roles, foto, reseteo de contraseña y cursos asignados. |
| Todos los estudiantes | `/app/admin/students` | Padrón consolidado de todos los cursos, con búsqueda y exportación. |

## Cuenta

**Mi perfil — `/app/profile`:** foto, datos de contacto y cambio de contraseña. El nombre, el usuario y el email institucional los administra GURU.
