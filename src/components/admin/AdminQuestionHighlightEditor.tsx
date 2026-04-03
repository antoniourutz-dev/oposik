import React, { useMemo, useRef, useState } from 'react';
import { Check, EyeOff, Highlighter, RefreshCcw, Trash2 } from 'lucide-react';
import { buildSmartHighlights, type HighlightConfidence } from '../../domain/highlighting';
import {
  HIGHLIGHT_CATEGORIES,
  type HighlightBlockType,
  type HighlightCategory,
  type HighlightOverrideRecord,
  type HighlightSpan,
} from '../../domain/highlighting/highlightTypes';
import { resolveHighlightsForBlock } from '../../domain/highlighting/resolveHighlightsForBlock';
import { validateHighlightSpans } from '../../domain/highlighting/validateHighlightSpans';
import { useAdminQuestionHighlights } from '../../hooks/useAdminQuestionHighlights';
import { findHighlightOverrideForBlock } from '../../hooks/useQuestionHighlightOverrides';
import { cn } from '../../lib/utils';
import { HighlightedText } from '../highlighting/HighlightedText';
import { HighlightCategoryPicker } from './HighlightCategoryPicker';

type AutoHighlightState = {
  spans: HighlightSpan[];
  confidence?: HighlightConfidence;
};

type AdminQuestionHighlightEditorProps = {
  questionId: number;
  questionText: string;
  answers: string[];
  explanation?: string | null;
  autoHighlights?: {
    question?: AutoHighlightState;
    answers?: Array<AutoHighlightState | undefined>;
    explanation?: AutoHighlightState;
  };
  currentUserId: string;
};

type BlockDescriptor = {
  key: string;
  title: string;
  contentType: HighlightBlockType;
  answerIndex: number | null;
  text: string;
  auto: AutoHighlightState;
};

type PendingSelection = {
  blockKey: string;
  start: number;
  end: number;
  text: string;
  category: HighlightCategory;
};

const AUTO_CATEGORY_BY_INTENT = {
  differentiator: 'differentiator',
  core_decision: 'core_concept',
  legal_anchor: 'legal_reference',
  negation_or_exception: 'negation',
  deadline_or_quantity: 'deadline',
} as const;

const SOURCE_BADGE_STYLES = {
  auto: 'border-sky-200 bg-sky-50 text-sky-800',
  manual: 'border-violet-200 bg-violet-50 text-violet-800',
  disabled: 'border-slate-200 bg-slate-100 text-slate-700',
  none: 'border-slate-200 bg-white text-slate-500',
} as const;

const toBlockKey = (contentType: HighlightBlockType, answerIndex: number | null) =>
  `${contentType}:${answerIndex ?? 'root'}`;

const sortSpans = (spans: HighlightSpan[]) =>
  [...spans].sort((left, right) => left.start - right.start || left.end - right.end);

const buildFallbackAutoHighlight = ({
  text,
  contentType,
  allAnswers,
  answerIndex,
}: {
  text: string;
  contentType: HighlightBlockType;
  allAnswers: string[];
  answerIndex: number | null;
}): AutoHighlightState => {
  if (!text.trim()) {
    return { spans: [], confidence: 'low' };
  }

  const autoResult = buildSmartHighlights({
    text,
    contentRole:
      contentType === 'question' ? 'question' : contentType === 'answer' ? 'answer_option' : 'explanation',
    allOptions: contentType === 'answer' ? allAnswers : undefined,
    optionIndex: contentType === 'answer' ? answerIndex ?? undefined : undefined,
  });

  return {
    confidence: autoResult.confidence,
    spans: autoResult.spans.map((span) => ({
      start: span.start,
      end: span.end,
      score: span.score,
      category: AUTO_CATEGORY_BY_INTENT[span.intent],
      colorToken: AUTO_CATEGORY_BY_INTENT[span.intent],
    })),
  };
};

const toSelectionOffsets = (container: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }

  const offsetRange = range.cloneRange();
  offsetRange.selectNodeContents(container);
  offsetRange.setEnd(range.startContainer, range.startOffset);
  const rawStart = offsetRange.toString().length;
  const rawText = range.toString();
  const rawEnd = rawStart + rawText.length;

  const leadingWhitespace = rawText.match(/^\s+/u)?.[0].length ?? 0;
  const trailingWhitespace = rawText.match(/\s+$/u)?.[0].length ?? 0;
  const start = rawStart + leadingWhitespace;
  const end = rawEnd - trailingWhitespace;

  if (end <= start) {
    return null;
  }

  return {
    start,
    end,
    text: container.textContent?.slice(start, end) ?? rawText.trim(),
  };
};

const captureSelectionForBlock = ({
  block,
  blockRefs,
  setPendingSelection,
  setBlockErrors,
}: {
  block: BlockDescriptor;
  blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  setPendingSelection: React.Dispatch<React.SetStateAction<PendingSelection | null>>;
  setBlockErrors: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
}) => {
  const container = blockRefs.current[block.key];
  if (!container) return false;

  const offsets = toSelectionOffsets(container);
  if (!offsets) {
    setBlockErrors((current) => ({
      ...current,
      [block.key]: 'Selecciona primero un fragmento dentro de este bloque.',
    }));
    return false;
  }

  setPendingSelection({
    blockKey: block.key,
    start: offsets.start,
    end: offsets.end,
    text: offsets.text,
    category: HIGHLIGHT_CATEGORIES[0],
  });
  setBlockErrors((current) => ({
    ...current,
    [block.key]: null,
  }));
  return true;
};

const resolveEditorState = ({
  block,
  override,
  draftSpans,
  isDirty,
}: {
  block: BlockDescriptor;
  override: HighlightOverrideRecord | null;
  draftSpans: HighlightSpan[] | undefined;
  isDirty: boolean;
}) => {
  const previewOverride =
    isDirty && draftSpans !== undefined
      ? ({
          id: 'draft',
          questionId: 0,
          contentType: block.contentType,
          answerIndex: block.answerIndex,
          mode: 'manual',
          spans: draftSpans,
          version: 0,
          isActive: true,
          createdBy: '',
          updatedBy: '',
          createdAt: '',
          updatedAt: '',
        } satisfies HighlightOverrideRecord)
      : override;

  return resolveHighlightsForBlock({
    manualOverride: previewOverride,
    autoSpans: block.auto.spans,
    autoConfidence: block.auto.confidence ?? 'low',
  });
};

const describeSource = (
  override: HighlightOverrideRecord | null,
  resolvedSource: 'manual' | 'disabled' | 'auto' | 'none',
) => {
  if (override?.mode === 'disabled') return 'Disabled';
  if (resolvedSource === 'manual') return 'Manual';
  if (resolvedSource === 'auto') return 'Auto';
  return 'Sin resaltado';
};

export function AdminQuestionHighlightEditor({
  questionId,
  questionText,
  answers,
  explanation = null,
  autoHighlights,
  currentUserId,
}: AdminQuestionHighlightEditorProps) {
  const {
    data: overrideRecords,
    error,
    loading,
    saving,
    saveManual,
    disableBlock,
    restoreAutomatic,
    refresh,
  } = useAdminQuestionHighlights({
    questionId,
    currentUserId,
  });
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [armedBlockKey, setArmedBlockKey] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [drafts, setDrafts] = useState<Record<string, HighlightSpan[]>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Record<string, boolean>>({});
  const [blockErrors, setBlockErrors] = useState<Record<string, string | null>>({});
  const blocks = useMemo<BlockDescriptor[]>(() => {
    const next: BlockDescriptor[] = [
      {
        key: toBlockKey('question', null),
        title: 'Pregunta',
        contentType: 'question',
        answerIndex: null,
        text: questionText,
        auto:
          autoHighlights?.question ??
          buildFallbackAutoHighlight({
            text: questionText,
            contentType: 'question',
            allAnswers: answers,
            answerIndex: null,
          }),
      },
    ];

    answers.forEach((answerText, answerIndex) => {
      next.push({
        key: toBlockKey('answer', answerIndex),
        title: `Respuesta ${answerIndex + 1}`,
        contentType: 'answer',
        answerIndex,
        text: answerText,
        auto:
          autoHighlights?.answers?.[answerIndex] ??
          buildFallbackAutoHighlight({
            text: answerText,
            contentType: 'answer',
            allAnswers: answers,
            answerIndex,
          }),
      });
    });

    if (explanation?.trim()) {
      next.push({
        key: toBlockKey('explanation', null),
        title: 'Explicacion',
        contentType: 'explanation',
        answerIndex: null,
        text: explanation,
        auto:
          autoHighlights?.explanation ??
          buildFallbackAutoHighlight({
            text: explanation,
            contentType: 'explanation',
            allAnswers: answers,
            answerIndex: null,
          }),
      });
    }

    return next;
  }, [answers, autoHighlights, explanation, questionText]);

  const setBlockDraft = (blockKey: string, spans: HighlightSpan[]) => {
    setDrafts((current) => ({
      ...current,
      [blockKey]: sortSpans(spans),
    }));
    setDirtyKeys((current) => ({
      ...current,
      [blockKey]: true,
    }));
  };

  const clearSelection = () => {
    setPendingSelection(null);
    setArmedBlockKey(null);
    window.getSelection()?.removeAllRanges();
  };

  const resetBlockState = (blockKey: string) => {
    setDrafts((current) => {
      const next = { ...current };
      delete next[blockKey];
      return next;
    });
    setDirtyKeys((current) => {
      const next = { ...current };
      delete next[blockKey];
      return next;
    });
    setBlockErrors((current) => {
      const next = { ...current };
      delete next[blockKey];
      return next;
    });
    setPendingSelection((current) => (current?.blockKey === blockKey ? null : current));
    setArmedBlockKey((current) => (current === blockKey ? null : current));
  };

  const handleSelectionCapture = (block: BlockDescriptor) => {
    if (armedBlockKey !== block.key) return;
    captureSelectionForBlock({
      block,
      blockRefs,
      setPendingSelection,
      setBlockErrors,
    });
  };

  const handleConfirmSelection = (block: BlockDescriptor) => {
    if (!pendingSelection || pendingSelection.blockKey !== block.key) return;

    const currentOverride = findHighlightOverrideForBlock(
      overrideRecords,
      block.contentType,
      block.answerIndex,
    );
    const baseSpans =
      dirtyKeys[block.key]
        ? drafts[block.key] ?? []
        : currentOverride?.mode === 'manual'
          ? currentOverride.spans
          : [];
    const nextSpans = sortSpans([
      ...baseSpans,
      {
        start: pendingSelection.start,
        end: pendingSelection.end,
        category: pendingSelection.category,
        colorToken: pendingSelection.category,
        score: 1,
      },
    ]);
    const validation = validateHighlightSpans({
      text: block.text,
      spans: nextSpans,
      blockType: block.contentType,
    });

    if (!validation.valid) {
      setBlockErrors((current) => ({
        ...current,
        [block.key]: validation.errors.join(' '),
      }));
      return;
    }

    setBlockDraft(block.key, nextSpans);
    setBlockErrors((current) => ({
      ...current,
      [block.key]: null,
    }));
    clearSelection();
  };

  const handleDeleteSpan = (blockKey: string, spanIndex: number, currentSpans: HighlightSpan[]) => {
    const nextSpans = currentSpans.filter((_, index) => index !== spanIndex);
    setBlockDraft(blockKey, nextSpans);
  };

  const handleSaveManual = async (block: BlockDescriptor, spans: HighlightSpan[]) => {
    const validation = validateHighlightSpans({
      text: block.text,
      spans,
      blockType: block.contentType,
    });

    if (!validation.valid) {
      setBlockErrors((current) => ({
        ...current,
        [block.key]: validation.errors.join(' '),
      }));
      return;
    }

    if (spans.length === 0) {
      setBlockErrors((current) => ({
        ...current,
        [block.key]: 'No hay spans manuales. Usa "Desactivar highlights" o "Restaurar automatico".',
      }));
      return;
    }

    try {
      await saveManual({
        contentType: block.contentType,
        answerIndex: block.answerIndex,
        spans,
      });
      resetBlockState(block.key);
    } catch (saveError) {
      setBlockErrors((current) => ({
        ...current,
        [block.key]:
          saveError instanceof Error
            ? saveError.message
            : 'No se ha podido guardar el override manual.',
      }));
    }
  };

  const handleDisableBlock = async (block: BlockDescriptor) => {
    try {
      await disableBlock({
        contentType: block.contentType,
        answerIndex: block.answerIndex,
      });
      resetBlockState(block.key);
    } catch (disableError) {
      setBlockErrors((current) => ({
        ...current,
        [block.key]:
          disableError instanceof Error
            ? disableError.message
            : 'No se ha podido desactivar el bloque.',
      }));
    }
  };

  const handleRestoreAutomatic = async (block: BlockDescriptor) => {
    try {
      await restoreAutomatic({
        contentType: block.contentType,
        answerIndex: block.answerIndex,
      });
      resetBlockState(block.key);
    } catch (restoreError) {
      setBlockErrors((current) => ({
        ...current,
        [block.key]:
          restoreError instanceof Error
            ? restoreError.message
            : 'No se ha podido restaurar el resaltado automatico.',
      }));
    }
  };

  return (
    <section className="space-y-4 rounded-[1.4rem] border border-slate-200/70 bg-white/92 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ui-label text-slate-500">Highlights admin</p>
          <h2 className="text-[1.08rem] font-black tracking-[-0.02em] text-slate-950">
            Editor manual de resaltado
          </h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            Selecciona texto, asigna una categoria oficial y guarda el bloque. El override se
            comparte con todos los usuarios.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void refresh();
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RefreshCcw size={14} />
          Recargar
        </button>
      </div>

      {error ? (
        <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {blocks.map((block) => {
          const override = findHighlightOverrideForBlock(
            overrideRecords,
            block.contentType,
            block.answerIndex,
          );
          const currentManualSpans =
            dirtyKeys[block.key]
              ? drafts[block.key] ?? []
              : override?.mode === 'manual'
                ? override.spans
                : [];
          const resolved = resolveEditorState({
            block,
            override,
            draftSpans: drafts[block.key],
            isDirty: Boolean(dirtyKeys[block.key]),
          });
          const sourceLabel = describeSource(override, resolved.source);
          const blockError = blockErrors[block.key];
          const isPendingBlock = pendingSelection?.blockKey === block.key;

          return (
            <article
              key={block.key}
              className="rounded-[1.15rem] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.95))] p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.16)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="ui-label text-slate-500">{block.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]',
                        SOURCE_BADGE_STYLES[resolved.source],
                      )}
                    >
                      {sourceLabel}
                    </span>
                    {dirtyKeys[block.key] ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-amber-700">
                        Cambios sin guardar
                      </span>
                    ) : null}
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      {block.text.length} caracteres
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setArmedBlockKey((current) => (current === block.key ? null : block.key))
                    }
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-colors',
                      armedBlockKey === block.key
                        ? 'border-violet-200 bg-violet-50 text-violet-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <Highlighter size={14} />
                    Anadir marcado
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleRestoreAutomatic(block);
                    }}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCcw size={14} />
                    Restaurar automatico
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDisableBlock(block);
                    }}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <EyeOff size={14} />
                    Desactivar highlights
                  </button>
                </div>
              </div>

              <div
                ref={(node) => {
                  blockRefs.current[block.key] = node;
                }}
                onPointerUp={() => handleSelectionCapture(block)}
                onMouseUp={() => handleSelectionCapture(block)}
                onKeyUp={() => handleSelectionCapture(block)}
                className={cn(
                  'mt-4 rounded-[1rem] border px-4 py-3 text-[0.98rem] font-medium leading-[1.72] tracking-[-0.01em] text-slate-800 select-text',
                  armedBlockKey === block.key
                    ? 'border-violet-300 bg-violet-50/40'
                    : 'border-slate-200 bg-white/75',
                )}
              >
                <HighlightedText text={block.text} spans={resolved.spans} />
              </div>

              {armedBlockKey === block.key ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold leading-[1.55] text-violet-700">
                    1. Selecciona texto dentro del bloque. 2. Pulsa "Usar seleccion" si no se captura sola.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      captureSelectionForBlock({
                        block,
                        blockRefs,
                        setPendingSelection,
                        setBlockErrors,
                      })
                    }
                    className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-violet-700 transition-colors hover:bg-violet-50"
                  >
                    Usar seleccion
                  </button>
                </div>
              ) : null}

              {isPendingBlock ? (
                <div className="mt-3 rounded-[1rem] border border-violet-200 bg-violet-50/65 p-3.5">
                  <p className="ui-label text-violet-700">Fragmento seleccionado</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                    "{pendingSelection.text}"
                  </p>
                  <HighlightCategoryPicker
                    className="mt-3"
                    value={pendingSelection.category}
                    onChange={(value) => {
                      setPendingSelection((current) =>
                        current ? { ...current, category: value } : current,
                      );
                    }}
                    disabled={saving}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmSelection(block)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={14} />
                      Confirmar fragmento
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="ui-label text-slate-500">Spans manuales</p>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    {currentManualSpans.length} span{currentManualSpans.length === 1 ? '' : 's'}
                  </p>
                </div>
                {currentManualSpans.length > 0 ? (
                  <div className="space-y-2">
                    {currentManualSpans.map((span, spanIndex) => (
                      <div
                        key={`${span.start}-${span.end}-${span.category}-${spanIndex}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                            {span.category} - {span.start}-{span.end}
                          </p>
                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                            "{block.text.slice(span.start, span.end)}"
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpan(block.key, spanIndex, currentManualSpans)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-rose-700 transition-colors hover:bg-rose-100"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[0.95rem] border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-sm font-semibold text-slate-500">
                    No hay spans manuales para este bloque.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Auto
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Confianza {block.auto.confidence ?? 'low'} - {block.auto.spans.length} span
                    {block.auto.spans.length === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving || !dirtyKeys[block.key]}
                  onClick={() => {
                    void handleSaveManual(block, currentManualSpans);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Check size={14} />
                  {saving ? 'Guardando' : 'Guardar marcado'}
                </button>
              </div>

              {blockError ? (
                <div className="mt-3 rounded-[0.95rem] border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700">
                  {blockError}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Cargando overrides actuales...</p>
      ) : null}
    </section>
  );
}
