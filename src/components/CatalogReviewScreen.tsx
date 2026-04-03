import React, { useLayoutEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  findHighlightOverrideForBlock,
  useQuestionHighlightOverrides,
} from '../hooks/useQuestionHighlightOverrides';
import type { OptionKey, PracticeQuestion, PracticeQuestionScope } from '../practiceTypes';
import { HighlightedText } from './HighlightedText';
import { StatementBody } from './StatementBody';

export type CatalogReviewScreenProps = {
  question: PracticeQuestion;
  questionIndex: number;
  totalQuestions: number;
  scope: PracticeQuestionScope;
  onNext: () => void;
  onExit: () => void;
  textHighlightingEnabled?: boolean;
};

const scopeHeadline = (scope: PracticeQuestionScope) =>
  scope === 'common' ? 'TEMARIO COMÚN' : 'TEMARIO ESPECÍFICO';

const CatalogReviewScreen: React.FC<CatalogReviewScreenProps> = ({
  question,
  questionIndex,
  totalQuestions,
  scope,
  onNext,
  onExit,
  textHighlightingEnabled = false,
}) => {
  const optionEntries = Object.entries(question.options) as Array<[OptionKey, string]>;
  const isLast = questionIndex >= totalQuestions - 1;
  const numericQuestionId = (() => {
    const parsed = Number(question.id);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  })();
  const { data: overrideRecords } = useQuestionHighlightOverrides(numericQuestionId);
  const questionHighlightOverride = findHighlightOverrideForBlock(overrideRecords, 'question');

  useLayoutEffect(() => {
    const scrollRoot = document.scrollingElement;
    scrollRoot?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [question.id]);

  return (
    <div
      className="mx-auto flex w-full max-w-full flex-1 flex-col bg-gradient-to-b from-slate-100/95 via-slate-50 to-indigo-50/40 px-3 py-3 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10 xl:pb-8 2xl:px-14 2xl:pb-10"
    >
      <div className="mx-auto w-full max-w-[1600px]">
      <div className="mb-4 sm:mb-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Salir"
            onClick={onExit}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm border border-slate-200/70 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            <RotateCcw aria-hidden="true" size={20} strokeWidth={2.5} />
          </button>

          <div
            className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={questionIndex + 1}
            aria-valuemin={1}
            aria-valuemax={Math.max(1, totalQuestions)}
            aria-label={`Pregunta ${questionIndex + 1} de ${totalQuestions}`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-[width] duration-300 ease-out"
              style={{
                width: `${totalQuestions > 0 ? ((questionIndex + 1) / totalQuestions) * 100 : 0}%`,
              }}
            />
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-black text-slate-400 tracking-tight">
              {scopeHeadline(scope)}
            </span>
            <span className="text-[10px] font-black text-slate-400 tracking-tight">
              {questionIndex + 1}/{totalQuestions}
            </span>
          </div>
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-12 xl:gap-x-10 xl:gap-y-6 2xl:gap-x-12">
        <div className="sticky top-1 z-30 -mx-1 px-1 pb-1 pt-2 sm:top-2 sm:pb-2 xl:sticky xl:top-4 xl:col-span-5 xl:z-auto xl:mx-0 xl:self-start xl:p-0 xl:pb-0 xl:pt-0 2xl:col-span-5 2xl:top-6">
          <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-violet-200/60 bg-[linear-gradient(152deg,#f5f3ff_0%,#ffffff_50%,#eef2ff_100%)] p-5 shadow-[0_22px_50px_-30px_rgba(91,33,182,0.14),0_1px_0_#ffffff_inset] ring-1 ring-violet-100/80 sm:rounded-[2rem] sm:p-8 xl:p-8 xl:min-h-0 2xl:p-10">
          <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-violet-200 blur-3xl opacity-90" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-sky-100 blur-3xl opacity-80" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_100%_0%,#ddd6fe_0%,transparent_55%)] opacity-40" />
          <div className="relative z-10 mb-4 flex items-center gap-2 sm:mb-5">
            <span className="ui-label text-violet-400/90">
              ENUNCIADO
            </span>
            <span
              className="hidden h-px flex-1 bg-gradient-to-r from-violet-200/60 to-transparent sm:block"
              aria-hidden="true"
            />
          </div>
          <div className="relative z-10 max-w-prose text-[1.08rem] font-medium leading-[1.88] tracking-[-0.012em] text-slate-700 sm:text-[1.14rem] sm:leading-[1.82] xl:max-w-none xl:text-[1.1rem] xl:leading-[1.9] 2xl:text-[1.14rem] 2xl:leading-[1.92]">
            <StatementBody
              text={question.statement}
              highlightEnabled={textHighlightingEnabled}
              manualOverride={questionHighlightOverride}
            />
          </div>
        </div>
      </div>

        <div className="mt-6 grid w-full gap-5 xl:col-span-7 xl:mt-0 2xl:col-span-7">
        <p className="text-center text-sm font-medium text-slate-500 xl:text-left">
          Respuesta correcta marcada. Solo lectura.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:gap-4 2xl:grid-cols-2 2xl:gap-x-5 2xl:gap-y-4">
          {optionEntries.map(([key, value], optionIndex) => {
            const answerHighlightOverride = findHighlightOverrideForBlock(
              overrideRecords,
              'answer',
              optionIndex,
            );
            const isCorrect = key === question.correctOption;
            return (
              <div
                key={key}
                className={`relative flex w-full flex-col gap-2 overflow-hidden rounded-2xl border px-4 py-3.5 text-left shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)] sm:px-5 sm:py-4 ${
                  isCorrect
                    ? 'border-emerald-300 bg-[linear-gradient(180deg,rgba(236,253,245,1),rgba(220,252,231,0.92))] ring-1 ring-emerald-100'
                    : 'border-slate-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))]'
                }`}
              >
                <div className="flex w-full items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.95rem] font-bold ${
                      isCorrect
                        ? 'bg-emerald-500 text-white shadow-[0_12px_24px_-16px_rgba(16,185,129,0.35)]'
                        : 'bg-slate-100/95 text-slate-600 shadow-inner'
                    }`}
                  >
                    {key.toUpperCase()}
                  </span>
                  <span
                    className={`min-w-0 flex-1 pt-0.5 text-[1.04rem] font-semibold leading-[1.68] tracking-[-0.012em] sm:text-[1.08rem] xl:text-[1.06rem] ${
                      isCorrect ? 'text-emerald-950' : 'text-slate-800'
                    }`}
                  >
                    <HighlightedText
                      text={value}
                      contentRole="answer_option"
                      allOptions={optionEntries.map(([, optionValue]) => optionValue)}
                      optionIndex={optionIndex}
                      manualOverride={answerHighlightOverride}
                      disabled={!textHighlightingEnabled}
                    />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {/* CTA inline (opción B): dentro del scroll, sin fixed */}
      <div className="mt-10 px-1">
        <button
          type="button"
          onClick={isLast ? onExit : onNext}
          className="ui-button-text w-full rounded-[28px] bg-slate-900 py-5 text-white shadow-xl transition-[transform,filter] duration-200 hover:brightness-[1.05] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/55"
        >
          {isLast ? 'Finalizar' : 'Siguiente'}
        </button>
      </div>
      </div>
    </div>
  );
};

export default CatalogReviewScreen;
