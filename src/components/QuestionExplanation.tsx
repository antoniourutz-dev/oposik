import React from 'react';
import type { HighlightOverrideRecord } from '../domain/highlighting/highlightTypes';
import {
  findHighlightOverrideForBlock,
  useQuestionHighlightOverrides,
} from '../hooks/useQuestionHighlightOverrides';
import { buildExplanationPresentation } from '../utils/explanationPresentation';
import { HighlightedText } from './HighlightedText';

type QuestionExplanationProps = {
  questionId?: number | string | null;
  explanation: string | null;
  editorialExplanation?: string | null;
  highlightOverride?: HighlightOverrideRecord | null;
  emptyLabel?: string;
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

const toNumericQuestionId = (questionId: number | string | null | undefined) => {
  if (typeof questionId === 'number' && Number.isSafeInteger(questionId) && questionId > 0) {
    return questionId;
  }

  if (typeof questionId === 'string') {
    const parsed = Number(questionId);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
};

const QuestionExplanation: React.FC<QuestionExplanationProps> = ({
  questionId = null,
  explanation,
  editorialExplanation = null,
  highlightOverride = null,
  emptyLabel = 'Sin explicacion disponible.',
  highlightEnabled = false,
}) => {
  const numericQuestionId = toNumericQuestionId(questionId);
  const { data: overrideRecords } = useQuestionHighlightOverrides(
    highlightOverride ? null : numericQuestionId,
  );
  const explanationOverride =
    highlightOverride ?? findHighlightOverrideForBlock(overrideRecords, 'explanation');
  const presentation = buildExplanationPresentation(explanation);
  const normalizedEditorial = editorialExplanation?.trim() || null;
  const lead = normalizedEditorial || presentation?.lead || null;
  const fullExplanationText = explanation?.trim() || normalizedEditorial;
  const manualExplanationOverride =
    explanationOverride?.mode === 'manual' ? explanationOverride : null;
  const explanationHighlightsDisabled = explanationOverride?.mode === 'disabled';
  const resolvedHighlightEnabled = highlightEnabled && !explanationHighlightsDisabled;
  const shouldShowFallbackSupport =
    Boolean(normalizedEditorial) &&
    Boolean(explanation?.trim()) &&
    (!presentation || presentation.blocks.length === 0) &&
    normalizeComparable(explanation ?? '') !== normalizeComparable(normalizedEditorial ?? '');

  if (!lead) {
    return <p className="ui-body-secondary leading-[1.62] text-slate-600">{emptyLabel}</p>;
  }

  if (manualExplanationOverride && fullExplanationText) {
    return (
      <div className="rounded-[0.95rem] border border-slate-200/70 bg-white/60 px-3.5 py-3">
        <p className="ui-label text-slate-500">Explicacion</p>
        <p className="ui-body-reading mt-2 text-slate-800">
          <HighlightedText
            text={fullExplanationText}
            contentRole="explanation"
            manualOverride={manualExplanationOverride}
            disabled={!highlightEnabled}
          />
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="ui-body-reading text-slate-700">
        <HighlightedText text={lead} contentRole="explanation" disabled={!resolvedHighlightEnabled} />
      </p>

      {(presentation?.blocks ?? []).map((block) => (
        <div
          key={`${block.tone}-${block.title}`}
          className={`rounded-[0.95rem] border px-3.5 py-3 ${toneClasses[block.tone].panel}`}
        >
          <p className={`ui-label ${toneClasses[block.tone].label}`}>{block.title}</p>
          <p className={`ui-body-reading mt-2 ${toneClasses[block.tone].text}`}>
            <HighlightedText
              text={block.text}
              contentRole="explanation"
              disabled={!resolvedHighlightEnabled}
            />
          </p>
        </div>
      ))}

      {shouldShowFallbackSupport ? (
        <div className={`rounded-[0.95rem] border px-3.5 py-3 ${toneClasses.detail.panel}`}>
          <p className={`ui-label ${toneClasses.detail.label}`}>Apoyo completo</p>
          <p className={`ui-body-reading mt-2 ${toneClasses.detail.text}`}>
            <HighlightedText
              text={explanation ?? ''}
              contentRole="explanation"
              disabled={!resolvedHighlightEnabled}
            />
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default QuestionExplanation;
