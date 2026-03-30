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
  formatPercent
} from './dashboard/shared';

const DashboardStatsTab = lazy(() => import('./dashboard/DashboardStatsTab'));
const DashboardStudyTab = lazy(() => import('./dashboard/DashboardStudyTab'));
const DashboardProfileTab = lazy(() => import('./dashboard/DashboardProfileTab'));


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
  accent?: boolean;
}> = ({ icon, label, title, caption, onClick, disabled, accent = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group flex w-full items-center gap-3 rounded-[1.05rem] border px-3.5 py-3 text-left text-slate-950 shadow-[0_14px_24px_-24px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99] disabled:opacity-45 disabled:hover:translate-y-0 ${
      accent
        ? 'border-[#c5d7f8] bg-[linear-gradient(180deg,rgba(243,248,255,0.98),rgba(235,243,255,0.94))] shadow-[0_16px_28px_-24px_rgba(141,147,242,0.18)]'
        : 'border-slate-200/88 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))]'
    }`}
  >
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] border ${
      accent 
        ? 'border-[#b8ccf6] bg-[linear-gradient(135deg,rgba(114,175,230,0.22),rgba(141,147,242,0.26))] text-blue-700'
        : 'border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.12),rgba(141,147,242,0.14))] text-slate-700'
    }`}>
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
      if (!s.finishedAt) continue;
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
  
  const hasLearningSnapshot = Boolean(learningDashboard || learningDashboardV2);
  
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
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-6 pb-20">
        {/* --- TIER 1: COCKPIT DE ESTUDIO (ACCION PRIORITARIA) --- */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
           <button
              type="button"
              onClick={onStartRecommended}
              className="order-1 xl:order-2 group relative flex flex-col justify-center overflow-hidden rounded-[2.5rem] quantia-bg-gradient p-7 text-left text-white shadow-[0_32px_64px_-24px_rgba(141,147,242,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_45px_100px_-35px_rgba(141,147,242,0.55)] active:translate-y-0 active:scale-[0.98]"
           >
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative z-10 flex items-center justify-between w-full">
                 <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/80">
                    <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
                    Lanzar Entrenamiento
                 </span>
                 <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-transform duration-700 group-hover:rotate-[360deg] group-hover:scale-110">
                    <ArrowRight size={22} />
                 </span>
              </div>
              <p className="relative z-10 mt-3 text-[1.5rem] font-black leading-tight tracking-tight text-white">
                 {primaryCtaCommand}
              </p>
           </button>

           <div className="order-2 xl:order-1 rounded-[2.5rem] border border-slate-100 bg-white/45 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-2xl transition-all duration-500 hover:shadow-indigo-500/10 flex flex-col sm:flex-row items-center gap-6">
              <div className="w-full sm:w-auto shrink-0">
                 <QuestionScopePicker
                    value={questionScope}
                    onChange={onQuestionScopeChange}
                    label="Temario seleccionado"
                    compact
                 />
              </div>
              <div className="hidden h-12 w-[1px] bg-slate-200 sm:block" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
                 <DesktopCockpitAction
                    label="Hoy"
                    title="Mixto"
                    caption={`${recommendedSessionSize} preguntas`}
                    onClick={onStartMixed}
                    icon={<Target size={20} />}
                    accent
                 />
                 <DesktopCockpitAction
                    label="Libre"
                    title="Aleatorio"
                    caption={`${batchSize} preguntas`}
                    onClick={onStartRandom}
                    icon={<Layers3 size={20} />}
                 />
                 <DesktopCockpitAction
                    label={weakReviewSlotCount > 0 ? `Top ${weakReviewSlotCount}` : 'Errores'}
                    title="Falladas"
                    caption={weakReviewSlotCount > 0 ? 'Atacar ahora' : 'Sin pendientes'}
                    onClick={onStartWeakReview}
                    disabled={weakQuestions.length === 0}
                    icon={<Flame size={20} />}
                 />
              </div>
           </div>
        </div>

        {/* --- TIER 2: HERO VIEW (SUMMARY STATS) --- */}
        <SectionCard className="relative overflow-hidden border-[#c8d8fb]/70 quantia-bg-gradient p-5 text-white shadow-[0_22px_52px_-42px_rgba(141,147,242,0.22)] sm:p-7 xl:p-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/14 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%)]" />
          </div>
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-50/88">
                <span className="h-2 w-2 rounded-full bg-white/92 shadow-[0_0_0_4px_rgba(255,255,255,0.12)]" />
                Coach Quantia Activo
              </p>
              <h1 className="mt-2 text-[1.8rem] font-black leading-[1.1] tracking-[-0.04em] text-white sm:text-[2.2rem] xl:text-[3rem]">
                {coachPlan.title}
              </h1>
              <p className="mt-4 max-w-[42rem] text-[15px] font-semibold leading-relaxed text-sky-50/85 xl:text-[17px]">
                {homeLeadMessage}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[42rem] xl:shrink-0">
              <HeroMiniStat label="Preparación" value={readinessLabel} />
              <HeroMiniStat label="Cobertura" value={formatPercent(coverageRate)} />
              <HeroMiniStat label="Repasos" value={String(recommendedReview)} />
              <HeroMiniStat label="Nuevas" value={String(recommendedNew)} />
            </div>
          </div>
        </SectionCard>

        {/* --- TIER 3: ANALYTICS & INSIGHTS --- */}
        <div className="grid gap-6 xl:grid-cols-2">
           <SectionCard title="Estado Global" hint="Nivel de preparación y banco" className="p-6">
             <div className="grid gap-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <AnalyticsMiniTile
                    label="Precisión"
                    value={accuracyLabel}
                    caption={accuracyCaption}
                    accent
                  />
                  <AnalyticsMiniTile label="Visto" value={formatPercent(coverageRate)} caption="banco" />
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
                   <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Distribución de dominio</p>
                        <span className="text-[11px] font-bold text-slate-400">{seenQuestionsResolved} / {totalQuestionsResolved}</span>
                      </div>
                      <SegmentedProgressBar segments={masterySegments} />
                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
                         {masterySegments.map(seg => (
                           <div key={seg.label} className="rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
                              <div className="flex items-center gap-2 mb-1.5">
                                 <span className={`h-2 w-2 rounded-full ${seg.className}`} />
                                 <span className="text-[9px] font-bold uppercase text-slate-400">{seg.label}</span>
                              </div>
                              <p className="text-xl font-black text-slate-900 leading-none">{seg.value}</p>
                           </div>
                         ))}
                      </div>
                   </div>
                )}
             </div>
           </SectionCard>

           <SectionCard title="Claves del Coach" hint="Recomendaciones de alto impacto" className="p-6">
              <div className="flex flex-col h-full gap-5">
                 <div className="flex-1 rounded-3xl border border-sky-100 bg-sky-50/40 p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                       <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                          <Target size={22} />
                       </div>
                       <div>
                          <p className="text-[11px] font-black uppercase tracking-widest text-sky-600">Prioridad Actual</p>
                          <h3 className="mt-1 text-xl font-bold text-slate-900">{coachPlan.focusLabel}</h3>
                          <div className="mt-4 space-y-3">
                             {coachPlan.reasons.map((reason, idx) => (
                               <div key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                                  {reason}
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                       <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Riesgo Detectado</p>
                       <p className="mt-2 text-base font-black text-slate-900">{topRiskBreakdown[0]?.label ?? 'Sistema estable'}</p>
                       <p className="mt-1 text-xs font-semibold text-slate-400">
                          {topRiskBreakdown[0] ? 'Acción prioritaria sugerida' : 'Sin alertas críticas'}
                       </p>
                    </div>
                    <button
                      onClick={onReloadQuestions}
                      className="group rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm transition-all hover:bg-indigo-50 active:scale-[0.98]"
                    >
                       <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase text-indigo-500 tracking-wider">Motor de Datos</p>
                          <RotateCcw size={14} className="text-indigo-400 group-hover:rotate-180 transition-transform duration-500" />
                       </div>
                       <p className="mt-2 text-base font-black text-slate-900 uppercase italic tracking-tighter">Sync Cloud</p>
                    </button>
                 </div>
              </div>
           </SectionCard>
        </div>

        {/* --- TIER 4: RECENT TREND --- */}
        {recentTrendItems.length > 0 && (
          <SectionCard title="Tendencia Reciente" hint="Evolución de precisión en últimas sesiones" className="p-6">
             <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
                <div className="min-h-[12rem] flex items-end pb-8">
                   <SparklineChart
                      items={recentTrendItems.map((item) => ({
                        label: item.label,
                        value: item.value,
                        meta: `${item.sessions} sesiones`
                      }))}
                   />
                </div>
                <div className="grid grid-cols-3 gap-3">
                   <AnalyticsMiniTile label="Media" value={`${recentTrendAverage}%`} caption="últimas" accent />
                   <AnalyticsMiniTile label="Máximo" value={`${recentTrendBest}%`} caption="pico móvil" />
                   <AnalyticsMiniTile label="Última" value={`${recentTrendLast}%`} caption={recentTrendLast >= recentTrendAverage ? '↑ media' : '↓ media'} />
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
