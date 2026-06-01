# SyPdN-Plani-WebApp

## Desarrollo local en Windows

Este proyecto se puede levantar localmente en Windows sin VM Ubuntu. El frontend
esta en `public/`, el backend PHP esta en `api/` y `npm` se usa solo como comando
comodo para iniciar el servidor local.

### Requisitos

- Node.js LTS
- PHP 8.2 o superior
- MariaDB/MySQL
- Extension `pdo_mysql` habilitada en PHP

### Verificar herramientas

```powershell
php -v
node -v
npm -v
mysql --version
php -m | findstr /i "pdo_mysql"
```

### Configurar variables locales

La configuracion local esperada es:

```env
APP_ENV=development
DB_HOST=127.0.0.1
DB_NAME=spn
DB_USER=root
DB_PASS=admin
JWT_SECRET=dev_secret_cambialo_despues_por_algo_largo
JWT_EXP_SECONDS=28800
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

Importante: si existe `.env.development`, sus valores sobrescriben los de `.env`
cuando `APP_ENV=development`.

### Crear base local

Entrar a MySQL/MariaDB:

```powershell
mysql -u root -p
```

Crear la base:

```sql
CREATE DATABASE IF NOT EXISTS spn
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### Levantar el servidor

```powershell
npm run dev
```

Si PowerShell bloquea `npm.ps1` por Execution Policy, ejecuta el mismo script con:

```powershell
npm.cmd run dev
```

Abrir:

```text
http://localhost:8080
```

Probar API:

```text
http://localhost:8080/api/ping
```

El comando usa PHP con `public/` como document root:

```powershell
php -S localhost:8080 -t public dev/router.php
```

Para detener el servidor:

```text
Ctrl + C
```

Para volver a levantarlo:

```powershell
npm run dev
```

Si queres exponerlo en la red local:

```powershell
npm run dev:host
```

## Configuracion de entorno (perfiles)

El backend carga variables desde `.env` y, si definis `APP_ENV`, tambien carga un
perfil con prioridad desde `.env.{APP_ENV}`. Ese perfil sobrescribe valores
anteriores.

Ejemplos disponibles:

- `.env.development`
- `.env.production`

### Como usarlo

1. Copia `.env.example` a `.env` y ajusta valores comunes.
2. Defini `APP_ENV` en `.env` para elegir el perfil, por ejemplo `development`
   o `production`.
3. Ajusta los valores especificos del perfil en `.env.development` o
   `.env.production`.

Orden de carga:

1. `.env`
2. `.env.{APP_ENV}` sobrescribe valores anteriores.
