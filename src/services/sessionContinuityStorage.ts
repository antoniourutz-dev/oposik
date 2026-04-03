import type { PracticeMode } from '../practiceTypes';
import type { SurfaceDominantState } from '../adapters/surfaces/surfaceTypes';

const KEY = 'oposikapp_session_continuity_v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 56; // ~48h ventana “mañana”

/** Texto actual de continuidad (backlog); mantener alineado con `sessionEndAdapter` */
const CONTINUITY_BACKLOG_CURRENT =
  'Ayer retomaste repasos que tenías pendientes; hoy sigue por lo que aún queda antes de empezar un bloque nuevo.';

/** Valores guardados antes de aclarar el copy; al leer los sustituimos y reescribimos storage */
function normalizeContinuityLine(line: string): string {
  const trimmed = line.trim();
  if (
    trimmed ===
    'Ayer moviste deuda; hoy conviene seguir por lo pendiente antes de abrir mapa nuevo.'
  ) {
    return CONTINUITY_BACKLOG_CURRENT;
  }
  if (trimmed.includes('moviste deuda')) {
    return CONTINUITY_BACKLOG_CURRENT;
  }
  return line;
}

export type SessionContinuityPayloadV1 = {
  version: 1;
  finishedAt: string;
  dominantState: SurfaceDominantState;
  /** Línea breve para Home */
  continuityLine: string;
  nextStepCta: string;
  mode: PracticeMode;
  percentage: number;
};

function safeParse(raw: string | null): SessionContinuityPayloadV1 | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as SessionContinuityPayloadV1;
    if (v?.version !== 1 || typeof v.finishedAt !== 'string' || typeof v.continuityLine !== 'string') {
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

export function writeSessionContinuity(payload: SessionContinuityPayloadV1): void {
  if (typeof window === 'undefined') return;
  try {
    const line = normalizeContinuityLine(payload.continuityLine);
    window.localStorage.setItem(
      KEY,
      JSON.stringify(line === payload.continuityLine ? payload : { ...payload, continuityLine: line }),
    );
  } catch {
    /* quota / private mode */
  }
}

/** Texto para Home si la sesión guardada sigue siendo reciente */
export function readSessionContinuityLineForHome(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  const data = safeParse(raw);
  if (!data) return null;
  const t = new Date(data.finishedAt).getTime();
  if (Number.isNaN(t) || Date.now() - t > MAX_AGE_MS) return null;
  const normalized = normalizeContinuityLine(data.continuityLine);
  if (normalized !== data.continuityLine) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ ...data, continuityLine: normalized }));
    } catch {
      /* ignore */
    }
  }
  return normalized;
}

export function clearSessionContinuity(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
