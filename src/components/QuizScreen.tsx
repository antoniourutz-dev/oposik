import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Clock3, X } from 'lucide-react';
import { inferAttemptErrorType } from '../domain/learningEngine';
import {
  OptionKey,
  PracticeAnswer,
  PracticeAnswerSubmission,
  PracticeQuestion
} from '../practiceTypes';

type QuizScreenProps = {
  title: string;
  feedbackMode: 'immediate' | 'deferred';
  startedAt: string;
  timeLimitSeconds: number | null;
  question: PracticeQuestion;
  questionIndex: number;
  totalQuestions: number;
  batchNumber: number;
  totalBatches: number;
  answers: PracticeAnswer[];
  onAnswer: (submission: PracticeAnswerSubmission) => void;
  onEndSession: () => void;
  onTimeExpired: (submission: PracticeAnswerSubmission | null) => void;
};

const QuizScreen: React.FC<QuizScreenProps> = ({
  title,
  feedbackMode,
  startedAt,
  timeLimitSeconds,
  question,
  questionIndex,
  totalQuestions,
  batchNumber,
  totalBatches,
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
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    timeLimitSeconds
  );
  const questionStartedAtRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  );
  const timeExpiredRef = useRef(false);

  useLayoutEffect(() => {
    setSelectedKey(null);
    setRevealedCorrectKey(null);
    setFirstSelectionElapsedMs(null);
    setSelectionElapsedMs(null);
    setChangedAnswer(false);
    questionStartedAtRef.current =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const scrollRoot = document.scrollingElement;
    scrollRoot?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [question.id]);

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
  const isCurrentAnswerCorrect =
    selectedKey !== null && selectedKey === question.correctOption;
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
        selectedKey !== null ? 'pb-28 sm:pb-32' : ''
      }`}
    >
      <div className="relative mb-4 overflow-hidden rounded-[1.7rem] border border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#79b6e9_0%,#8aa6ee_56%,#8a90f4_100%)] p-4 text-white shadow-[0_28px_72px_-42px_rgba(141,147,242,0.32)] sm:p-5">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/16 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
          <div className="absolute right-4 top-4 h-24 w-24 rounded-full border border-white/14" />
        </div>

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-50/88">
              {title}
              {question.category ? (
                <span className="ml-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/82">
                  ({question.category})
                </span>
              ) : null}
            </p>
            <h2 className="mt-1.5 text-[1.35rem] font-black tracking-[-0.02em] text-white sm:text-[1.7rem]">
              Pregunta {displayQuestionNumber} ({questionIndex + 1}/{totalQuestions})
            </h2>
          </div>

          <div className="grid shrink-0 gap-2">
            {formattedRemainingTime ? (
              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/22 bg-white/12 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">
                <Clock3 size={14} />
                {formattedRemainingTime}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onEndSession}
              disabled={selectedKey !== null}
              className="inline-flex items-center rounded-full border border-white/22 bg-white/12 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white transition-all duration-200 hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 active:scale-[0.98] disabled:opacity-45"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[1.1rem] border border-white/70 bg-white/80 p-2 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="flex gap-2">
          {Array.from({ length: totalQuestions }).map((_, index) => (
            <div
              key={index}
              className={`h-2.5 flex-1 rounded-full transition-colors ${
                isDeferredMode
                  ? index < answers.length
                    ? 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)]'
                    : index === questionIndex && hasAnsweredCurrentQuestion
                      ? 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)]'
                      : 'bg-slate-100'
                  : index === questionIndex
                  ? hasAnsweredCurrentQuestion
                    ? isCurrentAnswerCorrect
                      ? 'bg-emerald-400'
                      : 'bg-rose-500'
                    : 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)]'
                  : answers[index]
                    ? answers[index].isCorrect
                      ? 'bg-emerald-400'
                      : 'bg-rose-500'
                    : 'bg-slate-100'
              }`}
            />
          ))}
        </div>
      </div>

      <section key={question.id} className="flex flex-1 flex-col">
        <div className="sticky top-3 z-20 -mx-1 rounded-[1.9rem] bg-[linear-gradient(180deg,rgba(255,253,248,0.97)_0%,rgba(248,250,252,0.94)_78%,rgba(248,250,252,0)_100%)] px-1 pb-3 pt-1 sm:top-4">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(240,247,255,0.93))] p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.28)] backdrop-blur sm:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(141,147,242,0.12),transparent_18%),linear-gradient(135deg,rgba(125,182,232,0.06),transparent_40%)]" />
            <div className="absolute right-0 top-0 p-4 text-sky-200/40">
              <AlertCircle size={72} />
            </div>
            <h3 className="relative z-10 text-lg font-black leading-7 tracking-[-0.02em] text-slate-900 sm:text-[1.8rem] sm:leading-10">
              {question.statement}
            </h3>
          </div>
        </div>

        <div className="mt-1 grid gap-3 sm:mt-2 sm:gap-4">
          {optionEntries.map(([key, value]) => {
            const isCorrectOption = revealedCorrectKey === key;
            const isWrongSelected =
              selectedKey !== null && selectedKey === key && revealedCorrectKey !== key;
            const isOtherSelected = selectedKey !== null && selectedKey !== key && !isCorrectOption;

            return (
              <button
                key={key}
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
                className={`flex w-full items-center gap-3 rounded-[1.3rem] border px-4 py-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 sm:gap-4 sm:px-5 sm:py-4 ${
                  isDeferredMode
                    ? selectedKey === key
                      ? 'border-[#bfd2f6] bg-white shadow-[0_24px_38px_-28px_rgba(141,147,242,0.18)] ring-2 ring-sky-100'
                      : 'border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)] hover:-translate-y-0.5 hover:border-[#bfd2f6] hover:bg-white hover:shadow-[0_24px_38px_-28px_rgba(141,147,242,0.18)] active:translate-y-0 active:scale-[0.99]'
                    : isCorrectOption
                    ? 'border-emerald-400 bg-[linear-gradient(180deg,rgba(236,253,245,1),rgba(220,252,231,0.92))] shadow-[0_16px_35px_-24px_rgba(16,185,129,0.35)] ring-2 ring-emerald-200'
                    : isWrongSelected
                      ? 'border-rose-400 bg-[linear-gradient(180deg,rgba(255,241,242,1),rgba(255,228,230,0.92))] shadow-[0_16px_35px_-24px_rgba(244,63,94,0.3)] ring-2 ring-rose-200'
                      : isOtherSelected
                        ? 'border-slate-200 bg-white/50 opacity-50'
                        : 'border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)] hover:-translate-y-0.5 hover:border-[#bfd2f6] hover:bg-white hover:shadow-[0_24px_38px_-28px_rgba(141,147,242,0.18)] active:translate-y-0 active:scale-[0.99]'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] text-base font-extrabold sm:h-10 sm:w-10 sm:rounded-[1rem] sm:text-[1.02rem] ${
                    isDeferredMode
                      ? selectedKey === key
                        ? 'bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] text-white'
                        : 'bg-[linear-gradient(135deg,rgba(125,182,232,0.18),rgba(141,147,242,0.18))] text-slate-700'
                      : isCorrectOption
                      ? 'bg-emerald-500 text-white'
                      : isWrongSelected
                        ? 'bg-rose-500 text-white'
                        : 'bg-[linear-gradient(135deg,rgba(125,182,232,0.18),rgba(141,147,242,0.18))] text-slate-700'
                  }`}
                >
                  {isCorrectOption ? (
                    <Check size={19} strokeWidth={3} />
                  ) : isWrongSelected ? (
                    <X size={19} strokeWidth={3} />
                  ) : (
                    key.toUpperCase()
                  )}
                </span>
                <span
                  className={`text-[1.02rem] font-semibold leading-7 sm:text-[1.12rem] sm:leading-8 ${
                    isDeferredMode
                      ? selectedKey === key
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
              </button>
            );
          })}
        </div>
      </section>

      {selectedKey !== null ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
          <div className="mx-auto w-full max-w-3xl bg-[linear-gradient(180deg,rgba(248,250,252,0)_0%,rgba(248,250,252,0.94)_26%,rgba(248,250,252,0.98)_100%)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-6 sm:px-4 sm:pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:px-4">
            <button
              type="button"
              onClick={submitCurrentAnswer}
              className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-[1.3rem] border border-white/70 bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] px-4 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_24px_60px_-30px_rgba(141,147,242,0.34)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-30px_rgba(141,147,242,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 active:translate-y-0 active:scale-[0.99]"
            >
              {nextButtonLabel}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default QuizScreen;
