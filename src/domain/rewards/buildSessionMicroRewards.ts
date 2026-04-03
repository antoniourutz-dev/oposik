import type { PracticeMode } from '../../practiceTypes';
import type { SurfaceDominantState } from '../../adapters/surfaces/surfaceTypes';

export type SessionMicroRewardInput = {
  dominantState: SurfaceDominantState;
  correct: number;
  incorrect: number;
  total: number;
  mode: PracticeMode;
  /** Media ms hasta primera selección (sesión); null si no hay datos */
  avgTimeToFirstMs: number | null;
  /** Algún intento cambió respuesta y acertó */
  hadChangedAnswerToCorrect: boolean;
};

const MAX_REWARDS = 2;

/**
 * Microrecompensas sobrias: proceso y no solo nota. Como mucho `MAX_REWARDS`.
 */
export function buildSessionMicroRewards(input: SessionMicroRewardInput): string[] {
  const { dominantState, correct, incorrect, total, mode, avgTimeToFirstMs, hadChangedAnswerToCorrect } = input;
  const out: string[] = [];
  if (total <= 0) return out;

  if (hadChangedAnswerToCorrect) {
    out.push('Buena verificación antes de cerrar');
  }

  if (avgTimeToFirstMs !== null && avgTimeToFirstMs >= 9000 && incorrect === 0 && correct > 0) {
    out.push('Lectura pausada en el bloque');
  }

  if (mode === 'simulacro' && correct / total >= 0.72) {
    out.push('Exposición bajo presión asentada');
  }

  if (dominantState === 'recovery' && total >= 3) {
    out.push('Vuelta al ritmo de estudio');
  }

  if (dominantState === 'backlog' && incorrect < correct) {
    out.push('Repasos pendientes bajando en esta tanda');
  }

  if (dominantState === 'errors' && incorrect > 0 && incorrect <= Math.ceil(total * 0.35)) {
    out.push('Patrón localizado sin que dispare el bloque');
  }

  if (dominantState === 'pressure' && total >= 5) {
    out.push('Entrenamiento de transferencia registrado');
  }

  if (dominantState === 'growth' && correct / total >= 0.75) {
    out.push('Base que aguanta más exigencia');
  }

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const s of out) {
    if (seen.has(s)) continue;
    seen.add(s);
    deduped.push(s);
    if (deduped.length >= MAX_REWARDS) break;
  }
  return deduped;
}
