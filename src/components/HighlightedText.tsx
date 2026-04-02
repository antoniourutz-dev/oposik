import React, { useMemo } from 'react';
import {
  buildSmartHighlights,
  type HighlightConfidence,
  type HighlightContentRole,
  type HighlightIntent,
  type HighlightSpan,
} from '../domain/highlighting';

/** Estilo editorial discreto: lavanda suave, sin efecto rotulador agresivo. */
const INTENT_MARK_CLASS: Record<HighlightIntent, string> = {
  differentiator:
    'rounded-[0.3rem] font-semibold text-slate-900 bg-[#ebe4ff]/95 [box-decoration-break:clone] ring-1 ring-violet-200/35',
  core_decision:
    'rounded-[0.3rem] font-semibold text-slate-900 bg-[#f0ecff]/90 [box-decoration-break:clone]',
  legal_anchor:
    'rounded-[0.3rem] font-semibold text-slate-800 bg-[#ede9fe]/75 [box-decoration-break:clone]',
  negation_or_exception:
    'rounded-[0.3rem] font-semibold text-slate-900 bg-[#f5f0ff]/88 [box-decoration-break:clone]',
  deadline_or_quantity:
    'rounded-[0.3rem] font-semibold text-slate-900 bg-[#f3f1fa]/92 [box-decoration-break:clone]',
};

function renderWithSpans(text: string, spans: HighlightSpan[]): React.ReactNode[] {
  const sorted = [...spans]
    .filter((s) => s.start >= 0 && s.end <= text.length && s.end > s.start)
    .sort((a, b) => a.start - b.start);

  if (sorted.length === 0) {
    return [text];
  }

  const nodes: React.ReactNode[] = [];
  let last = 0;
  sorted.forEach((s, i) => {
    if (s.start > last) {
      nodes.push(<span key={`t-${last}-${s.start}`}>{text.slice(last, s.start)}</span>);
    }
    nodes.push(
      <mark
        key={`h-${i}-${s.start}-${s.end}`}
        className={INTENT_MARK_CLASS[s.intent] ?? INTENT_MARK_CLASS.core_decision}
        data-highlight-intent={s.intent}
        data-highlight-score={String(Math.round(s.score * 100) / 100)}
      >
        {text.slice(s.start, s.end)}
      </mark>,
    );
    last = s.end;
  });
  if (last < text.length) {
    nodes.push(<span key={`t-${last}-end`}>{text.slice(last)}</span>);
  }
  return nodes;
}

export type HighlightedTextProps = {
  text: string;
  contentRole?: HighlightContentRole;
  allOptions?: readonly string[];
  optionIndex?: number;
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
  disabled = false,
  className,
}: HighlightedTextProps) {
  const { nodes, plain, confidence } = useMemo(() => {
    if (disabled || !text) {
      return {
        nodes: null as React.ReactNode[] | null,
        plain: true,
        confidence: 'low' as HighlightConfidence,
      };
    }
    const { spans, confidence: conf } = buildSmartHighlights({
      text,
      contentRole,
      allOptions,
      optionIndex,
    });
    if (conf === 'low' || spans.length === 0) {
      return { nodes: null, plain: true, confidence: conf };
    }
    return { nodes: renderWithSpans(text, spans), plain: false, confidence: conf };
  }, [text, contentRole, allOptions, optionIndex, disabled]);

  if (plain || !nodes) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className} data-highlight-confidence={confidence}>
      {nodes}
    </span>
  );
}
