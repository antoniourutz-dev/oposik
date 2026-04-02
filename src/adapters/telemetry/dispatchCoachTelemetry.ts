import type { CoachDecisionTelemetryEvent } from './coachTelemetryTypes';
import type { CoachEffectTelemetryEvent } from './coachTelemetryTypes';

export type CoachTelemetryEvent = CoachDecisionTelemetryEvent | CoachEffectTelemetryEvent;

const MAX_BUFFER = 40;
const buffer: CoachTelemetryEvent[] = [];

/**
 * Punto único de salida: sin red en producción por defecto.
 * Buffer en memoria para inspección / futuro envío batch.
 */
export function dispatchCoachTelemetry(event: CoachTelemetryEvent): void {
  buffer.push(event);
  if (buffer.length > MAX_BUFFER) {
    buffer.splice(0, buffer.length - MAX_BUFFER);
  }

  const isDev =
    typeof import.meta !== 'undefined' &&
    !!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;
  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug('[coach-telemetry]', event.kind, event);
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('oposik:coach-telemetry', { detail: event }));
  }
}

export function peekCoachTelemetryBuffer(): readonly CoachTelemetryEvent[] {
  return buffer;
}
