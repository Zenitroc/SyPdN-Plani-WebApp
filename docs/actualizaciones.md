# Actualizaciones del repositorio

Este documento resume los cambios por período a partir del historial de commits.

## Periodo: 6–7 de septiembre de 2025
**Enfoque:** base funcional de la plataforma, API inicial, estilos, ABM de estudiantes/grupos/entregas, y mejoras visuales.

**Cambios destacados**
- Se creó la base del proyecto con API PHP, autenticación JWT, RBAC y primeras rutas.
- Se agregaron temas claro/oscuro, mejoras de estilo y componentes UI.
- Se implementaron ABM de estudiantes, grupos y trabajos prácticos con promedio.
- Se enriqueció el Home con selección de cursos y colores por curso.
- Se incorporó el módulo de parciales y el service worker.

**Commits**
- `f77bb6b` — Initial commit
- `0004ff6` — Toda la base funcional con bdd y usuarios
- `442b372` — Tema Claro/Oscuro
- `a82127f` — Agrego estilo, botones y mini animaciones
- `ba37aaa` — ABM Grupos y Usuarios
- `dd4bf49` — ABM TPS con calculo de promedio
- `472771c` — Agrego muchos temas lindos
- `1973dfd` — Panel home mejorado con color por cursos
- `9b5bd35` — Merge pull request #1 from Zenitroc/homeSelector
- `2dd44bc` — Agrego cursos a bd
- `db43e89` — Merge pull request #2 from Zenitroc/responsiveCelu
- `d8144de` — Merge branch 'main' into temas
- `aeea3f3` — Merge pull request #3 from Zenitroc/temas
- `1201d2f` — ABM parciales

## Periodo: 8 de septiembre de 2025
**Enfoque:** nuevo login y ajustes en estudiantes.

**Cambios destacados**
- Se rediseñó el login, aislando estilos y mejorando la experiencia visual.
- Se agregaron mejoras en validaciones y flujos de login.
- Se corrigió la importación CSV de estudiantes.

**Commits**
- `61f1005` — mejoro login
- `a1e99ff` — feat: isolate login styles
- `eb17c02` — Merge pull request #7 from Zenitroc/codex/improve-login-aesthetic
- `1c43236` — Corrijo error tipeo
- `532a648` — Actualizaciones copadas del login
- `0af3863` — detallecitos
- `27b96e5` — Merge pull request #8 from Zenitroc/nuevoLogin
- `b889928` — Merge pull request #9 from Zenitroc/nuevoLogin
- `d9ed993` — Funciona el csv en estudiantes

## Periodo: 11 de septiembre de 2025
**Enfoque:** asistencia, reportes y planificación.

**Cambios destacados**
- Se creó el módulo de asistencia con exportación a PDF y Excel.
- Se añadió el centro de reportes con envío de mensajes.
- Se incorporó la pantalla de planificación con iframe.
- Se ajustaron rutas relativas en páginas.

**Commits**
- `aac74d7` — Agrego reportes y asistencia, ambos a mejorar
- `86cb2e6` — Asistencia mejorada y exporta pdf y excel
- `4973858` — Supuestamente funciona la plani, pero no la veo en el menú, hay q arreglar
- `760e9bd` — Cambio rutas relativas a generales

## Periodo: 29 de diciembre de 2025
**Enfoque:** administración de cursos.

**Cambios destacados**
- Se añadió el panel de administración de cursos con CRUD y asignación de usuarios.
- Se ajustó la navegación y estilos relacionados, solo hay tema claro y oscuro.

**Commits**
- `8403dd4` — Cambios y gestion de cursos, a modificar, tmbn borrar todos los temas y dejar claro y oscuro nomas
- `b130614` — Merge pull request #17 from Zenitroc/nuevoLogin
- `ca12345` - Se eliminan todos los temas, se agrega gestior de cursos, falta arreglar que no se ven los roles
- `0151cba` - Merge pull request #18 from Zenitroc/nuevoLogin
- `6d4304b` - agrego docs de actualizaciones y explicaciòn pantallas