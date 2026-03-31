export type EdgeLogLevel = 'info' | 'warn' | 'error';

export type EdgeErrorCode =
  | 'METHOD_NOT_ALLOWED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_PAYLOAD'
  | 'PAYLOAD_TOO_LARGE'
  | 'SYNC_FAILED'
  | 'LOGIN_FAILED'
  | 'ADMIN_ACTION_FAILED'
  | 'PUSH_CRON_UNAUTHORIZED'
  | 'PUSH_DELIVERY_FAILED'
  | 'INTERNAL_ERROR';

export type EdgeLogEvent = {
  ts: string;
  level: EdgeLogLevel;
  fn: string;
  event: string;
  requestId: string;
  code?: EdgeErrorCode;
  status?: number;
  durationMs?: number;
  // Contexto adicional (siempre sanitizado por quien lo pase)
  ctx?: Record<string, unknown>;
  err?: {
    name?: string;
    message?: string;
  };
};

const nowIso = () => new Date().toISOString();

export const getRequestId = (request: Request) =>
  request.headers.get('x-request-id') ||
  request.headers.get('x-correlation-id') ||
  request.headers.get('cf-ray') ||
  crypto.randomUUID();

export const redactBearer = (value: string) =>
  value.replace(/^\s*Bearer\s+.+$/i, 'Bearer [REDACTED]');

export const sanitizeError = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '');
    return { name: 'Error', message };
  }
  return { name: 'Error', message: String(error) };
};

export const safeUserId = (userId: string | null | undefined) => {
  if (!userId) return null;
  // UUID no es un secreto, pero lo reducimos para minimizar PII en logs.
  const normalized = String(userId);
  return normalized.length <= 10 ? normalized : `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
};

export const createEdgeLogger = (fn: string, request: Request) => {
  const requestId = getRequestId(request);
  const startMs = Date.now();

  const emit = (level: EdgeLogLevel, entry: Omit<EdgeLogEvent, 'ts' | 'level' | 'fn' | 'requestId'>) => {
    const event: EdgeLogEvent = {
      ts: nowIso(),
      level,
      fn,
      requestId,
      ...entry,
    };

    // Importante: no loguear objetos enormes. Aquí solo serializamos el evento estructurado.
    const line = JSON.stringify(event);
    if (level === 'error') {
      console.error(line);
      return;
    }
    if (level === 'warn') {
      console.warn(line);
      return;
    }
    console.log(line);
  };

  return {
    requestId,
    startMs,
    durationMs: () => Date.now() - startMs,
    info: (event: string, ctx?: Record<string, unknown>) => emit('info', { event, ctx }),
    warn: (event: string, ctx?: Record<string, unknown>, code?: EdgeErrorCode, status?: number) =>
      emit('warn', { event, ctx, code, status }),
    error: (
      event: string,
      error: unknown,
      ctx?: Record<string, unknown>,
      code?: EdgeErrorCode,
      status?: number,
    ) => emit('error', { event, ctx, code, status, err: sanitizeError(error) }),
  };
};

