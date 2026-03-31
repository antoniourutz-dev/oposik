import React, { useMemo, useState } from 'react';
import { ArrowRight, Flame, Layers3, Target } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import QuestionScopePicker from '../QuestionScopePicker';
import type { DashboardContentProps } from './types';
import { toCoachTwoLineMessage } from '../../domain/learningEngine';

/**
 * STUDY → ACCIÓN
 * Responde: “¿cómo quiero estudiar?”
 * Mantiene simplicidad radical sin convertirse en dashboard:
 * - CTA recomendado arriba
 * - modos rápidos (Mixto/Aleatorio/Falladas)
 * - explorar (más opciones) sin métricas ni bloques analíticos
 */
const DashboardStudyTab: React.FC<DashboardContentProps> = ({
  batchSize,
  catalogLoading = false,
  coachPlan,
  learningDashboardV2,
  onQuestionScopeChange,
  onStartAntiTrap,
  onStartFromBeginning,
  onStartMixed,
  onStartRandom,
  onStartRecommended,
  onStartSimulacro,
  onStartWeakReview,
  onStartLawTraining,
  questionScope,
  questionsCount,
  weakQuestions,
}) => {
  const reduceMotion = useReducedMotion();
  const practiceLocked = catalogLoading || questionsCount === 0;

  const coach = toCoachTwoLineMessage({
    mode: coachPlan.mode,
    tone: coachPlan.tone,
    focusMessage: learningDashboardV2?.focusMessage ?? null,
    reasons: coachPlan.reasons,
    summary: coachPlan.summary,
  });

  const availableLaws = useMemo(() => {
    const list = learningDashboardV2?.lawBreakdown ?? [];
    return list
      .map((l) => String(l.ley_referencia ?? '').trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [learningDashboardV2?.lawBreakdown]);
  const [selectedLaw, setSelectedLaw] = useState<string>(() => availableLaws[0] ?? '');

  const handleStartLaw = () => {
    const law = selectedLaw.trim();
    if (!law) return;
    onStartLawTraining(law);
  };

  const handleScrollToTemario = () => {
    const node = document.getElementById('study-temario');
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5 pb-12 xl:max-w-6xl xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start xl:gap-6">
      <div id="study-temario" className="xl:col-span-2">
        <QuestionScopePicker value={questionScope} onChange={onQuestionScopeChange} label="Temario" />
      </div>

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.1)] xl:sticky xl:top-[6.1rem]"
        aria-label="Entrenar"
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Entrenar
        </p>
        <h2 className="mt-2 text-[1.15rem] font-semibold leading-snug tracking-[-0.02em] text-slate-900 sm:text-[1.25rem]">
          {coach.line1}
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{coach.line2}</p>

        <button
          type="button"
          onClick={onStartRecommended}
          disabled={practiceLocked}
          aria-busy={catalogLoading}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-slate-200/90 bg-[linear-gradient(180deg,rgba(15,23,42,1),rgba(15,23,42,0.96))] px-5 py-4 text-left text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.42)] transition-colors hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 disabled:pointer-events-none disabled:opacity-45"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/60">
              Empezar recomendado
            </span>
            <span className="mt-1 block text-base font-semibold text-white">
              {coachPlan.primaryActionLabel}
            </span>
          </span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10">
            <ArrowRight size={18} aria-hidden />
          </span>
        </button>
      </motion.section>

      <div className="grid gap-2.5 sm:grid-cols-3 xl:col-span-1" aria-label="Modos rápidos">
        <button
          type="button"
          onClick={onStartMixed}
          disabled={practiceLocked}
          className="rounded-2xl border border-slate-200/90 bg-white/92 px-4 py-4 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 disabled:pointer-events-none disabled:opacity-45"
        >
          <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            <Target size={14} aria-hidden /> Mixto
          </span>
          <span className="mt-2 block text-sm font-semibold text-slate-900">Mezclar y consolidar</span>
        </button>

        <button
          type="button"
          onClick={onStartRandom}
          disabled={practiceLocked}
          className="rounded-2xl border border-slate-200/90 bg-white/92 px-4 py-4 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 disabled:pointer-events-none disabled:opacity-45"
        >
          <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            <Layers3 size={14} aria-hidden /> Aleatorio
          </span>
          <span className="mt-2 block text-sm font-semibold text-slate-900">{batchSize} mezcladas</span>
        </button>

        <button
          type="button"
          onClick={onStartWeakReview}
          disabled={practiceLocked || weakQuestions.length === 0}
          className="rounded-2xl border border-slate-200/90 bg-white/92 px-4 py-4 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 disabled:pointer-events-none disabled:opacity-45"
        >
          <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            <Flame size={14} aria-hidden /> Falladas
          </span>
          <span className="mt-2 block text-sm font-semibold text-slate-900">
            {weakQuestions.length > 0 ? 'Repaso corto' : 'Sin pendientes'}
          </span>
        </button>
      </div>

      <section
        className="rounded-2xl border border-slate-200/90 bg-white/92 p-5 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.08)]"
        aria-label="Explorar"
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Explorar</p>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Elige un enfoque y empieza. Sin comparar datos.
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleScrollToTemario}
            className="rounded-2xl border border-slate-200/90 bg-white/92 px-4 py-4 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75"
          >
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Por tema</span>
            <span className="mt-2 block text-sm font-semibold text-slate-900">Cambiar temario</span>
            <span className="mt-1 block text-[12px] font-medium text-slate-500">Selecciona el ámbito arriba.</span>
          </button>

          <button
            type="button"
            onClick={onStartFromBeginning}
            disabled={practiceLocked}
            className="rounded-2xl border border-slate-200/90 bg-white/92 px-4 py-4 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 disabled:pointer-events-none disabled:opacity-45"
          >
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Secuencial</span>
            <span className="mt-2 block text-sm font-semibold text-slate-900">Bloque 1</span>
            <span className="mt-1 block text-[12px] font-medium text-slate-500">Volver a la base.</span>
          </button>

          <button
            type="button"
            onClick={onStartSimulacro}
            disabled={practiceLocked}
            className="rounded-2xl border border-slate-200/90 bg-white/92 px-4 py-4 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 disabled:pointer-events-none disabled:opacity-45"
          >
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Examen</span>
            <span className="mt-2 block text-sm font-semibold text-slate-900">Simulacro</span>
            <span className="mt-1 block text-[12px] font-medium text-slate-500">Sin feedback inmediato.</span>
          </button>

          <button
            type="button"
            onClick={onStartAntiTrap}
            disabled={practiceLocked}
            className="rounded-2xl border border-slate-200/90 bg-white/92 px-4 py-4 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 disabled:pointer-events-none disabled:opacity-45"
          >
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Lectura</span>
            <span className="mt-2 block text-sm font-semibold text-slate-900">Anti-trampas</span>
            <span className="mt-1 block text-[12px] font-medium text-slate-500">Plazos, excepciones, negaciones.</span>
          </button>

          <button
            type="button"
            onClick={onStartWeakReview}
            disabled={practiceLocked || weakQuestions.length === 0}
            className="rounded-2xl border border-slate-200/90 bg-white/92 px-4 py-4 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 disabled:pointer-events-none disabled:opacity-45"
          >
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Repaso</span>
            <span className="mt-2 block text-sm font-semibold text-slate-900">Pendientes</span>
            <span className="mt-1 block text-[12px] font-medium text-slate-500">Atacar fallos recurrentes.</span>
          </button>

          <div className="rounded-2xl border border-slate-200/90 bg-white/92 px-4 py-4 shadow-sm">
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Por ley</span>
            <span className="mt-2 block text-sm font-semibold text-slate-900">Entrenar por ley</span>
            <span className="mt-1 block text-[12px] font-medium text-slate-500">Elige una ley y empieza.</span>

            <div className="mt-3 grid gap-2">
              <select
                value={selectedLaw}
                onChange={(e) => setSelectedLaw(e.target.value)}
                disabled={practiceLocked || availableLaws.length === 0}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100 disabled:opacity-60"
                aria-label="Ley"
              >
                {availableLaws.length === 0 ? (
                  <option value="">Sin leyes disponibles</option>
                ) : (
                  availableLaws.map((law) => (
                    <option key={law} value={law}>
                      {law}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={handleStartLaw}
                disabled={practiceLocked || !selectedLaw}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/75 disabled:pointer-events-none disabled:opacity-45"
              >
                Empezar por ley
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardStudyTab;

