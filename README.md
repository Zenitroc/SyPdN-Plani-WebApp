# La PolliWeb

Sistema de gestión de cursos: padrón de estudiantes, grupos, trabajos prácticos, parciales, asistencia y cierre de cursada.

## Arquitectura

- **Front:** SPA de cliente pesado en React + TypeScript + Vite (`frontend/`). Toda la interfaz corre en el navegador y solo habla con la API bajo `/api`.
- **API:** PHP 8.2+ con PDO sobre MySQL/MariaDB (`backend/`), autenticación JWT y roles (GURU, SENIOR, AYUDANTE).

```
frontend/
  index.html            punto de entrada de la SPA
  public/assets/        imágenes y textos editables (guía de cada pantalla)
  src/
    lib/                api (fetch), query (caché de datos), nav (pantallas), permissions (roles), format
    context/            sesión, curso seleccionado, catálogo académico, tema, avisos
    components/         sistema de componentes (ui, íconos, gráficos, buscador, guía)
    layouts/            estructura con barra lateral y barra superior
    pages/              una pantalla por archivo; registry.ts las asocia a la navegación
    styles/             tokens (paleta y medidas), base, componentes, layout y pantallas
backend/
  public/index.php      punto de entrada HTTP de la API
  src/Domain            reglas del negocio (AcademicCatalog: temas, instancias, escala, umbrales)
  src/Controllers, Services, Repositories   módulos ya migrados a capas
  src/Legacy            módulos que conservan su implementación original
  src/Middleware        JWT, roles y acceso a cursos
  src/Infrastructure    configuración, PDO, router HTTP y JWT
  tests/api-smoke.mjs   prueba de humo de toda la API
```

### Dónde se cambia cada cosa

| Quiero… | Tocar |
| --- | --- |
| Cambiar temas, instancias, tipos de TP, escala o umbrales | `backend/src/Domain/AcademicCatalog.php` (el front los lee de `GET /api/catalog`) |
| Agregar una pantalla | una entrada en `frontend/src/lib/nav.ts` + su componente en `frontend/src/pages/registry.ts` |
| Cambiar qué rol puede hacer qué en la interfaz | `frontend/src/lib/permissions.ts` (debe reflejar los `require_role` de la API) |
| Cambiar colores, radios, sombras o tiempos de animación | `frontend/src/styles/tokens.css` |
| Editar los textos de la guía de cada pantalla | `frontend/public/assets/data/tutorial-config.json` |
| Cambiar el mail de soporte del login | `VITE_SUPPORT_EMAIL` en `frontend/.env` |

## Requisitos

- PHP 8.2 o superior con `pdo_mysql`
- MySQL o MariaDB (esquema en `docs/baseDeDatos.sql`)
- Node.js 20 o superior

## Configuración

Copiá `.env.example` a `.env` y configurá `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `JWT_SECRET` y `CORS_ORIGINS`.
La API carga `.env` y luego `.env.{APP_ENV}` (por ejemplo `.env.development`), que sobrescribe los valores comunes.

El front no necesita configuración. Sus opciones están en `frontend/.env.example`.

## Desarrollo

```powershell
npm install
npm run dev:api     # API PHP en http://127.0.0.1:8080
npm run dev         # front en http://localhost:5173 (reenvía /api a la API)
```

Abrí `http://localhost:5173`.

| Comando | Qué hace |
| --- | --- |
| `npm run typecheck` | Chequeo de tipos del front |
| `npm run build` | Compila el front en `frontend/dist/` |
| `npm run test:api` | Prueba de humo de la API (ver abajo) |

### Prueba de humo de la API

Recorre todos los endpoints dentro de un curso temporal que crea y borra al terminar. Necesita la API corriendo y un usuario GURU:

```powershell
$env:SMOKE_USER = 'guru'; $env:SMOKE_PASS = '...'; npm run test:api
```

No prueba el envío de reportes (manda un correo real) ni el cambio de contraseña. Las personas de prueba quedan en la tabla `people` (la API no ofrece borrarlas); el script indica con qué legajo.

## Producción

```powershell
npm run build
```

Publicá `frontend/dist/` como raíz del sitio y dirigí `/api` a `backend/public/index.php`. Todas las rutas que no sean archivos deben responder `index.html` (en Apache ya lo resuelve el `.htaccess` incluido en el build). Los pasos del servidor están en [`DESPLIEGUE.md`](DESPLIEGUE.md).

Para probar el build en local con un solo proceso: `npm run dev:api` y abrir `http://127.0.0.1:8080`.

## Estado del backend en Node

`backend/src/**/*.ts`, `backend/prisma/`, `backend/Dockerfile`, `docker-compose.yml` y `Caddyfile` son una migración a Node/Fastify **sin terminar**: solo cubre login, perfil y listado de cursos, y no compila (dependencias sin instalar e imports con mayúsculas distintas a las carpetas). La API en uso es la de PHP; levantar el `docker-compose` actual dejaría sin funcionar todos los módulos.

## Historial

El historial funcional de versiones está en [`docs/README_VERSIONES.md`](docs/README_VERSIONES.md) y el detalle por período en [`docs/actualizaciones.md`](docs/actualizaciones.md).
