# Quantia

Aplicacion web (PWA) para preparar oposiciones en castellano: practica por bloques, revision con explicaciones, estadisticas y repaso de errores. Las preguntas se cargan desde **Supabase**; el progreso y el catalogo se combinan con datos en servidor para usuarios autenticados.

**Nombre comercial:** Quantia. En `package.json`, el campo `name` es `quantia` (convencion npm en minusculas); no implica otro producto.

## Estado actual / capacidades

- **PWA:** configuracion en `vite.config.ts` (plugin `vite-plugin-pwa`, service worker en `src/sw.ts`).
- **Supabase:** cliente anonimo para lecturas y API de datos; funciones Edge en `supabase/functions/` (login por usuario, sincronizacion de sesiones de practica, recordatorios push, herramientas de administracion de usuarios).
- **Autenticacion:** acceso con usuario/contrasena (Edge `login-with-username` y, segun entorno, flujo legacy documentado en `src/services/authApi.ts`).
- **Modo invitado:** acceso limitado; el numero maximo de bloques de practica para invitado esta definido en `GUEST_MAX_BLOCKS` en `src/hooks/practiceAppStorage.ts` (actualmente **2**).
- **Practica:** sesiones estandar por bloques de **`PRACTICE_BATCH_SIZE`** preguntas (`src/practiceConfig.ts`, actualmente **20**); repaso de debiles acotado por **`WEAK_QUESTIONS_LIMIT`** (actualmente **5**); simulacro y tiempo limite con `SIMULACRO_BATCH_SIZE` y `SIMULACRO_TIME_LIMIT_SECONDS` en el mismo archivo.
- **Dashboard:** estadisticas, calendario/estudio, perfiles segun pantallas en `src/components/` y pestanas bajo `src/components/dashboard/`.
- **Motor de aprendizaje (dominio):** logica en `src/domain/learningEngine/` (paralela en `supabase/functions/_shared/learning-engine/` para servidor).
- **Sincronizacion:** tras sesiones, invocacion de la funcion `sync-practice-session` desde `src/services/practiceCloudApi.ts`.
- **Administracion:** consola para administradores (`src/components/AdminConsoleScreen.tsx`, API en `src/services/adminApi.ts`).
- **Telemetria:** cliente en `src/telemetry/telemetryClient.ts` (eventos en memoria y envio HTTP opcional); **Web Vitals** en `src/telemetry/webVitals.ts`, cargados desde `src/index.tsx`.

Valores numericos visibles en documentacion deben coincidir con `src/practiceConfig.ts` y `src/hooks/practiceAppStorage.ts` (fuente de verdad).

## Stack principal

- React 19, TypeScript (`strict` activado en `tsconfig.json`; comprobar tipos con `npm run typecheck`)
- Vite 6
- Tailwind CSS v4
- TanStack Query
- Supabase JS
- Framer Motion, Recharts (segun pantallas)

## Requisitos

- Node.js 20 o superior
- npm
- Proyecto Supabase con esquema compatible (tabla `preguntas` legible con la clave anonima, y resto segun migraciones del repo)

## Instalacion

```bash
npm install
```

## Variables de entorno

Definir en `.env.local` (Vite solo expone variables que empiezan por `VITE_`).

| Variable                                     | Obligatoria | Uso                                                                                                                  |
| -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                          | Si          | URL del proyecto Supabase. Sin ella la app muestra pantalla de error de configuracion (`src/supabaseConfig.ts`).     |
| `VITE_SUPABASE_ANON_KEY`                     | Si          | Clave publica (anon) de Supabase.                                                                                    |
| `VITE_TELEMETRY_ENDPOINT`                    | No          | Si esta vacia o no definida, no se envian lotes HTTP de telemetria (solo buffer en cliente).                         |
| `VITE_TELEMETRY_DEBUG`                       | No          | Valor `1` activa comportamiento de depuracion en cliente (`src/telemetry/telemetryClient.ts`).                       |
| `VITE_TELEMETRY_SAMPLE_RATE`                 | No          | Tasa de muestreo 0..1 (por defecto efectivo 1).                                                                      |
| `VITE_LOGIN_WITH_USERNAME_FUNCTION_URL`      | No          | URL completa de la funcion Edge de login; por defecto se usa `{VITE_SUPABASE_URL}/functions/v1/login-with-username`. |
| `VITE_ADMIN_USER_MANAGEMENT_FUNCTION_URL`    | No          | URL de la funcion Edge de administracion; por defecto `{VITE_SUPABASE_URL}/functions/v1/admin-user-management`.      |
| `VITE_ENABLE_LEGACY_USERNAME_LOGIN_FALLBACK` | No          | Si es `1`, permite fallback legacy fuera de desarrollo (`src/services/authApi.ts`).                                  |

## Desarrollo local

```bash
npm run dev
```

Servidor por defecto: puerto `5173` (`vite.config.ts`).

## Tests

```bash
npm test
```

Configuracion de Vitest en `vite.config.ts` (`include`: `src/**/*.test.ts`).

## Integracion continua (GitHub Actions)

En cada `push` y `pull_request`, el workflow `.github/workflows/ci.yml` ejecuta `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`. No requiere secretos del repositorio para compilar; las variables `VITE_*` siguen siendo necesarias en local o en el entorno de despliegue para una app funcional contra Supabase.

## Build

```bash
npm run build
npm run preview
```

## Despliegue (scripts del repositorio)

Los comandos utiles estan en `package.json`, por ejemplo:

- `npm run supabase:db:push` — empujar migraciones (Supabase CLI).
- `npm run supabase:functions:deploy:login` — desplegar `login-with-username` (con `--no-verify-jwt` segun script).
- Despliegues agrupados: `supabase:deploy:username-auth`, `supabase:deploy:admin-tools`, `supabase:deploy:push-reminders`, `supabase:deploy:sync-practice`.

Revisar los flags de cada script antes de usar en produccion.

## Telemetria y observabilidad

- **Telemetria de aplicacion:** eventos tipados, posible envio por `fetch`/`sendBeacon` al endpoint configurado; metadatos acotados en tamano (`telemetryClient.ts`). Sin `VITE_TELEMETRY_ENDPOINT`, no hay envio HTTP.
- **Web Vitals:** metricas de rendimiento en el navegador, integradas con el mismo modulo de telemetria donde aplica.

No se documenta aqui una politica de privacidad; solo la configuracion observable en codigo.

## Estructura relevante del proyecto

- `src/App.tsx` — arranque, comprobacion de env Supabase, carga perezosa del shell.
- `src/PracticeAppShell.tsx` — navegacion principal (dashboard, quiz, revision, auth).
- `src/services/` — API (preguntas, cuenta, nube, admin, auth).
- `src/hooks/` — estado de practica y sesiones.
- `src/domain/learningEngine/` — reglas de aprendizaje en cliente.
- `supabase/functions/` — funciones Edge y codigo compartido de motor donde corresponda.

**Nombre en UI y PWA:** constante `APP_DISPLAY_NAME` en `src/appMeta.ts` (alineada con manifest en `vite.config.ts`). El titulo de `index.html` debe mantenerse coherente con ese nombre.

## Esquema minimo documentado de `preguntas`

La tabla `preguntas` debe ser legible con la clave publica e incluir al menos:

```text
id
numero
pregunta
opcion_a
opcion_b
opcion_c
opcion_d
respuesta_correcta
explicacion
grupo
```

## Persistencia y datos

- **Invitado:** uso acotado por `GUEST_MAX_BLOCKS`; estado en `localStorage` (claves en `practiceAppStorage.ts`).
- **Usuario autenticado:** datos de practica y progreso se obtienen y actualizan via Supabase segun `practiceCloudApi.ts`, `accountApi.ts` y funciones Edge indicadas arriba.

## Posibles siguientes pasos (no exhaustivo)

- Ampliar cobertura de tests (p. ej. flujos integrados).
- Sustituir iconos o assets por branding definitivo si aplica.
- Mantener alineados README, `src/appMeta.ts` y manifest al cambiar nombre comercial o constantes de practica.
