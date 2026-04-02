export type {
  BuildSmartHighlightsInput,
  HighlightConfidence,
  HighlightContentRole,
  HighlightIntent,
  HighlightResult,
  HighlightSpan,
} from './types';
export { buildSmartHighlights } from './buildSmartHighlights';
export { compareAnswerOptions } from './compareAnswerOptions';
export { detectLegalReferences } from './detectLegalReferences';
export { detectDeadlineOrQuantity, detectNegationOrException } from './detectCriticalTokens';
export { detectCoreDecision } from './detectCoreDecision';
export { mergeHighlightCandidates } from './mergeHighlightCandidates';
export { selectHighlightSpans, computeHighlightConfidence } from './selectHighlightSpans';
