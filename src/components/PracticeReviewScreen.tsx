import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpenText, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { PracticeAnswer } from '../practiceTypes';

type PracticeReviewScreenProps = {
  answers: PracticeAnswer[];
  batchNumber: number;
  totalBatches: number;
  hasNextBatch: boolean;
  title?: string;
  continueLabel?: string;
  onRetryBatch: () => void;
  onContinue: () => void;
  onBackToStart: () => void;
};

const PracticeReviewScreen: React.FC<PracticeReviewScreenProps> = ({
  answers,
  batchNumber,
  totalBatches,
  hasNextBatch,
  title,
  continueLabel,
  onRetryBatch,
  onContinue,
  onBackToStart
}) => {
  const score = answers.filter((answer) => answer.isCorrect).length;
  const total = answers.length;
  const percentage = total === 0 ? 0 : Math.round((score / total) * 100);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-0 py-3 sm:px-2 lg:px-4">
      <section className="overflow-hidden rounded-[1.7rem] border border-white/70 bg-[linear-gradient(135deg,#fffdf8_0%,#ffffff_52%,#eff6ff_100%)] p-5 shadow-[0_30px_70px_-35px_rgba(15,23,42,0.4)] backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-600">
              Revision del bloque
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
              {title || `Bloque ${batchNumber} de ${totalBatches}`}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-600">Aciertos: {score} de {total}</p>
          </div>

          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-950 px-4 py-3.5 text-center shadow-[0_22px_40px_-30px_rgba(15,23,42,0.85)]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
              Resultado
            </p>
            <p className="mt-1.5 text-4xl font-black text-white sm:text-5xl">
              {score}
              <span className="text-2xl text-slate-400"> / {total}</span>
            </p>
            <p className="mt-1 text-sm font-bold text-slate-300">{percentage}% de acierto</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onBackToStart}
            className="inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </button>
          <button
            type="button"
            onClick={onRetryBatch}
            className="inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-800 transition-colors hover:bg-sky-100"
          >
            <RotateCcw size={16} />
            Repetir este bloque
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-[1.1rem] bg-slate-900 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800"
          >
            {continueLabel || (hasNextBatch ? 'Continuar con las siguientes 20' : 'Volver a empezar')}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {answers.map((answer, index) => {
          const selectedKey = answer.selectedOption;
          const correctKey = answer.question.correctOption;
          const selectedText = selectedKey ? answer.question.options[selectedKey] : null;
          const correctText = answer.question.options[correctKey];

          return (
            <motion.article
              key={`${answer.question.id}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/75 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Pregunta {index + 1}
                      </span>
                      {answer.question.category && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                          {answer.question.category}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-black leading-6 text-slate-900 sm:text-lg sm:leading-7">
                      {answer.question.statement}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] ${
                      answer.isCorrect
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {answer.isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {answer.isCorrect ? 'Correcta' : 'Incorrecta'}
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div
                    className={`rounded-[1.1rem] border px-4 py-3 ${
                      answer.isCorrect
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-rose-200 bg-rose-50'
                    }`}
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Tu respuesta
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
                      {selectedKey ? `${selectedKey.toUpperCase()}) ${selectedText}` : 'Sin responder'}
                    </p>
                  </div>

                  <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Respuesta correcta
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
                      {`${correctKey.toUpperCase()}) ${correctText}`}
                    </p>
                  </div>
                </div>

                <details className="rounded-[1.1rem] border border-amber-100 bg-amber-50/70 px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-amber-900">
                    <BookOpenText size={16} />
                    Ver explicacion
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {answer.question.explanation || 'Esta pregunta todavia no tiene explicacion cargada.'}
                  </p>
                </details>
              </div>
            </motion.article>
          );
        })}
      </section>
    </div>
  );
};

export default PracticeReviewScreen;
