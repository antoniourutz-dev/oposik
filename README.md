# OposikApp

Aplicacion web tipo PWA para preparar oposiciones en castellano. La app carga preguntas desde Supabase, permite practicar por bloques de 10, revisar cada respuesta con explicacion y guardar estadisticas locales por jugador para detectar puntos debiles.

## Estado actual

- Practica secuencial por bloques de 10 preguntas.
- Revision de bloque con respuesta correcta y explicacion desplegable.
- Persistencia local por jugador en el navegador.
- Selector de jugador, creacion y renombrado.
- Dashboard con:
  - precision global,
  - sesiones realizadas,
  - bloque recomendado para continuar,
  - top 5 preguntas mas falladas,
  - grupos tematicos mas debiles,
  - historial reciente.
- Modo de repaso de preguntas mas falladas.
- Integracion con Supabase para leer la tabla `preguntas`.
- Build de produccion verificada con Vite.

## Stack

- React 19
- TypeScript
- Vite
- Framer Motion
- Supabase
- Tailwind CSS v4

## Requisitos

- Node.js 20 o superior
- npm
- Un proyecto de Supabase con la tabla `public.preguntas`

## Configuracion local

Crea un archivo `.env.local` con:

```bash
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_publica
```

La tabla `preguntas` debe ser legible con esa clave publica y contener, como minimo, estos campos:

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

## Persistencia actual

Las estadisticas de jugador y el historial de sesiones se guardan en `localStorage` del navegador. Esto permite:

- continuar por el siguiente bloque recomendado,
- ver las 5 preguntas mas falladas,
- revisar grupos con mayor tasa de error,
- mantener varios jugadores en el mismo dispositivo.

## Siguientes pasos recomendados para produccion real

- Mover estadisticas e historial de jugador a Supabase para sincronizacion entre dispositivos.
- Añadir autenticacion real de alumno.
- Crear una tabla de intentos y otra de progreso por jugador.
- Sustituir los iconos actuales por branding propio de OposikApp.
- Incorporar tests de integracion para flujos de practica y persistencia.
