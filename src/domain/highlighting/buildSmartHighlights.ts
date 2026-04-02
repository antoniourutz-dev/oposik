import { INTENT_PRIORITY } from './highlightPatterns';
import { applyPenalties } from './applyPenalties';
import { compareAnswerOptions } from './compareAnswerOptions';
import { detectCoreDecision } from './detectCoreDecision';
import { detectDeadlineOrQuantity, detectNegationOrException } from './detectCriticalTokens';
import { detectLegalReferences } from './detectLegalReferences';
import { mergeHighlightCandidates } from './mergeHighlightCandidates';
import { computeHighlightConfidence, selectHighlightSpans } from './selectHighlightSpans';
import type { HighlightCandidate } from './spanUtils';
import type { BuildSmartHighlightsInput, HighlightConfidence, HighlightContentRole, HighlightResult } from './types';

function pickBestSingle(candidates: HighlightCandidate[]): HighlightCandidate | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    const pa = INTENT_PRIORITY[a.intent];
    const pb = INTENT_PRIORITY[b.intent];
    if (pa !== pb) return pa - pb;
    return b.score - a.score;
  });
  return sorted[0] ?? null;
}

/**
 * Orquesta detectores, fusión, penalización, selección y confianza global.
 */
export function buildSmartHighlights(input: BuildSmartHighlightsInput): HighlightResult {
  const text = input.text ?? '';
  const role: HighlightContentRole = input.contentRole ?? 'question';

  if (!text.trim()) {
    return { spans: [], confidence: 'low' };
  }

  const opts = input.allOptions;
  const idx = input.optionIndex;
  const isOption =
    opts &&
    opts.length > 1 &&
    typeof idx === 'number' &&
    idx >= 0 &&
    idx < opts.length &&
    opts[idx] === text;

  const effectiveRole: HighlightContentRole = isOption ? 'answer_option' : role;

  let candidates: HighlightCandidate[] = [];

  if (isOption) {
    const byOpt = compareAnswerOptions(opts);
    candidates.push(...(byOpt[idx] ?? []));
  }

  candidates.push(
    ...detectCoreDecision(text),
    ...detectNegationOrException(text),
    ...detectDeadlineOrQuantity(text),
    ...detectLegalReferences(text),
  );

  candidates = applyPenalties(text, candidates);
  const merged = mergeHighlightCandidates(text, candidates);

  let spans = selectHighlightSpans(merged, effectiveRole);
  let confidence: HighlightConfidence = computeHighlightConfidence(spans);

  if (confidence === 'low') {
    const best = pickBestSingle(merged);
    if (
      merged.length > 0 &&
      best &&
      best.score >= 62 &&
      (best.intent !== 'legal_anchor' || best.score >= 68)
    ) {
      spans = [
        {
          start: best.start,
          end: best.end,
          score: best.score,
          intent: best.intent,
        },
      ];
      confidence = computeHighlightConfidence(spans);
      if (confidence === 'low') {
        confidence = 'medium';
      }
    } else {
      spans = [];
    }
  }

  if (text.trim().length < 28 && effectiveRole === 'question') {
    const strong = spans.filter((s) => s.score >= 74 || s.intent === 'differentiator');
    if (strong.length === 0) {
      return { spans: [], confidence: 'low' };
    }
    spans = strong.slice(0, Math.min(2, strong.length));
    confidence = computeHighlightConfidence(spans);
  }

  if (confidence === 'low' || spans.length === 0) {
    return { spans: [], confidence: 'low' };
  }

  return { spans, confidence };
}
