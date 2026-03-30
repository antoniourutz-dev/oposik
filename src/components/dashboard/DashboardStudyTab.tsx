import React from 'react';
import { Brain, ChartNoAxesColumn, Flame, Layers3, Shield, Target, Sparkles, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { DEFAULT_CURRICULUM } from '../../practiceConfig';
import { recordQuestionExplanationOpened } from '../../services/practiceCloudApi';
import QuestionExplanation from '../QuestionExplanation';
import QuestionScopePicker from '../QuestionScopePicker';
import type { DashboardContentProps } from './types';
import {
  AnalyticsMiniTile,
  StatsDisclosure,
  StudyActionCard,
  getAccuracy,
  formatOptionalPercent,
  formatPercent
} from './shared';

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

const getCategoryRiskPercent = ({
  attempts,
  incorrectAttempts,
  rawFailRate,
  smoothedFailRate
}: {
  attempts: number;
  incorrectAttempts: number;
  rawFailRate: number | null;
  smoothedFailRate: number | null;
}) => {
  const fallbackRate = attempts > 0 ? incorrectAttempts / attempts : 0;
  const resolvedRate = smoothedFailRate ?? rawFailRate ?? fallbackRate;
  return Math.round(Math.max(0, Math.min(1, resolvedRate)) * 100);
};

const getCategoryRiskSupportLabel = ({
  confidenceFlag,
  sampleOk
}: {
  confidenceFlag: 'low' | 'medium' | 'high';
  sampleOk: boolean;
}) => {
  if (!sampleOk) return 'muestra en consolidacion';
  if (confidenceFlag === 'high') return 'muestra solida';
  return 'muestra util';
};

const DashboardStudyTab: React.FC<DashboardContentProps> = ({
  batchSize,
  coachPlan,
  learningDashboard,
  learningDashboardV2,
  onQuestionScopeChange,
  onStartAntiTrap,
  onStartFromBeginning,
  onStartMixed,
  onStartRandom,
  onStartRecommended,
  onStartSimulacro,
  onStartWeakReview,
  pressureInsights,
  pressureInsightsV2,
  profile,
  questionScope,
  questionsCount,
  totalBatches,
  weakCategories,
  weakQuestions
}) => {
  const readinessLabel = formatPercent(
    learningDashboardV2?.examReadinessRate ?? learningDashboard?.readiness ?? null
  );
  const recommendedReview =
    learningDashboardV2?.recommendedReviewCount ?? learningDashboard?.recommendedReviewCount ?? 0;
  const recommendedNew =
    learningDashboardV2?.recommendedNewCount ?? learningDashboard?.recommendedNewCount ?? 0;
  const topRiskBreakdown = (learningDashboard?.riskBreakdown ?? []).slice(0, 3);
  const pressureGapPoints =
    (pressureInsightsV2?.pressureGapRaw ?? pressureInsights?.pressureGap) === null ||
    (pressureInsightsV2?.pressureGapRaw ?? pressureInsights?.pressureGap) === undefined
      ? null
      : Math.round(
          Math.abs(pressureInsightsV2?.pressureGapRaw ?? pressureInsights?.pressureGap ?? 0) * 100
        );
  const studyPrimarySummary = learningDashboard || learningDashboardV2
    ? `${recommendedReview} repasos y ${recommendedNew} nuevas para sostener progreso sin ruido.`
    : 'Combina repaso, fragiles y nuevas en una sola sesion adaptativa.';
  const studyFocusLine =
    topRiskBreakdown[0]?.label
      ? `Vigila ${topRiskBreakdown[0].label.toLowerCase()} antes de ampliar carga.`
      : learningDashboardV2?.focusMessage ?? coachPlan.reasons[0] ?? coachPlan.impactLabel;
  const mixedIsRecommended = coachPlan.mode === 'mixed' || coachPlan.mode === 'standard';
  const randomIsRecommended = coachPlan.mode === 'random';
  const antiTrapIsRecommended = coachPlan.mode === 'anti_trap';
  const simulacroIsRecommended = coachPlan.mode === 'simulacro';
  const weakQuestionsVisible = weakQuestions.slice(0, 4);
  const topWeakCategories = weakCategories.slice(0, 5);
  const maxWeakCategoryRisk = topWeakCategories.reduce((max, item) => {
    const riskPercent = getCategoryRiskPercent(item);
    return Math.max(max, riskPercent);
  }, 0);
  const dominantRiskLabel = topRiskBreakdown[0]?.label ?? 'Sin patron';
  const hottestCategoryLabel = topWeakCategories[0]?.category ?? 'Sin tema';
  const hottestCategorySupport = topWeakCategories[0]
    ? getCategoryRiskSupportLabel(topWeakCategories[0])
    : 'sin muestra';
  const curriculum = profile?.curriculum ?? DEFAULT_CURRICULUM;
  const retentionSeenLabel = formatOptionalPercent(learningDashboardV2?.retentionSeenRate ?? null);
  const pressureSupportLabel = pressureInsightsV2
    ? pressureInsightsV2.sampleOk
      ? pressureInsightsV2.confidenceFlag === 'high'
        ? 'muestra solida'
        : 'muestra util'
      : 'muestra en consolidacion'
    : pressureGapPoints === null
      ? 'sin muestra de simulacro'
      : 'lectura simple';

  return (
    <div className="grid gap-6">
      <QuestionScopePicker
        value={questionScope}
        onChange={onQuestionScopeChange}
        label="Temario"
      />

      {/* 🔮 EL SESIÓN SASHIMI: OPTIMIZADOR PROACTIVO */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-[#dbeafe] bg-white p-6 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.18)] lg:p-10"
      >
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sky-50 blur-3xl opacity-60" />
        <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-indigo-50 blur-3xl opacity-60" />
        
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <div className="flex-1">
             <div className="flex items-center gap-2.5 mb-5">
               <span className="flex h-9 w-9 items-center justify-center rounded-2xl quantia-bg-gradient text-white shadow-lg ring-4 ring-white">
                 <Wand2 size={18} />
               </span>
               <span className="text-[12px] font-black uppercase tracking-[0.2em] text-sky-600">Sesión recomendada</span>
             </div>

             <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
               Tu sesión <span className="brand-gradient-h bg-clip-text text-transparent">adaptada a hoy</span>
             </h2>

             <p className="mt-5 max-w-2xl text-[16px] font-semibold leading-relaxed text-slate-600">
               Mezcla repaso, preguntas frágiles y material nuevo para avanzar sin dejar huecos. El mix cambia cada día según tu estado real.
             </p>

             <div className="mt-8 flex flex-wrap gap-4">
               {[
                 { label: 'Repaso Crítico', value: `${recommendedReview}`, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                 { label: 'Fragilidad Alta', value: `${weakQuestions.length}`, color: 'bg-rose-50 text-rose-600 border-rose-100' },
                 { label: 'Nuevas Capas', value: `${recommendedNew}`, color: 'bg-sky-50 text-sky-600 border-sky-100' }
               ].map((chip) => (
                 <div key={chip.label} className={`flex items-center gap-3 rounded-[1.25rem] border px-4 py-2.5 ${chip.color} shadow-sm transition-all hover:-translate-y-0.5`}>
                   <span className="text-sm font-black">{chip.value}</span>
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{chip.label}</span>
                 </div>
               ))}
             </div>
          </div>

          <div className="shrink-0 xl:w-[22rem]">
             <motion.button
               whileHover={{ scale: 1.02, y: -2 }}
               whileTap={{ scale: 0.98 }}
               onClick={onStartRecommended}
               className="group relative w-full overflow-hidden rounded-[2rem] bg-slate-950 px-8 py-7 text-white shadow-2xl transition-all hover:bg-slate-900"
             >
                <div className="absolute inset-x-0 bottom-0 h-1 brand-gradient-h" />
                <div className="flex items-center justify-center gap-3">
                   <Sparkles size={20} className="text-sky-400" />
                   <span className="text-xl font-bold tracking-tight">Empezar sesión</span>
                </div>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-sky-300 transition-colors">{recommendedReview} repasos · {recommendedNew} nuevas</p>
             </motion.button>
          </div>
        </div>
      </motion.section>

      <section className="rounded-[1.55rem] border border-white/72 bg-white/88 p-4 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.36)] backdrop-blur sm:p-5">
        <div className="mb-3">
          <p className="text-[1.02rem] font-extrabold tracking-[-0.02em] text-slate-950 sm:text-lg">
            Modos disponibles
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Aqui eliges herramienta. La ruta sugerida te orienta y el resto te deja desviarte con criterio.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] xl:items-start">
          <div className="rounded-[1.3rem] border border-[#c8d8f8] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(138,144,244,0.16))] p-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)]">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                Ruta sugerida
              </span>
              <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                {coachPlan.focusLabel}
              </span>
              <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                Preparacion {readinessLabel}
              </span>
            </div>
            <p className="mt-3 text-[1.35rem] font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-[1.55rem]">
              {coachPlan.primaryActionLabel}
            </p>
            <p className="mt-2 max-w-[38rem] text-sm leading-6 text-slate-600">
              {studyPrimarySummary}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                {recommendedReview} repasos
              </span>
              <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                {recommendedNew} nuevas
              </span>
              <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                {pressureGapPoints === null ? 'sin brecha visible' : `${pressureGapPoints} pts de presion`}
              </span>
            </div>
          </div>

          <div className="grid gap-2.5 xl:grid-cols-2">
            <AnalyticsMiniTile
              label="Preparacion"
              value={readinessLabel}
              caption={learningDashboardV2 ? pressureSupportLabel : 'lectura actual'}
              accent
            />
            <AnalyticsMiniTile
              label="Retencion vista"
              value={retentionSeenLabel}
              caption={learningDashboardV2 ? `${learningDashboardV2.retentionSeenN} vistas` : 'sin base'}
            />
            <AnalyticsMiniTile
              label="Presion"
              value={pressureGapPoints === null ? '--' : `${pressureGapPoints} pts`}
              caption={pressureSupportLabel}
            />
            <AnalyticsMiniTile
              label="Backlog"
              value={String(
                learningDashboardV2?.backlogOverdueCount ?? learningDashboard?.backlogCount ?? 0
              )}
              caption={
                learningDashboardV2
                  ? `${learningDashboardV2.backlogOverdueCount} urgentes`
                  : `${learningDashboard?.overdueCount ?? 0} urgentes`
              }
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <StudyActionCard
            label={mixedIsRecommended ? 'Recomendado hoy' : 'Mixto'}
            title="Mixto adaptativo"
            description="Combina repaso, nuevas y frágiles en una sola sesión rentable."
            meta={`${recommendedReview} repasos · ${recommendedNew} nuevas`}
            icon={<Target size={18} />}
            onClick={mixedIsRecommended ? onStartRecommended : onStartMixed}
            tone={mixedIsRecommended ? 'primary' : 'default'}
          />
          <StudyActionCard
            label="Repaso"
            title="Top falladas"
            description="Ataca las preguntas que más castigan tu precisión actual."
            meta={`${weakQuestions.length} visibles`}
            icon={<Flame size={18} />}
            onClick={onStartWeakReview}
            disabled={weakQuestions.length === 0}
          />
          <StudyActionCard
            label={randomIsRecommended ? 'Recomendado hoy' : 'Aleatorio'}
            title="20 mezcladas"
            description="Mide recuperación real con mezcla completa de banco."
            meta="sin patrón fijo"
            icon={<Brain size={18} />}
            onClick={randomIsRecommended ? onStartRecommended : onStartRandom}
            tone={randomIsRecommended ? 'primary' : 'default'}
          />
          <StudyActionCard
            label="Secuencial"
            title="Bloque 1"
            description="Reinicia el recorrido desde el inicio del banco."
            meta={`${totalBatches} bloques`}
            icon={<Layers3 size={18} />}
            onClick={onStartFromBeginning}
          />
          <StudyActionCard
            label={antiTrapIsRecommended ? 'Recomendado hoy' : 'Anti-trampas'}
            title="Plazos y excepciones"
            description="Entrena negaciones, plazos, literalidad y distractores cercanos."
            meta={dominantRiskLabel}
            icon={<Shield size={18} />}
            onClick={antiTrapIsRecommended ? onStartRecommended : onStartAntiTrap}
            tone={antiTrapIsRecommended ? 'primary' : 'default'}
          />
          <StudyActionCard
            label={simulacroIsRecommended ? 'Recomendado hoy' : 'Simulacro'}
            title="Examen real"
            description="Sin feedback inmediato y con temporizador global."
            meta={pressureSupportLabel}
            icon={<ChartNoAxesColumn size={18} />}
            onClick={simulacroIsRecommended ? onStartRecommended : onStartSimulacro}
            tone={simulacroIsRecommended ? 'primary' : 'default'}
          />
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
        <StatsDisclosure title="Senales de hoy" hint="Abre esto si quieres ajustar la sesion antes de empezar.">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2.5">
              <AnalyticsMiniTile
                label="Capacidad"
                value={learningDashboard ? String(learningDashboard.dailyReviewCapacity) : '--'}
                caption="repasos por dia"
                accent
              />
              <AnalyticsMiniTile
                label="Backlog"
                value={learningDashboard ? String(learningDashboard.backlogCount) : '--'}
                caption={learningDashboard ? `${learningDashboard.overdueCount} urgentes` : 'sin base'}
              />
              <AnalyticsMiniTile
                label="Tema critico"
                value={maxWeakCategoryRisk === 0 ? '--' : `${maxWeakCategoryRisk}%`}
                caption={`${hottestCategoryLabel} | ${hottestCategorySupport}`}
              />
              <AnalyticsMiniTile
                label="Patron"
                value={topRiskBreakdown[0] ? String(topRiskBreakdown[0].count) : '--'}
                caption={dominantRiskLabel}
              />
            </div>

            <div className="rounded-[1.18rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(242,247,255,0.92))] px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                Foco del dia
              </p>
              <p className="mt-2 text-base font-extrabold leading-6 text-slate-950">
                {coachPlan.focusLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{studyFocusLine}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                  Banco {questionsCount}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                  Bloques {totalBatches}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                  Tamano {batchSize}
                </span>
              </div>
            </div>
          </div>
        </StatsDisclosure>

        <StatsDisclosure
          title="Material de repaso"
          hint="Preguntas debiles para revisar solo si quieres entrar fino antes de ejecutar."
        >
          {weakQuestionsVisible.length === 0 ? (
            <p className="text-sm font-medium text-slate-500">
              Todavia no hay preguntas marcadas como debiles.
            </p>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {weakQuestionsVisible.map(({ question, stat }, index) => (
                <details
                  key={`${question.id}-${question.number ?? 'na'}-${index}`}
                  className="rounded-[1.22rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)]"
                  onToggle={(event) => {
                    if (!event.currentTarget.open) return;

                    void recordQuestionExplanationOpened({
                      questionId: question.id,
                      curriculum,
                      surface: 'study',
                      explanationKind: getExplanationKind({
                        explanation: question.explanation,
                        editorialExplanation: question.editorialExplanation
                      })
                    }).catch(() => {});
                  }}
                >
                  <summary className="cursor-pointer list-none">
                    <div className="grid gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(138,144,244,0.2))] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700">
                              Top {index + 1}
                            </span>
                            {question.category ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                                {question.category}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-base font-extrabold text-slate-900">
                            Pregunta {question.number ?? question.id}
                          </p>
                        </div>
                        <div className="rounded-[1.05rem] border border-[#bfd2f6] bg-[linear-gradient(135deg,rgba(121,182,233,0.16),rgba(138,144,244,0.18))] px-3 py-2 text-right">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                            Fallos
                          </p>
                          <p className="mt-1 text-lg font-black text-slate-900">
                            {stat.incorrectAttempts}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <AnalyticsMiniTile
                          label="Intentos"
                          value={String(stat.attempts)}
                          caption="muestra actual"
                        />
                        <AnalyticsMiniTile
                          label="Precision"
                          value={`${getAccuracy(stat.correctAttempts, stat.attempts)}%`}
                          caption="sobre esta pregunta"
                        />
                      </div>
                    </div>
                  </summary>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[1.15rem] bg-[linear-gradient(180deg,rgba(236,246,255,0.9),rgba(241,247,255,0.92))] px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                        Respuesta correcta
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                        {question.correctOption.toUpperCase()}) {question.options[question.correctOption]}
                      </p>
                    </div>
                    <div className="rounded-[1.15rem] bg-[linear-gradient(180deg,rgba(232,240,255,0.92),rgba(241,247,255,0.92))] px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">
                        Explicacion
                      </p>
                      <div className="mt-2">
                        <QuestionExplanation
                          explanation={question.explanation}
                          editorialExplanation={question.editorialExplanation}
                        />
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </StatsDisclosure>
      </div>
    </div>
  );
};

export default DashboardStudyTab;
