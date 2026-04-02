import { WEAK_GENERIC_TOKENS } from './highlightPatterns';
import { normalizeToken } from './spanUtils';
import type { HighlightCandidate } from './spanUtils';

/**
 * Descarta fragmentos demasiado cortos, conectores o verbos genéricos aislados.
 */
export function applyPenalties(text: string, candidates: HighlightCandidate[]): HighlightCandidate[] {
  return candidates
    .map((c) => applyPenalty(text, c))
    .filter((c): c is HighlightCandidate => c !== null);
}

function applyPenalty(text: string, c: HighlightCandidate): HighlightCandidate | null {
  const raw = text.slice(c.start, c.end).trim();
  if (raw.length === 0) return null;

  if (raw.length < 3 && !/\d/.test(raw)) {
    return c.intent === 'differentiator' && raw.length >= 2 ? c : null;
  }

  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const n = normalizeToken(words[0]!);
    if (WEAK_GENERIC_TOKENS.has(n) && c.intent !== 'differentiator') {
      return null;
    }
    if (n.length <= 2 && c.intent !== 'deadline_or_quantity') {
      return null;
    }
  }

  /** Penalizar anclas legales muy cortas sin cifra (suelen ser ruido). */
  if (c.intent === 'legal_anchor' && raw.length < 6 && !/\d/.test(raw)) {
    return { ...c, score: Math.round(c.score * 0.65 * 100) / 100 };
  }

  return penalizeIsolatedModalNoise(c, raw);
}

/** Reduce score si parece un verbo deontico aislado (ya no detectamos modales como categoría propia). */
function penalizeIsolatedModalNoise(c: HighlightCandidate, raw: string): HighlightCandidate | null {
  const modals = /^(deberá|deberán|podrá|podrán|puede|pueden|debe|deben)$/i;
  if (wordsCount(raw) === 1 && modals.test(raw.trim()) && c.intent !== 'differentiator') {
    return null;
  }
  return c;
}

function wordsCount(raw: string): number {
  return raw.trim().split(/\s+/).filter(Boolean).length;
}
