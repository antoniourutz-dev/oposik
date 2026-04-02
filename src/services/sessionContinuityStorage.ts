import type { PracticeMode } from '../practiceTypes';
import type { SurfaceDominantState } from '../adapters/surfaces/surfaceTypes';

const KEY = 'oposikapp_session_continuity_v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 56; // ~48h ventana “mañana”

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
    window.localStorage.setItem(KEY, JSON.stringify(payload));
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
  return data.continuityLine;
}

export function clearSessionContinuity(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
