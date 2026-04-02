import { DEADLINE_QUANTITY_PATTERNS, NEGATION_EXCEPTION_PATTERNS } from './highlightPatterns';
import { collectPatternCandidates } from './spanUtils';

export function detectDeadlineOrQuantity(text: string) {
  const out = [];
  for (const p of DEADLINE_QUANTITY_PATTERNS) {
    out.push(...collectPatternCandidates(text, p.regex, p.intent, p.strength));
  }
  return out;
}

export function detectNegationOrException(text: string) {
  const out = [];
  for (const p of NEGATION_EXCEPTION_PATTERNS) {
    out.push(...collectPatternCandidates(text, p.regex, p.intent, p.strength));
  }
  return out;
}
