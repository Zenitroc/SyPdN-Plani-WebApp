# La PolliWeb

## Estructura

- `frontend/`: interfaz HTML, CSS, JavaScript y recursos estáticos.
- `backend/public/`: punto de entrada HTTP de la API.
- `backend/src/Domain`: conceptos del negocio sin dependencias HTTP.
- `backend/src/Controllers`, `Services` y `Repositories`: API, lógica de negocio y persistencia.
- `backend/src/Middleware`: autenticación JWT, roles y acceso a cursos.
- `backend/src/Infrastructure`: configuración, PDO, HTTP y JWT.
- `backend/src/Legacy`: módulos aún conservados durante la migración, para mantener sus endpoints y comportamiento.

La interfaz solo se comunica con la API bajo `/api`; no accede a la base de datos.

## Requisitos

- PHP 8.2 o superior con `pdo_mysql`
- MySQL o MariaDB
- Node.js (solo para ejecutar los scripts de desarrollo)

## Configuración

Copiá `.env.example` a `.env` y configurá `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `JWT_SECRET` y `CORS_ORIGINS`.

El backend carga `.env` y luego `.env.{APP_ENV}`; por ejemplo, `.env.development` o `.env.production` sobrescribe los valores comunes.

## Desarrollo en Windows

```powershell
npm.cmd run dev
```

Abrí `http://localhost:8080`. La API queda disponible en `http://localhost:8080/api` y el endpoint de prueba es `http://localhost:8080/api/ping`.

El dashboard consume `GET /api/dashboard?course_id={id}`; el backend aplica permisos de curso y devuelve las métricas calculadas.

El comando equivalente es:

```powershell
php -S localhost:8080 -t frontend dev/router.php
```

## Historial

El historial funcional de versiones está en [`docs/README_VERSIONES.md`](docs/README_VERSIONES.md).
