import { LEGAL_ANCHOR_PATTERNS } from './highlightPatterns';
import { collectPatternCandidates } from './spanUtils';

export function detectLegalReferences(text: string) {
  const out = [];
  for (const p of LEGAL_ANCHOR_PATTERNS) {
    out.push(...collectPatternCandidates(text, p.regex, p.intent, p.strength));
  }
  return out;
}
