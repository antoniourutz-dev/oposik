## Observabilidad Edge (Supabase Functions)

Objetivo: logs **útiles, consistentes y seguros** sin depender aún de plataformas externas.

### Formato de log

Todas las Edge Functions críticas emiten **JSON line** con este shape (ejemplo):

```json
{
  "ts": "2026-03-30T23:59:59.000Z",
  "level": "info",
  "fn": "sync-practice-session",
  "event": "sync.start",
  "requestId": "…",
  "code": "INVALID_PAYLOAD",
  "status": 400,
  "durationMs": 123,
  "ctx": { "attemptsCount": 20 }
}
```

Implementación común: `supabase/functions/_shared/observability.ts` (`createEdgeLogger`).

### Niveles

- `info`: inicio/fin de operaciones y métricas agregadas (counts, duration).
- `warn`: errores esperables / controlados (method not allowed, unauthorized, invalid payload).
- `error`: fallos inesperados o de infraestructura (DB, webpush, etc.).

### Taxonomía (códigos)

Ejemplos usados:
- `METHOD_NOT_ALLOWED`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `INVALID_PAYLOAD`
- `PAYLOAD_TOO_LARGE`
- `SYNC_FAILED`
- `LOGIN_FAILED`
- `ADMIN_ACTION_FAILED`
- `PUSH_CRON_UNAUTHORIZED`
- `INTERNAL_ERROR`

### Privacidad / redacción

- **Nunca** loguear: `Authorization`, tokens, secrets, payloads completos, emails internos.
- `user.id` se registra como identificador **acortado** (`safeUserId`) para minimizar PII.
- Errores se registran con `{ name, message }` sin stack por defecto (`sanitizeError`).

