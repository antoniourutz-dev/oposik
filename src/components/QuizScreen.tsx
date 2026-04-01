import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Clock3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { inferAttemptErrorType } from '../domain/learningEngine';
import {
  OptionKey,
  PracticeAnswer,
  PracticeAnswerSubmission,
  PracticeMode,
  PracticeQuestionScopeFilter,
  PracticeQuestion,
} from '../practiceTypes';
import { getQuizFriendlyCopy } from '../sessionPresentation';
import { useQuizTelemetry } from '../hooks/useQuizTelemetry';
import { computeSessionFatigueScore } from '../domain/learningEngine/fatigue';
import { StatementBody } from './StatementBody';

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
  title: _title,
  subtitle: _subtitle,
  feedbackMode,
  startedAt,
  timeLimitSeconds,
  question,
  questionIndex,
  totalQuestions,
  questionScope: _questionScope = 'all',
  simplified = false,
  answers,
  onAnswer,
  onEndSession,
  onTimeExpired,
}) => {
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null);
  const [revealedCorrectKey, setRevealedCorrectKey] = useState<OptionKey | null>(null);
  const [firstSelectionElapsedMs, setFirstSelectionElapsedMs] = useState<number | null>(null);
  const [selectionElapsedMs, setSelectionElapsedMs] = useState<number | null>(null);
  const [changedAnswer, setChangedAnswer] = useState(false);
  const [, setIsQuestionVisible] = useState(false);
  const [isDecisionVisible, setIsDecisionVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(timeLimitSeconds);
  const questionStartedAtRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : Date.now(),
  );
  const timeExpiredRef = useRef(false);
  const actionBarRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Partial<Record<OptionKey, HTMLButtonElement | null>>>({});
  useQuizTelemetry(question.id);

  const fatigueScore = useMemo(() => {
    if (answers.length < 4) return 0;
    const sessionInsights = answers.map((a) => ({
      isCorrect: a.isCorrect,
      responseTimeMs: a.responseTimeMs ?? 0,
      errorTypeInferred: a.errorTypeInferred,
    }));
    return computeSessionFatigueScore(sessionInsights);
  }, [answers]);

  const [hasShownFatigueWarning, setHasShownFatigueWarning] = useState(false);
  const [isFatigueModalOpen, setIsFatigueModalOpen] = useState(false);

  useEffect(() => {
    if (fatigueScore >= 0.7 && !hasShownFatigueWarning) {
      setIsFatigueModalOpen(true);
      setHasShownFatigueWarning(true);
    }
  }, [fatigueScore, hasShownFatigueWarning]);

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
        ...highlightedOptions.map((node) => node.getBoundingClientRect().bottom),
      );

      if (highlightedBottom <= safeBottom) return;

      window.scrollBy({
        top: highlightedBottom - safeBottom + 12,
        behavior: 'smooth',
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
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
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
    [question.options],
  );
  const isDeferredMode = feedbackMode === 'deferred';
  const displayQuestionNumber = question.number ?? questionIndex + 1;
  const friendlyCopy = getQuizFriendlyCopy(mode);
  const isCurrentAnswerCorrect = selectedKey !== null && selectedKey === question.correctOption;
  const nextButtonLabel =
    questionIndex === totalQuestions - 1
      ? isDeferredMode
        ? 'Finalizar simulacro'
        : 'Ver resultados'
      : isDeferredMode
        ? 'Guardar y seguir'
        : 'Siguiente';

  const formattedRemainingTime =
    remainingSeconds === null
      ? null
      : `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(
          remainingSeconds % 60,
        ).padStart(2, '0')}`;

  const buildSubmission = (): PracticeAnswerSubmission | null => {
    if (!selectedKey) return null;
    const answeredAt = new Date().toISOString();
    const nowPerformance = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsedMs = Math.max(0, Math.round(nowPerformance - questionStartedAtRef.current));
    const resolvedResponseTimeMs = isDeferredMode ? elapsedMs : (selectionElapsedMs ?? elapsedMs);
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
        isCorrect,
      }),
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
    <div className="rounded-full bg-white p-1 shadow-[0_10px_28px_-12px_rgba(76,29,149,0.12),0_1px_0_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-200/60">
      <button
        type="button"
        onClick={submitCurrentAnswer}
        className="brand-gradient-h flex min-h-[52px] w-full items-center justify-center rounded-full px-6 text-[0.95rem] font-bold tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_14px_36px_-18px_rgba(124,182,232,0.45)] transition-[filter,transform] duration-200 hover:brightness-[1.04] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        {nextButtonLabel}
      </button>
    </div>
  );

  const feedbackAnnouncement =
    !isDeferredMode && selectedKey !== null
      ? isCurrentAnswerCorrect
        ? 'Correcto. Esta era la clave.'
        : 'Aquí has fallado.'
      : '';

  return (
    <div
      className={`mx-auto flex w-full max-w-[min(100%,42rem)] flex-1 flex-col bg-gradient-to-b from-slate-100/95 via-slate-50 to-indigo-50/40 px-3 py-3 sm:px-6 sm:py-6 lg:py-8 ${
        selectedKey !== null ? 'pb-32' : 'pb-10'
      }`}
    >
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {feedbackAnnouncement}
      </div>
      <AnimatePresence mode="wait">
        <div className="mb-4 space-y-3 sm:mb-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Salir de la sesión"
                onClick={() => onEndSession(buildSubmission())}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/90 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                <X aria-hidden="true" size={20} strokeWidth={2.5} />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                    Práctica
                  </span>
                  {!simplified ? (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
                      {friendlyCopy.sessionKindLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {formattedRemainingTime ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
                  <Clock3 aria-hidden="true" size={12} />
                  <span aria-label={`Tiempo restante: ${formattedRemainingTime}`}>
                    {formattedRemainingTime}
                  </span>
                </div>
              ) : null}
              <button
                type="button"
                aria-label="Salir de la sesión"
                onClick={() => onEndSession(buildSubmission())}
                className="rounded-lg px-2 py-1 text-sm font-bold text-violet-600 transition hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                Salir
              </button>
            </div>
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

          {!simplified ? (
            <div className="space-y-0.5 px-0.5 pt-1">
              <p className="text-xs font-medium text-slate-500">{friendlyCopy.contextLine1}</p>
              <p className="text-base font-bold text-slate-800">
                Pregunta {displayQuestionNumber} de {totalQuestions}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 px-0.5 pt-1">
              <p className="text-base font-bold text-slate-800">
                Pregunta {displayQuestionNumber} de {totalQuestions}
              </p>
            </div>
          )}
        </div>

        <motion.section
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex flex-1 flex-col gap-6"
        >
          {/* --- ENUNCIADO (superficie de lectura: distinta de las tarjetas de opción) --- */}
          <div className="sticky top-1 z-30 -mx-1 px-1 pb-1 pt-2 sm:top-2 sm:pb-2 xl:static xl:z-auto xl:mx-0 xl:p-0 xl:pb-0 xl:pt-0">
            <div
              className={`relative isolate overflow-hidden rounded-[1.75rem] border border-violet-200/60 bg-[linear-gradient(152deg,#f5f3ff_0%,#ffffff_50%,#eef2ff_100%)] p-5 shadow-[0_22px_50px_-30px_rgba(91,33,182,0.14),0_1px_0_#ffffff_inset] ring-1 ring-violet-100/80 transition-all duration-300 sm:rounded-[2rem] sm:p-8 xl:p-10 ${
                isDecisionVisible ? 'decision-soft-pulse' : ''
              }`}
            >
              {/* Decoración solo encima del fondo opaco (sin transparencias que mezclen con el scroll de detrás) */}
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
              <div className="relative z-10 max-w-prose text-[1.05rem] font-medium leading-[1.82] tracking-tight text-slate-700 sm:text-[1.12rem] sm:leading-[1.78]">
                <StatementBody text={question.statement} />
              </div>
            </div>
          </div>

          <div className="grid w-full gap-5">
            {selectedKey === null ? (
              <p className="text-center text-sm font-medium text-slate-500">
                Piensa bien antes de responder
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:gap-5">
              {optionEntries.map(([key, value]) => {
                const isCorrectOption = revealedCorrectKey === key;
                const isWrongSelected =
                  selectedKey !== null && selectedKey === key && revealedCorrectKey !== key;
                const isOtherSelected =
                  selectedKey !== null && selectedKey !== key && !isCorrectOption;
                const isDeferredSelected = isDeferredMode && selectedKey === key;
                const feedbackAccentClass = isDeferredSelected
                  ? 'quantia-bg-gradient opacity-95'
                  : isCorrectOption
                    ? 'bg-[linear-gradient(180deg,#34d399_0%,#10b981_100%)] opacity-95'
                    : isWrongSelected
                      ? 'bg-[linear-gradient(180deg,#fb7185_0%,#f43f5e_100%)] opacity-95'
                      : 'bg-white/0 opacity-0';

                const ariaLabel = isCorrectOption
                  ? `Opción ${key.toUpperCase()}: ${value} — Correcta`
                  : isWrongSelected
                    ? `Opción ${key.toUpperCase()}: ${value} — Incorrecta`
                    : `Opción ${key.toUpperCase()}: ${value}`;

                return (
                  <motion.button
                    key={key}
                    ref={(node) => {
                      optionRefs.current[key] = node;
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    aria-label={ariaLabel}
                    aria-pressed={selectedKey === key ? 'true' : 'false'}
                    onClick={() => {
                      if (!isDeferredMode && selectedKey !== null) return;
                      const nowPerformance =
                        typeof performance !== 'undefined' ? performance.now() : Date.now();
                      const elapsedMs = Math.max(
                        0,
                        Math.round(nowPerformance - questionStartedAtRef.current),
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
                    className={`relative flex w-full flex-col items-stretch gap-2 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80 sm:px-5 sm:py-4 ${
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
                            ? 'quantia-bg-gradient text-white shadow-[0_14px_24px_-18px_rgba(141,147,242,0.45)]'
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
                      <span
                        aria-hidden="true"
                        className="relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-[0_12px_24px_-20px_rgba(16,185,129,0.32)]"
                      >
                        <Check size={15} strokeWidth={3} />
                      </span>
                    ) : null}
                    {!isDeferredMode && isWrongSelected ? (
                      <span
                        aria-hidden="true"
                        className="relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-600 shadow-[0_12px_24px_-20px_rgba(244,63,94,0.28)]"
                      >
                        <X size={15} strokeWidth={3} />
                      </span>
                    ) : null}
                  </motion.button>
                );
              })}

              <AnimatePresence>
                {selectedKey !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 hidden xl:block"
                  >
                    <div className="rounded-[2.5rem] border border-white/75 bg-white/95 p-3 shadow-xl backdrop-blur">
                      {renderActionButton()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>
      </AnimatePresence>

      <AnimatePresence>
        {selectedKey !== null && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 xl:hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFatigueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
              onClick={() => setIsFatigueModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/20 bg-white shadow-2xl"
            >
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-50 blur-3xl" />

              <div className="p-8 text-center sm:p-10">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-500 shadow-inner">
                  <AlertCircle aria-hidden="true" size={40} strokeWidth={1.5} />
                </div>

                <h3 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Señal de <span className="text-rose-600">Fatiga</span>
                </h3>

                <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-500">
                  Llevas muchas preguntas seguidas. Un descanso ahora puede ayudarte a consolidar
                  mejor lo que has repasado.
                </p>

                <div className="mt-8 space-y-3">
                  <Button
                    onClick={() => setIsFatigueModalOpen(false)}
                    className="w-full h-14 rounded-2xl bg-rose-600 text-lg font-bold text-white shadow-lg hover:bg-rose-700 hover:shadow-rose-600/20 active:scale-[0.98]"
                  >
                    Continuar bajo mi riesgo
                  </Button>
                  <Button
                    onClick={() => (window.location.href = '/dashboard')}
                    variant="ghost"
                    className="w-full h-14 rounded-2xl text-base font-bold text-slate-500 hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Pausar sesión (Recomendado)
                  </Button>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Protección de memoria activa
                  </p>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuizScreen;
