## Modelo de seguridad de Edge Functions (Supabase)

Este documento describe el **modelo de acceso** y los **guards reales** de las funciones en `supabase/functions/`.

### Inventario y acceso

| Función | Ruta | Despliegue | Modelo de acceso | Validación real en código |
|--------|------|------------|------------------|---------------------------|
| Login con username | `login-with-username` | `--no-verify-jwt` | **Pública** (login) | Normaliza entrada y usa `signInWithPassword`. No devuelve detalles sensibles; siempre 401 ante credenciales inválidas. |
| Admin tools | `admin-user-management` | **verify-jwt** | **JWT + rol admin** | Requiere `Authorization`, valida usuario (`auth.getUser` con anon key) y hace `rpc('is_admin')`. |
| Sync práctica | `sync-practice-session` | **verify-jwt** | **JWT (usuario)** + service role para persistencia | Verifica usuario con anon key (`requireAuthenticatedUser`) y usa service role para escribir/leer. Limita payload (max 200 attempts). No filtra `details/hint` en errores. |
| Daily push reminders | `daily-push-reminders` | `--no-verify-jwt` | **Secret interno** (cron) | Requiere `Authorization: Bearer ${DAILY_PUSH_REMINDER_CRON_SECRET}`. |

### Principios aplicados

- **No confiar en `--no-verify-jwt`** para funciones que deberían ser privadas: se despliegan con verificación JWT cuando corresponde.
- **Separar verificación de identidad (anon key)** de **persistencia privilegiada (service role)** en funciones que escriben en DB.
- **Rechazo temprano** de payloads anómalos (p. ej. arrays gigantes) para reducir superficie de abuso.
- **No filtrar detalles internos** (SQL hints, stack, etc.) en respuestas HTTP.

### Deuda / siguientes pasos

- Añadir tests específicos para validación de payload en `sync-practice-session` (fixtures de entrada inválida).
- Revisar `Access-Control-Allow-Origin` si se quiere restringir CORS por entorno (sin romper flujos actuales).

### Contrato de payload (sync-practice-session)

- Parser/validador: `supabase/functions/_shared/syncPracticePayload.ts`
- Tests del parser: `src/services/edgePayloadValidation/parseSyncPracticeSessionPayload.test.ts`

