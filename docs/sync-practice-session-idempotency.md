# sync-practice-session: idempotencia y reintentos

## Estrategia

- **Clave lógica de intento**: `(session_id, question_id, answered_at)` con `answered_at` normalizado a ISO UTC para comparar payload y filas existentes.
- **Deduplicación en payload**: si el cliente envía el mismo `question_id` + `answered_at` varias veces, se conserva la **última** ocurrencia y el orden de **primera aparición** por clave (`dedupeAttemptsStable`).
- **Backend**: índice único `question_attempt_events_session_question_answered_at_uidx` evita filas duplicadas. Los intentos ya presentes para esa sesión se **omiten** en el motor de aprendizaje (no se vuelve a aplicar `updateQuestionState`).
- **Inserción de eventos**: `upsert` con `onConflict: session_id,question_id,answered_at` e `ignoreDuplicates: true` para carreras o reintentos residuales.
- **Sesión** `practice_sessions`: `upsert` por `session_id` (idempotente).
- **Estado** `user_question_state`: `upsert` por `(user_id, curriculum, question_id)` (idempotente por pregunta).

## Qué garantiza el sistema

- Reenviar el **mismo** payload tras un éxito previo no altera el estado de aprendizaje ni inserta eventos duplicados (respuesta `sync.syncKind: duplicate_only` con contadores).
- Reintentos con **mezcla** de intentos ya guardados y nuevos solo procesan los **pendientes** (`syncKind: mixed`).
- El resumen de sesión (`score` / `total`) sigue basado en el payload **deduplicado** completo, coherente con la sesión mostrada al usuario.

## Limitaciones

- Si el servidor aplicó cambios a `user_question_state` y **falló antes** de insertar el evento correspondiente, un reintento podría volver a aplicar el motor para ese intento (ventana sin evento). Es rara; mitigaría un flujo transaccional único en BD.
- Dos peticiones **paralelas** con el mismo `session_id` pueden competir; el índice único limita duplicados en eventos, pero el orden no está serializado.
- `answered_at` equivalentes con cadenas distintas se alinean vía `Date.parse`; instantes ambiguos son improbables en la práctica.

## Respuesta HTTP (campos no sensibles)

Incluye `sync.attemptsProcessed`, `sync.attemptsDuplicateIgnored`, `sync.attemptsInPayload`, `sync.syncKind` (`full` | `mixed` | `duplicate_only`).
