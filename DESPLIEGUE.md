# Guía rápida de cambios y despliegue

## Flujo local

```bash
git checkout -b nombre-de-tu-rama
git add .
git commit -m "Descripcion del cambio"
git push origin nombre-de-tu-rama
```

## Compilar el front

El front es una SPA que se compila: el servidor publica `frontend/dist/`, que no se versiona.
Después de traer cambios que toquen `frontend/`, en el servidor:

```bash
npm ci
npm run build
```

El sitio debe servir `frontend/dist/` como raíz, responder `index.html` para cualquier ruta que no sea un archivo (rutas `/login` y `/app/...`) y dirigir `/api` a `backend/public/index.php`.

## Probar rama en servidor

```bash
cd ~/site/SyPdN-Plani-WebApp
cp .env.production /tmp/.env.production.servidor
git fetch origin
git switch nombre-de-tu-rama || git switch -c nombre-de-tu-rama origin/nombre-de-tu-rama
git pull origin nombre-de-tu-rama
cp /tmp/.env.production.servidor .env.production
git update-index --skip-worktree .env.production
docker restart php-fpm
```

## Volver a main si algo falla

```bash
cd ~/site/SyPdN-Plani-WebApp
git switch main
git pull origin main
cp /tmp/.env.production.servidor .env.production
git update-index --skip-worktree .env.production
docker restart php-fpm
```

## Verificar servidor

```bash
git branch --show-current
git log --oneline -1
curl https://sypdn.avantek.com.ar/api/ping
```

## Caddy

Si no existe `caddy.service`, revisar:

```bash
ps aux | grep -i caddy
```

Si corre como binario:

```bash
sudo caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

## Reglas

* No subir `.env.production`.
* Antes de hacer pull en servidor, correr `git status --short`.
* Si aparece `.env.production` modificado, hacer backup antes.
* Si se cambió PHP, reiniciar `php-fpm`.
* Si cambió algo de `frontend/`, volver a correr `npm run build`.
  ::: 
