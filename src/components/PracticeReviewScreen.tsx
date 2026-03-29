import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import {
  computeOverconfidenceScore,
  computeSessionFatigueScore,
  getErrorTypeLabel
} from '../domain/learningEngine';
import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { recordQuestionExplanationOpened } from '../services/practiceCloudApi';
import QuestionExplanation from './QuestionExplanation';
import { PracticeAnswer } from '../practiceTypes';
import { getSessionPresentation } from '../sessionPresentation';

type ReviewFilter = 'incorrect' | 'all';

type PracticeReviewScreenProps = {
  answers: PracticeAnswer[];
  batchNumber: number;
  totalBatches: number;
  hasNextBatch: boolean;
  sessionMode?: 'standard' | 'weakest' | 'random' | 'review' | 'mixed' | 'simulacro' | 'anti_trap';
  sessionStartedAt?: string;
  sessionQuestionCount?: number;
  sessionId?: string | null;
  curriculum?: string;
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

type ReviewEntry = {
  answer: PracticeAnswer;
  reviewIndex: number;
};

const INITIAL_REVIEW_RENDER_COUNT = 8;
const REVIEW_RENDER_STEP = 6;

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

const formatDuration = (value: number | null) => {
  if (value === null) return null;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getExplanationKind = ({
  explanation,
  editorialExplanation
}: {
  explanation: string | null;
  editorialExplanation?: string | null;
}) => {
  const hasExplanation = Boolean(explanation?.trim());
  const hasEditorialExplanation = Boolean(editorialExplanation?.trim());

  if (hasExplanation && hasEditorialExplanation) return 'both';
  if (hasEditorialExplanation) return 'editorial';
  return 'base';
};

const ReviewEntryCard = React.memo(
  ({
    curriculum = DEFAULT_CURRICULUM,
    entry,
    sessionId = null
  }: {
    entry: ReviewEntry;
    sessionId?: string | null;
    curriculum?: string;
  }) => {
    const { answer, reviewIndex } = entry;
    const [isExplanationOpen, setIsExplanationOpen] = useState(false);
    const selectedKey = answer.selectedOption;
    const correctKey = answer.question.correctOption;
    const selectedText = selectedKey ? answer.question.options[selectedKey] : null;
    const correctText = answer.question.options[correctKey];

    return (
      <article className="overflow-hidden rounded-[1.25rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.92))] p-3.5 shadow-[0_20px_46px_-36px_rgba(141,147,242,0.16)] backdrop-blur">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-[linear-gradient(135deg,rgba(121,182,233,0.16),rgba(141,147,242,0.18))] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-600">
                  Pregunta {reviewIndex + 1}
                </span>
                {answer.question.category ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-600">
                    {answer.question.category}
                  </span>
                ) : null}
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

          <details
            className="rounded-[1rem] border border-white/80 bg-[linear-gradient(180deg,rgba(232,240,255,0.9),rgba(241,247,255,0.92))] px-3.5 py-2.5"
            onToggle={(event) => {
              const nextOpen = event.currentTarget.open;
              setIsExplanationOpen(nextOpen);
              if (!nextOpen) return;

              void recordQuestionExplanationOpened({
                questionId: answer.question.id,
                curriculum,
                sessionId,
                surface: 'review',
                explanationKind: getExplanationKind({
                  explanation: answer.question.explanation,
                  editorialExplanation: answer.question.editorialExplanation
                })
              }).catch(() => {});
            }}
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-extrabold text-indigo-900 transition-colors hover:text-indigo-950 sm:text-sm">
              <BookOpenText size={16} />
              Ver explicacion
            </summary>
            {isExplanationOpen ? (
              <div className="mt-2.5">
                <QuestionExplanation
                  explanation={answer.question.explanation}
                  editorialExplanation={answer.question.editorialExplanation}
                  emptyLabel="Esta pregunta todavia no tiene explicacion cargada."
                />
              </div>
            ) : null}
          </details>
        </div>
      </article>
    );
  }
);

ReviewEntryCard.displayName = 'ReviewEntryCard';

const PracticeReviewScreen: React.FC<PracticeReviewScreenProps> = ({
  answers,
  batchNumber,
  totalBatches,
  hasNextBatch,
  sessionId = null,
  curriculum = DEFAULT_CURRICULUM,
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
  const {
    fatigueScore,
    incorrectCount,
    incorrectEntries,
    lastAnsweredAt,
    overconfidenceScore,
    reviewEntries,
    score
  } = useMemo(() => {
    const nextReviewEntries: ReviewEntry[] = [];
    const nextIncorrectEntries: ReviewEntry[] = [];
    const sessionAttempts = [];
    let nextScore = 0;
    let nextLastAnsweredAt: string | null = null;

    for (let index = 0; index < answers.length; index += 1) {
      const answer = answers[index];
      const entry = { answer, reviewIndex: index };
      nextReviewEntries.push(entry);
      if (!answer.isCorrect) {
        nextIncorrectEntries.push(entry);
      } else {
        nextScore += 1;
      }
      sessionAttempts.push({
        isCorrect: answer.isCorrect,
        responseTimeMs: answer.responseTimeMs,
        errorTypeInferred: answer.errorTypeInferred,
        changedAnswer: answer.changedAnswer
      });
      nextLastAnsweredAt = answer.answeredAt ?? nextLastAnsweredAt;
    }

    return {
      fatigueScore: computeSessionFatigueScore(sessionAttempts),
      incorrectCount: nextIncorrectEntries.length,
      incorrectEntries: nextIncorrectEntries,
      lastAnsweredAt: nextLastAnsweredAt,
      overconfidenceScore: computeOverconfidenceScore(sessionAttempts),
      reviewEntries: nextReviewEntries,
      score: nextScore
    };
  }, [answers]);
  const unansweredCount = Math.max(totalQuestions - answeredCount, 0);
  const percentage = totalQuestions === 0 ? 0 : Math.round((score / totalQuestions) * 100);
  const fatigueLabel =
    fatigueScore >= 0.66 ? 'Fatiga alta' : fatigueScore >= 0.33 ? 'Fatiga media' : 'Fatiga baja';
  const overconfidenceLabel =
    overconfidenceScore >= 0.4
      ? 'Sobreconfianza alta'
      : overconfidenceScore >= 0.2
        ? 'Sobreconfianza media'
        : 'Sobreconfianza baja';
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
  const reviewClosure = useMemo(
    () =>
      getReviewClosure({
        percentage,
        unansweredCount,
        sessionMode,
        fatigueScore,
        overconfidenceScore,
        hasNextBatch
      }),
    [
      fatigueScore,
      hasNextBatch,
      overconfidenceScore,
      percentage,
      sessionMode,
      unansweredCount
    ]
  );
  const scoreSurfaceClass =
    percentage >= 85
      ? 'border-emerald-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.94))] shadow-[0_24px_48px_-34px_rgba(16,185,129,0.24)]'
      : percentage >= 70
        ? 'border-sky-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] shadow-[0_24px_48px_-34px_rgba(125,182,232,0.22)]'
        : percentage >= 55
          ? 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94))] shadow-[0_24px_48px_-34px_rgba(245,158,11,0.2)]'
          : 'border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.94))] shadow-[0_24px_48px_-34px_rgba(244,63,94,0.2)]';
  const resultBandClass =
    percentage >= 85
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : percentage >= 70
        ? 'border-sky-200 bg-sky-50 text-sky-700'
        : percentage >= 55
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-rose-200 bg-rose-50 text-rose-700';
  const nextStepSurfaceClass =
    unansweredCount > 0
      ? 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94))]'
      : overconfidenceScore >= 0.4
        ? 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94))]'
        : fatigueScore >= 0.45
          ? 'border-sky-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))]'
          : 'border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.94))]';
  const simplifiedHeroHeadline =
    batchNumber >= totalBatches ? 'Prueba completada' : `Bloque ${batchNumber} completado`;
  const simplifiedReviewHint = hasNextBatch
    ? 'Revisa este bloque y, si quieres, abre el siguiente.'
    : 'Revisa tus respuestas y cierra la prueba cuando termines.';
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(
    incorrectCount > 0 ? 'incorrect' : 'all'
  );
  const [isDockVisible, setIsDockVisible] = useState(true);
  const [renderedEntryCount, setRenderedEntryCount] = useState(INITIAL_REVIEW_RENDER_COUNT);
  const hideDockTimeoutRef = useRef<number | null>(null);
  const dockFrameRef = useRef<number | null>(null);
  const isDockVisibleRef = useRef(true);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const visibleEntries = useMemo(
    () => (reviewFilter === 'incorrect' ? incorrectEntries : reviewEntries),
    [incorrectEntries, reviewEntries, reviewFilter]
  );
  const renderedEntries = useMemo(
    () => visibleEntries.slice(0, renderedEntryCount),
    [renderedEntryCount, visibleEntries]
  );
  const hasMoreEntries = renderedEntryCount < visibleEntries.length;
  const remainingEntries = Math.max(visibleEntries.length - renderedEntryCount, 0);
  const loadMoreEntries = useCallback(() => {
    setRenderedEntryCount((currentCount) =>
      Math.min(visibleEntries.length, currentCount + REVIEW_RENDER_STEP)
    );
  }, [visibleEntries.length]);

  useEffect(() => {
    isDockVisibleRef.current = isDockVisible;
  }, [isDockVisible]);

  useEffect(() => {
    const clearHideTimeout = () => {
      if (hideDockTimeoutRef.current !== null) {
        window.clearTimeout(hideDockTimeoutRef.current);
        hideDockTimeoutRef.current = null;
      }
    };

    const scheduleHide = () => {
      clearHideTimeout();
      hideDockTimeoutRef.current = window.setTimeout(() => {
        isDockVisibleRef.current = false;
        setIsDockVisible(false);
      }, 1400);
    };

    const handleScroll = () => {
      if (dockFrameRef.current !== null) return;
      dockFrameRef.current = window.requestAnimationFrame(() => {
        dockFrameRef.current = null;
        if (!isDockVisibleRef.current) {
          isDockVisibleRef.current = true;
          setIsDockVisible(true);
        }
        scheduleHide();
      });
    };

    scheduleHide();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearHideTimeout();
      if (dockFrameRef.current !== null) {
        window.cancelAnimationFrame(dockFrameRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setReviewFilter(incorrectCount > 0 ? 'incorrect' : 'all');
  }, [incorrectCount, batchNumber, totalBatches, sessionStartedAt]);

  useEffect(() => {
    setRenderedEntryCount(Math.min(visibleEntries.length, INITIAL_REVIEW_RENDER_COUNT));
  }, [visibleEntries.length, reviewFilter, batchNumber, totalBatches, sessionStartedAt]);

  useEffect(() => {
    if (!hasMoreEntries || !loadMoreSentinelRef.current || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        loadMoreEntries();
        observer.disconnect();
      },
      {
        root: null,
        rootMargin: '0px 0px 420px 0px',
        threshold: 0.01
      }
    );

    observer.observe(loadMoreSentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreEntries, loadMoreEntries, renderedEntryCount]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-0 py-3 pb-32 sm:px-2 sm:pb-32 lg:px-4">
      <section className="space-y-3.5">
        <div className="relative overflow-hidden rounded-[1.4rem] border border-[#d7e4fb] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] p-4 shadow-[0_24px_56px_-36px_rgba(141,147,242,0.2)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,147,242,0.1),transparent_24%),linear-gradient(135deg,rgba(125,182,232,0.05),transparent_42%)]" />
          <div className="relative min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#d7e4fb] bg-white/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-600">
                {simplified ? 'Revision' : sessionPresentation.eyebrow}
              </span>
              {!simplified ? (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] ${resultBandClass}`}
                >
                  {reviewClosure.resultBand}
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 text-[1.34rem] font-black leading-[0.98] tracking-[-0.04em] text-slate-950 sm:text-[1.72rem]">
              {simplified ? simplifiedHeroHeadline : reviewClosure.outcomeHeadline}
            </h2>
            <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              {title || `Bloque ${batchNumber} de ${totalBatches}`}
            </p>
          </div>
        </div>

        <div className="grid gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className={`rounded-[1.2rem] border px-3.5 py-3.5 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.14)] ${scoreSurfaceClass}`}
            >
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Resultado
              </p>
              <p className="mt-2 text-[2rem] font-black leading-none tracking-[-0.04em] text-slate-950 sm:text-[2.35rem]">
                {score}
                <span className="text-[1rem] text-slate-400 sm:text-[1.2rem]"> / {totalQuestions}</span>
              </p>
              <p className="mt-1 text-[12px] font-bold text-slate-500">{percentage}% de acierto</p>
            </div>

            <div
              className={`rounded-[1.2rem] border px-3.5 py-3.5 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.14)] ${nextStepSurfaceClass}`}
            >
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                {simplified ? 'Siguiente' : 'Ahora'}
              </p>
              <p className="mt-2 text-[1rem] font-black leading-[1.06] text-slate-950 sm:text-[1.08rem]">
                {simplified ? simplifiedReviewHint : reviewClosure.nextFocus}
              </p>
              {!simplified ? (
                <p className="mt-1.5 text-[12px] font-semibold leading-5 text-slate-500 sm:text-[13px]">
                  {reviewClosure.outcomeSummary}
                </p>
              ) : null}
            </div>
          </div>

          {!simplified ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-3 py-2.5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Cierre
                </p>
                <p className="mt-1.5 text-[1rem] font-black leading-none text-slate-950">
                  {answeredCount}/{totalQuestions}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-slate-400">
                  {unansweredCount > 0 ? `${unansweredCount} sin responder` : 'Sin huecos'}
                </p>
              </div>

              <div className="rounded-[1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-3 py-2.5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Senal
                </p>
                <p className="mt-1.5 text-[13px] font-black leading-4 text-slate-950">
                  {primarySignalLabel}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-slate-400">Lectura de sesion</p>
              </div>

              <div className="rounded-[1rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-3 py-2.5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Tiempo
                </p>
                <p className="mt-1.5 text-[1rem] font-black leading-none text-slate-950">
                  {resolvedTimeLabel ?? '--'}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-slate-400">
                  {timeLimitLabel ? 'Con limite' : 'Sin crono'}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-2.5">
        <div className="rounded-[1.25rem] border border-[#d7e4fb] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] px-3.5 py-3 shadow-[0_20px_46px_-34px_rgba(141,147,242,0.16)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Revision
              </p>
              <p className="mt-1 text-[0.95rem] font-black leading-5 text-slate-950">
                {reviewFilter === 'incorrect' ? 'Solo fallos' : 'Todas las respuestas'}
              </p>
            </div>
            <div className="inline-flex rounded-full border border-[#d7e4fb] bg-white/90 p-1 shadow-[0_12px_24px_-22px_rgba(141,147,242,0.16)]">
              <button
                type="button"
                onClick={() => setReviewFilter('incorrect')}
                disabled={incorrectCount === 0}
                className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all duration-200 ${
                  reviewFilter === 'incorrect'
                    ? 'bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] text-white shadow-[0_12px_22px_-16px_rgba(141,147,242,0.28)]'
                    : 'text-slate-500 hover:bg-sky-50/80'
                } ${incorrectCount === 0 ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : ''}`}
              >
                Incorrectas
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all duration-200 ${
                  reviewFilter === 'all'
                    ? 'bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] text-white shadow-[0_12px_22px_-16px_rgba(141,147,242,0.28)]'
                    : 'text-slate-500 hover:bg-sky-50/80'
                }`}
              >
                Todas
              </button>
            </div>
          </div>
          <p className="mt-2 text-[12px] font-semibold text-slate-500">
            {reviewFilter === 'incorrect'
              ? `${incorrectCount} fallo${incorrectCount === 1 ? '' : 's'} para revisar`
              : `${answers.length} respuesta${answers.length === 1 ? '' : 's'} resuelta${answers.length === 1 ? '' : 's'}`}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Mostrando {renderedEntries.length} de {visibleEntries.length}
          </p>
        </div>

        {renderedEntries.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-[#d7e4fb] bg-white/80 px-4 py-5 text-center shadow-[0_18px_34px_-30px_rgba(141,147,242,0.14)]">
            <p className="text-[0.98rem] font-black text-slate-900">No hay respuestas para revisar</p>
            <p className="mt-1.5 text-[13px] font-semibold text-slate-500">
              Completa un bloque para abrir esta lectura con detalle.
            </p>
          </div>
        ) : null}

        <div className="grid gap-2.5 xl:grid-cols-2">
          {renderedEntries.map((entry) => (
            <ReviewEntryCard
              key={`${entry.answer.question.id}-${entry.reviewIndex}`}
              entry={entry}
              sessionId={sessionId}
              curriculum={curriculum}
            />
          ))}
        </div>

        {hasMoreEntries ? (
          <div
            ref={loadMoreSentinelRef}
            className="flex flex-col items-center gap-2 rounded-[1.15rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] px-4 py-3.5 shadow-[0_20px_40px_-34px_rgba(141,147,242,0.16)]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Quedan {remainingEntries} por cargar
            </p>
            <button
              type="button"
              onClick={loadMoreEntries}
              className="rounded-full border border-[#bfd2f6] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.18))] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-800 shadow-[0_12px_24px_-20px_rgba(141,147,242,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(141,147,242,0.22))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.98]"
            >
              Cargar {Math.min(REVIEW_RENDER_STEP, remainingEntries)} mas
            </button>
          </div>
        ) : null}
      </section>

      <nav
        className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] transition-all duration-300 sm:px-6 lg:px-8 xl:inset-y-0 xl:inset-x-auto xl:right-[max(1.25rem,calc((100vw-1480px)/2+1rem))] xl:bottom-auto xl:flex xl:items-center xl:px-0 xl:pb-0 ${
          isDockVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        <div className="mx-auto w-full max-w-[420px] rounded-[1.35rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,249,255,0.9))] p-1 shadow-[0_22px_60px_-34px_rgba(141,147,242,0.2)] backdrop-blur-xl xl:mx-0 xl:w-[118px] xl:max-w-none xl:rounded-[2rem] xl:p-2">
          <div className={`grid gap-1.5 ${showRetry ? 'grid-cols-3 xl:grid-cols-1' : 'grid-cols-2 xl:grid-cols-1'}`}>
            <button
              type="button"
              onClick={onBackToStart}
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-[0.9rem] px-2.5 py-2 text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.98] xl:min-h-[72px] xl:flex-col xl:gap-2"
            >
              <ArrowLeft size={15} />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]">Inicio</span>
            </button>
            {showRetry ? (
              <button
                type="button"
                onClick={onRetryBatch}
                className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-[0.9rem] border border-[#bfd2f6] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.18))] px-2.5 py-2 text-slate-800 shadow-[0_14px_28px_-24px_rgba(141,147,242,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(141,147,242,0.22))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.98] xl:min-h-[72px] xl:flex-col xl:gap-2"
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
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-[0.9rem] border border-white/70 bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] px-2.5 py-2 text-white shadow-[0_16px_28px_-18px_rgba(141,147,242,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.98] xl:min-h-[88px] xl:flex-col xl:gap-2"
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
