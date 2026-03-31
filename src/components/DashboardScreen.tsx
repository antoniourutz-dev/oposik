import React, { Suspense, lazy } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Flame, Layers3, RotateCcw, Target } from 'lucide-react';
import { SIMULACRO_BATCH_SIZE } from '../practiceConfig';
import QuestionScopePicker from './QuestionScopePicker';
import type { DashboardScreenProps } from './dashboard/types';
import {
  AnalyticsMiniTile,
  DashboardSegmentTile,
  DashboardTabFallback,
  SectionCard,
  SegmentedProgressBar,
  SparklineChart,
  formatPercent,
} from './dashboard/shared';

const DashboardStatsTab = lazy(() => import('./dashboard/DashboardStatsTab'));
const DashboardStudyTab = lazy(() => import('./dashboard/DashboardStudyTab'));
const DashboardProfileTab = lazy(() => import('./dashboard/DashboardProfileTab'));

/** Métricas en superficie clara (bloque coach / insight), sin competir con el hero. */
const InsightStatChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200/85 bg-white/75 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
    <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</p>
    <p className="mt-1 text-[1.02rem] font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
  </div>
);

const DesktopCockpitAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  title: string;
  caption: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}> = ({ icon, label, title, caption, onClick, disabled, accent = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group flex w-full items-center gap-3 rounded-[1.05rem] border px-3.5 py-3 text-left text-slate-950 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] active:translate-y-0 active:scale-[0.99] disabled:opacity-45 disabled:hover:translate-y-0 ${
      accent
        ? 'border-indigo-200/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,248,255,0.97))] shadow-[0_22px_44px_-28px_rgba(79,70,229,0.14)] ring-1 ring-indigo-100/60'
        : 'border-slate-200/88 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_14px_28px_-26px_rgba(15,23,42,0.06)]'
    }`}
  >
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] border ${
        accent
          ? 'border-indigo-200/80 bg-indigo-50/90 text-indigo-800'
          : 'border-slate-200/90 bg-slate-50/90 text-slate-700'
      }`}
    >
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[8px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <span className="mt-1 block text-[0.98rem] font-bold leading-[1.05] text-slate-950">
        {title}
      </span>
      <span className="mt-1 block text-[11px] font-medium leading-4 text-slate-500">
        {caption}
      </span>
    </span>
    <ArrowRight
      size={14}
      className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5"
    />
  </button>
);

const DashboardScreen: React.FC<DashboardScreenProps> = (props) => {
  const reduceMotion = useReducedMotion();
  const {
    activeTab,
    batchSize,
    catalogLoading = false,
    coachPlan,
    learningDashboard,
    learningDashboardV2,
    onQuestionScopeChange,
    onReloadQuestions,
    onStartMixed,
    onStartRandom,
    onStartRecommended,
    onStartWeakReview,
    profile,
    questionScope,
    questionsCount,
    recentSessions,
    recommendedBatchNumber,
    weakQuestions,
  } = props;

  const practiceLocked = catalogLoading || questionsCount === 0;

  const accuracy =
    profile && profile.totalAnswered > 0
      ? Math.round((profile.totalCorrect / profile.totalAnswered) * 100)
      : 0;
  const coverageRate =
    learningDashboardV2?.coverageRate ??
    (learningDashboard && learningDashboard.totalQuestions > 0
      ? learningDashboard.seenQuestions / learningDashboard.totalQuestions
      : 0);
  const usefulMasteryRate =
    learningDashboard && learningDashboard.seenQuestions > 0
      ? (learningDashboard.solidCount + learningDashboard.masteredCount) /
        learningDashboard.seenQuestions
      : 0;
  const recommendedReview =
    learningDashboardV2?.recommendedReviewCount ?? learningDashboard?.recommendedReviewCount ?? 0;
  const recommendedNew =
    learningDashboardV2?.recommendedNewCount ?? learningDashboard?.recommendedNewCount ?? 0;
  const topRiskBreakdown = (learningDashboard?.riskBreakdown ?? []).slice(0, 3);

  const accuracyLabel = learningDashboardV2
    ? formatPercent(learningDashboardV2.observedAccuracyRate)
    : `${accuracy}%`;
  const accuracyCaption = learningDashboardV2
    ? `${learningDashboardV2.observedAccuracyN} respuestas`
    : 'rendimiento actual';
  const retentionLabel = learningDashboardV2
    ? formatPercent(learningDashboardV2.retentionSeenRate)
    : formatPercent(usefulMasteryRate);
  const retentionCaption = learningDashboardV2
    ? learningDashboardV2.retentionSeenConfidenceFlag === 'high'
      ? 'retencion con base solida'
      : learningDashboardV2.retentionSeenConfidenceFlag === 'medium'
        ? 'retencion con base util'
        : 'retencion en consolidacion'
    : 'memoria estable';
  const resolvedExamReadinessRate =
    learningDashboardV2?.examReadinessRate ?? learningDashboard?.readiness ?? null;
  const readinessLabel =
    learningDashboardV2 || learningDashboard ? formatPercent(resolvedExamReadinessRate) : '--';
  const homeLeadMessage =
    learningDashboardV2?.focusMessage ?? coachPlan.reasons[0] ?? coachPlan.impactLabel;

  const recommendedSessionSize = coachPlan.mode === 'simulacro' ? SIMULACRO_BATCH_SIZE : batchSize;
  const weakReviewSlotCount = Math.min(weakQuestions.length, 5);
  const totalQuestionsResolved =
    learningDashboardV2?.totalQuestions ?? learningDashboard?.totalQuestions ?? questionsCount ?? 0;
  const seenQuestionsResolved =
    learningDashboardV2?.seenQuestions ?? learningDashboard?.seenQuestions ?? 0;
  const fragileCountResolved =
    learningDashboardV2?.fragileCount ?? learningDashboard?.fragileCount ?? 0;
  const consolidatingCountResolved =
    learningDashboardV2?.consolidatingCount ?? learningDashboard?.consolidatingCount ?? 0;
  const solidCountResolved = learningDashboardV2?.solidCount ?? learningDashboard?.solidCount ?? 0;
  const masteredCountResolved =
    learningDashboardV2?.masteredCount ?? learningDashboard?.masteredCount ?? 0;
  const newCountResolved = Math.max(totalQuestionsResolved - seenQuestionsResolved, 0);
  const backlogCountResolved =
    learningDashboardV2?.backlogOverdueCount ?? learningDashboard?.backlogCount ?? 0;
  const overdueCountResolved =
    learningDashboardV2?.backlogOverdueCount ?? learningDashboard?.overdueCount ?? 0;
  const masterySegments =
    learningDashboard || learningDashboardV2
      ? [
          { label: 'Nuevas', value: newCountResolved, className: 'bg-slate-300/95' },
          { label: 'Frágiles', value: fragileCountResolved, className: 'bg-amber-300/95' },
          { label: 'Consolidan', value: consolidatingCountResolved, className: 'bg-sky-300/95' },
          { label: 'Sólidas', value: solidCountResolved, className: 'bg-indigo-300/95' },
          { label: 'Dominadas', value: masteredCountResolved, className: 'bg-emerald-300/95' },
        ]
      : [];
  const recentTrendItems = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const byDay: Record<string, { score: number; total: number; count: number }> = {};
    for (const s of recentSessions) {
      if (!s.finishedAt) continue;
      const dayKey = new Date(s.finishedAt).toISOString().slice(0, 10);
      const prev = byDay[dayKey] ?? { score: 0, total: 0, count: 0 };
      byDay[dayKey] = {
        score: prev.score + s.score,
        total: prev.total + s.total,
        count: prev.count + 1,
      };
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([dayKey, { score, total, count }]) => {
        const date = new Date(dayKey);
        const label =
          dayKey === today ? 'Hoy' : dayKey === yesterday ? 'Ayer' : dayNames[date.getDay()];
        return {
          id: dayKey,
          label,
          value: total > 0 ? Math.round((score / total) * 100) : 0,
          sessions: count,
        };
      });
  })();
  const primaryCtaCommand =
    coachPlan.mode === 'standard'
      ? `Abrir bloque ${recommendedBatchNumber}`
      : coachPlan.mode === 'simulacro'
        ? 'Lanzar simulacro'
        : coachPlan.mode === 'anti_trap'
          ? 'Entrenar anti-trampas'
          : coachPlan.mode === 'random'
            ? 'Abrir sesion aleatoria'
            : 'Iniciar sesion mixta';

  const hasLearningSnapshot = Boolean(learningDashboard || learningDashboardV2);

  const recentTrendAverage = recentTrendItems.length
    ? Math.round(
        recentTrendItems.reduce((sum, item) => sum + item.value, 0) / recentTrendItems.length,
      )
    : 0;
  const recentTrendBest = recentTrendItems.length
    ? Math.max(...recentTrendItems.map((item) => item.value))
    : 0;
  const recentTrendLast = recentTrendItems.length
    ? recentTrendItems[recentTrendItems.length - 1].value
    : 0;

  if (activeTab === 'home') {
    return (
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-8 pb-20">
        {/* 1 — Hero signature: una sola acción protagonista, calma y precisión */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            onClick={onStartRecommended}
            disabled={practiceLocked}
            aria-busy={catalogLoading}
            className="quantia-home-hero group relative w-full overflow-hidden px-6 py-8 text-left transition-all duration-300 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] enabled:hover:bg-slate-50/30 sm:px-10 sm:py-10 disabled:pointer-events-none disabled:opacity-45"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 90% 10%, rgba(148, 163, 184, 0.12), transparent 50%)',
              }}
            />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Próximo paso
                </p>
                <h1 className="mt-3 text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.03em] text-slate-900 sm:text-[2.1rem] xl:text-[2.35rem]">
                  {primaryCtaCommand}
                </h1>
                <p className="mt-3 text-[15px] font-medium leading-relaxed text-slate-600">
                  Aprender sin fricción. Mejorar sin ruido.
                </p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-full border border-slate-200/90 bg-white/80 text-slate-700 shadow-sm transition-transform duration-200 group-hover:translate-x-0.5 md:h-14 md:w-14">
                <ArrowRight size={22} strokeWidth={2.25} aria-hidden="true" />
              </span>
            </div>
          </button>
        </motion.div>

        {/* 2 — Coach como insight tranquilo (no segundo hero) */}
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="quantia-coach-surface px-5 py-6 sm:px-8 sm:py-8"
          aria-labelledby="home-coach-heading"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-900/45">
                Guía Quantia
              </p>
              <h2
                id="home-coach-heading"
                className="mt-2 text-xl font-semibold leading-snug tracking-[-0.02em] text-slate-900 sm:text-2xl"
              >
                {coachPlan.title}
              </h2>
              <p className="mt-3 text-[15px] font-medium leading-relaxed text-slate-600">
                {homeLeadMessage}
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4 xl:w-auto xl:max-w-[28rem] xl:shrink-0">
              <InsightStatChip label="Preparación" value={readinessLabel} />
              <InsightStatChip label="Cobertura" value={formatPercent(coverageRate)} />
              <InsightStatChip label="Repasos" value={String(recommendedReview)} />
              <InsightStatChip label="Nuevas" value={String(recommendedNew)} />
            </div>
          </div>
        </motion.section>

        {/* 3 — Entradas de entrenamiento + temario (soporte, jerarquía clara) */}
        <div className="ui-surface flex flex-col gap-6 p-5 transition-all duration-300 sm:flex-row sm:items-center">
          <div className="w-full shrink-0 sm:w-auto">
            <QuestionScopePicker
              value={questionScope}
              onChange={onQuestionScopeChange}
              label="Temario"
              compact
            />
          </div>
          <div className="hidden h-12 w-px bg-slate-200/90 sm:block" />
          <div className="grid w-full flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <DesktopCockpitAction
              label="Hoy"
              title="Mixto"
              caption={`${recommendedSessionSize} preguntas`}
              onClick={onStartMixed}
              icon={<Target size={20} />}
              accent
              disabled={practiceLocked}
            />
            <DesktopCockpitAction
              label="Libre"
              title="Aleatorio"
              caption={`${batchSize} preguntas`}
              onClick={onStartRandom}
              icon={<Layers3 size={20} />}
              disabled={practiceLocked}
            />
            <DesktopCockpitAction
              label={weakReviewSlotCount > 0 ? `Top ${weakReviewSlotCount}` : 'Errores'}
              title="Falladas"
              caption={weakReviewSlotCount > 0 ? 'Atacar ahora' : 'Sin pendientes'}
              onClick={onStartWeakReview}
              disabled={practiceLocked || weakQuestions.length === 0}
              icon={<Flame size={20} />}
            />
          </div>
        </div>

        {/* 4 — Estructura: métricas y contexto */}
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Estado global"
            hint="Preparación y banco"
            className="border-slate-200/85 bg-white/92 p-6 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.08)]"
          >
            <div className="grid gap-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <AnalyticsMiniTile
                  label="Precisión"
                  value={accuracyLabel}
                  caption={accuracyCaption}
                  accent
                />
                <AnalyticsMiniTile
                  label="Visto"
                  value={formatPercent(coverageRate)}
                  caption="banco"
                />
                <AnalyticsMiniTile
                  label="Retención"
                  value={retentionLabel}
                  caption={retentionCaption}
                />
                <AnalyticsMiniTile
                  label="Carga"
                  value={String(backlogCountResolved)}
                  caption={overdueCountResolved > 0 ? 'con retraso' : 'al día'}
                />
              </div>
              {hasLearningSnapshot && (
                <div className="quantia-structure-surface p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Distribución de dominio
                    </p>
                    <span className="text-[11px] font-bold text-slate-400">
                      {seenQuestionsResolved} / {totalQuestionsResolved}
                    </span>
                  </div>
                  <SegmentedProgressBar segments={masterySegments} />
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {masterySegments.map((seg) => (
                      <DashboardSegmentTile
                        key={seg.label}
                        label={seg.label}
                        value={seg.value}
                        dotClassName={seg.className}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Contexto del coach"
            hint="Prioridad y datos"
            className="border-slate-200/85 bg-white/92 p-6 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.08)]"
          >
            <div className="flex h-full flex-col gap-5">
              <div className="flex-1 rounded-[1.35rem] border border-slate-200/80 bg-slate-50/60 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm">
                    <Target size={20} strokeWidth={2.25} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Prioridad
                    </p>
                    <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">
                      {coachPlan.focusLabel}
                    </h3>
                    <div className="mt-4 space-y-2.5">
                      {coachPlan.reasons.map((reason, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-sm font-medium leading-relaxed text-slate-600"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400/80" />
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.15rem] border border-slate-200/85 bg-white/90 p-4 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Riesgo
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {topRiskBreakdown[0]?.label ?? 'Sistema estable'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {topRiskBreakdown[0] ? 'Revisar cuando puedas' : 'Sin alertas críticas'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onReloadQuestions}
                  className="group rounded-[1.15rem] border border-slate-200/85 bg-white/90 p-4 text-left shadow-sm transition-all hover:border-slate-300/90 hover:bg-slate-50/80 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Datos
                    </p>
                    <RotateCcw
                      size={14}
                      className="text-slate-400 transition-transform duration-300 group-hover:rotate-[-25deg]"
                    />
                  </div>
                  <p className="mt-2 text-base font-semibold tracking-tight text-slate-900">
                    Sincronizar banco
                  </p>
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* --- TIER 4: RECENT TREND --- */}
        {recentTrendItems.length > 0 && (
          <SectionCard
            title="Tendencia reciente"
            hint="Precisión en últimas sesiones"
            className="border-slate-200/85 bg-white/92 p-6 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.08)]"
          >
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
              <div className="min-h-[12rem] flex items-end pb-8">
                <SparklineChart
                  items={recentTrendItems.map((item) => ({
                    label: item.label,
                    value: item.value,
                    meta: `${item.sessions} sesiones`,
                  }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <AnalyticsMiniTile
                  label="Media"
                  value={`${recentTrendAverage}%`}
                  caption="últimas"
                  accent
                />
                <AnalyticsMiniTile
                  label="Máximo"
                  value={`${recentTrendBest}%`}
                  caption="pico móvil"
                />
                <AnalyticsMiniTile
                  label="Última"
                  value={`${recentTrendLast}%`}
                  caption={recentTrendLast >= recentTrendAverage ? '↑ media' : '↓ media'}
                />
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    );
  }

  const { activeTab: _activeTab, ...tabProps } = props;

  return (
    <Suspense
      fallback={
        <DashboardTabFallback
          label={
            activeTab === 'stats' ? 'Estadisticas' : activeTab === 'study' ? 'Estudio' : 'Perfil'
          }
        />
      }
    >
      {activeTab === 'stats' ? <DashboardStatsTab {...tabProps} /> : null}
      {activeTab === 'study' ? <DashboardStudyTab {...tabProps} /> : null}
      {activeTab === 'profile' ? <DashboardProfileTab {...tabProps} /> : null}
    </Suspense>
  );
};

export default DashboardScreen;
