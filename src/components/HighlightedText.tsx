import React, { useMemo } from 'react';
import {
  buildSmartHighlights,
  type HighlightConfidence,
  type HighlightContentRole,
} from '../domain/highlighting';
import type {
  HighlightOverrideRecord,
  HighlightSpan as ManualHighlightSpan,
} from '../domain/highlighting/highlightTypes';
import { resolveHighlightsForBlock } from '../domain/highlighting/resolveHighlightsForBlock';
import { HighlightedText as HighlightedTextRenderer } from './highlighting/HighlightedText';

/**
 * Wrapper de compatibilidad de la app: resuelve auto/manual/disabled
 * y delega el pintado real al renderer base de `components/highlighting`.
 */
const AUTO_CATEGORY_BY_INTENT = {
  differentiator: 'differentiator',
  core_decision: 'core_concept',
  legal_anchor: 'legal_reference',
  negation_or_exception: 'negation',
  deadline_or_quantity: 'deadline',
} as const;

const mapAutoSpans = (
  text: string,
  contentRole: HighlightContentRole,
  allOptions?: readonly string[],
  optionIndex?: number,
): { spans: ManualHighlightSpan[]; confidence: HighlightConfidence } => {
  const { spans, confidence } = buildSmartHighlights({
    text,
    contentRole,
    allOptions,
    optionIndex,
  });

  return {
    confidence,
    spans: spans.map((span) => ({
      start: span.start,
      end: span.end,
      score: span.score,
      category: AUTO_CATEGORY_BY_INTENT[span.intent],
      colorToken: AUTO_CATEGORY_BY_INTENT[span.intent],
    })),
  };
};

export type HighlightedTextProps = {
  text: string;
  contentRole?: HighlightContentRole;
  allOptions?: readonly string[];
  optionIndex?: number;
  manualOverride?: HighlightOverrideRecord | null;
  disabled?: boolean;
  className?: string;
};

/**
 * Resalta pocos fragmentos decisivos. Con confianza baja, muestra texto plano.
 */
export function HighlightedText({
  text,
  contentRole = 'question',
  allOptions,
  optionIndex,
  manualOverride = null,
  disabled = false,
  className,
}: HighlightedTextProps) {
  const resolved = useMemo(() => {
    if (disabled || !text) {
      return {
        source: 'none' as const,
        spans: [] as ManualHighlightSpan[],
      };
    }

    const auto = mapAutoSpans(text, contentRole, allOptions, optionIndex);
    return resolveHighlightsForBlock({
      manualOverride,
      autoSpans: auto.spans,
      autoConfidence: auto.confidence,
    });
  }, [allOptions, contentRole, disabled, manualOverride, optionIndex, text]);

  if (resolved.spans.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <HighlightedTextRenderer text={text} spans={resolved.spans} className={className} />
  );
}
