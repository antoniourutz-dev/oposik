import { INTENT_PRIORITY } from './highlightPatterns';
import type { HighlightCandidate } from './spanUtils';
import type { HighlightIntent } from './types';

function betterIntent(a: HighlightIntent, b: HighlightIntent): HighlightIntent {
  return INTENT_PRIORITY[a] <= INTENT_PRIORITY[b] ? a : b;
}

/**
 * Fusiona fragmentos contiguos o casi contiguos para evitar ruido de palabras sueltas.
 * Mantiene la intención de mayor prioridad y refuerza ligeramente la puntuación por frase completa.
 */
export function mergeHighlightCandidates(text: string, candidates: HighlightCandidate[]): HighlightCandidate[] {
  if (candidates.length === 0) return [];

  const sorted = [...candidates].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: HighlightCandidate[] = [];

  const maxGap = 2;

  for (const c of sorted) {
    if (c.start < 0 || c.end > text.length || c.end <= c.start) continue;

    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...c });
      continue;
    }

    const gap = c.start - last.end;
    const overlaps = c.start < last.end;
    const canMerge =
      overlaps ||
      (gap >= 0 &&
        gap <= maxGap &&
        (c.intent === last.intent ||
          (INTENT_PRIORITY[c.intent] <= 2 && INTENT_PRIORITY[last.intent] <= 2)));

    if (canMerge) {
      const intent = betterIntent(last.intent, c.intent);
      const newScore = Math.min(100, Math.max(last.score, c.score) * 1.04);
      last.end = Math.max(last.end, c.end);
      last.start = Math.min(last.start, c.start);
      last.intent = intent;
      last.score = Math.round(newScore * 100) / 100;
    } else {
      merged.push({ ...c });
    }
  }

  return merged;
}
