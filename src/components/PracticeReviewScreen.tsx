import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import {
  computeOverconfidenceScore,
  computeSessionFatigueScore,
  getErrorTypeLabel
} from '../domain/learningEngine';
import QuestionExplanation from './QuestionExplanation';
import { PracticeAnswer } from '../practiceTypes';
import { getSessionPresentation } from '../sessionPresentation';

type PracticeReviewScreenProps = {
  answers: PracticeAnswer[];
  batchNumber: number;
  totalBatches: number;
  hasNextBatch: boolean;
  sessionMode?: 'standard' | 'weakest' | 'random' | 'review' | 'mixed' | 'simulacro' | 'anti_trap';
  sessionStartedAt?: string;
  sessionQuestionCount?: number;
  timeLimitSeconds?: number | null;
  title?: string;
  subtitle?: string;
  continueLabel?: string;
  showRetry?: boolean;
  simplified?: boolean;
  onRetryBatch: () => void;
  onContinue: () => void;
  onBackToStart: () => void;
};

const getReviewClosure = ({
  percentage,
  unansweredCount,
  sessionMode,
  fatigueScore,
  overconfidenceScore,
  hasNextBatch
}: {
  percentage: number;
  unansweredCount: number;
  sessionMode: PracticeReviewScreenProps['sessionMode'];
  fatigueScore: number;
  overconfidenceScore: number;
  hasNextBatch: boolean;
}) => {
  const isSimulacro = sessionMode === 'simulacro';
  const outcomeHeadline = isSimulacro
    ? percentage >= 80 && unansweredCount === 0
      ? 'Simulacro muy solido'
      : percentage >= 65
        ? 'Base competitiva'
        : 'Simulacro de ajuste'
    : percentage >= 85
      ? 'Bloque muy solido'
      : percentage >= 70
        ? 'Buena consolidacion'
        : percentage >= 55
          ? 'Base util, aun fragil'
          : 'Sesion de ajuste';

  const outcomeSummary =
    unansweredCount > 0
      ? 'La prioridad inmediata es cerrar todas las preguntas antes de ampliar ritmo.'
      : overconfidenceScore >= 0.4
        ? 'El conocimiento esta, pero la lectura rapida te roba nota que no deberia escaparse.'
        : fatigueScore >= 0.45
          ? 'El rendimiento cae al final de la sesion. Conviene apretar menos y cerrar mejor.'
          : percentage >= 80
            ? 'Has cerrado la sesion con una base fiable y margen para seguir avanzando.'
            : 'Conviene limpiar este bloque antes de abrir demasiada carga nueva.';

  const resultBand =
    percentage >= 85
      ? 'Muy fino'
      : percentage >= 70
        ? 'Solido'
        : percentage >= 55
          ? 'En ajuste'
          : 'Fragil';

  const nextFocus = unansweredCount > 0
    ? 'Cerrar preguntas'
    : overconfidenceScore >= 0.4
      ? 'Frenar medio segundo'
      : fatigueScore >= 0.45
        ? 'Recortar fatiga'
        : hasNextBatch
          ? 'Mantener el ritmo'
          : 'Consolidar antes de seguir';

  return {
    outcomeHeadline,
    outcomeSummary,
    resultBand,
    nextFocus
  };
};

const PracticeReviewScreen: React.FC<PracticeReviewScreenProps> = ({
  answers,
  batchNumber,
  totalBatches,
  hasNextBatch,
  sessionMode = 'standard',
  sessionStartedAt,
  sessionQuestionCount,
  timeLimitSeconds = null,
  title,
  subtitle: _subtitle,
  continueLabel,
  showRetry = true,
  simplified = false,
  onRetryBatch,
  onContinue,
  onBackToStart
}) => {
  const totalQuestions = Math.max(sessionQuestionCount ?? answers.length, answers.length);
  const answeredCount = answers.length;
  const score = answers.filter((answer) => answer.isCorrect).length;
  const unansweredCount = Math.max(totalQuestions - answeredCount, 0);
  const percentage = totalQuestions === 0 ? 0 : Math.round((score / totalQuestions) * 100);
  const fatigueScore = computeSessionFatigueScore(
    answers.map((answer) => ({
      isCorrect: answer.isCorrect,
      responseTimeMs: answer.responseTimeMs,
      errorTypeInferred: answer.errorTypeInferred,
      changedAnswer: answer.changedAnswer
    }))
  );
  const overconfidenceScore = computeOverconfidenceScore(
    answers.map((answer) => ({
      isCorrect: answer.isCorrect,
      responseTimeMs: answer.responseTimeMs,
      errorTypeInferred: answer.errorTypeInferred,
      changedAnswer: answer.changedAnswer
    }))
  );
  const fatigueLabel =
    fatigueScore >= 0.66 ? 'Fatiga alta' : fatigueScore >= 0.33 ? 'Fatiga media' : 'Fatiga baja';
  const overconfidenceLabel =
    overconfidenceScore >= 0.4
      ? 'Sobreconfianza alta'
      : overconfidenceScore >= 0.2
        ? 'Sobreconfianza media'
        : 'Sobreconfianza baja';
  const lastAnsweredAt = answers[answers.length - 1]?.answeredAt ?? null;
  const elapsedSeconds =
    sessionStartedAt
      ? Math.max(
          0,
          Math.round(
            ((lastAnsweredAt ? new Date(lastAnsweredAt) : new Date()).getTime() -
              new Date(sessionStartedAt).getTime()) /
              1000
          )
        )
      : null;
  const formatDuration = (value: number | null) => {
    if (value === null) return null;
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  const elapsedLabel = formatDuration(elapsedSeconds);
  const timeLimitLabel = formatDuration(timeLimitSeconds);
  const resolvedContinueLabel =
    continueLabel || (hasNextBatch ? 'Continuar con las siguientes 20' : 'Volver a empezar');
  const continueDockLabel = hasNextBatch
    ? 'Continuar'
    : !showRetry
      ? resolvedContinueLabel
    : sessionMode === 'simulacro'
      ? 'Panel'
      : resolvedContinueLabel.includes('panel')
        ? 'Panel'
        : 'Reiniciar';
  const sessionPresentation = getSessionPresentation(sessionMode);
  const primarySignalLabel =
    overconfidenceScore > fatigueScore ? overconfidenceLabel : fatigueLabel;
  const resolvedTimeLabel =
    elapsedLabel && timeLimitLabel
      ? `${elapsedLabel} / ${timeLimitLabel}`
      : elapsedLabel
        ? elapsedLabel
        : timeLimitLabel;
  const reviewClosure = getReviewClosure({
    percentage,
    unansweredCount,
    sessionMode,
    fatigueScore,
    overconfidenceScore,
    hasNextBatch
  });
  const simplifiedHeroHeadline =
    batchNumber >= totalBatches ? 'Prueba completada' : `Bloque ${batchNumber} completado`;
  const simplifiedReviewHint = hasNextBatch
    ? 'Revisa este bloque y, si quieres, abre el siguiente.'
    : 'Revisa tus respuestas y cierra la prueba cuando termines.';
  const [isDockVisible, setIsDockVisible] = useState(true);
  const hideDockTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearHideTimeout = () => {
      if (hideDockTimeoutRef.current !== null) {
        window.clearTimeout(hideDockTimeoutRef.current);
      }
    };

    const scheduleHide = () => {
      clearHideTimeout();
      hideDockTimeoutRef.current = window.setTimeout(() => {
        setIsDockVisible(false);
      }, 1400);
    };

    const handleScroll = () => {
      setIsDockVisible(true);
      scheduleHide();
    };

    scheduleHide();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearHideTimeout();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-0 py-3 pb-32 sm:px-2 sm:pb-32 lg:px-4">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#79b6e9_0%,#8aa6ee_56%,#8a90f4_100%)] p-3.5 text-white shadow-[0_28px_60px_-34px_rgba(141,147,242,0.24)] backdrop-blur sm:rounded-[1.6rem] sm:p-5">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/16 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
        </div>

        <div className="relative flex flex-col gap-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-sky-50/82 sm:text-[10px] sm:tracking-[0.2em]">
                {simplified ? 'Revision' : sessionPresentation.eyebrow}
              </p>
              <h2 className="mt-1 text-[1.28rem] font-black leading-[0.98] tracking-[-0.03em] text-white sm:mt-1.5 sm:text-[1.9rem]">
                {simplified ? simplifiedHeroHeadline : reviewClosure.outcomeHeadline}
              </h2>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-50/74 sm:mt-1.5 sm:text-[11px] sm:tracking-[0.16em]">
                {title || `Bloque ${batchNumber} de ${totalBatches}`}
              </p>
              <p className="mt-1.5 text-[13px] font-semibold text-sky-50/84 sm:mt-2 sm:text-sm">
                {simplified ? simplifiedReviewHint : reviewClosure.nextFocus}
              </p>
            </div>

            <div className="self-start rounded-[1rem] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] px-3 py-2.5 text-left shadow-[0_20px_40px_-30px_rgba(141,147,242,0.28)] backdrop-blur-[10px] sm:min-w-[11rem] sm:rounded-[1.15rem] sm:px-4 sm:py-3 sm:text-center">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-sky-50/78 sm:text-[10px] sm:tracking-[0.18em]">
                Resultado
              </p>
              <p className="mt-1 text-[2.1rem] font-black leading-none text-white sm:mt-1.5 sm:text-[2.5rem]">
                {score}
                <span className="text-base text-white/60 sm:text-xl"> / {totalQuestions}</span>
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-sky-50/78 sm:mt-1 sm:text-xs">
                {percentage}% de acierto
              </p>
            </div>
          </div>

          {!simplified ? (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:gap-2">
              <div className="rounded-[0.95rem] border border-white/14 bg-white/10 px-2.5 py-2 backdrop-blur-sm sm:rounded-[1rem] sm:px-3 sm:py-2.5">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-sky-50/68 sm:text-[9px] sm:tracking-[0.16em]">
                  Cierre
                </p>
                <p className="mt-0.5 text-[13px] font-black text-white sm:mt-1 sm:text-sm">
                  {answeredCount}/{totalQuestions}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-sky-50/68 sm:text-[11px]">
                  {unansweredCount > 0 ? `${unansweredCount} sin responder` : 'sin huecos'}
                </p>
              </div>
              <div className="rounded-[0.95rem] border border-white/14 bg-white/10 px-2.5 py-2 backdrop-blur-sm sm:rounded-[1rem] sm:px-3 sm:py-2.5">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-sky-50/68 sm:text-[9px] sm:tracking-[0.16em]">
                  Senal
                </p>
                <p className="mt-0.5 text-[13px] font-black text-white sm:mt-1 sm:text-sm">
                  {primarySignalLabel}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-sky-50/68 sm:text-[11px]">
                  {reviewClosure.nextFocus}
                </p>
              </div>
              <div className="rounded-[0.95rem] border border-white/14 bg-white/10 px-2.5 py-2 backdrop-blur-sm sm:rounded-[1rem] sm:px-3 sm:py-2.5">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-sky-50/68 sm:text-[9px] sm:tracking-[0.16em]">
                  Tiempo
                </p>
                <p className="mt-0.5 text-[13px] font-black text-white sm:mt-1 sm:text-sm">
                  {resolvedTimeLabel ?? '--'}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-sky-50/68 sm:text-[11px]">
                  {timeLimitLabel ? 'con limite' : 'sin cronometro'}
                </p>
              </div>
              <div className="col-span-2 inline-flex min-h-[2.3rem] items-center justify-center rounded-full border border-white/14 bg-white/10 px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/82 sm:col-span-1 sm:min-h-0 sm:text-[10px] sm:tracking-[0.16em]">
                {reviewClosure.resultBand}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-2.5">
        {answers.map((answer, index) => {
          const selectedKey = answer.selectedOption;
          const correctKey = answer.question.correctOption;
          const selectedText = selectedKey ? answer.question.options[selectedKey] : null;
          const correctText = answer.question.options[correctKey];

          return (
            <article
              key={`${answer.question.id}-${index}`}
              className="overflow-hidden rounded-[1.25rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.92))] p-3.5 shadow-[0_20px_46px_-36px_rgba(141,147,242,0.16)] backdrop-blur"
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-[linear-gradient(135deg,rgba(121,182,233,0.16),rgba(141,147,242,0.18))] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-600">
                        Pregunta {index + 1}
                      </span>
                      {answer.question.category && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-600">
                          {answer.question.category}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] ${
                          answer.isCorrect
                            ? 'bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(74,222,128,0.14))] text-emerald-700'
                            : 'bg-[linear-gradient(135deg,rgba(244,63,94,0.12),rgba(251,113,133,0.14))] text-rose-700'
                        }`}
                      >
                        {answer.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {answer.isCorrect ? 'Correcta' : 'Incorrecta'}
                      </span>
                    </div>
                    <h3 className="mt-2 text-[0.98rem] font-extrabold leading-6 tracking-[-0.01em] text-slate-900 sm:text-[1.06rem] sm:leading-7">
                      {answer.question.statement}
                    </h3>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div
                    className={`rounded-[1rem] border px-3.5 py-2.5 ${
                      answer.isCorrect
                        ? 'border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,1),rgba(220,252,231,0.92))]'
                        : 'border-rose-200 bg-[linear-gradient(180deg,rgba(255,241,242,1),rgba(255,228,230,0.92))]'
                    }`}
                  >
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                      Tu respuesta
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-800 sm:text-sm sm:leading-6">
                      {selectedKey ? `${selectedKey.toUpperCase()}) ${selectedText}` : 'Sin responder'}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-white/80 bg-[linear-gradient(180deg,rgba(236,246,255,0.9),rgba(241,247,255,0.92))] px-3.5 py-2.5">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                      Respuesta correcta
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-800 sm:text-sm sm:leading-6">
                      {`${correctKey.toUpperCase()}) ${correctText}`}
                    </p>
                  </div>
                </div>

                {!answer.isCorrect && answer.errorTypeInferred ? (
                  <div className="rounded-[1rem] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(254,243,199,0.72))] px-3.5 py-2.5">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-amber-700">
                      Clave del fallo
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold leading-5 text-amber-950 sm:text-sm sm:leading-6">
                      {getErrorTypeLabel(answer.errorTypeInferred) ?? 'Memoria fragil'}
                    </p>
                  </div>
                ) : null}

                <details className="rounded-[1rem] border border-white/80 bg-[linear-gradient(180deg,rgba(232,240,255,0.9),rgba(241,247,255,0.92))] px-3.5 py-2.5">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-extrabold text-indigo-900 transition-colors hover:text-indigo-950 sm:text-sm">
                    <BookOpenText size={16} />
                    Ver explicacion
                  </summary>
                  <div className="mt-2.5">
                    <QuestionExplanation
                      explanation={answer.question.explanation}
                      editorialExplanation={answer.question.editorialExplanation}
                      emptyLabel="Esta pregunta todavia no tiene explicacion cargada."
                    />
                  </div>
                </details>
              </div>
            </article>
          );
        })}
      </section>

      <nav
        className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] transition-all duration-300 sm:px-6 lg:px-8 ${
          isDockVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        <div className="mx-auto w-full max-w-[420px] rounded-[1.35rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,249,255,0.9))] p-1 shadow-[0_22px_60px_-34px_rgba(141,147,242,0.2)] backdrop-blur-xl">
          <div className={`grid gap-1.5 ${showRetry ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <button
              type="button"
              onClick={onBackToStart}
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-[0.9rem] px-2.5 py-2 text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.98]"
            >
              <ArrowLeft size={15} />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]">Inicio</span>
            </button>
            {showRetry ? (
              <button
                type="button"
                onClick={onRetryBatch}
                className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-[0.9rem] border border-[#bfd2f6] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.18))] px-2.5 py-2 text-slate-800 shadow-[0_14px_28px_-24px_rgba(141,147,242,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(141,147,242,0.22))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.98]"
              >
                <RotateCcw size={15} />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]">
                  Repetir
                </span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onContinue}
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-[0.9rem] border border-white/70 bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] px-2.5 py-2 text-white shadow-[0_16px_28px_-18px_rgba(141,147,242,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.98]"
            >
              <ArrowRight size={15} />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]">
                {continueDockLabel}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default PracticeReviewScreen;
