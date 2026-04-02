import { CORE_DECISION_PATTERNS } from './highlightPatterns';
import { collectPatternCandidates } from './spanUtils';

export function detectCoreDecision(text: string) {
  const out = [];
  for (const p of CORE_DECISION_PATTERNS) {
    out.push(...collectPatternCandidates(text, p.regex, p.intent, p.strength));
  }
  return out;
}
