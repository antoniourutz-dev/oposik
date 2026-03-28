import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Clock3, X } from 'lucide-react';
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
  const questionScopeLabel = getQuestionScopeLabel(questionScope);
  const previewAnsweredCount = Math.min(
    totalQuestions,
    answers.length + (hasAnsweredCurrentQuestion ? 1 : 0)
  );
  const previewCorrectCount = isDeferredMode
    ? answers.filter((answer) => answer.isCorrect).length
    : answers.filter((answer) => answer.isCorrect).length +
      (hasAnsweredCurrentQuestion && selectedKey === question.correctOption ? 1 : 0);
  const immediateStreak = (() => {
    const outcomeTrail = answers.map((answer) => answer.isCorrect);
    if (!isDeferredMode && hasAnsweredCurrentQuestion) {
      outcomeTrail.push(selectedKey === question.correctOption);
    }

    let streak = 0;
    for (let index = outcomeTrail.length - 1; index >= 0; index -= 1) {
      if (!outcomeTrail[index]) break;
      streak += 1;
    }
    return streak;
  })();
  const currentStage = Math.min(
    4,
    Math.max(
      1,
      Math.ceil(((previewAnsweredCount > 0 ? previewAnsweredCount : questionIndex + 1) / totalQuestions) * 4)
    )
  );
  const stageName =
    ['Arranque', 'Traccion', 'Cruce', 'Cierre'][currentStage - 1] ?? 'Pulso';
  const rhythmLabel = (() => {
    if (isDeferredMode && timeLimitSeconds) {
      const elapsedSeconds = Math.max(
        1,
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      );
      const answeredForRhythm = Math.max(previewAnsweredCount, 1);
      const idealSpentSeconds = (timeLimitSeconds / totalQuestions) * answeredForRhythm;
      const ratio = elapsedSeconds / Math.max(idealSpentSeconds, 1);

      if (ratio <= 0.85) return 'Con margen';
      if (ratio <= 1.05) return 'Ritmo exacto';
      return 'Ritmo justo';
    }

    const knownResponseTimes = answers
      .map((answer) => answer.responseTimeMs)
      .filter((value): value is number => value !== null);
    const currentResponseTime =
      !isDeferredMode && hasAnsweredCurrentQuestion && selectionElapsedMs !== null
        ? [selectionElapsedMs]
        : [];
    const responseSample = [...knownResponseTimes, ...currentResponseTime];

    if (responseSample.length === 0) return 'En arranque';

    const averageSeconds =
      responseSample.reduce((total, value) => total + value, 0) / responseSample.length / 1000;

    if (averageSeconds <= 15) return 'Agil';
    if (averageSeconds <= 28) return 'Estable';
    return 'Pausado';
  })();
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
  const isCurrentAnswerCorrect =
    selectedKey !== null && selectedKey === question.correctOption;
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

  return (
    <div
      className={`mx-auto flex w-full max-w-3xl flex-1 flex-col px-0 py-3 sm:px-2 lg:px-4 ${
        selectedKey !== null ? 'pb-28 sm:pb-32' : 'pb-8 sm:pb-10'
      }`}
    >
      <div className="relative mb-3 overflow-hidden rounded-[1.5rem] border border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#79b6e9_0%,#8aa6ee_56%,#8a90f4_100%)] p-3 text-white shadow-[0_24px_60px_-40px_rgba(141,147,242,0.3)] sm:mb-4 sm:rounded-[1.7rem] sm:p-5">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/16 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
          <div className="absolute right-4 top-4 h-24 w-24 rounded-full border border-white/14" />
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
                <h2 className="text-[1.08rem] font-black tracking-[-0.03em] text-white sm:text-[1.55rem]">
                  Pregunta {displayQuestionNumber}{' '}
                  <span className="text-white/82">({questionIndex + 1} de {totalQuestions})</span>
                </h2>
                <p className="mt-1 hidden max-w-[30rem] text-xs font-semibold leading-5 text-white/68 sm:block">
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
        className={`flex flex-1 flex-col transition-all duration-300 ease-out ${
          isQuestionVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <div className="sticky top-3 z-20 -mx-1 rounded-[1.9rem] bg-[linear-gradient(180deg,rgba(255,253,248,0.97)_0%,rgba(248,250,252,0.94)_78%,rgba(248,250,252,0)_100%)] px-1 pb-2 pt-0.5 sm:top-4 sm:pb-3 sm:pt-1">
          <div
            className={`relative overflow-hidden rounded-[1.45rem] border p-3.5 backdrop-blur transition-all duration-300 sm:rounded-[1.75rem] sm:p-6 ${feedbackSurfaceClass} ${
              isDecisionVisible ? 'decision-soft-pulse' : ''
            }`}
          >
            <div className="absolute inset-y-4 left-0 w-1.5 rounded-r-full bg-[linear-gradient(180deg,#7cb6e8_0%,#8d93f2_100%)] opacity-85" />
            <div
              className={`absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,147,242,0.1),transparent_18%),linear-gradient(135deg,rgba(125,182,232,0.05),transparent_38%)]`}
            />
            <div
              className={`absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))] ${feedbackAccentGlowClass}`}
            />
            {!feedbackPill ? (
              <div className="absolute right-0 top-0 p-2.5 text-sky-200/26 sm:p-4">
                <AlertCircle size={44} className="sm:h-[72px] sm:w-[72px]" />
              </div>
            ) : null}
            <div className="relative z-10 mb-3 flex items-start justify-between gap-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[#cbdcf9] bg-white/78 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                  {simplified ? 'Pregunta' : 'Enunciado'}
                </span>
                {!simplified ? (
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Lee antes de elegir
                  </span>
                ) : null}
              </div>
              {feedbackPill ? (
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] ${feedbackPill.className}`}
                >
                  {feedbackPill.icon}
                  <span>{feedbackPill.label}</span>
                </span>
              ) : null}
            </div>
            <h3 className="relative z-10 text-[1.06rem] font-extrabold leading-[1.82] tracking-[-0.02em] text-slate-900 sm:text-[1.62rem] sm:leading-[2.7rem]">
              {question.statement}
            </h3>
          </div>
        </div>

        {simplified && showCompactProgress ? (
          <div className="mb-3 rounded-[1rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,249,255,0.88))] p-2 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.16)] sm:mb-4 sm:rounded-[1.15rem] sm:p-2.5">
            <div className="flex gap-1">
              {Array.from({ length: totalQuestions }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2.5 rounded-full transition-all duration-300 sm:h-3 ${
                    index === questionIndex ? 'flex-[1.8]' : 'flex-1'
                  } ${
                    isDeferredMode
                      ? index < answers.length
                        ? 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_10px_18px_-14px_rgba(141,147,242,0.5)]'
                        : index === questionIndex && hasAnsweredCurrentQuestion
                          ? 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_10px_18px_-14px_rgba(141,147,242,0.5)]'
                          : index === questionIndex
                            ? 'border border-[#bfd2f6] bg-white shadow-[0_10px_18px_-16px_rgba(148,163,184,0.4)]'
                            : 'bg-slate-100/90'
                      : index === questionIndex
                        ? hasAnsweredCurrentQuestion
                          ? isCurrentAnswerCorrect
                            ? 'bg-emerald-400 shadow-[0_10px_18px_-14px_rgba(16,185,129,0.45)]'
                            : 'bg-rose-500 shadow-[0_10px_18px_-14px_rgba(244,63,94,0.4)]'
                          : 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_10px_18px_-14px_rgba(141,147,242,0.5)]'
                        : answers[index]
                          ? answers[index].isCorrect
                            ? 'bg-emerald-400'
                            : 'bg-rose-500'
                          : 'bg-slate-100/90'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}

        {!simplified ? (
          <div
            className={`mb-3 rounded-[1rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,249,255,0.88))] p-2 backdrop-blur transition-all duration-300 sm:mb-4 sm:rounded-[1.15rem] sm:p-2.5 ${
              feedbackState === 'correct'
                ? 'border-emerald-100/90 shadow-[0_16px_28px_-24px_rgba(16,185,129,0.18)]'
                : feedbackState === 'wrong'
                  ? 'border-rose-100/90 shadow-[0_16px_28px_-24px_rgba(244,63,94,0.14)]'
                  : feedbackState === 'armed'
                    ? 'border-[#d5e2fa] shadow-[0_16px_28px_-24px_rgba(141,147,242,0.18)]'
                    : 'border-white/75 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.16)]'
            } ${isDecisionVisible ? 'decision-soft-pulse' : ''}`}
          >
            <div className="flex gap-1">
              {Array.from({ length: totalQuestions }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2.5 rounded-full transition-all duration-300 sm:h-3 ${
                    index === questionIndex ? 'flex-[1.8]' : 'flex-1'
                  } ${
                    isDeferredMode
                      ? index < answers.length
                        ? 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_10px_18px_-14px_rgba(141,147,242,0.5)]'
                        : index === questionIndex && hasAnsweredCurrentQuestion
                          ? 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_10px_18px_-14px_rgba(141,147,242,0.5)]'
                          : index === questionIndex
                            ? 'border border-[#bfd2f6] bg-white shadow-[0_10px_18px_-16px_rgba(148,163,184,0.4)]'
                            : 'bg-slate-100/90'
                      : index === questionIndex
                        ? hasAnsweredCurrentQuestion
                          ? isCurrentAnswerCorrect
                            ? 'bg-emerald-400 shadow-[0_10px_18px_-14px_rgba(16,185,129,0.45)]'
                            : 'bg-rose-500 shadow-[0_10px_18px_-14px_rgba(244,63,94,0.4)]'
                          : 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_10px_18px_-14px_rgba(141,147,242,0.5)]'
                        : answers[index]
                          ? answers[index].isCorrect
                            ? 'bg-emerald-400'
                            : 'bg-rose-500'
                          : 'bg-slate-100/90'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[0.95rem] border border-slate-100/90 bg-white/88 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:px-3 sm:py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    Pulso
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {previewAnsweredCount}/{totalQuestions}
                  </span>
                </div>
                <p className="mt-1 text-[13px] font-black tracking-[-0.01em] text-slate-900 sm:text-[0.96rem]">
                  {stageName} del bloque
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] sm:text-[10px] ${rhythmToneClass}`}
                >
                  {rhythmLabel}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] sm:text-[10px] ${signalToneClass}`}
                >
                  {signalLabel}
                </span>
              </div>
            </div>

          </div>
        ) : null}

        <div className="grid gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              Respuestas
            </p>
            {!simplified ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Elige una opcion
              </p>
            ) : null}
          </div>
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
                className={`relative flex w-full items-start gap-3 overflow-hidden rounded-[1.2rem] border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 sm:gap-3.5 sm:px-5 sm:py-3.5 ${
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
                  className={`relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] text-base font-extrabold sm:mt-1 sm:h-10 sm:w-10 sm:rounded-[1rem] sm:text-[1.02rem] ${
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
                  className={`relative z-10 min-w-0 flex-1 pr-1 text-[1.02rem] font-semibold leading-[1.72] sm:text-[1.12rem] sm:leading-[1.78] ${
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
        </div>
      </section>

      {selectedKey !== null ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
          <div className="mx-auto w-full max-w-3xl bg-[linear-gradient(180deg,rgba(248,250,252,0)_0%,rgba(248,250,252,0.94)_26%,rgba(248,250,252,0.98)_100%)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-6 sm:px-4 sm:pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:px-4">
            <div className="pointer-events-auto translate-y-0 opacity-100">
              <div
                ref={actionBarRef}
                className="rounded-[1.45rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,248,255,0.94))] p-2 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.24)] backdrop-blur"
              >
                <button
                  type="button"
                  onClick={submitCurrentAnswer}
                  className="flex w-full items-center justify-between gap-3 rounded-[1.15rem] border border-white/70 bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] px-4 py-3.5 text-white shadow-[0_24px_60px_-34px_rgba(141,147,242,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-34px_rgba(141,147,242,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 active:translate-y-0 active:scale-[0.99]"
                >
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-sm font-black uppercase tracking-[0.14em] text-white sm:text-[0.96rem]">
                      {nextButtonLabel}
                    </span>
                  </span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <ArrowRight size={18} />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default QuizScreen;
