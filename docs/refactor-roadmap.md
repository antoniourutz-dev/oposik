## Oposik Refactor Roadmap

### Objetivo

Preparar Oposik para crecer en:

- volumen de preguntas
- numero de alumnos
- numero de temarios
- numero de flujos administrativos

sin disparar coste de mantenimiento ni riesgo de regresion.

### Fase 0. Estabilizacion inmediata

Objetivo: eliminar fragilidad operativa antes de seguir construyendo.

- asegurar que todas las migraciones sean aplicables desde cero
- eliminar dependencias accidentales a `public.game_results`
- dejar una sola fuente de verdad para cada flujo activo
- introducir pruebas minimas de build, SQL y mapeadores criticos

Entregables:

- despliegue reproducible en Supabase desde un proyecto vacio
- smoke tests para login, carga de preguntas y grabacion de sesion
- inventario de codigo legado a retirar

### Fase 1. Separacion de productos y poda de legado

Objetivo: reducir deuda cognitiva y evitar evolucionar dos aplicaciones en paralelo.

- extraer Korrika a otro repo o a `apps/korrika`
- dejar Oposik en `apps/oposik` o como unica app activa
- borrar componentes, hooks, stores y servicios no usados por Oposik
- eliminar variantes locales no conectadas a la arquitectura principal

Regla:

- ninguna feature nueva entra hasta cerrar esta fase

### Fase 2. Replanteamiento del modelo de datos

Objetivo: soportar multi-temario y crecimiento real de contenido.

- introducir entidad explicita de `curriculum`
- mover `practice_profiles` a clave por `user_id + curriculum`
- separar catalogo de preguntas de resultados y agregados
- definir contratos de lectura orientados a casos de uso, no a tablas crudas

Resultado esperado:

- un usuario puede tener progreso aislado por cada oposicion
- las consultas dejan de mezclar dominios

### Fase 3. Backend orientado a casos de uso

Objetivo: evitar descargar catalogos completos y reducir acoplamiento frontend-SQL.

- crear RPC o endpoints para:
  - siguiente bloque
  - repaso de falladas
  - metricas resumidas
  - listado paginado de preguntas
- paginar siempre listados de administracion
- mover operaciones destructivas a funciones SQL transaccionales

Regla:

- el frontend no debe construir logica de dominio a partir de `select *`

### Fase 4. Reorganizacion frontend

Objetivo: dividir responsabilidades y bajar el coste de cambio.

- separar `App.tsx` por dominios
- introducir capa de queries y comandos por feature
- encapsular auth, dashboard, practice y admin en modulos independientes
- sustituir contratos de UI por tipos de dominio

Objetivo tecnico:

- que una feature nueva no exija tocar el entrypoint principal

### Fase 5. Escalado y observabilidad

Objetivo: preparar operacion continua.

- metricas de errores de RPC y edge functions
- trazas de login y sincronizacion
- limites y dashboards de uso
- estrategias de cache y reintento por feature

### Orden recomendado

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5

### No hacer

- no seguir metiendo features sobre la convivencia Korrika + Oposik
- no ampliar `preguntas` manteniendo fetch total en cliente como estrategia base
- no mantener operaciones admin repartidas entre edge functions y SQL sin transaccion
- no introducir multi-temario sobre el modelo actual de `practice_profiles`
