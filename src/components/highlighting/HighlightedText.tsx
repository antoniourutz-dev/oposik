import React from 'react';
import { cn } from '../../lib/utils';
import type { HighlightCategory, HighlightSpan } from '../../domain/highlighting/highlightTypes';

/** Renderer base del sistema nuevo: solo pinta spans ya resueltos. */
const HIGHLIGHT_CATEGORY_CLASSNAMES: Record<HighlightCategory, string> = {
  legal_reference:
    'rounded-[0.3rem] bg-violet-100/95 text-violet-950 ring-1 ring-violet-200/45 font-semibold [box-decoration-break:clone]',
  core_concept:
    'rounded-[0.3rem] bg-indigo-100/90 text-indigo-950 font-semibold [box-decoration-break:clone]',
  negation:
    'rounded-[0.3rem] bg-rose-100/92 text-rose-950 font-semibold [box-decoration-break:clone]',
  condition:
    'rounded-[0.3rem] bg-sky-100/92 text-sky-950 font-semibold [box-decoration-break:clone]',
  deadline:
    'rounded-[0.3rem] bg-amber-100/94 text-amber-950 font-semibold [box-decoration-break:clone]',
  subject:
    'rounded-[0.3rem] bg-emerald-100/92 text-emerald-950 font-semibold [box-decoration-break:clone]',
  differentiator:
    'rounded-[0.3rem] bg-slate-200/92 text-slate-950 font-semibold [box-decoration-break:clone]',
};

const normalizeSpans = (text: string, spans: HighlightSpan[]) =>
  [...spans]
    .filter(
      (span) =>
        Number.isFinite(span.start) &&
        Number.isFinite(span.end) &&
        span.start >= 0 &&
        span.end > span.start &&
        span.end <= text.length,
    )
    .sort((left, right) => left.start - right.start);

const renderFragments = (text: string, spans: HighlightSpan[]) => {
  const normalized = normalizeSpans(text, spans);

  if (normalized.length === 0) {
    return [text];
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  normalized.forEach((span, index) => {
    if (span.start > cursor) {
      nodes.push(<span key={`plain-${cursor}-${span.start}`}>{text.slice(cursor, span.start)}</span>);
    }

    const token = span.colorToken ?? span.category;
    nodes.push(
      <mark
        key={`highlight-${index}-${span.start}-${span.end}`}
        className={HIGHLIGHT_CATEGORY_CLASSNAMES[token] ?? HIGHLIGHT_CATEGORY_CLASSNAMES.core_concept}
        data-highlight-category={span.category}
        data-highlight-score={String(Math.round(span.score * 100) / 100)}
      >
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = span.end;
  });

  if (cursor < text.length) {
    nodes.push(<span key={`plain-${cursor}-end`}>{text.slice(cursor)}</span>);
  }

  return nodes;
};

export type HighlightedTextProps = {
  text: string;
  spans: HighlightSpan[];
  className?: string;
};

export function HighlightedText({ text, spans, className }: HighlightedTextProps) {
  return <span className={cn('whitespace-pre-wrap break-words', className)}>{renderFragments(text, spans)}</span>;
}
