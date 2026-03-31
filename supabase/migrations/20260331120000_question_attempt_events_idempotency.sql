-- Idempotencia de intentos por sesión: evita filas duplicadas en reintentos y permite ON CONFLICT DO NOTHING.
-- Elimina duplicados previos conservando la fila con id (uuid) menor.

delete from app.question_attempt_events a
using app.question_attempt_events b
where a.session_id = b.session_id
  and a.question_id = b.question_id
  and a.answered_at = b.answered_at
  and a.id > b.id;

create unique index if not exists question_attempt_events_session_question_answered_at_uidx
  on app.question_attempt_events (session_id, question_id, answered_at);
