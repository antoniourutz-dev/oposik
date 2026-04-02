import { INTENT_PRIORITY } from './highlightPatterns';
import type { HighlightCandidate } from './spanUtils';
import type {
  HighlightConfidence,
  HighlightContentRole,
  HighlightIntent,
  HighlightSpan,
} from './types';

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return !(a.end <= b.start || a.start >= b.end);
}

function sortCandidatesForGreedy(candidates: HighlightCandidate[]): HighlightCandidate[] {
  return [...candidates].sort((a, b) => {
    const pa = INTENT_PRIORITY[a.intent];
    const pb = INTENT_PRIORITY[b.intent];
    if (pa !== pb) return pa - pb;
    return b.score - a.score;
  });
}

/**
 * Selección no solapada con tope por rol y ligera preferencia por diversidad de intención.
 */
export function selectHighlightSpans(
  candidates: HighlightCandidate[],
  contentRole: HighlightContentRole,
): HighlightSpan[] {
  const maxByRole: Record<HighlightContentRole, number> = {
    question: 4,
    answer_option: 2,
    explanation: 2,
  };
  const max = maxByRole[contentRole];

  const sorted = sortCandidatesForGreedy(candidates);
  const picked: HighlightSpan[] = [];
  const usedIntents = new Set<HighlightIntent>();

  for (const c of sorted) {
    if (picked.length >= max) break;
    if (picked.some((p) => overlaps(p, c))) continue;

    // Evitar acumular muchas anclas legales débiles si ya hay decisión o diferenciador
    if (
      c.intent === 'legal_anchor' &&
      usedIntents.has('differentiator') &&
      c.score < 62
    ) {
      continue;
    }
    if (
      c.intent === 'legal_anchor' &&
      usedIntents.has('core_decision') &&
      picked.filter((p) => p.intent === 'legal_anchor').length >= 1
    ) {
      continue;
    }

    picked.push({
      start: c.start,
      end: c.end,
      score: c.score,
      intent: c.intent,
    });
    usedIntents.add(c.intent);
  }

  return picked.sort((a, b) => a.start - b.start);
}

export function computeHighlightConfidence(spans: HighlightSpan[]): HighlightConfidence {
  if (spans.length === 0) return 'low';

  const hasDiff = spans.some((s) => s.intent === 'differentiator');
  const strongCore = spans.some((s) => s.intent === 'core_decision' && s.score >= 78);
  const hasNeg = spans.some((s) => s.intent === 'negation_or_exception' && s.score >= 62);

  if (hasDiff || strongCore) return 'high';
  if (spans.length >= 2 && (hasNeg || spans.some((s) => s.intent === 'deadline_or_quantity'))) {
    return 'medium';
  }
  if (spans.length === 1 && spans[0]!.score >= 58) return 'medium';
  return 'low';
}
