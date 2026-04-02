import React from 'react';
import { buildExplanationPresentation } from '../utils/explanationPresentation';
import { HighlightedText } from './HighlightedText';

type QuestionExplanationProps = {
  explanation: string | null;
  editorialExplanation?: string | null;
  emptyLabel?: string;
  /** Si es false, desactiva el resaltado en el texto de la explicación. */
  highlightEnabled?: boolean;
};

const toneClasses = {
  basis: {
    panel:
      'border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.92),rgba(254,243,199,0.7))]',
    label: 'text-amber-700',
    text: 'text-amber-950',
  },
  trap: {
    panel:
      'border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,241,242,0.94),rgba(255,228,230,0.78))]',
    label: 'text-rose-700',
    text: 'text-rose-950',
  },
  detail: {
    panel: 'border-slate-200/70 bg-white/55',
    label: 'text-slate-500',
    text: 'text-slate-800',
  },
} as const;

const normalizeComparable = (value: string) =>
  value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

const QuestionExplanation: React.FC<QuestionExplanationProps> = ({
  explanation,
  editorialExplanation = null,
  emptyLabel = 'Sin explicacion disponible.',
  highlightEnabled = true,
}) => {
  const presentation = buildExplanationPresentation(explanation);
  const normalizedEditorial = editorialExplanation?.trim() || null;
  const lead = normalizedEditorial || presentation?.lead || null;
  const shouldShowFallbackSupport =
    Boolean(normalizedEditorial) &&
    Boolean(explanation?.trim()) &&
    (!presentation || presentation.blocks.length === 0) &&
    normalizeComparable(explanation ?? '') !== normalizeComparable(normalizedEditorial ?? '');

  if (!lead) {
    return (
      <p className="text-[13px] leading-5.5 text-slate-600 sm:text-sm sm:leading-6">{emptyLabel}</p>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[13px] font-medium leading-5.5 text-slate-700 sm:text-sm sm:leading-6">
        <HighlightedText text={lead} contentRole="explanation" disabled={!highlightEnabled} />
      </p>

      {(presentation?.blocks ?? []).map((block) => (
        <div
          key={`${block.tone}-${block.title}`}
          className={`rounded-[0.95rem] border px-3 py-2.5 ${toneClasses[block.tone].panel}`}
        >
          <p
            className={`text-[9px] font-extrabold uppercase tracking-[0.14em] ${toneClasses[block.tone].label}`}
          >
            {block.title}
          </p>
          <p
            className={`mt-1.5 text-[13px] font-medium leading-5.5 sm:text-sm sm:leading-6 ${toneClasses[block.tone].text}`}
          >
            <HighlightedText text={block.text} contentRole="explanation" />
          </p>
        </div>
      ))}

      {shouldShowFallbackSupport ? (
        <div className={`rounded-[0.95rem] border px-3 py-2.5 ${toneClasses.detail.panel}`}>
          <p
            className={`text-[9px] font-extrabold uppercase tracking-[0.14em] ${toneClasses.detail.label}`}
          >
            Apoyo completo
          </p>
          <p
            className={`mt-1.5 text-[13px] font-medium leading-5.5 sm:text-sm sm:leading-6 ${toneClasses.detail.text}`}
          >
            <HighlightedText
              text={explanation ?? ''}
              contentRole="explanation"
              disabled={!highlightEnabled}
            />
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default QuestionExplanation;
