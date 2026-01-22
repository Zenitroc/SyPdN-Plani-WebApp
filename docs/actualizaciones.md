# Actualizaciones del repositorio

Este documento resume las funcionalidades y mejoras más relevantes incorporadas por período. La idea es explicar qué se agregó y qué cambió para quien usa la app, con fechas de referencia.

## Periodo: 6–7 de septiembre de 2025 — Base funcional y primeros módulos
**Enfoque:** cimientos del sistema, primeros ABM y personalización visual.

**Qué se incorporó y por qué importa**
- **Base completa del sistema:** se levantó la estructura inicial con API PHP, autenticación JWT y control de roles (RBAC), para que el acceso ya quede protegido y con permisos por perfil.
- **Primeros módulos de gestión (ABM):** quedaron operativos estudiantes, grupos y trabajos prácticos. Esto permitió empezar a administrar cursos reales con notas y conformación de equipos.
- **Parciales iniciales:** se habilitó el registro de parciales para llevar calificaciones de evaluaciones formales.
- **Home mejorado:** el inicio ahora permite elegir curso/comisión y asignar color por curso, haciendo más clara la navegación.
- **Estilo y temas:** se sumaron temas (claro/oscuro y variantes) y mejoras visuales en botones y animaciones para dar más claridad y feedback.
- **Service worker y mejoras de UI:** se consolidó la base para mejorar la experiencia offline y la interacción.

**Comparado con antes:** antes no existía plataforma funcional; ahora hay login, módulos de carga de datos y experiencia visual completa para operar un curso.

## Periodo: 8 de septiembre de 2025 — Nuevo login y mejoras de estudiantes
**Enfoque:** experiencia de acceso y correcciones de carga masiva.

**Qué se incorporó y por qué importa**
- **Rediseño integral del login:** se aisló el estilo del login y se actualizó el flujo visual, haciendo el acceso más claro y moderno.
- **Validaciones y ajustes de autenticación:** mejoras pequeñas pero claves para evitar errores de login.
- **CSV de estudiantes corregido:** se corrigió el flujo de importación de estudiantes por CSV, que antes fallaba o era inestable.

**Comparado con antes:** el login era más básico y la carga por CSV no terminaba de funcionar; ahora el ingreso es más claro y la importación es confiable.

## Periodo: 11 de septiembre de 2025 — Asistencia, reportes y planificación
**Enfoque:** operación diaria docente y comunicación.

**Qué se incorporó y por qué importa**
- **Asistencia con exportación:** se agregó la toma de asistencia con exportación a PDF y Excel para llevar registros formales.
- **Centro de reportes:** se habilitó el envío de reportes (bugs, ideas, pedidos) desde la interfaz.
- **Planificación del curso:** se sumó la pantalla de planificación con iframe para integrar un plan externo.
- **Rutas corregidas:** ajustes en rutas relativas para mejorar navegación.

**Comparado con antes:** no había asistencia ni reportes; ahora se puede registrar y exportar, y centralizar feedback.

## Periodo: 29–30 de diciembre de 2025 — Administración avanzada y usuarios
**Enfoque:** administración de cursos y gestión de usuarios.

**Qué se incorporó y por qué importa**
- **Gestión de cursos (CRUD):** se creó el panel de administración de cursos y asignación de usuarios a cursos. Ahora los cursos se pueden crear, editar y asignar desde la app.
- **Gestión de usuarios:** se sumó un gestor de usuarios con perfil, más datos en la base y correcciones de UI. Esto habilita administrar cuentas y roles en un lugar central.
- **Correcciones de roles en cursos:** se arregló la visualización de roles en la gestión de cursos.
- **Ajustes de tema y visuales:** se simplificaron los temas a claro/oscuro y se corrigieron inconsistencias de estilo.
- **Documentación:** se incorporaron documentos de pantallas y actualizaciones para dejar trazabilidad funcional.

**Comparado con antes:** no existía administración central de usuarios ni cursos; ahora hay paneles específicos y control de roles más claro.

## Periodo: 31 de diciembre de 2025 – 1 de enero de 2026 — Preparación para deploy y onboarding
**Enfoque:** despliegue, navegación, y solicitud de cuentas.

**Qué se incorporó y por qué importa**
- **Ajustes para deploy:** se reconfiguraron rutas y estructura de archivos para poder publicar la app (incluyendo cambios en rutas del front y eliminación de dependencias de `/public`).
- **Correcciones de navegación y pantallas negras:** se arreglaron redirecciones y rutas que generaban pantallas en blanco.
- **Solicitud de cuenta funcional:** se dejó operativo el flujo de “Solicitar cuenta” y se agregó animación de carga para mejorar feedback.
- **Pantalla de carga en Home:** se incorporó un loading screen y mejoras de botones para percepción de fluidez.
- **Rutas y scripts del front:** se agregó un JSON de rutas y se corrigieron referencias a scripts en `index.html`.
- **Actualización de base de datos:** se ajustó la BD para reflejar nuevos campos y requerimientos.

**Comparado con antes:** el deploy era difícil y la navegación fallaba; ahora la app está preparada para publicación y el onboarding de usuarios funciona.

## Periodo: 4–7 de enero de 2026 — Nuevo front, roles y centro de recursos
**Enfoque:** rediseño visual, roles y contenidos informativos.

**Qué se incorporó y por qué importa**
- **Rediseño visual completo:** se actualizó el look & feel (colores, fondos y estilos) para una interfaz más moderna y coherente.
- **Roles más restrictivos:** se ajustó el rol “ayudante” para limitar accesos, mejorando la seguridad por perfil.
- **Login actualizado:** cambio de login alineado con el nuevo front.
- **Centro de novedades y recursos:** se agregó un espacio dedicado a noticias y recursos, útil para comunicar novedades a los usuarios.
- **Correcciones de menú y textos:** se corrigieron textos y comportamiento del menú para mayor claridad.
- **Base de datos de referencia:** se creó `baseDeDatos.sql` para facilitar la carga/replicación de datos.

**Comparado con antes:** la UI era más básica y no había un centro de novedades; ahora la app luce más moderna y ofrece un espacio informativo central.

## Periodo: 11 de enero de 2026 — Mejoras en parciales, asistencia y CSV
**Enfoque:** seguimiento académico y mejoras en importación.

**Qué se incorporó y por qué importa**
- **Parciales con filtro por tema:** ahora se puede filtrar por tema y marcar visualmente cuando un estudiante aprueba una instancia (resuelve #37).
- **Asistencia con indicadores por tema aprobado:** se colorea la asistencia según aprobaciones, permitiendo detectar rápidamente avances.
- **Nuevo método de carga CSV (SIU):** se agregó un método adicional para importar estudiantes desde CSV, ampliando compatibilidad con formatos externos.

**Comparado con antes:** no había filtros ni señales visuales por tema; ahora el seguimiento es más claro y la importación de datos es más flexible.