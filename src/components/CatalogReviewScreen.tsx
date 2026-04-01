import React, { useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import type { OptionKey, PracticeQuestion, PracticeQuestionScope } from '../practiceTypes';
import { StatementBody } from './StatementBody';

export type CatalogReviewScreenProps = {
  question: PracticeQuestion;
  questionIndex: number;
  totalQuestions: number;
  scope: PracticeQuestionScope;
  onNext: () => void;
  onExit: () => void;
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
}) => {
  const optionEntries = Object.entries(question.options) as Array<[OptionKey, string]>;
  const isLast = questionIndex >= totalQuestions - 1;

  useLayoutEffect(() => {
    const scrollRoot = document.scrollingElement;
    scrollRoot?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [question.id]);

  return (
    <div
      className="mx-auto flex w-full max-w-full flex-1 flex-col bg-gradient-to-b from-slate-100/95 via-slate-50 to-indigo-50/40 px-3 py-3 pb-32 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10 xl:pb-10 2xl:px-14 2xl:pb-12"
    >
      <div className="mx-auto w-full max-w-[1600px]">
      <div className="mb-4 space-y-3 sm:mb-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Salir"
              onClick={onExit}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/90 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            >
              <X aria-hidden="true" size={20} strokeWidth={2.5} />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                  Análisis
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
                  {scopeHeadline(scope)}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Salir"
            onClick={onExit}
            className="rounded-lg px-2 py-1 text-sm font-bold text-violet-600 transition hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            Salir
          </button>
        </div>

        <div
          className="h-1 w-full overflow-hidden rounded-full bg-slate-200/90"
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

        <div className="space-y-0.5 px-0.5 pt-1">
          <p className="text-xs font-medium text-slate-500">Lectura del banco completo</p>
          <p className="text-base font-bold text-slate-800">
            Pregunta {question.number ?? questionIndex + 1} de {totalQuestions}
          </p>
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-12 xl:gap-x-10 xl:gap-y-6 2xl:gap-x-12">
        <div className="sticky top-1 z-30 -mx-1 px-1 pb-1 pt-2 sm:top-2 sm:pb-2 xl:sticky xl:top-4 xl:col-span-5 xl:z-auto xl:mx-0 xl:self-start xl:p-0 xl:pb-0 xl:pt-0 2xl:col-span-5 2xl:top-6">
          <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-violet-200/60 bg-[linear-gradient(152deg,#f5f3ff_0%,#ffffff_50%,#eef2ff_100%)] p-5 shadow-[0_22px_50px_-30px_rgba(91,33,182,0.14),0_1px_0_#ffffff_inset] ring-1 ring-violet-100/80 sm:rounded-[2rem] sm:p-8 xl:p-8 xl:min-h-0 2xl:p-10">
          <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-violet-200 blur-3xl opacity-90" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-sky-100 blur-3xl opacity-80" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_100%_0%,#ddd6fe_0%,transparent_55%)] opacity-40" />
          <div className="relative z-10 mb-4 flex items-center gap-2 sm:mb-5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-400/90">
              ENUNCIADO
            </span>
            <span
              className="hidden h-px flex-1 bg-gradient-to-r from-violet-200/60 to-transparent sm:block"
              aria-hidden="true"
            />
          </div>
          <div className="relative z-10 max-w-prose text-[1.05rem] font-medium leading-[1.82] tracking-tight text-slate-700 sm:text-[1.12rem] sm:leading-[1.78] xl:max-w-none xl:text-[1.08rem] xl:leading-[1.88] 2xl:text-[1.12rem] 2xl:leading-[1.9]">
            <StatementBody text={question.statement} />
          </div>
        </div>
      </div>

        <div className="mt-6 grid w-full gap-5 xl:col-span-7 xl:mt-0 2xl:col-span-7">
        <p className="text-center text-sm font-medium text-slate-500 xl:text-left">
          Respuesta correcta marcada. Solo lectura.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:gap-4 2xl:grid-cols-2 2xl:gap-x-5 2xl:gap-y-4">
          {optionEntries.map(([key, value]) => {
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
                    className={`min-w-0 flex-1 pt-0.5 text-[1.02rem] font-semibold leading-relaxed sm:text-[1.06rem] xl:text-[1.04rem] ${
                      isCorrect ? 'text-emerald-950' : 'text-slate-800'
                    }`}
                  >
                    {value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 xl:hidden">
        <div className="mx-auto w-full max-w-[1600px] bg-[linear-gradient(180deg,rgba(248,250,252,0)_0%,rgba(248,250,252,0.95)_38%,rgba(248,250,252,1)_100%)] px-3 pb-4 pt-8 sm:px-6 sm:pb-6 xl:px-10">
          <div className="pointer-events-auto">
            <div className="rounded-[2rem] border border-white/80 bg-white/95 p-2 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-3">
              <div className="rounded-full bg-white p-1 shadow-[0_10px_28px_-12px_rgba(76,29,149,0.12),0_1px_0_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-200/60">
                <button
                  type="button"
                  onClick={isLast ? onExit : onNext}
                  className="brand-gradient-h flex min-h-[52px] w-full items-center justify-center rounded-full px-6 text-[0.95rem] font-bold tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_14px_36px_-18px_rgba(124,182,232,0.45)] transition-[filter,transform] duration-200 hover:brightness-[1.04] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  {isLast ? 'Finalizar' : 'Siguiente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 hidden w-full xl:mt-10 xl:grid xl:grid-cols-12 xl:gap-x-10 xl:gap-y-0 2xl:mt-12 2xl:gap-x-12">
        <div className="hidden xl:col-span-5 2xl:col-span-5" aria-hidden="true" />
        <div className="xl:col-span-7 xl:flex xl:justify-end 2xl:col-span-7">
        <div className="w-full max-w-full xl:max-w-md 2xl:max-w-lg">
          <div className="rounded-[2.5rem] border border-white/75 bg-white/95 p-3 shadow-xl backdrop-blur">
            <div className="rounded-full bg-white p-1 shadow-[0_10px_28px_-12px_rgba(76,29,149,0.12)] ring-1 ring-slate-200/60">
              <button
                type="button"
                onClick={isLast ? onExit : onNext}
                className="brand-gradient-h flex min-h-[52px] w-full items-center justify-center rounded-full px-6 text-[0.95rem] font-bold tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_14px_36px_-18px_rgba(124,182,232,0.45)] transition-[filter,transform] duration-200 hover:brightness-[1.04] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {isLast ? 'Finalizar' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="xl:hidden" aria-hidden="true">
        <div className="h-14" />
      </div>
      </div>
    </div>
  );
};

export default CatalogReviewScreen;
