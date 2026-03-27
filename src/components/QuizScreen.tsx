import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, X } from 'lucide-react';
import { OptionKey, PracticeAnswer, PracticeQuestion } from '../practiceTypes';

type QuizScreenProps = {
  question: PracticeQuestion;
  questionIndex: number;
  totalQuestions: number;
  batchNumber: number;
  totalBatches: number;
  answers: PracticeAnswer[];
  onAnswer: (selectedOption: OptionKey) => void;
  onEndSession: () => void;
};

const QuizScreen: React.FC<QuizScreenProps> = ({
  question,
  questionIndex,
  totalQuestions,
  batchNumber,
  totalBatches,
  answers,
  onAnswer,
  onEndSession
}) => {
  const answeredRef = useRef(false);
  const answerTimeoutRef = useRef<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null);
  const [revealedCorrectKey, setRevealedCorrectKey] = useState<OptionKey | null>(null);

  useEffect(() => {
    answeredRef.current = false;
    setSelectedKey(null);
    setRevealedCorrectKey(null);
  }, [question.id]);

  useEffect(() => {
    return () => {
      if (answerTimeoutRef.current !== null) {
        window.clearTimeout(answerTimeoutRef.current);
      }
    };
  }, []);

  const optionEntries = useMemo(
    () => Object.entries(question.options) as Array<[OptionKey, string]>,
    [question.options]
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-0 py-3 sm:px-2 lg:px-4">
      <div className="mb-4 flex flex-col gap-3 rounded-[1.6rem] border border-slate-800/60 bg-[linear-gradient(135deg,#0f172a_0%,#13233f_62%,#1d4ed8_100%)] p-4 text-white shadow-[0_28px_72px_-42px_rgba(15,23,42,0.9)] sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
            Bloque {batchNumber} de {totalBatches}
          </p>
          <h2 className="mt-1.5 text-xl font-black text-white sm:text-2xl">
            Pregunta {questionIndex + 1} de {totalQuestions}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {question.category && (
            <span className="inline-flex items-center self-start rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
              {question.category}
            </span>
          )}
          <button
            type="button"
            onClick={onEndSession}
            disabled={selectedKey !== null}
            className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/15 disabled:opacity-45"
          >
            Terminar
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {Array.from({ length: totalQuestions }).map((_, index) => (
          <div
            key={index}
            className={`h-2 flex-1 rounded-full transition-colors ${
              index === questionIndex
                ? 'bg-amber-500'
                : answers[index]
                  ? answers[index].isCorrect
                    ? 'bg-emerald-400'
                    : 'bg-rose-500'
                  : 'bg-white/80'
            }`}
          />
        ))}
      </div>

      <motion.section
        key={question.id}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col"
      >
        <div className="relative overflow-hidden rounded-[1.7rem] border border-white/70 bg-white/84 p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.5)] backdrop-blur sm:p-7">
          <div className="absolute right-0 top-0 p-4 text-amber-200/30">
            <AlertCircle size={72} />
          </div>
          <h3 className="relative z-10 text-lg font-black leading-7 text-slate-900 sm:text-2xl sm:leading-10">
            {question.statement}
          </h3>
        </div>

        <div className="mt-4 grid gap-3 sm:gap-4">
          {optionEntries.map(([key, value]) => {
            const isSelected = selectedKey === key;
            const isCorrectOption = revealedCorrectKey === key;
            const isWrongSelected =
              selectedKey !== null && selectedKey === key && revealedCorrectKey !== key;
            const isOtherSelected = selectedKey !== null && !isSelected && !isCorrectOption;

            return (
              <motion.button
                key={key}
                type="button"
                whileHover={selectedKey ? undefined : { y: -2 }}
                whileTap={selectedKey ? undefined : { scale: 0.99 }}
                onClick={() => {
                  if (answeredRef.current) return;
                  answeredRef.current = true;
                  setSelectedKey(key);
                  setRevealedCorrectKey(question.correctOption);
                  answerTimeoutRef.current = window.setTimeout(() => {
                    answerTimeoutRef.current = null;
                    onAnswer(key);
                  }, 850);
                }}
                disabled={selectedKey !== null}
                className={`flex w-full items-center gap-3 rounded-[1.35rem] border px-4 py-3.5 text-left transition-all sm:gap-4 sm:px-5 sm:py-4 ${
                  isCorrectOption
                    ? 'border-emerald-400 bg-emerald-50 shadow-[0_16px_35px_-24px_rgba(16,185,129,0.45)] ring-2 ring-emerald-200'
                    : isWrongSelected
                      ? 'border-rose-400 bg-rose-50 shadow-[0_16px_35px_-24px_rgba(244,63,94,0.4)] ring-2 ring-rose-200'
                    : isOtherSelected
                      ? 'border-slate-200 bg-white/50 opacity-50'
                      : 'border-white/70 bg-white/80 hover:border-amber-200 hover:bg-white'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
                    isCorrectOption
                      ? 'bg-emerald-500 text-white'
                      : isWrongSelected
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {isCorrectOption ? (
                    <Check size={22} strokeWidth={3} />
                  ) : isWrongSelected ? (
                    <X size={22} strokeWidth={3} />
                  ) : (
                    key.toUpperCase()
                  )}
                </span>
                <span
                  className={`text-sm font-bold leading-6 sm:text-base sm:leading-7 ${
                    isCorrectOption
                      ? 'text-emerald-900'
                      : isWrongSelected
                        ? 'text-rose-900'
                        : 'text-slate-800'
                  }`}
                >
                  {value}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
};

export default QuizScreen;
