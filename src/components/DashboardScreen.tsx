import React, { Suspense, lazy } from 'react';
import { ArrowRight, Flame, Layers3, RotateCcw, Target } from 'lucide-react';
import { SIMULACRO_BATCH_SIZE } from '../practiceConfig';
import QuestionScopePicker from './QuestionScopePicker';
import type { DashboardScreenProps } from './dashboard/types';
import {
  AnalyticsMiniTile,
  DashboardTabFallback,
  SectionCard,
  SegmentedProgressBar,
  SparklineChart,
  formatPercent,
  formatSignedPoints
} from './dashboard/shared';

const DashboardStatsTab = lazy(() => import('./dashboard/DashboardStatsTab'));
const DashboardStudyTab = lazy(() => import('./dashboard/DashboardStudyTab'));
const DashboardProfileTab = lazy(() => import('./dashboard/DashboardProfileTab'));

const HeroCompactAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  title: string;
  caption?: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}> = ({ icon, label, title, caption, onClick, disabled, accent = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group relative inline-flex min-h-[6.2rem] w-full flex-col rounded-[1rem] border px-3 py-3 text-left text-slate-950 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99] disabled:opacity-45 disabled:hover:translate-y-0 ${
      accent
        ? 'border-[#c7d8fb] bg-[linear-gradient(180deg,rgba(247,251,255,0.99),rgba(236,244,255,0.95))] shadow-[0_16px_28px_-24px_rgba(141,147,242,0.18)] hover:border-[#b5cef8] hover:shadow-[0_18px_30px_-22px_rgba(141,147,242,0.2)]'
        : 'border-slate-200/88 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(247,250,255,0.94))] shadow-[0_14px_24px_-24px_rgba(15,23,42,0.12)] hover:border-[#c5d7f8] hover:shadow-[0_16px_26px_-22px_rgba(141,147,242,0.16)]'
    }`}
  >
    <span className="pointer-events-none absolute right-3 top-3 text-slate-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-600">
      <ArrowRight size={14} />
    </span>
    <span className="flex w-full items-start gap-2">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] border text-slate-700 ${
          accent
            ? 'border-[#c6d7fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(141,147,242,0.22))] text-slate-800'
            : 'border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.12),rgba(141,147,242,0.14))]'
        }`}
      >
        {icon}
      </span>
    </span>
    <span className="mt-3 min-w-0">
      <span className="block text-[8px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <span className="mt-1 block text-[1rem] font-black leading-[1.02] text-slate-950 sm:text-[1.03rem]">
        {title}
      </span>
      {caption ? (
        <span className="mt-1 block pr-5 text-[11px] font-semibold leading-4 text-slate-500">
          {caption}
        </span>
      ) : null}
    </span>
  </button>
);

const HeroMiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[0.98rem] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.07))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
    <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-sky-50/68">{label}</p>
    <p className="mt-1 text-[1.02rem] font-black leading-none text-white">{value}</p>
  </div>
);

const DesktopCockpitAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  title: string;
  caption: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, title, caption, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="group flex w-full items-center gap-3 rounded-[1.05rem] border border-slate-200/88 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] px-3.5 py-3 text-left text-slate-950 shadow-[0_14px_24px_-24px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c5d7f8] hover:shadow-[0_16px_26px_-22px_rgba(141,147,242,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99] disabled:opacity-45 disabled:hover:translate-y-0"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] border border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.12),rgba(141,147,242,0.14))] text-slate-700">
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[8px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <span className="mt-1 block text-[0.98rem] font-black leading-[1.05] text-slate-950">
        {title}
      </span>
      <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">
        {caption}
      </span>
    </span>
    <ArrowRight size={14} className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5" />
  </button>
);

const HomeStatusBandMetric: React.FC<{
  label: string;
  value: string;
  caption: string;
  accent?: boolean;
}> = ({ label, value, caption, accent = false }) => (
  <div
    className={`flex min-h-[6.25rem] flex-col justify-between px-3.5 py-3 ${
      accent
        ? 'bg-[linear-gradient(180deg,rgba(243,248,255,0.96),rgba(235,243,255,0.9))]'
        : 'bg-transparent'
    }`}
  >
    <div>
      <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-[1.55rem] font-black leading-none tracking-[-0.04em] text-slate-950">
        {value}
      </p>
    </div>
    <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-400">{caption}</p>
  </div>
);

const DashboardScreen: React.FC<DashboardScreenProps> = (props) => {
  const {
    activeTab,
    batchSize,
    coachPlan,
    learningDashboard,
    learningDashboardV2,
    onQuestionScopeChange,
    onReloadQuestions,
    onStartMixed,
    onStartRandom,
    onStartRecommended,
    onStartWeakReview,
    pressureInsights,
    pressureInsightsV2,
    profile,
    questionScope,
    questionsCount,
    recentSessions,
    recommendedBatchNumber,
    weakQuestions
  } = props;

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
  const resolvedPressureGap =
    pressureInsightsV2?.pressureGapRaw ?? pressureInsights?.pressureGap ?? null;
  const pressureGapLabel = formatSignedPoints(resolvedPressureGap);
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
  const pressureBadgeLabel = pressureInsightsV2
    ? pressureInsightsV2.sampleOk
      ? pressureGapLabel
      : 'muestra corta'
    : pressureGapLabel;
  const recommendedSessionSize =
    coachPlan.mode === 'simulacro' ? SIMULACRO_BATCH_SIZE : batchSize;
  const weakReviewSlotCount = Math.min(weakQuestions.length, 5);
  const totalQuestionsResolved = learningDashboardV2?.totalQuestions ?? learningDashboard?.totalQuestions ?? questionsCount ?? 0;
  const seenQuestionsResolved = learningDashboardV2?.seenQuestions ?? learningDashboard?.seenQuestions ?? 0;
  const fragileCountResolved = learningDashboardV2?.fragileCount ?? learningDashboard?.fragileCount ?? 0;
  const consolidatingCountResolved = learningDashboardV2?.consolidatingCount ?? learningDashboard?.consolidatingCount ?? 0;
  const solidCountResolved = learningDashboardV2?.solidCount ?? learningDashboard?.solidCount ?? 0;
  const masteredCountResolved = learningDashboardV2?.masteredCount ?? learningDashboard?.masteredCount ?? 0;
  const newCountResolved = Math.max(totalQuestionsResolved - seenQuestionsResolved, 0);
  const backlogCountResolved =
    learningDashboardV2?.backlogOverdueCount ?? learningDashboard?.backlogCount ?? 0;
  const overdueCountResolved =
    learningDashboardV2?.backlogOverdueCount ?? learningDashboard?.overdueCount ?? 0;
  const masterySegments = learningDashboard || learningDashboardV2
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
      const dayKey = new Date(s.finishedAt).toISOString().slice(0, 10);
      const prev = byDay[dayKey] ?? { score: 0, total: 0, count: 0 };
      byDay[dayKey] = { score: prev.score + s.score, total: prev.total + s.total, count: prev.count + 1 };
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([dayKey, { score, total, count }]) => {
        const date = new Date(dayKey);
        const label = dayKey === today ? 'Hoy' : dayKey === yesterday ? 'Ayer' : dayNames[date.getDay()];
        return { id: dayKey, label, value: total > 0 ? Math.round((score / total) * 100) : 0, sessions: count };
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
  const primaryCtaMetaLabel =
    coachPlan.mode === 'standard'
      ? `Bloque ${recommendedBatchNumber}`
      : coachPlan.mode === 'simulacro'
        ? 'Examen real'
        : coachPlan.mode === 'anti_trap'
          ? 'Errores caros'
          : coachPlan.mode === 'random'
            ? 'Recuperacion'
            : coachPlan.focusLabel;
  const hasLearningSnapshot = Boolean(learningDashboard || learningDashboardV2);
  const readinessSupportCaption = hasLearningSnapshot
    ? `${seenQuestionsResolved} de ${totalQuestionsResolved} vistas`
    : 'sin base suficiente';
  const pressureSupportCaption = pressureInsightsV2
    ? pressureInsightsV2.sampleOk
      ? pressureInsightsV2.confidenceFlag === 'high'
        ? 'muestra solida'
        : 'muestra util'
      : 'muestra corta'
    : pressureInsights
      ? 'lectura simple'
      : 'sin simulacro';
  const recentTrendAverage = recentTrendItems.length
    ? Math.round(recentTrendItems.reduce((sum, item) => sum + item.value, 0) / recentTrendItems.length)
    : 0;
  const recentTrendBest = recentTrendItems.length
    ? Math.max(...recentTrendItems.map((item) => item.value))
    : 0;
  const recentTrendLast = recentTrendItems.length
    ? recentTrendItems[recentTrendItems.length - 1].value
    : 0;

  if (activeTab === 'home') {
    return (
      <div className="grid gap-4 xl:gap-5 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_20rem]">
        <SectionCard className="relative overflow-hidden border-[#c8d8fb]/70 bg-[linear-gradient(135deg,#72afe6_0%,#87a6ee_56%,#8d96f4_100%)] p-3.5 text-white shadow-[0_22px_52px_-42px_rgba(141,147,242,0.22)] sm:p-4 xl:p-5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/14 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%)]" />
          </div>
          <div className="relative grid gap-3.5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-50/88">
                  <span className="h-2 w-2 rounded-full bg-white/92 shadow-[0_0_0_4px_rgba(255,255,255,0.12)]" />
                  Hoy
                </p>
                <p className="mt-1.5 max-w-[16ch] text-[1.56rem] font-black leading-[0.96] tracking-[-0.04em] text-white sm:text-[1.9rem] xl:text-[2.45rem] 2xl:text-[2.7rem]">
                  {coachPlan.title}
                </p>
                <p className="mt-3 max-w-[40rem] text-sm font-semibold leading-6 text-sky-50/82 xl:text-[15px]">
                  {homeLeadMessage}
                </p>
              </div>
            </div>

            <div className="hidden grid-cols-4 gap-2.5 xl:grid">
              <HeroMiniStat label="Preparacion" value={readinessLabel} />
              <HeroMiniStat label="Cobertura" value={formatPercent(coverageRate)} />
              <HeroMiniStat label="Repasos hoy" value={String(recommendedReview)} />
              <HeroMiniStat label="Nuevas hoy" value={String(recommendedNew)} />
            </div>

            <div className="grid max-w-[30rem] gap-2.5 sm:gap-2.75 xl:hidden">
              <QuestionScopePicker
                value={questionScope}
                onChange={onQuestionScopeChange}
                label="Temario"
              />
              <button
                type="button"
                onClick={onStartRecommended}
                className="group flex items-center justify-between gap-3 rounded-[1.08rem] border border-white/82 bg-white/98 px-3.5 py-3 text-left text-slate-950 shadow-[0_20px_32px_-26px_rgba(141,147,242,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_36px_-26px_rgba(141,147,242,0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 active:translate-y-0 active:scale-[0.995] sm:px-4 sm:py-3.25"
              >
                <span className="min-w-0 flex-1 self-center">
                  <span className="inline-flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7cb6e8]" />
                    Empieza ahora
                  </span>
                  <span className="mt-1 block text-[1.16rem] font-black leading-[1.01] tracking-[-0.035em] text-slate-950 sm:mt-1.25 sm:text-[1.24rem]">
                    {primaryCtaCommand}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-600 sm:text-[10px]">
                      {recommendedSessionSize} preguntas
                    </span>
                    <span className="rounded-full bg-[linear-gradient(135deg,rgba(121,182,233,0.12),rgba(141,147,242,0.14))] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-700 sm:text-[10px]">
                      {primaryCtaMetaLabel}
                    </span>
                  </span>
                </span>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] text-white shadow-[0_16px_26px_-18px_rgba(141,147,242,0.28)] transition-transform duration-200 group-hover:translate-x-0.5 sm:h-12 sm:w-12">
                  <ArrowRight size={18} />
                </span>
              </button>
              <div className="grid max-w-[20rem] grid-cols-2 gap-2.5">
                <HeroMiniStat label="Repasos hoy" value={String(recommendedReview)} />
                <HeroMiniStat label="Nuevas hoy" value={String(recommendedNew)} />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Cabina de hoy"
          hint="Temario, accion principal y atajos de ejecucion."
          className="hidden xl:row-span-2 xl:flex xl:flex-col xl:gap-3 xl:p-4"
        >
          <QuestionScopePicker
            value={questionScope}
            onChange={onQuestionScopeChange}
            label="Temario"
          />
          <button
            type="button"
            onClick={onStartRecommended}
            className="group flex items-center justify-between gap-3 rounded-[1.18rem] bg-[linear-gradient(135deg,#72afe6_0%,#8d96f4_100%)] px-3.5 py-3.5 text-left text-white shadow-[0_16px_28px_-18px_rgba(141,147,242,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_32px_-18px_rgba(141,147,242,0.44)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 active:translate-y-0 active:scale-[0.995]"
          >
            <span className="min-w-0 flex-1 self-center">
              <span className="inline-flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
                Empieza ahora
              </span>
              <span className="mt-1 block text-[1.12rem] font-black leading-[1.01] tracking-[-0.035em] text-white">
                {primaryCtaCommand}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/90">
                  {recommendedSessionSize} preguntas
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/85">
                  {primaryCtaMetaLabel}
                </span>
              </span>
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/22 text-white transition-transform duration-200 group-hover:translate-x-0.5">
              <ArrowRight size={16} />
            </span>
          </button>

          <div className="grid gap-2.5">
            <DesktopCockpitAction
              label="Hoy"
              title="Mixto"
              caption={`${recommendedSessionSize} preguntas`}
              onClick={onStartMixed}
              icon={<Target size={18} />}
            />
            <DesktopCockpitAction
              label="Directo"
              title="Aleatorio"
              caption={`${batchSize} preguntas`}
              onClick={onStartRandom}
              icon={<Layers3 size={18} />}
            />
            <DesktopCockpitAction
              label={weakReviewSlotCount > 0 ? `Top ${weakReviewSlotCount}` : 'Errores'}
              title="Falladas"
              caption={weakReviewSlotCount > 0 ? 'Repasar ahora' : 'Sin pendientes'}
              onClick={onStartWeakReview}
              disabled={weakQuestions.length === 0}
              icon={<Flame size={18} />}
            />
          </div>
        </SectionCard>

        <div className="grid grid-cols-3 gap-2.5 xl:hidden">
          <HeroCompactAction
            label="Hoy"
            title="Mixto"
            caption={`${recommendedSessionSize} preguntas`}
            onClick={onStartMixed}
            icon={<Target size={18} />}
            accent
          />
          <HeroCompactAction
            label="Directo"
            title="Aleatorio"
            caption={`${batchSize} preguntas`}
            onClick={onStartRandom}
            icon={<Layers3 size={18} />}
          />
          <HeroCompactAction
            label={weakReviewSlotCount > 0 ? `Top ${weakReviewSlotCount}` : 'Errores'}
            title="Falladas"
            caption={weakReviewSlotCount > 0 ? 'Repasar ahora' : 'Sin pendientes'}
            onClick={onStartWeakReview}
            disabled={weakQuestions.length === 0}
            icon={<Flame size={18} />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
          <SectionCard title="Estado de hoy" hint="Pulso real y mapa de dominio" className="p-3.5 sm:p-4">
            <div className="grid gap-3.5">
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <AnalyticsMiniTile
                  label={learningDashboardV2 ? 'Precision obs.' : 'Precision'}
                  value={accuracyLabel}
                  caption={accuracyCaption}
                  accent
                />
                <AnalyticsMiniTile
                  label="Cobertura"
                  value={formatPercent(coverageRate)}
                  caption="banco visto"
                />
                <AnalyticsMiniTile
                  label={learningDashboardV2 ? 'Retencion vista' : 'Dominio util'}
                  value={retentionLabel}
                  caption={retentionCaption}
                />
                <AnalyticsMiniTile
                  label="Pendientes"
                  value={String(backlogCountResolved)}
                  caption={overdueCountResolved > 0 ? `${overdueCountResolved} urgentes` : 'sin carga vencida'}
                />
              </div>

              {hasLearningSnapshot ? (
                <div className="rounded-[1.18rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(242,247,255,0.92))] px-4 py-4 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                        Dominio del banco
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        Reparto real entre nuevas, fragiles y memoria que ya sostiene nota.
                      </p>
                    </div>
                    <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700">
                      {seenQuestionsResolved}/{totalQuestionsResolved}
                    </span>
                  </div>
                  <div className="mt-3">
                    <SegmentedProgressBar segments={masterySegments} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-5">
                    {masterySegments.map((segment) => (
                      <div
                        key={segment.label}
                        className="rounded-[0.98rem] border border-white/82 bg-white/86 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${segment.className}`} />
                          <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                            {segment.label}
                          </span>
                        </div>
                        <p className="mt-2 text-[1.05rem] font-black leading-none text-slate-950">
                          {segment.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Claves de hoy" hint="Direccion y decision rapida" className="p-3.5 sm:p-4">
            <div className="grid gap-3">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_11rem]">
                <div className="rounded-[1.18rem] border border-[#d7e4fb] bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(239,246,255,0.94))] px-4 py-3.5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(138,144,244,0.18))] text-slate-700">
                        <Target size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                          Ahora
                        </p>
                        <p className="mt-1 text-[1rem] font-black leading-5 text-slate-950">
                          {coachPlan.focusLabel}
                        </p>
                        <p className="mt-1.5 text-[12px] font-semibold leading-5 text-slate-500">
                          {coachPlan.reasons[0] ?? coachPlan.impactLabel}
                        </p>
                      </div>
                    </div>
                    {pressureInsights || pressureInsightsV2 ? (
                      <span className="shrink-0 rounded-full border border-slate-200/90 bg-white/92 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700">
                        {pressureBadgeLabel}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2.5">
                  <AnalyticsMiniTile
                    label="Preparacion"
                    value={readinessLabel}
                    caption={readinessSupportCaption}
                    accent
                  />
                  <AnalyticsMiniTile
                    label="Presion"
                    value={pressureBadgeLabel}
                    caption={pressureSupportCaption}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
                <div className="rounded-[1.05rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-3.5 py-3 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.12)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                        Riesgo
                      </p>
                      <p className="mt-1 text-[0.96rem] font-black leading-5 text-slate-950">
                        {topRiskBreakdown[0]?.label ?? 'Sistema estable'}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">
                        {topRiskBreakdown[0]
                          ? 'Conviene limpiarlo antes de ampliar carga.'
                          : 'No hay una alerta dominante ahora mismo.'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(138,144,244,0.16))] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700">
                      {topRiskBreakdown[0] ? topRiskBreakdown[0].count : 'OK'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onReloadQuestions}
                  className="inline-flex min-h-[5.85rem] items-center justify-center gap-2 rounded-[1.05rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.94))] px-3.5 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-700 shadow-[0_14px_24px_-24px_rgba(15,23,42,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bfd2f6] hover:bg-sky-50/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99]"
                >
                  <RotateCcw size={15} />
                  Sync
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        {hasLearningSnapshot ? (
          <div className="hidden xl:col-span-2 xl:grid xl:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)] xl:gap-5">
            <SectionCard title="Banco de preguntas" hint="Distribucion real por nivel de dominio" className="p-4">
              <div className="grid gap-4">
                <SegmentedProgressBar segments={masterySegments} />
                <div className="grid grid-cols-5 gap-2">
                  <AnalyticsMiniTile label="Nuevas" value={String(newCountResolved)} caption={`de ${totalQuestionsResolved}`} accent />
                  <AnalyticsMiniTile label="Fragiles" value={String(fragileCountResolved)} caption="revisar" />
                  <AnalyticsMiniTile label="Consolidan" value={String(consolidatingCountResolved)} caption="en proceso" />
                  <AnalyticsMiniTile label="Solidas" value={String(solidCountResolved)} caption="dominadas" />
                  <AnalyticsMiniTile label="Dominadas" value={String(masteredCountResolved)} caption="completadas" />
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {masterySegments.map((seg) => (
                    <span key={seg.label} className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      <span className={`h-2 w-2 rounded-full ${seg.className}`} />
                      {seg.label}
                    </span>
                  ))}
                </div>
              </div>
            </SectionCard>

            {recentTrendItems.length > 0 ? (
              <SectionCard title="Tendencia reciente" hint="Acierto por sesion" className="p-4">
                <div className="grid gap-4">
                  <SparklineChart
                    items={recentTrendItems.map((item) => ({
                      label: item.label,
                      value: item.value,
                      meta: `${item.sessions} sesiones`
                    }))}
                  />
                  <div className="grid grid-cols-3 gap-2.5">
                    <AnalyticsMiniTile label="Media" value={`${recentTrendAverage}%`} caption={`${recentTrendItems.length} cierres`} accent />
                    <AnalyticsMiniTile label="Mejor" value={`${recentTrendBest}%`} caption="pico reciente" />
                    <AnalyticsMiniTile
                      label="Ultima"
                      value={`${recentTrendLast}%`}
                      caption={recentTrendLast >= recentTrendAverage ? 'por encima de media' : 'por debajo de media'}
                    />
                  </div>
                </div>
              </SectionCard>
            ) : (
              <SectionCard title="Tendencia reciente" hint="Sin sesiones registradas aun" className="p-4">
                <p className="py-8 text-center text-sm font-medium text-slate-400">
                  Completa tu primera sesion para ver la tendencia.
                </p>
              </SectionCard>
            )}
          </div>
        ) : null}
      </div>
    );
  }
  const { activeTab: _activeTab, ...tabProps } = props;

  return (
    <Suspense
      fallback={
        <DashboardTabFallback
          label={
            activeTab === 'stats'
              ? 'Estadisticas'
              : activeTab === 'study'
                ? 'Estudio'
                : 'Perfil'
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

