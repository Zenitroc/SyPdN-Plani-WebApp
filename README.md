# SyPdN-Plani-WebApp

## Configuración de entorno (perfiles)

El backend carga variables desde `.env` y, si definís `APP_ENV`, también carga un
perfil con prioridad (sobrescribe) desde `.env.{APP_ENV}`.

Ejemplos disponibles:

- `.env.development`
- `.env.production`

### Cómo usarlo

1. Copiá `.env.example` a `.env` y ajustá valores comunes.
2. Definí `APP_ENV` en `.env` para elegir el perfil (por ejemplo `development` o `production`).
3. Ajustá los valores específicos del perfil en `.env.development` o `.env.production`.

Orden de carga:

1. `.env`
2. `.env.{APP_ENV}` (sobrescribe valores anteriores)