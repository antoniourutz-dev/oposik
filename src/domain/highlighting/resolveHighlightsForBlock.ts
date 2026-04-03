import type {
  HighlightOverrideRecord,
  HighlightSource,
  HighlightSpan,
} from './highlightTypes';

export function resolveHighlightsForBlock(params: {
  manualOverride?: HighlightOverrideRecord | null;
  autoSpans?: HighlightSpan[];
  autoConfidence?: 'low' | 'medium' | 'high';
}): {
  source: HighlightSource;
  spans: HighlightSpan[];
} {
  const { manualOverride = null, autoSpans = [], autoConfidence = 'low' } = params;

  if (manualOverride?.mode === 'manual') {
    return {
      source: 'manual',
      spans: manualOverride.spans ?? [],
    };
  }

  if (manualOverride?.mode === 'disabled') {
    return {
      source: 'disabled',
      spans: [],
    };
  }

  if (autoConfidence !== 'low' && autoSpans.length > 0) {
    return {
      source: 'auto',
      spans: autoSpans,
    };
  }

  return {
    source: 'none',
    spans: [],
  };
}
