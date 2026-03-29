import React, { useMemo } from 'react';
import { SIMULACRO_BATCH_SIZE } from '../../practiceConfig';
import type { DashboardContentProps } from './types';
import {
  AnalyticsMiniTile,
  DashboardTabFallback,
  PressureComparisonMeter,
  RangeMeter,
  RankedMeterRow,
  SectionCard,
  SegmentedProgressBar,
  SparklineChart,
  StatsDisclosure,
  formatOptionalPercent,
  formatPercent,
  formatSessionDate,
  formatSignedPoints,
  toPercentNumber,
  CircularGauge,
  DashboardMetricTile,
  SectionHeader
} from './shared';
import { StudyCalendar as Calendar } from './StudyCalendar';
import { 
  EvolutionAreaChart, 
  DistributionDonutChart, 
  PerformanceBarChart,
  KPIPulseCard
} from './VisualSuite';
import { 
  Activity, 
  Target, 
  ShieldCheck, 
  Zap, 
  AlertCircle, 
  Clock, 
  BarChart3, 
  TrendingUp, 
  ChevronRight, 
  Filter, 
  Download,
  Calendar as CalendarIcon,
  Search
} from 'lucide-react';


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
  excessRisk,
  sampleOk
}: {
  confidenceFlag: 'low' | 'medium' | 'high';
  excessRisk: number | null;
  sampleOk: boolean;
}) => {
  if (!sampleOk) return 'muestra en consolidacion';
  if (excessRisk !== null && Number.isFinite(excessRisk)) {
    const points = Math.round(excessRisk * 100);
    return `${points >= 0 ? '+' : '-'}${Math.abs(points)} pts vs base`;
  }
  if (confidenceFlag === 'high') return 'muestra solida';
  return 'muestra util';
};

const formatConfidenceLabel = (flag: 'low' | 'medium' | 'high') => {
  if (flag === 'high') return 'alta';
  if (flag === 'medium') return 'media';
  return 'baja';
};

const DashboardStatsTab: React.FC<DashboardContentProps> = ({
  batchSize,
  coachPlan,
  learningDashboard,
  learningDashboardV2,
  pressureInsights,
  pressureInsightsV2,
  profile,
  questionsCount,
  recentSessions,
  recommendedBatchNumber,
  totalBatches,
  weakCategories
}) => {
  const accuracy =
    profile && profile.totalAnswered > 0
      ? Math.round((profile.totalCorrect / profile.totalAnswered) * 100)
      : 0;
  const resolvedExamReadinessRate =
    learningDashboardV2?.examReadinessRate ?? learningDashboard?.readiness ?? null;
  const readinessLabel = formatPercent(resolvedExamReadinessRate);
  const recommendedToday =
    learningDashboardV2?.recommendedTodayCount ?? learningDashboard?.recommendedTodayCount ?? 0;
  const recommendedReview =
    learningDashboardV2?.recommendedReviewCount ?? learningDashboard?.recommendedReviewCount ?? 0;
  const recommendedNew =
    learningDashboardV2?.recommendedNewCount ?? learningDashboard?.recommendedNewCount ?? 0;
  const riskBreakdown = learningDashboard?.riskBreakdown ?? [];
  const topRiskBreakdown = riskBreakdown.slice(0, 3);
  const resolvedPressureGap =
    pressureInsightsV2?.pressureGapRaw ?? pressureInsights?.pressureGap ?? null;
  const resolvedLearningAccuracy =
    pressureInsightsV2?.learningAccuracy ?? pressureInsights?.learningAccuracy ?? null;
  const resolvedSimulacroAccuracy =
    pressureInsightsV2?.simulacroAccuracy ?? pressureInsights?.simulacroAccuracy ?? null;
  const resolvedPressureMessage =
    pressureInsightsV2?.pressureMessage ??
    pressureInsights?.pressureMessage ??
    'Todavia no hay senal suficiente de simulacro.';
  const pressureGapLabel = formatSignedPoints(resolvedPressureGap);
  const learningAccuracyLabel = formatOptionalPercent(resolvedLearningAccuracy);
  const simulacroAccuracyLabel = formatOptionalPercent(resolvedSimulacroAccuracy);
  const recommendedSessionSize =
    coachPlan.mode === 'simulacro' ? SIMULACRO_BATCH_SIZE : batchSize;
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
  const totalQuestionsResolved =
    learningDashboardV2?.totalQuestions ??
    learningDashboard?.totalQuestions ??
    questionsCount ??
    0;
  const seenQuestionsResolved =
    learningDashboardV2?.seenQuestions ?? learningDashboard?.seenQuestions ?? 0;
  const coverageRate =
    learningDashboardV2?.coverageRate ??
    (totalQuestionsResolved > 0 ? seenQuestionsResolved / totalQuestionsResolved : 0);
  const fragileCountResolved =
    learningDashboardV2?.fragileCount ?? learningDashboard?.fragileCount ?? 0;
  const consolidatingCountResolved =
    learningDashboardV2?.consolidatingCount ?? learningDashboard?.consolidatingCount ?? 0;
  const solidCountResolved =
    learningDashboardV2?.solidCount ?? learningDashboard?.solidCount ?? 0;
  const masteredCountResolved =
    learningDashboardV2?.masteredCount ?? learningDashboard?.masteredCount ?? 0;
  const newCountResolved =
    learningDashboard?.newCount ??
    Math.max(totalQuestionsResolved - seenQuestionsResolved, 0);
  const usefulMasteryRate =
    seenQuestionsResolved > 0
      ? (solidCountResolved + masteredCountResolved) / seenQuestionsResolved
      : 0;
  const fragilityRate =
    seenQuestionsResolved > 0 ? fragileCountResolved / seenQuestionsResolved : 0;
  const observedAccuracyRate =
    learningDashboardV2?.observedAccuracyRate ?? (accuracy > 0 ? accuracy / 100 : 0);
  const observedAccuracyLabel = learningDashboardV2
    ? formatPercent(observedAccuracyRate)
    : `${accuracy}%`;
  const observedAccuracyCaption = learningDashboardV2
    ? `${learningDashboardV2.observedAccuracyN} respuestas | ${
        learningDashboardV2.observedAccuracySampleOk ? 'muestra util' : 'muestra corta'
      }`
    : 'rendimiento global';
  const retentionSeenLabel = formatOptionalPercent(learningDashboardV2?.retentionSeenRate ?? null);
  const retentionSeenCaption = learningDashboardV2
    ? `${learningDashboardV2.retentionSeenN} vistas | confianza ${formatConfidenceLabel(
        learningDashboardV2.retentionSeenConfidenceFlag
      )}`
    : `${solidCountResolved + masteredCountResolved} preguntas`;
  const recentTrendItems = recentSessions
    .slice(0, 6)
    .reverse()
    .map((session, index) => ({
      label: `S${index + 1}`,
      value: toPercentNumber(session.total > 0 ? session.score / session.total : 0),
      meta: `${session.score}/${session.total}`
    }));
  const masterySegments = learningDashboard || learningDashboardV2
    ? [
        { label: 'Nuevas', value: newCountResolved, className: 'bg-slate-300/95' },
        { label: 'Fragiles', value: fragileCountResolved, className: 'bg-amber-300/95' },
        {
          label: 'Consolidan',
          value: consolidatingCountResolved,
          className: 'bg-sky-300/95'
        },
        { label: 'Solidas', value: solidCountResolved, className: 'bg-indigo-300/95' },
        {
          label: 'Dominadas',
          value: masteredCountResolved,
          className: 'bg-emerald-300/95'
        }
      ]
    : [];
  const hasReadinessPanelData = Boolean(learningDashboard || learningDashboardV2);
  const hasPressurePanelData = Boolean(pressureInsights || pressureInsightsV2);
  const topWeakCategories = weakCategories.slice(0, 5);
  const pressureGapPoints =
    resolvedPressureGap === null || resolvedPressureGap === undefined
      ? null
      : Math.round(Math.abs(resolvedPressureGap) * 100);
  const readinessRangeLabel =
    learningDashboardV2?.examReadinessCiLow !== null &&
    learningDashboardV2?.examReadinessCiLow !== undefined &&
    learningDashboardV2?.examReadinessCiHigh !== null &&
    learningDashboardV2?.examReadinessCiHigh !== undefined
      ? `${formatPercent(learningDashboardV2.examReadinessCiLow)} - ${formatPercent(learningDashboardV2.examReadinessCiHigh)}`
      : learningDashboard?.readinessLower === null ||
          learningDashboard?.readinessLower === undefined ||
          learningDashboard?.readinessUpper === null ||
          learningDashboard?.readinessUpper === undefined
      ? 'Rango pendiente'
      : `${formatPercent(learningDashboard.readinessLower)} - ${formatPercent(learningDashboard.readinessUpper)}`;
  const projectedReadinessLabel =
    learningDashboard?.projectedReadiness === null ||
    learningDashboard?.projectedReadiness === undefined
      ? 'Sin fecha objetivo'
      : formatPercent(learningDashboard.projectedReadiness);
  const overconfidenceLabel = formatOptionalPercent(
    pressureInsightsV2?.overconfidenceRate ?? pressureInsights?.overconfidenceRate
  );
  const fatigueLabel = formatOptionalPercent(
    pressureInsightsV2?.avgSimulacroFatigue ?? pressureInsights?.avgSimulacroFatigue
  );
  const lastSimulacroLabel = pressureInsights?.lastSimulacroFinishedAt
    ? formatSessionDate(pressureInsights.lastSimulacroFinishedAt)
    : pressureInsightsV2?.simulacroSessionN
      ? `${pressureInsightsV2.simulacroSessionN} simulacros`
      : 'Sin simulacro';
  const masteryBase = Math.max(totalQuestionsResolved, 1);
  const recentAverageLabel =
    recentTrendItems.length > 0
      ? `${Math.round(
          recentTrendItems.reduce((total, item) => total + item.value, 0) / recentTrendItems.length
        )}% media`
      : 'Sin muestra';
  const latestTrendValue =
    recentTrendItems.length > 0 ? recentTrendItems[recentTrendItems.length - 1].value : null;
  const earliestTrendValue = recentTrendItems.length > 0 ? recentTrendItems[0].value : null;
  const trendDeltaPoints =
    latestTrendValue === null || earliestTrendValue === null
      ? null
      : latestTrendValue - earliestTrendValue;
  const trendDeltaLabel =
    trendDeltaPoints === null
      ? '--'
      : `${trendDeltaPoints >= 0 ? '+' : '-'}${Math.abs(trendDeltaPoints)} pts`;
  const trendPeakValue =
    recentTrendItems.length > 0 ? Math.max(...recentTrendItems.map((item) => item.value)) : null;
  const trendSpreadValue =
    recentTrendItems.length > 0
      ? Math.max(...recentTrendItems.map((item) => item.value)) -
        Math.min(...recentTrendItems.map((item) => item.value))
      : null;
  const riskBreakdownTotal = topRiskBreakdown.reduce((total, risk) => total + risk.count, 0);
  const maxWeakCategoryRisk = topWeakCategories.reduce((max, item) => {
    const riskPercent = getCategoryRiskPercent(item);
    return Math.max(max, riskPercent);
  }, 0);
  const maxRiskShare = topRiskBreakdown.reduce((max, risk) => {
    const share = riskBreakdownTotal === 0 ? 0 : Math.round((risk.count / riskBreakdownTotal) * 100);
    return Math.max(max, share);
  }, 0);
  const visibleWeakFailures = topWeakCategories.reduce(
    (total, item) => total + item.incorrectAttempts,
    0
  );
  const dominantRiskLabel = topRiskBreakdown[0]?.label ?? 'Sin patron';
  const hottestCategoryLabel = topWeakCategories[0]?.category ?? 'Sin tema';
  const hottestCategorySupport = topWeakCategories[0]
    ? getCategoryRiskSupportLabel(topWeakCategories[0])
    : 'sin muestra';
  const studyFocusLine =
    topRiskBreakdown[0]?.label
      ? `Vigila ${topRiskBreakdown[0].label.toLowerCase()} antes de ampliar carga.`
      : learningDashboardV2?.focusMessage ?? coachPlan.reasons[0] ?? coachPlan.impactLabel;
  const pressureSupportLabel = pressureInsightsV2
    ? pressureInsightsV2.sampleOk
      ? `confianza ${formatConfidenceLabel(pressureInsightsV2.confidenceFlag)}`
      : 'muestra en consolidacion'
    : 'caida bajo presion';
  const statsLeadLabel =
    pressureGapPoints && pressureGapPoints >= 12
      ? 'Presion alta'
      : (learningDashboardV2?.backlogOverdueCount ?? learningDashboard?.overdueCount ?? 0) > 0
        ? 'Hoy conviene consolidar'
        : 'Sistema estable';
  const backlogCountResolved = learningDashboardV2?.backlogOverdueCount ?? learningDashboard?.overdueCount ?? 0;
  const statsLeadMessage =
    pressureGapPoints && pressureGapPoints >= 12
      ? `Tu rendimiento cae ${pressureGapPoints} puntos bajo presion. Conviene afinar lectura y simulacro.`
      : learningDashboardV2?.focusMessage ?? coachPlan.summary;

  // 1. DATA PREPARATION FOR RECHARTS
  const trendData = recentTrendItems.map((item) => ({
    label: item.label,
    value: item.value,
    acc: item.meta
  }));

  const masteryDonutData = [
    { name: 'Dominadas', value: masteredCountResolved, color: '#10b981' },
    { name: 'Sólidas', value: solidCountResolved, color: '#8d93f2' },
    { name: 'Frágiles', value: fragileCountResolved, color: '#f59e0b' },
    { name: 'Vistas', value: seenQuestionsResolved - (solidCountResolved + masteredCountResolved + fragileCountResolved), color: '#7cb6e8' }
  ].filter(d => d.value > 0);

  const performanceBarData = topWeakCategories.slice(0, 5).map(cat => ({
     category: cat.category.length > 20 ? cat.category.substring(0, 18) + '...' : cat.category,
     accuracy: Math.round((cat.correctAttempts / Math.max(1, cat.attempts)) * 100),
     attempts: cat.attempts
  }));

  // 2. DATA PREPARATION: AGGREGATE RECENT SESSIONS TABLE
  const sessionList = recentSessions.slice(0, 5).map(s => ({
    id: s.id,
    date: formatSessionDate(s.finishedAt),
    score: s.score,
    total: s.total,
    acc: Math.round((s.score / Math.max(1, s.total)) * 100),
    mode: s.mode
  }));

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] px-4 py-8 md:px-6 md:py-10 lg:px-10">
      <div className="mx-auto w-full max-w-[1780px] space-y-12">
        
        {/* --- HEADER (Responsive: Tight on mobile, Wide on desktop) --- */}
        <header className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-100 pb-8">
           <div className="flex items-center gap-4">
              <div className="hidden lg:flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                 <BarChart3 size={24} />
              </div>
              <div>
                 <h1 className="text-3xl font-black tracking-tight text-slate-950 lg:text-4xl">
                    Performance <span className="text-slate-400">Hub</span>
                 </h1>
                 <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Insights en tiempo real por Oposik AI
                 </p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-1.5 shadow-sm">
                 <CalendarIcon size={14} className="text-slate-400" />
                 <span className="text-xs font-black text-slate-900">12 Abr 2026</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-korrika-pink text-white shadow-lg shadow-korrika-pink/30">
                 <Zap size={18} />
              </div>
           </div>
        </header>

        {/* --- HERO SECTION (Adaptive Grid) --- */}
        <div className="grid gap-8 lg:grid-cols-12">
           
           {/* Primary: Insights & Main Chart (Takes up more space on desktop) */}
           <div className="space-y-8 lg:col-span-8">
              
              {/* Coach Insight (Full width of this col) */}
              <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 shadow-2xl xl:p-10">
                 <div className="relative z-10">
                    <div className="flex items-center justify-between">
                       <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300 backdrop-blur-sm">
                          <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                          Ready Index: {readinessLabel}%
                       </span>
                       <TrendingUp className="text-white/20" size={24} />
                    </div>
                    <h2 className="mt-8 text-2xl font-black text-white lg:text-3xl">{statsLeadLabel}</h2>
                    <p className="mt-4 text-base font-semibold leading-relaxed text-slate-400 lg:text-[17px]">
                       {statsLeadMessage}
                    </p>
                    <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-white/10 pt-8">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Plan actual</p>
                          <p className="text-sm font-black text-white">{coachPlan.title}</p>
                       </div>
                       <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sesión Sugerida</p>
                          <p className="text-sm font-black text-white">{studyFocusLine}</p>
                       </div>
                    </div>
                 </div>
                 <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-korrika-pink/10 blur-[80px]" />
              </section>

              {/* Evolution Chart (Hidden/Simplified on mobile) */}
              <section className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm lg:p-10">
                 <div className="mb-10 flex items-center justify-between">
                    <div>
                       <h3 className="text-xl font-black text-slate-950">Curva de Rendimiento</h3>
                       <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">Evolución de los últimos cierres</p>
                    </div>
                    <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-500">
                       <Clock size={14} /> Total: {recentSessions.length} sesiones
                    </div>
                 </div>
                 <div className="h-[280px] lg:h-[340px] w-full">
                    <EvolutionAreaChart data={trendData} />
                 </div>
              </section>
           </div>

           {/* Secondary: KPI Sidebar & Calendar (Side column on desktop, stack on mobile) */}
           <div className="space-y-8 lg:col-span-4">
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                 <KPIPulseCard 
                   label="Aptitud Media" 
                   value={observedAccuracyLabel} 
                   trend={2} 
                   icon={<Target size={22} />} 
                 />
                 <KPIPulseCard 
                   label="Cobertura" 
                   value={formatPercent(coverageRate)} 
                   trend={-1} 
                   icon={<ShieldCheck size={22} />} 
                 />
                 <KPIPulseCard 
                   label="Backlog Review" 
                   value={String(backlogCountResolved)} 
                   trend={-5} 
                   icon={<Clock size={22} />} 
                 />
                 <div className="hidden lg:block">
                    <KPIPulseCard 
                      label="Memory Stability" 
                      value={learningDashboardV2 ? retentionSeenLabel : "88%"} 
                      trend={12} 
                      icon={<Activity size={22} />} 
                    />
                 </div>
              </div>

              <Calendar sessions={recentSessions} className="border-slate-100 bg-white shadow-sm" />
           </div>
        </div>

        {/* --- PERFORMANCE BREAKDOWN (Hidden/Summary on mobile) --- */}
        <div className="grid gap-8 lg:grid-cols-3">
           
           {/* Knowledge Distribution (Desktop Only) */}
           <section className="hidden lg:block rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-black text-slate-950 mb-8">Distribución de Madurez</h3>
              <div className="flex flex-col items-center gap-8">
                 <div className="w-full max-w-[240px]">
                    <DistributionDonutChart data={masteryDonutData} />
                 </div>
                 <div className="grid w-full gap-3">
                    {masteryDonutData.map((d, i) => (
                       <div key={i} className="flex items-center justify-between rounded-xl border border-slate-50 bg-slate-50/50 p-3">
                          <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-tight">
                             <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                             {d.name}
                          </div>
                          <span className="text-sm font-black text-slate-950">{d.value}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </section>

           {/* Performance per Category (Simplified on mobile) */}
           <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm lg:col-span-2">
              <div className="mb-8 flex items-end justify-between">
                 <div>
                    <h3 className="text-xl font-black text-slate-950">Acierto por Familia</h3>
                    <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">Temas con mayor desviación</p>
                 </div>
                 <button className="hidden lg:block text-xs font-black uppercase text-korrika-pink">Ver desglose completo</button>
              </div>
              <div className="h-[280px] w-full">
                 <PerformanceBarChart data={performanceBarData} />
              </div>
           </section>
        </div>

        {/* --- DATA TABLE: DETAILED SESSIONS & TOPICS (Desktop focus) --- */}
        <div className="grid gap-8 lg:grid-cols-12">
           
           {/* Recent Sessions List (Desktop Only) */}
           <section className="hidden xl:block lg:col-span-4 rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-black text-slate-950 mb-6">Últimas Sesiones</h3>
              <div className="space-y-4">
                 {sessionList.map(s => (
                    <div key={s.id} className="flex items-center justify-between border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                       <div>
                          <p className="text-sm font-black text-slate-900">{s.mode}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.date}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-slate-950">{s.acc}%</p>
                          <p className="text-[10px] font-bold text-slate-400">{s.score}/{s.total}</p>
                       </div>
                    </div>
                 ))}
                 <button className="w-full mt-4 rounded-xl bg-slate-50 py-3 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-900">
                    Historial Completo
                 </button>
              </div>
           </section>

           {/* Detailed Table (Adaptive: shorter on mobile) */}
           <section className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm lg:col-span-8">
              <div className="p-8">
                 <h3 className="text-xl font-black text-slate-950">Análisis del Temario</h3>
                 <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest italic">Riesgo detectado por tema</p>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/50">
                       <tr className="border-y border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <th className="px-8 py-5">Tema</th>
                          <th className="px-6 py-5 hidden sm:table-cell">Muestra</th>
                          <th className="px-6 py-5">Acierto (%)</th>
                          <th className="px-8 py-5 text-right">Diagnóstico</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {topWeakCategories.slice(0, 6).map(cat => {
                          const acc = Math.round((cat.correctAttempts / Math.max(1, cat.attempts)) * 100);
                          return (
                             <tr key={cat.category} className="group hover:bg-slate-50/30 transition-colors">
                                <td className="px-8 py-6">
                                   <p className="text-sm font-black text-slate-900 leading-tight line-clamp-1">{cat.category}</p>
                                </td>
                                <td className="px-6 py-6 hidden sm:table-cell text-xs font-bold text-slate-500">{cat.attempts} preg.</td>
                                <td className="px-6 py-6">
                                   <div className="flex items-center gap-3">
                                      <span className="text-sm font-black text-slate-950">{acc}%</span>
                                      <div className="hidden lg:block h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                                         <div className={`h-full ${acc < 50 ? 'bg-rose-500' : acc < 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${acc}%` }} />
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                   <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${acc < 50 ? 'bg-rose-50 text-rose-600' : acc < 75 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                      {acc < 50 ? 'Crítico' : acc < 75 ? 'Mejorable' : 'Sólido'}
                                   </span>
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </section>
        </div>

        {/* --- FOOTER (Concise on mobile) --- */}
        <footer className="rounded-[2rem] bg-slate-100/50 p-6 lg:p-10 flex flex-col lg:flex-row items-center gap-6 text-center lg:text-left">
           <div className="h-14 w-14 shrink-0 rounded-2xl bg-white flex items-center justify-center text-slate-400">
              <ShieldCheck size={28} />
           </div>
           <div>
              <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Motor de Inferencia AI</p>
              <p className="mt-1 text-sm font-semibold text-slate-600 leading-relaxed italic">
                 "Los datos presentados son proyecciones basadas en tu ritmo de acierto bajo presión. 
                 Se recomienda un mínimo de 3 simulacros semanales para maximizar la fidelidad del Ready Index."
              </p>
           </div>
        </footer>
        
      </div>
    </div>
  );
};

export default DashboardStatsTab;
