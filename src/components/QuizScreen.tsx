import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Clock3, X } from 'lucide-react';
import { Button } from './ui/button';
import { inferAttemptErrorType } from '../domain/learningEngine';
import {
  OptionKey,
  PracticeAnswer,
  PracticeAnswerSubmission,
  PracticeMode,
  PracticeQuestionScopeFilter,
  PracticeQuestion
} from '../practiceTypes';
import { getSessionPresentation } from '../sessionPresentation';
import { getQuestionScopeLabel } from '../utils/practiceQuestionScope';

type QuizScreenProps = {
  mode: PracticeMode;
  title: string;
  subtitle: string;
  feedbackMode: 'immediate' | 'deferred';
  startedAt: string;
  timeLimitSeconds: number | null;
  question: PracticeQuestion;
  questionIndex: number;
  totalQuestions: number;
  batchNumber: number;
  totalBatches: number;
  questionScope?: PracticeQuestionScopeFilter;
  simplified?: boolean;
  showCompactProgress?: boolean;
  answers: PracticeAnswer[];
  onAnswer: (submission: PracticeAnswerSubmission) => void;
  onEndSession: (submission: PracticeAnswerSubmission | null) => void;
  onTimeExpired: (submission: PracticeAnswerSubmission | null) => void;
};

type ProgressSegment = {
  key: number;
  isCurrent: boolean;
  className: string;
};

const ProgressTrack = React.memo(({ segments }: { segments: ProgressSegment[] }) => (
  <div className="flex gap-1">
    {segments.map(({ key, isCurrent, className }) => (
      <div
        key={key}
        className={`h-2.5 rounded-full transition-all duration-300 sm:h-3 ${
          isCurrent ? 'flex-[1.8]' : 'flex-1'
        } ${className}`}
      />
    ))}
  </div>
));

ProgressTrack.displayName = 'ProgressTrack';

const QuizScreen: React.FC<QuizScreenProps> = ({
  mode,
  title,
  subtitle,
  feedbackMode,
  startedAt,
  timeLimitSeconds,
  question,
  questionIndex,
  totalQuestions,
  batchNumber,
  totalBatches,
  questionScope = 'all',
  simplified = false,
  showCompactProgress = false,
  answers,
  onAnswer,
  onEndSession,
  onTimeExpired
}) => {
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null);
  const [revealedCorrectKey, setRevealedCorrectKey] = useState<OptionKey | null>(null);
  const [firstSelectionElapsedMs, setFirstSelectionElapsedMs] = useState<number | null>(null);
  const [selectionElapsedMs, setSelectionElapsedMs] = useState<number | null>(null);
  const [changedAnswer, setChangedAnswer] = useState(false);
  const [isQuestionVisible, setIsQuestionVisible] = useState(false);
  const [isDecisionVisible, setIsDecisionVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    timeLimitSeconds
  );
  const questionStartedAtRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  );
  const timeExpiredRef = useRef(false);
  const actionBarRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Partial<Record<OptionKey, HTMLButtonElement | null>>>({});

  useLayoutEffect(() => {
    setSelectedKey(null);
    setRevealedCorrectKey(null);
    setFirstSelectionElapsedMs(null);
    setSelectionElapsedMs(null);
    setChangedAnswer(false);
    setIsQuestionVisible(false);
    setIsDecisionVisible(false);
    questionStartedAtRef.current =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const scrollRoot = document.scrollingElement;
    scrollRoot?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [question.id]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsQuestionVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [question.id]);

  useEffect(() => {
    if (selectedKey === null) {
      setIsDecisionVisible(false);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsDecisionVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedKey]);

  useEffect(() => {
    if (selectedKey === null) return;

    const frameId = window.requestAnimationFrame(() => {
      const highlightedKeys = new Set<OptionKey>([selectedKey]);
      if (revealedCorrectKey) {
        highlightedKeys.add(revealedCorrectKey);
      }

      const highlightedOptions = Array.from(highlightedKeys)
        .map((key) => optionRefs.current[key] ?? null)
        .filter((node): node is HTMLButtonElement => Boolean(node));

      if (highlightedOptions.length === 0) return;

      const actionHeight = actionBarRef.current?.getBoundingClientRect().height ?? 92;
      const safeBottom = window.innerHeight - actionHeight - 22;
      const highlightedBottom = Math.max(
        ...highlightedOptions.map((node) => node.getBoundingClientRect().bottom)
      );

      if (highlightedBottom <= safeBottom) return;

      window.scrollBy({
        top: highlightedBottom - safeBottom + 12,
        behavior: 'smooth'
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [revealedCorrectKey, selectedKey]);

  useEffect(() => {
    if (feedbackMode !== 'deferred' || !timeLimitSeconds) {
      setRemainingSeconds(null);
      return;
    }

    timeExpiredRef.current = false;

    const updateRemaining = () => {
      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      );
      const nextRemaining = Math.max(0, timeLimitSeconds - elapsedSeconds);
      setRemainingSeconds(nextRemaining);

      if (nextRemaining === 0 && !timeExpiredRef.current) {
        timeExpiredRef.current = true;
        onTimeExpired(buildSubmission());
      }
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [feedbackMode, onTimeExpired, question.id, startedAt, timeLimitSeconds]);

  const optionEntries = useMemo(
    () => Object.entries(question.options) as Array<[OptionKey, string]>,
    [question.options]
  );
  const hasAnsweredCurrentQuestion = selectedKey !== null;
  const isDeferredMode = feedbackMode === 'deferred';
  const displayQuestionNumber = question.number ?? questionIndex + 1;
  const sessionPresentation = getSessionPresentation(mode);
  const questionScopeLabel = getQuestionScopeLabel(questionScope as 'all' | 'common' | 'specific');
  const previewAnsweredCount = Math.min(
    totalQuestions,
    answers.length + (hasAnsweredCurrentQuestion ? 1 : 0)
  );
  const answerMetrics = useMemo(() => {
    let correctCount = 0;
    let trailingCorrectStreak = 0;
    let responseTimeTotal = 0;
    let responseTimeCount = 0;

    for (const answer of answers) {
      if (answer.isCorrect) {
        correctCount += 1;
      }
      if (answer.responseTimeMs !== null) {
        responseTimeTotal += answer.responseTimeMs;
        responseTimeCount += 1;
      }
    }

    for (let index = answers.length - 1; index >= 0; index -= 1) {
      if (!answers[index].isCorrect) break;
      trailingCorrectStreak += 1;
    }

    return {
      correctCount,
      trailingCorrectStreak,
      responseTimeTotal,
      responseTimeCount
    };
  }, [answers]);
  const isCurrentAnswerCorrect =
    selectedKey !== null && selectedKey === question.correctOption;
  const previewCorrectCount = isDeferredMode
    ? answerMetrics.correctCount
    : answerMetrics.correctCount + (hasAnsweredCurrentQuestion && isCurrentAnswerCorrect ? 1 : 0);
  const immediateStreak =
    !isDeferredMode && hasAnsweredCurrentQuestion
      ? isCurrentAnswerCorrect
        ? answerMetrics.trailingCorrectStreak + 1
        : 0
      : answerMetrics.trailingCorrectStreak;
  const currentStage = Math.min(
    4,
    Math.max(
      1,
      Math.ceil(((previewAnsweredCount > 0 ? previewAnsweredCount : questionIndex + 1) / totalQuestions) * 4)
    )
  );
  const stageName =
    ['Arranque', 'Traccion', 'Cruce', 'Cierre'][currentStage - 1] ?? 'Pulso';
  const rhythmLabel = useMemo(() => {
    if (isDeferredMode && timeLimitSeconds) {
      const elapsedSeconds =
        remainingSeconds !== null
          ? Math.max(1, timeLimitSeconds - remainingSeconds)
          : Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
      const answeredForRhythm = Math.max(previewAnsweredCount, 1);
      const idealSpentSeconds = (timeLimitSeconds / totalQuestions) * answeredForRhythm;
      const ratio = elapsedSeconds / Math.max(idealSpentSeconds, 1);

      if (ratio <= 0.85) return 'Con margen';
      if (ratio <= 1.05) return 'Ritmo exacto';
      return 'Ritmo justo';
    }

    const hasCurrentResponseTime =
      !isDeferredMode && hasAnsweredCurrentQuestion && selectionElapsedMs !== null;
    const responseSampleCount = answerMetrics.responseTimeCount + (hasCurrentResponseTime ? 1 : 0);
    if (responseSampleCount === 0) return 'En arranque';

    const responseSampleTotal =
      answerMetrics.responseTimeTotal + (hasCurrentResponseTime ? selectionElapsedMs ?? 0 : 0);
    const averageSeconds = responseSampleTotal / responseSampleCount / 1000;

    if (averageSeconds <= 15) return 'Agil';
    if (averageSeconds <= 28) return 'Estable';
    return 'Pausado';
  }, [
    answerMetrics.responseTimeCount,
    answerMetrics.responseTimeTotal,
    hasAnsweredCurrentQuestion,
    isDeferredMode,
    previewAnsweredCount,
    remainingSeconds,
    selectionElapsedMs,
    startedAt,
    timeLimitSeconds,
    totalQuestions
  ]);
  const signalLabel = isDeferredMode
    ? `${previewAnsweredCount}/${totalQuestions}`
    : immediateStreak >= 3
      ? `Racha ${immediateStreak}`
      : hasAnsweredCurrentQuestion && selectedKey !== question.correctOption
        ? 'Recoloca'
        : previewCorrectCount > 0
          ? `${previewCorrectCount} bien`
          : 'En curso';
  const rhythmToneClass =
    rhythmLabel === 'Agil' || rhythmLabel === 'Con margen'
      ? 'border-emerald-100/80 bg-emerald-50/90 text-emerald-700'
      : rhythmLabel === 'Estable' || rhythmLabel === 'Ritmo exacto'
        ? 'border-sky-100/80 bg-sky-50/90 text-sky-700'
        : rhythmLabel === 'En arranque'
          ? 'border-slate-100/80 bg-slate-50/90 text-slate-700'
          : 'border-amber-100/80 bg-amber-50/90 text-amber-700';
  const signalToneClass = isDeferredMode
    ? 'border-indigo-100/80 bg-indigo-50/90 text-indigo-700'
    : immediateStreak >= 3
      ? 'border-emerald-100/80 bg-emerald-50/90 text-emerald-700'
      : hasAnsweredCurrentQuestion && selectedKey !== question.correctOption
        ? 'border-rose-100/80 bg-rose-50/90 text-rose-700'
        : previewCorrectCount > 0
          ? 'border-sky-100/80 bg-sky-50/90 text-sky-700'
          : 'border-slate-100/80 bg-slate-50/90 text-slate-700';
  const progressSegments = useMemo(
    () =>
      Array.from({ length: totalQuestions }, (_, index) => {
        let className = 'bg-slate-100/90';

        if (isDeferredMode) {
          if (index < answers.length || (index === questionIndex && hasAnsweredCurrentQuestion)) {
            className =
              'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_10px_18px_-14px_rgba(141,147,242,0.5)]';
          } else if (index === questionIndex) {
            className =
              'border border-[#bfd2f6] bg-white shadow-[0_10px_18px_-16px_rgba(148,163,184,0.4)]';
          }
        } else if (index === questionIndex) {
          if (hasAnsweredCurrentQuestion) {
            className = isCurrentAnswerCorrect
              ? 'bg-emerald-400 shadow-[0_10px_18px_-14px_rgba(16,185,129,0.45)]'
              : 'bg-rose-500 shadow-[0_10px_18px_-14px_rgba(244,63,94,0.4)]';
          } else {
            className =
              'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_10px_18px_-14px_rgba(141,147,242,0.5)]';
          }
        } else if (answers[index]) {
          className = answers[index].isCorrect ? 'bg-emerald-400' : 'bg-rose-500';
        }

        return {
          key: index,
          isCurrent: index === questionIndex,
          className
        };
      }),
    [
      answers,
      hasAnsweredCurrentQuestion,
      isCurrentAnswerCorrect,
      isDeferredMode,
      questionIndex,
      totalQuestions
    ]
  );
  const feedbackState = isDeferredMode
    ? selectedKey !== null
      ? 'armed'
      : 'idle'
    : selectedKey !== null
      ? isCurrentAnswerCorrect
        ? 'correct'
        : 'wrong'
      : 'idle';
  const feedbackSurfaceClass =
    feedbackState === 'correct'
      ? 'border-emerald-200/90 bg-[linear-gradient(180deg,rgba(245,253,249,0.98),rgba(236,253,245,0.94))] shadow-[0_24px_64px_-42px_rgba(16,185,129,0.28)]'
      : feedbackState === 'wrong'
        ? 'border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,248,249,0.98),rgba(255,241,242,0.94))] shadow-[0_24px_64px_-42px_rgba(244,63,94,0.22)]'
        : feedbackState === 'armed'
          ? 'border-[#bfd2f6] bg-[linear-gradient(180deg,rgba(240,247,255,0.98),rgba(237,245,255,0.96))] shadow-[0_24px_64px_-42px_rgba(141,147,242,0.22)]'
          : 'border-[#d8e4fb] bg-[linear-gradient(180deg,rgba(239,245,255,0.98),rgba(247,250,255,0.96))] shadow-[0_22px_64px_-42px_rgba(15,23,42,0.22)]';
  const feedbackAccentGlowClass =
    feedbackState === 'correct'
      ? 'from-emerald-200/35 via-transparent to-transparent'
      : feedbackState === 'wrong'
        ? 'from-rose-200/35 via-transparent to-transparent'
        : feedbackState === 'armed'
          ? 'from-sky-200/35 via-transparent to-transparent'
          : 'from-[#8d93f2]/14 via-transparent to-transparent';
  const feedbackPill =
    !isDeferredMode && selectedKey !== null
      ? isCurrentAnswerCorrect
        ? {
            label: 'Correcta',
            className:
              'border-emerald-200/90 bg-emerald-50/92 text-emerald-700 shadow-[0_12px_24px_-20px_rgba(16,185,129,0.28)]',
            icon: <Check size={14} strokeWidth={3} />
          }
        : {
            label: 'Fallo',
            className:
              'border-rose-200/90 bg-rose-50/92 text-rose-700 shadow-[0_12px_24px_-20px_rgba(244,63,94,0.24)]',
            icon: <X size={14} strokeWidth={3} />
          }
      : null;
  const nextButtonLabel =
    questionIndex === totalQuestions - 1
      ? isDeferredMode
        ? 'Finalizar simulacro'
        : 'Ver resultados'
      : isDeferredMode
        ? 'Guardar y seguir'
        : 'Siguiente pregunta';

  const formattedRemainingTime =
    remainingSeconds === null
      ? null
      : `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(
          remainingSeconds % 60
        ).padStart(2, '0')}`;

  const buildSubmission = (): PracticeAnswerSubmission | null => {
    if (!selectedKey) return null;
    const answeredAt = new Date().toISOString();
    const nowPerformance =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsedMs = Math.max(0, Math.round(nowPerformance - questionStartedAtRef.current));
    const resolvedResponseTimeMs =
      isDeferredMode ? elapsedMs : selectionElapsedMs ?? elapsedMs;
    const isCorrect = selectedKey === question.correctOption;

    return {
      selectedOption: selectedKey,
      answeredAt,
      responseTimeMs: resolvedResponseTimeMs,
      timeToFirstSelectionMs: firstSelectionElapsedMs ?? elapsedMs,
      changedAnswer,
      errorTypeInferred: inferAttemptErrorType({
        statement: question.statement,
        selectedOptionText: question.options[selectedKey],
        correctOptionText: question.options[question.correctOption],
        responseTimeMs: elapsedMs,
        isCorrect
      })
    };
  };

  const submitCurrentAnswer = () => {
    const submission = buildSubmission();
    if (!submission) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const scrollRoot = document.scrollingElement;
    scrollRoot?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
    onAnswer(submission);
  };

  const renderActionButton = () => (
    <Button
      variant="premium"
      size="xl"
      onClick={submitCurrentAnswer}
      className="flex w-full items-center justify-between"
    >
      <span className="min-w-0 text-left truncate uppercase tracking-[0.14em]">
        {nextButtonLabel}
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
        <ArrowRight size={18} />
      </span>
    </Button>
  );

  return (
    <div
      className={`mx-auto flex w-full max-w-[1920px] flex-1 flex-col px-3 py-3 sm:px-6 sm:py-6 lg:px-10 lg:py-10 2xl:px-16 ${
        selectedKey !== null ? 'pb-32' : 'pb-10'
      }`}
    >
      <div className="relative mb-3 overflow-hidden rounded-[1.5rem] border border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#79b6e9_0%,#8aa6ee_56%,#8a90f4_100%)] p-3 text-white shadow-[0_24px_60px_-40px_rgba(141,147,242,0.3)] sm:mb-4 sm:rounded-[1.7rem] sm:p-5 xl:mb-5 xl:rounded-[1.95rem] xl:p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/16 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
          <div className="absolute right-4 top-4 h-24 w-24 rounded-full border border-white/14 xl:h-32 xl:w-32" />
        </div>

        <div className="relative grid gap-2.5 sm:gap-3">
          <div className="flex items-start justify-between gap-3">
            {simplified ? (
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-50/82">
                  Practica
                </p>
                <h2 className="mt-1 text-[1.15rem] font-black tracking-[-0.03em] text-white sm:text-[1.55rem]">
                  Pregunta {displayQuestionNumber}
                </h2>
                <p className="mt-0.5 text-[13px] font-semibold text-white/82 sm:text-[0.98rem]">
                  {questionIndex + 1} de {totalQuestions}
                </p>
              </div>
            ) : (
              <div className="min-w-0 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-sky-50/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/92" />
                  {sessionPresentation.eyebrow}
                </span>
                <span className="inline-flex items-center rounded-full border border-white/16 bg-white/10 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/78">
                  {questionScopeLabel}
                </span>
                {question.category ? (
                  <span className="inline-flex items-center rounded-full border border-white/16 bg-white/10 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/78">
                    {question.category}
                  </span>
                ) : null}
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2">
              {formattedRemainingTime ? (
                <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/22 bg-white/12 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  <Clock3 size={13} />
                  {formattedRemainingTime}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => onEndSession(buildSubmission())}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/55 bg-[linear-gradient(180deg,rgba(251,113,133,0.28),rgba(244,63,94,0.24))] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[0_12px_22px_-18px_rgba(244,63,94,0.34)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(251,113,133,0.34),rgba(244,63,94,0.3))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-100/70 active:translate-y-0 active:scale-[0.98]"
              >
                <X size={13} strokeWidth={3} />
                Salir
              </button>
            </div>
          </div>

          {!simplified ? (
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[1.08rem] font-black tracking-[-0.03em] text-white sm:text-[1.55rem] xl:text-[1.85rem]">
                  Pregunta {displayQuestionNumber}{' '}
                  <span className="text-white/82">({questionIndex + 1} de {totalQuestions})</span>
                </h2>
                <p className="mt-1 hidden max-w-[44rem] text-xs font-semibold leading-5 text-white/68 sm:block xl:text-sm xl:leading-6">
                  {title}. {subtitle}
                </p>
              </div>
              <span className="rounded-full border border-white/16 bg-white/10 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-3 sm:text-[10px]">
                {sessionPresentation.compactLabel}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <section
        key={question.id}
        className={`flex flex-1 flex-col gap-6 transition-all duration-300 ease-out ${
          isQuestionVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        {/* --- QUESTION AREA: MOBILE STICKY + DESKTOP FULL WIDTH --- */}
        <div className="sticky top-1 z-30 -mx-1 px-1 pb-1 pt-2 sm:top-2 sm:pb-2 xl:static xl:z-auto xl:mx-0 xl:p-0 xl:pb-0 xl:pt-0">
           <div
             className={`relative overflow-hidden rounded-[1.8rem] border p-5 backdrop-blur-md transition-all duration-300 sm:rounded-[2.5rem] sm:p-7 xl:min-h-[22rem] xl:p-12 ${feedbackSurfaceClass} ${
               isDecisionVisible ? 'decision-soft-pulse' : ''
             }`}
           >
             <div className="absolute inset-y-4 left-0 w-1.5 rounded-r-full bg-[linear-gradient(180deg,#7cb6e8_0%,#8d93f2_100%)] opacity-85" />
             <div className="relative z-10 mb-4 flex items-start justify-between gap-3 sm:mb-6">
               <div className="flex items-center gap-3">
                 <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm sm:px-3 sm:py-1.5 sm:text-[10px]">
                   {simplified ? 'Pregunta' : 'Enunciado del Caso'}
                 </span>
               </div>
               {feedbackPill ? (
                 <span
                   className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest sm:gap-2 sm:px-4 sm:py-2 sm:text-[12px] ${feedbackPill.className}`}
                 >
                   {feedbackPill.icon}
                   <span>{feedbackPill.label}</span>
                 </span>
               ) : null}
             </div>
             <h3 className="relative z-10 text-[1.18rem] font-black leading-[1.6] tracking-tight text-slate-950 sm:text-[1.8rem] sm:leading-snug xl:text-[2.6rem]">
               {question.statement}
             </h3>
           </div>
        </div>

        {/* --- ANSWERS AREA: GRID FOR HORIZONTAL EFFICIENCY --- */}
        <div className="grid gap-4 w-full">
           <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                 Selecciona la respuesta correcta
              </p>
              <div className="hidden lg:flex items-center gap-4">
                 <div className="flex items-center gap-2 text-[11px] font-black text-slate-400">
                    <Clock3 size={14} /> {formattedRemainingTime ?? 'Sin límite'}
                 </div>
              </div>
           </div>

           <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 xl:gap-5">
            {optionEntries.map(([key, value]) => {
              const isCorrectOption = revealedCorrectKey === key;
              const isWrongSelected =
                selectedKey !== null && selectedKey === key && revealedCorrectKey !== key;
              const isOtherSelected = selectedKey !== null && selectedKey !== key && !isCorrectOption;
              const isDeferredSelected = isDeferredMode && selectedKey === key;
              const feedbackAccentClass = isDeferredSelected
                ? 'bg-[linear-gradient(180deg,#7cb6e8_0%,#8d93f2_100%)] opacity-95'
                : isCorrectOption
                  ? 'bg-[linear-gradient(180deg,#34d399_0%,#10b981_100%)] opacity-95'
                  : isWrongSelected
                    ? 'bg-[linear-gradient(180deg,#fb7185_0%,#f43f5e_100%)] opacity-95'
                    : 'bg-white/0 opacity-0';

              return (
                <button
                  key={key}
                  ref={(node) => {
                    optionRefs.current[key] = node;
                  }}
                  type="button"
                  onClick={() => {
                    if (!isDeferredMode && selectedKey !== null) return;
                    const nowPerformance =
                      typeof performance !== 'undefined' ? performance.now() : Date.now();
                    const elapsedMs = Math.max(
                      0,
                      Math.round(nowPerformance - questionStartedAtRef.current)
                    );
                    if (isDeferredMode) {
                      if (selectedKey === null) {
                        setSelectedKey(key);
                        setFirstSelectionElapsedMs(elapsedMs);
                        setSelectionElapsedMs(elapsedMs);
                        setChangedAnswer(false);
                        return;
                      }

                      if (selectedKey !== key) {
                        setSelectedKey(key);
                        setChangedAnswer(true);
                      }
                      return;
                    }

                    setSelectedKey(key);
                    setFirstSelectionElapsedMs(elapsedMs);
                    setSelectionElapsedMs(elapsedMs);
                    setChangedAnswer(false);
                    setRevealedCorrectKey(question.correctOption);
                  }}
                  disabled={!isDeferredMode && selectedKey !== null}
                  className={`relative flex w-full items-start gap-3 overflow-hidden rounded-[1.2rem] border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 sm:gap-3.5 sm:px-5 sm:py-3.5 xl:rounded-[1.35rem] xl:px-6 xl:py-5 ${
                    isDeferredMode
                      ? isDeferredSelected
                        ? 'border-[#bfd2f6] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(237,245,255,0.96))] shadow-[0_24px_38px_-28px_rgba(141,147,242,0.22)] ring-1 ring-sky-200'
                        : 'border-slate-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))] shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-[#bfd2f6] hover:bg-white hover:shadow-[0_24px_38px_-28px_rgba(141,147,242,0.16)] active:translate-y-0 active:scale-[0.99]'
                      : isCorrectOption
                      ? 'border-emerald-300 bg-[linear-gradient(180deg,rgba(236,253,245,1),rgba(220,252,231,0.92))] shadow-[0_16px_35px_-24px_rgba(16,185,129,0.32)] ring-1 ring-emerald-100'
                      : isWrongSelected
                        ? 'border-rose-300 bg-[linear-gradient(180deg,rgba(255,241,242,1),rgba(255,228,230,0.92))] shadow-[0_16px_35px_-24px_rgba(244,63,94,0.26)] ring-1 ring-rose-100'
                      : isOtherSelected
                          ? 'border-slate-200/90 bg-white/55 opacity-60 saturate-75'
                          : 'border-slate-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))] shadow-[0_18px_34px_-28px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-[#bfd2f6] hover:bg-white hover:shadow-[0_24px_38px_-28px_rgba(141,147,242,0.16)] active:translate-y-0 active:scale-[0.99]'
                  } ${selectedKey === key && isDecisionVisible ? 'decision-commit-in' : ''}`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-3 left-0 w-1.5 rounded-r-full transition-all duration-200 ${feedbackAccentClass}`}
                  />
                  <span
                    className={`relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] text-base font-extrabold sm:mt-1 sm:h-10 sm:w-10 sm:rounded-[1rem] sm:text-[1.02rem] xl:h-11 xl:w-11 xl:text-[1.08rem] ${
                      isDeferredMode
                        ? isDeferredSelected
                          ? 'bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] text-white shadow-[0_14px_24px_-18px_rgba(141,147,242,0.45)]'
                          : 'bg-[linear-gradient(135deg,rgba(125,182,232,0.18),rgba(141,147,242,0.18))] text-slate-700'
                        : isCorrectOption
                        ? 'bg-emerald-500 text-white shadow-[0_14px_24px_-18px_rgba(16,185,129,0.38)]'
                        : isWrongSelected
                          ? 'bg-rose-500 text-white shadow-[0_14px_24px_-18px_rgba(244,63,94,0.34)]'
                          : 'bg-[linear-gradient(135deg,rgba(125,182,232,0.18),rgba(141,147,242,0.18))] text-slate-700'
                    }`}
                  >
                    {key.toUpperCase()}
                  </span>
                  <span
                    className={`relative z-10 min-w-0 flex-1 pr-1 text-[1.02rem] font-semibold leading-[1.72] sm:text-[1.12rem] sm:leading-[1.78] xl:text-[1.18rem] xl:leading-[1.88] ${
                      isDeferredMode
                        ? isDeferredSelected
                          ? 'text-slate-950'
                          : 'text-slate-800'
                        : isCorrectOption
                        ? 'text-emerald-900'
                        : isWrongSelected
                          ? 'text-rose-900'
                          : 'text-slate-800'
                    }`}
                  >
                    {value}
                  </span>
                  {isDeferredSelected ? (
                    <span className="relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-sky-50/90 text-sky-600 shadow-[0_12px_24px_-20px_rgba(125,182,232,0.34)]">
                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    </span>
                  ) : null}
                  {!isDeferredMode && isCorrectOption ? (
                    <span className="relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-[0_12px_24px_-20px_rgba(16,185,129,0.32)]">
                      <Check size={15} strokeWidth={3} />
                    </span>
                  ) : null}
                  {!isDeferredMode && isWrongSelected ? (
                    <span className="relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-600 shadow-[0_12px_24px_-20px_rgba(244,63,94,0.28)]">
                      <X size={15} strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}

            {selectedKey !== null ? (
              <div className="hidden xl:block lg:col-span-2 mt-8">
                <div className="rounded-[2.5rem] border border-white/75 bg-white/95 p-3 shadow-xl backdrop-blur">
                  {renderActionButton()}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {selectedKey !== null ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 xl:hidden">
          <div className="mx-auto w-full max-w-2xl bg-[linear-gradient(180deg,rgba(248,250,252,0)_0%,rgba(248,250,252,0.95)_38%,rgba(248,250,252,1)_100%)] px-3 pb-4 pt-8 sm:px-6 sm:pb-6">
            <div className="pointer-events-auto">
              <div
                ref={actionBarRef}
                className="rounded-[2rem] border border-white/80 bg-white/95 p-2 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-3"
              >
                {renderActionButton()}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default QuizScreen;
