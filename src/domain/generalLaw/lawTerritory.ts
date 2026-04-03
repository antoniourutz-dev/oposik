import type { PracticeLawBlockPerformance, PracticeLawPerformance } from '../../practiceTypes';
import { MIN_QUESTIONS_FOR_BLOCK_TERRITORY } from './constants';

export type LawTerritoryContinuityHint = {
  lawTrainingIntent?: string | null;
  blockTrainingFocus?: string | null;
};

/**
 * No recomendar bloques con menos preguntas que el umbral (producto: sin masa útil).
 */
export function isBlockEligibleForTerritoryRecommendation(
  block: PracticeLawBlockPerformance,
  minQuestions: number = MIN_QUESTIONS_FOR_BLOCK_TERRITORY,
): boolean {
  return (block.questionCount ?? 0) >= minQuestions;
}

/**
 * Elige el bloque peor en precisión entre los que tienen masa suficiente (para microfoco / coach).
 */
export function pickWeakestRecommendableBlock(
  blocks: PracticeLawBlockPerformance[] | undefined,
  minQuestions: number = MIN_QUESTIONS_FOR_BLOCK_TERRITORY,
): PracticeLawBlockPerformance | null {
  if (!blocks?.length) return null;
  const eligible = blocks.filter((b) => isBlockEligibleForTerritoryRecommendation(b, minQuestions));
  if (!eligible.length) return null;
  return eligible.reduce((worst, b) => {
    const wa = worst.accuracyRate ?? 1;
    const ba = b.accuracyRate ?? 1;
    return ba < wa ? b : worst;
  });
}

/**
 * Empareja la sesión monográfica por ley (`title` = `ley_referencia`) con el breakdown del dashboard.
 */
export function matchLawPerformanceForSessionTitle(
  sessionTitle: string,
  lawBreakdown: PracticeLawPerformance[] | undefined,
): PracticeLawPerformance | null {
  if (!lawBreakdown?.length) return null;
  const t = sessionTitle.trim();
  return lawBreakdown.find((l) => l.ley_referencia.trim() === t) ?? null;
}

/**
 * Hint para Session End / continuidad: intención de ley + opcionalmente foco del bloque más débil recomendable.
 */
export function resolveLawTerritoryContinuityHint(
  sessionTitle: string,
  lawBreakdown: PracticeLawPerformance[] | undefined,
): LawTerritoryContinuityHint | undefined {
  const law = matchLawPerformanceForSessionTitle(sessionTitle, lawBreakdown);
  if (!law) return undefined;

  const hint: LawTerritoryContinuityHint = {};
  if (law.trainingIntent?.trim()) {
    hint.lawTrainingIntent = law.trainingIntent.trim();
  }

  const weakest = pickWeakestRecommendableBlock(law.blocks);
  if (weakest?.trainingFocus?.trim()) {
    hint.blockTrainingFocus = weakest.trainingFocus.trim();
  }

  return hint.lawTrainingIntent || hint.blockTrainingFocus ? hint : undefined;
}

/**
 * Añade narrativa de territorio a la línea base de continuidad (Home).
 */
export function appendTerritoryToContinuityBridge(
  baseLine: string,
  territory?: LawTerritoryContinuityHint | null,
): string {
  if (!territory) return baseLine;
  const parts: string[] = [baseLine.trim()];
  if (territory.lawTrainingIntent?.trim()) {
    parts.push(`Territorio: ${territory.lawTrainingIntent.trim()}`);
  }
  if (territory.blockTrainingFocus?.trim()) {
    parts.push(`Microfoco util: ${territory.blockTrainingFocus.trim()}`);
  }
  return parts.join(' ');
}

/** Subtítulo en Study: intención de entrenamiento si existe; si no, referencia legal corta. */
export function buildStudyLawDescription(law: PracticeLawPerformance): string {
  const intent = law.trainingIntent?.trim();
  if (intent) return intent;
  const short = law.shortTitle?.trim();
  if (short) return short;
  return law.ley_referencia;
}
