# Korrika PWA

Aplicacion web tipo PWA para un reto de 11 dias inspirado en Korrika. La app desbloquea una partida diaria, muestra contenido asociado a cada jornada, guarda progreso y ranking en Supabase e incluye una consola de administracion para supervisar el reto.

## Funcionalidades

- Flujo de bienvenida para nuevos usuarios.
- Login con `username + password` sobre Supabase.
- Fallback legacy en desarrollo mientras se despliega la Edge Function de login.
- Reto diario de 11 dias con bloqueo por fecha y contador.
- Ranking general y diario.
- Historial y gestion de cuenta.
- Consola admin para:
  - cambiar la fecha global de inicio del reto,
  - lanzar simulaciones por dia o secuenciales,
  - inspeccionar el banco de preguntas,
  - buscar jugadores, renombrarlos y limpiar resultados.

## Stack

- React 19
- TypeScript
- Vite
- Zustand
- Framer Motion
- Supabase

## Requisitos

- Node.js 20 o superior
- npm
- Un proyecto de Supabase con acceso a Auth, Database y Edge Functions

## Configuracion local

Crea un archivo `.env.local` con al menos estas variables:

```bash
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

Variables opcionales:

```bash
VITE_LOGIN_WITH_USERNAME_FUNCTION_URL=https://tu-proyecto.supabase.co/functions/v1/login-with-username
VITE_ENABLE_LEGACY_USERNAME_LOGIN_FALLBACK=1
```

Notas:

- `VITE_LOGIN_WITH_USERNAME_FUNCTION_URL` permite apuntar a una funcion distinta de la URL por defecto de Supabase.
- `VITE_ENABLE_LEGACY_USERNAME_LOGIN_FALLBACK=1` solo tiene sentido como via de transicion o para desarrollo local.

## Desarrollo

```bash
npm install
npm run dev
```

## Build de produccion

```bash
npm run build
npm run preview
```

## Despliegue de Supabase

Los artefactos de base de datos, configuracion y funciones viven en `supabase/`.

```bash
copy .env.supabase.example .env.supabase
npm run supabase:login
npm run supabase:link
npm run supabase:config:push
npm run supabase:db:push
npm run supabase:functions:deploy:login
```

Atajos utiles:

```bash
npm run supabase:deploy:username-auth
npm run rotate:internal-auth-emails
```

## Notas de backend

- El schema `app` debe estar expuesto en la API de Supabase para que funcionen las APIs de cuenta y administracion.
- `supabase/config.toml` ya contempla `api.schemas = ["public", "storage", "graphql_public", "app"]`.
- La migracion mas reciente para utilidades de consola admin esta en `supabase/migrations/20260314120000_admin_console_tools.sql`.
- El script `rotate:internal-auth-emails` necesita `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el entorno.

## Estructura rapida

```text
src/
  components/screens/   pantallas principales
  hooks/                logica de juego y progreso
  services/             acceso a Supabase y APIs
  store/                estado global con Zustand
supabase/
  migrations/           migraciones SQL
  functions/            edge functions
```
