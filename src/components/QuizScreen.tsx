import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { inferAttemptErrorType } from '../domain/learningEngine';
import {
  ActivePracticeSession,
  OptionKey,
  PracticeAnswer,
  PracticeAnswerSubmission,
  PracticeMode,
  PracticeQuestionScopeFilter,
  PracticeQuestion,
} from '../practiceTypes';
import {
  buildTestAdapterOutput,
  quizFeedbackAnnouncement,
  resolveQuizPrimaryButtonLabel,
  type TestAdapterSurfaceContext,
} from '../adapters/surfaces/testAdapter';
import { getQuizFriendlyCopy } from '../sessionPresentation';
import { useQuizTelemetry } from '../hooks/useQuizTelemetry';
import { computeSessionFatigueScore } from '../domain/learningEngine/fatigue';
import { StatementBody } from './StatementBody';
import { HighlightedText } from './HighlightedText';

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
  /** Sesión activa (adapter de superficie). */
  activeSession: ActivePracticeSession;
  /** Contexto alineado con Home/Stats para una sola narrativa dominante. */
  surfaceContext: TestAdapterSurfaceContext;
  onAnswer: (submission: PracticeAnswerSubmission) => void;
  onEndSession: (submission: PracticeAnswerSubmission | null) => void;
  onTimeExpired: (submission: PracticeAnswerSubmission | null) => void;
  /** Preferencia de perfil: resaltado en enunciado, opciones y explicaciones (si aplica). */
  textHighlightingEnabled?: boolean;
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
  activeSession,
  surfaceContext,
  onAnswer,
  onEndSession,
  onTimeExpired,
  textHighlightingEnabled = true,
}) => {
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null);
  const [revealedCorrectKey, setRevealedCorrectKey] = useState<OptionKey | null>(null);
  const [firstSelectionElapsedMs, setFirstSelectionElapsedMs] = useState<number | null>(null);
  const [selectionElapsedMs, setSelectionElapsedMs] = useState<number | null>(null);
  const [changedAnswer, setChangedAnswer] = useState(false);
  const [, setIsQuestionVisible] = useState(false);
  const [isDecisionVisible, setIsDecisionVisible] = useState(false);
  const [, setRemainingSeconds] = useState<number | null>(timeLimitSeconds);
  const questionStartedAtRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : Date.now(),
  );
  const timeExpiredRef = useRef(false);
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

      // Margen para el CTA flotante fijo (~88px) + pequeño buffer.
      const safeBottom = window.innerHeight - 104;
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
  const optionTextsForCompare = useMemo(
    () => optionEntries.map(([, v]) => v),
    [optionEntries],
  );

  const testExperience = useMemo(
    () =>
      buildTestAdapterOutput({
        planV2: surfaceContext.planV2,
        activeSession,
        answers,
        currentQuestion: question,
        pressureInsightsV2: surfaceContext.pressureInsightsV2,
        selectedQuestionScope: _questionScope,
        surfaceContext,
      }),
    [activeSession, answers, question, surfaceContext, _questionScope],
  );

  const statementHighlightEnabled =
    textHighlightingEnabled && testExperience.answerUi.highlightImportantText;

  const isDeferredMode = feedbackMode === 'deferred';
  const friendlyCopy = getQuizFriendlyCopy(mode);
  const resolvedQuestionScope = question.questionScope ?? (_questionScope !== 'all' ? _questionScope : null);
  const scopeLabelUpper =
    resolvedQuestionScope === 'common'
      ? 'TEMARIO COMÚN'
      : resolvedQuestionScope === 'specific'
        ? 'TEMARIO ESPECÍFICO'
        : String(friendlyCopy.contextLine1 ?? 'TEMARIO').toUpperCase();
  const displayQuestionNumber = question.number ?? null;
  const isCurrentAnswerCorrect = selectedKey !== null && selectedKey === question.correctOption;
  const nextButtonLabel = useMemo(
    () =>
      resolveQuizPrimaryButtonLabel(testExperience, {
        questionIndex,
        totalQuestions,
        feedbackMode,
      }),
    [feedbackMode, questionIndex, testExperience, totalQuestions],
  );

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

  const renderActionButton = (disabled: boolean) => (
    <button
      type="button"
      onClick={submitCurrentAnswer}
      disabled={disabled}
      className={`w-full py-[1.15rem] text-white rounded-[28px] font-black text-[1.05rem] tracking-[-0.02em] transition-[transform,filter] duration-200 hover:brightness-[1.06] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/55 ${primaryCtaClass}`}
    >
      {nextButtonLabel}
    </button>
  );

  const feedbackAnnouncement = useMemo(() => {
    if (isDeferredMode || selectedKey === null) return '';
    return quizFeedbackAnnouncement({
      isCorrect: isCurrentAnswerCorrect,
      hasSelection: true,
      feedbackStyle: testExperience.feedbackStyle,
    });
  }, [
    isCurrentAnswerCorrect,
    isDeferredMode,
    selectedKey,
    testExperience.feedbackStyle,
  ]);

  /** Microseñal conductual sobria (solo refuerzos; sin castigar la velocidad). */
  const behavioralMicroLine = useMemo(() => {
    if (selectedKey === null) return null;
    if (!testExperience.feedbackStyle.showMicroReinforcement && mode !== 'simulacro') return null;
    const correct = selectedKey === question.correctOption;
    const ms = firstSelectionElapsedMs ?? 0;
    if (isDeferredMode && changedAnswer && correct) return 'Buena verificación';
    if (correct && ms >= 11000) return 'Mejor lectura';
    if (correct && ms >= 6500 && ms < 11000) return 'Lectura pausada';
    if (mode === 'simulacro' && correct && ms >= 4500) return 'Control bajo presión';
    return null;
  }, [
    changedAnswer,
    firstSelectionElapsedMs,
    isDeferredMode,
    mode,
    question.correctOption,
    selectedKey,
    testExperience.feedbackStyle.showMicroReinforcement,
  ]);

  const quizSurfaceClass =
    testExperience.tension === 'high'
      ? 'ring-1 ring-slate-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]'
      : testExperience.tension === 'low'
        ? 'ring-1 ring-slate-200/70'
        : '';
  const primaryCtaClass =
    testExperience.tension === 'high'
      ? 'bg-slate-950 ring-1 ring-white/10 shadow-[0_20px_48px_-20px_rgba(15,23,42,0.45)]'
      : 'bg-slate-900 shadow-xl';

  return (
    <div
      className={`mx-auto flex w-full max-w-[min(100%,42rem)] flex-1 flex-col rounded-[1.5rem] bg-slate-50 text-slate-900 px-3 py-3 sm:px-6 sm:py-6 lg:py-8 pb-28 ${quizSurfaceClass}`}
    >
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {feedbackAnnouncement}
      </div>
      <AnimatePresence mode="wait">
        <div className="mb-4 flex items-center justify-between gap-3 max-w-2xl mx-auto w-full sm:mb-5">
          <button
            type="button"
            aria-label="Salir de la sesión"
            onClick={() => onEndSession(buildSubmission())}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-600 shadow-sm transition hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
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

          <span className="text-xs font-black text-slate-400 tracking-tight">
            {questionIndex + 1}/{totalQuestions}
          </span>
        </div>

        <motion.section
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex flex-1 flex-col gap-6"
        >
          {/* --- Enunciado: intención de sesión + lectura seria --- */}
          <div
            className={`sticky top-0 z-30 rounded-b-xl bg-slate-50/95 pt-2 pb-3 backdrop-blur-[6px] sm:pt-3 sm:pb-4 ${
              isDecisionVisible ? 'decision-soft-pulse' : ''
            }`}
          >
            <div className="mb-3 space-y-1.5 border-b border-slate-200/80 pb-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {!simplified ? (
                  <>
                    {scopeLabelUpper}
                    <span className="mx-1.5 text-slate-300">·</span>
                    Pregunta {questionIndex + 1}/{totalQuestions}
                  </>
                ) : (
                  'Enunciado'
                )}
              </p>
              {!simplified && testExperience.headerContext ? (
                <p
                  className={`text-[0.8125rem] font-bold leading-snug tracking-[-0.02em] ${
                    testExperience.headerContext.subdued ? 'text-slate-600' : 'text-slate-900'
                  }`}
                >
                  {testExperience.headerContext.label}
                </p>
              ) : null}
            </div>
            <h2 className="text-[1.35rem] font-semibold leading-[1.4] tracking-[-0.025em] text-slate-950 sm:text-[1.5rem] sm:leading-[1.38]">
              {displayQuestionNumber != null ? (
                <span className="mr-1.5 font-bold text-slate-500">{displayQuestionNumber}.</span>
              ) : null}
              <StatementBody
                text={question.statement}
                highlightEnabled={statementHighlightEnabled}
              />
            </h2>
          </div>

          <div className="grid w-full gap-5">
            <div className="space-y-4">
              {optionEntries.map(([key, value], optionIdx) => {
                const isCorrectOption = revealedCorrectKey === key;
                const isWrongSelected =
                  selectedKey !== null && selectedKey === key && revealedCorrectKey !== key;
                const isOtherSelected =
                  selectedKey !== null && selectedKey !== key && !isCorrectOption;
                const isDeferredSelected = isDeferredMode && selectedKey === key;

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
                    className={`w-full bg-white border border-slate-200 rounded-3xl text-left font-medium text-slate-700 hover:border-violet-300/90 hover:bg-violet-50/80 transition-all flex items-start gap-3 sm:gap-4 group shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80 ${
                      testExperience.answerUi.compactOptions ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'
                    } ${
                      isCorrectOption
                        ? 'border-emerald-300 bg-[linear-gradient(180deg,rgba(236,253,245,1),rgba(220,252,231,0.92))] shadow-[0_16px_35px_-24px_rgba(16,185,129,0.32)] ring-1 ring-emerald-100'
                        : isWrongSelected
                          ? 'border-rose-300 bg-[linear-gradient(180deg,rgba(255,241,242,1),rgba(255,228,230,0.92))] shadow-[0_16px_35px_-24px_rgba(244,63,94,0.26)] ring-1 ring-rose-100'
                          : isOtherSelected
                            ? 'border-slate-200/90 bg-white/55 opacity-60'
                            : isDeferredSelected
                              ? 'border-[#bfd2f6] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(237,245,255,0.96))] shadow-[0_24px_38px_-28px_rgba(141,147,242,0.22)] ring-1 ring-sky-200'
                              : ''
                    } ${selectedKey === key && isDecisionVisible ? 'decision-commit-in' : ''}`}
                  >
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-colors ${
                        isCorrectOption
                          ? 'bg-emerald-500 text-white'
                          : isWrongSelected
                            ? 'bg-rose-500 text-white'
                            : isDeferredSelected
                              ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-violet-200 group-hover:text-violet-700'
                      }`}
                      aria-hidden="true"
                    >
                      {key}
                    </span>
                    <HighlightedText
                      text={value}
                      contentRole="answer_option"
                      allOptions={optionTextsForCompare}
                      optionIndex={optionIdx}
                      disabled={!statementHighlightEnabled}
                      className={`min-w-0 flex-1 break-words hyphens-auto text-[0.98rem] font-medium leading-[1.55] sm:text-[1rem] sm:leading-[1.52] ${
                        isCorrectOption ? 'text-emerald-900' : isWrongSelected ? 'text-rose-900' : 'text-slate-800'
                      }`}
                    />
                  </motion.button>
                );
              })}
            </div>

            {behavioralMicroLine ? (
              <p
                className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800/85"
                aria-hidden="true"
              >
                {behavioralMicroLine}
              </p>
            ) : null}
          </div>
        </motion.section>
      </AnimatePresence>

      {/* Botón flotante: aparece al seleccionar una opción */}
      <AnimatePresence>
        {selectedKey !== null && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-0 inset-x-0 z-40 flex justify-center px-3 pb-5 pt-2 pointer-events-none"
          >
            <div className="w-full max-w-[min(100%,42rem)] pointer-events-auto">
              {renderActionButton(false)}
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
