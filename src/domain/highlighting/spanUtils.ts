import { INTENT_WEIGHT } from './highlightPatterns';
import type { HighlightIntent } from './types';

export type HighlightCandidate = {
  start: number;
  end: number;
  intent: HighlightIntent;
  score: number;
};

export function scoreIntent(intent: HighlightIntent, strength: number): number {
  return Math.round(INTENT_WEIGHT[intent] * strength * 100) / 100;
}

/** Ejecuta regex global y devuelve candidatos con puntuación ponderada. */
export function collectPatternCandidates(
  text: string,
  regex: RegExp,
  intent: HighlightIntent,
  strength: number,
): HighlightCandidate[] {
  const rx = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  const out: HighlightCandidate[] = [];
  const clone = new RegExp(rx.source, rx.flags);
  let m: RegExpExecArray | null;
  while ((m = clone.exec(text)) !== null) {
    const raw = m[0];
    if (!raw) continue;
    const start = m.index;
    const end = start + raw.length;
    if (end > start) {
      out.push({
        start,
        end,
        intent,
        score: scoreIntent(intent, strength),
      });
    }
    if (m.index === clone.lastIndex) {
      clone.lastIndex += 1;
    }
  }
  return out;
}

export function normalizeToken(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9áéíóúüñ]/gi, '');
}
