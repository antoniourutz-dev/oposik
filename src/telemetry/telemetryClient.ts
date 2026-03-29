type TelemetryKind = 'vital' | 'operation' | 'navigation' | 'query' | 'render';
type TelemetryStatus = 'success' | 'error';
type TelemetryRating = 'good' | 'needs-improvement' | 'poor' | 'unknown';
type TelemetrySeverity = 'info' | 'warning' | 'error';

export type TelemetryMeta = Record<string, unknown>;

export type TelemetryEvent = {
  kind: TelemetryKind;
  name: string;
  recordedAt: string;
  durationMs?: number;
  value?: number;
  rating?: TelemetryRating;
  status?: TelemetryStatus;
  severity?: TelemetrySeverity;
  meta?: TelemetryMeta;
};

declare global {
  interface Window {
    __oposikTelemetryBuffer?: TelemetryEvent[];
  }
}

const isBrowser = typeof window !== 'undefined';
const telemetryEndpoint = import.meta.env.VITE_TELEMETRY_ENDPOINT?.trim() || null;
const debugTelemetry =
  import.meta.env.DEV || import.meta.env.VITE_TELEMETRY_DEBUG === '1';
const sampleRate = Math.max(
  0,
  Math.min(1, Number.parseFloat(import.meta.env.VITE_TELEMETRY_SAMPLE_RATE ?? '1') || 1)
);
const bufferLimit = 200;

let telemetryInitialized = false;
let flushTimer: number | null = null;
let pendingEvents: TelemetryEvent[] = [];

const sessionId = (() => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `oposik-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
})();

const telemetryEnabled = !isBrowser || sampleRate >= 1 ? true : Math.random() <= sampleRate;

const now = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

const roundMetric = (value: number) => Math.round(value * 100) / 100;

const sanitizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? roundMetric(value) : undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 180);
  if (Array.isArray(value)) {
    return value.slice(0, 8).map((entry) => sanitizeValue(entry));
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).slice(0, 240);
    } catch {
      return '[unserializable]';
    }
  }
  return String(value).slice(0, 180);
};

const sanitizeMeta = (meta?: TelemetryMeta) => {
  if (!meta) return undefined;

  return Object.entries(meta).reduce<TelemetryMeta>((result, [key, value]) => {
    const nextValue = sanitizeValue(value);
    if (nextValue !== undefined) {
      result[key] = nextValue;
    }
    return result;
  }, {});
};

const getBuffer = () => {
  if (!isBrowser) return [] as TelemetryEvent[];
  if (!window.__oposikTelemetryBuffer) {
    window.__oposikTelemetryBuffer = [];
  }
  return window.__oposikTelemetryBuffer;
};

const scheduleFlush = () => {
  if (!telemetryEndpoint || !isBrowser || flushTimer !== null) return;

  flushTimer = window.setTimeout(() => {
    flushTelemetry('interval');
  }, 15_000);
};

const sendTelemetryBatch = (events: TelemetryEvent[], reason: string) => {
  if (!telemetryEndpoint || !isBrowser || events.length === 0) return;

  const payload = JSON.stringify({
    reason,
    sessionId,
    href: window.location.href,
    userAgent: navigator.userAgent,
    events
  });

  if (navigator.sendBeacon) {
    const success = navigator.sendBeacon(
      telemetryEndpoint,
      new Blob([payload], { type: 'application/json' })
    );

    if (success) {
      return;
    }
  }

  void fetch(telemetryEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: payload,
    keepalive: true
  }).catch(() => undefined);
};

export const flushTelemetry = (reason = 'manual') => {
  if (!telemetryEndpoint || !isBrowser || pendingEvents.length === 0) return;

  const batch = pendingEvents;
  pendingEvents = [];

  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }

  sendTelemetryBatch(batch, reason);
};

export const initializeTelemetry = () => {
  if (!isBrowser || telemetryInitialized) return;

  telemetryInitialized = true;
  getBuffer();

  window.addEventListener('pagehide', () => {
    flushTelemetry('pagehide');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushTelemetry('hidden');
    }
  });
};

const emitTelemetry = (event: Omit<TelemetryEvent, 'recordedAt'>) => {
  if (!telemetryEnabled) return;

  const normalizedEvent: TelemetryEvent = {
    ...event,
    recordedAt: new Date().toISOString(),
    durationMs:
      typeof event.durationMs === 'number' ? roundMetric(event.durationMs) : undefined,
    value: typeof event.value === 'number' ? roundMetric(event.value) : undefined,
    meta: sanitizeMeta(event.meta)
  };

  if (isBrowser) {
    const buffer = getBuffer();
    buffer.push(normalizedEvent);
    if (buffer.length > bufferLimit) {
      buffer.splice(0, buffer.length - bufferLimit);
    }
  }

  if (debugTelemetry) {
    console.info('[telemetry]', normalizedEvent.kind, normalizedEvent.name, normalizedEvent);
  }

  if (telemetryEndpoint && isBrowser) {
    pendingEvents.push(normalizedEvent);
    scheduleFlush();
  }
};

export const recordVital = (
  name: string,
  value: number,
  rating: TelemetryRating,
  meta?: TelemetryMeta
) => {
  emitTelemetry({
    kind: 'vital',
    name,
    value,
    rating,
    severity: rating === 'poor' ? 'warning' : 'info',
    status: 'success',
    meta
  });
};

export const recordNavigation = (name: string, meta?: TelemetryMeta) => {
  emitTelemetry({
    kind: 'navigation',
    name,
    status: 'success',
    meta
  });
};

export const recordRender = (
  name: string,
  {
    durationMs,
    meta,
    severity = 'info',
    status = 'success',
    value
  }: {
    durationMs?: number;
    meta?: TelemetryMeta;
    severity?: TelemetrySeverity;
    status?: TelemetryStatus;
    value?: number;
  } = {}
) => {
  emitTelemetry({
    kind: 'render',
    name,
    durationMs,
    meta,
    severity,
    status,
    value
  });
};

export const recordQueryError = (name: string, meta?: TelemetryMeta) => {
  emitTelemetry({
    kind: 'query',
    name,
    status: 'error',
    severity: 'error',
    meta
  });
};

export const trackAsyncOperation = async <T>(
  name: string,
  run: () => Promise<T>,
  meta?: TelemetryMeta
): Promise<T> => {
  const startedAt = now();

  try {
    const result = await run();
    emitTelemetry({
      kind: 'operation',
      name,
      durationMs: now() - startedAt,
      status: 'success',
      severity: 'info',
      meta
    });
    return result;
  } catch (error) {
    emitTelemetry({
      kind: 'operation',
      name,
      durationMs: now() - startedAt,
      status: 'error',
      severity: 'error',
      meta: {
        ...meta,
        error:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : 'unknown error'
      }
    });
    throw error;
  }
};
