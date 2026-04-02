import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RotateCcw,
  Shield,
  Target,
  Zap,
} from 'lucide-react';
import { StudyCalendar } from './StudyCalendar';
import type { DashboardContentProps } from './types';
import { buildStatsAdapterOutput } from '../../adapters/surfaces/statsAdapter';
import { buildCoachTwoLineMessageV2 } from '../../domain/coachCopyV2';

const formatCompact = (n: number) => {
  if (!Number.isFinite(n)) return '--';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
};

const DashboardStatsTab: React.FC<DashboardContentProps> = ({
  coachPlan: _coachPlan,
  examTarget,
  learningDashboard,
  learningDashboardV2,
  pressureInsights: _pressureInsights,
  pressureInsightsV2,
  planV2,
  recentSessions,
  streakDays,
  onReloadQuestions,
  onStartAntiTrap,
  onStartRecommended,
  onStartWeakReview,
  weakCategories,
}) => {
  const statsExperience = useMemo(
    () =>
      buildStatsAdapterOutput({
        planV2,
        learningDashboardV2,
        pressureInsightsV2,
        recentSessions,
        streakDays,
        weakCategories,
      }),
    [learningDashboardV2, planV2, pressureInsightsV2, recentSessions, streakDays, weakCategories],
  );

  const coach = useMemo(
    () =>
      buildCoachTwoLineMessageV2({
        planV2,
        dominantState: statsExperience.dominantState,
      }),
    [planV2, statsExperience.dominantState],
  );

  const observedAccuracy =
    (learningDashboardV2?.observedAccuracyN ?? 0) > 0
      ? (learningDashboardV2?.observedAccuracyRate ?? null)
      : null;
  const derivedAccuracyPct = useMemo(() => {
    const first = recentSessions?.[0];
    if (!first) return null;
    const total = Math.max(1, first.total);
    const ratio = first.score / total;
    return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  }, [recentSessions]);

  const accuracyPct = observedAccuracy ?? derivedAccuracyPct ?? 0;

  const avgSeconds = useMemo(() => {
    const durations = (recentSessions ?? [])
      .map((s) => {
        const a = new Date(s.startedAt);
        const b = new Date(s.finishedAt);
        if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
        const diff = (b.getTime() - a.getTime()) / 1000;
        if (!Number.isFinite(diff) || diff <= 0) return null;
        return diff;
      })
      .filter((v): v is number => v !== null);

    if (durations.length === 0) return null;
    const avg = durations.reduce((acc, v) => acc + v, 0) / durations.length;
    return Math.round(avg);
  }, [recentSessions]);

  const sessionsForCalendar = (recentSessions ?? []).map((s) => ({ finishedAt: s.finishedAt }));

  const examDate = examTarget?.examDate ?? learningDashboard?.examDate ?? null;
  const daysToExam = useMemo(() => {
    if (!examDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(examDate);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    const diffMs = d.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [examDate]);

  const questionsTotal = learningDashboardV2?.totalQuestions ?? learningDashboard?.totalQuestions ?? 0;

  const onBridgeAction = () => {
    if (statsExperience.dominantState === 'pressure') {
      onStartAntiTrap();
      return;
    }
    if (statsExperience.dominantState === 'errors') {
      onStartWeakReview();
      return;
    }
    onStartRecommended();
  };

  const heroIcon =
    statsExperience.dominantState === 'pressure' ? (
      <Shield size={20} aria-hidden />
    ) : statsExperience.dominantState === 'backlog' ? (
      <AlertTriangle size={20} aria-hidden />
    ) : statsExperience.dominantState === 'recovery' ? (
      <RotateCcw size={20} aria-hidden />
    ) : statsExperience.dominantState === 'growth' ? (
      <Zap size={20} aria-hidden />
    ) : statsExperience.dominantState === 'errors' ? (
      <Zap size={20} aria-hidden />
    ) : (
      <Target size={20} aria-hidden />
    );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-16 xl:max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Estadísticas</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Lectura del momento · misma lógica que Home</p>
        </div>

        <button
          type="button"
          onClick={() => void onReloadQuestions()}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80"
        >
          <RotateCcw size={14} className="text-slate-500" aria-hidden />
        </button>
      </div>

      {/* Insight dominante: un solo centro de gravedad */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(165deg,#0f172a_0%,#1e293b_52%,#334155_100%)] px-5 py-6 text-white shadow-[0_28px_64px_-32px_rgba(15,23,42,0.45)] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_0%_0%,rgba(255,255,255,0.07),transparent_45%)]" />
        <div className="relative">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-violet-100">
              {heroIcon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Lectura principal</p>
              <h2 className="mt-2 text-[1.35rem] font-black leading-[1.15] tracking-[-0.03em] sm:text-[1.5rem]">
                {statsExperience.primaryInsight.title}
              </h2>
              <p className="mt-2 text-[0.9375rem] font-medium leading-relaxed text-slate-300">
                {statsExperience.primaryInsight.summary}
              </p>
              {statsExperience.trajectoryLine ? (
                <p className="mt-3 text-[12px] font-medium leading-snug text-slate-400">{statsExperience.trajectoryLine}</p>
              ) : null}
              {statsExperience.footnote ? (
                <p className="mt-2 text-[11px] font-medium leading-snug text-amber-200/85">{statsExperience.footnote}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/90">
              {statsExperience.coachBridge.bridgeLead}
            </p>
            <p className="mt-1.5 text-[0.8125rem] font-semibold leading-snug text-slate-200">
              «{coach.line1}» — {statsExperience.coachBridge.visibleReason}
            </p>
            <button
              type="button"
              onClick={onBridgeAction}
              className="mt-4 w-full rounded-2xl bg-white py-3.5 text-center text-[0.95rem] font-black tracking-[-0.02em] text-slate-900 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.35)] transition-[transform,filter] hover:brightness-[1.03] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {statsExperience.coachBridge.nextActionLabel}
            </button>
            <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
              Misma recomendación que el coach en Home
            </p>
          </div>
        </div>
      </section>

      {/* KPIs: subordinados, solo contexto numérico */}
      <div>
        <p className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Datos que apoyan esta lectura
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 text-center shadow-sm sm:p-4">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Precisión observada</p>
            <p className="mt-1 text-base font-black tabular-nums text-slate-900 sm:text-lg">{Math.round(accuracyPct)}%</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 text-center shadow-sm sm:p-4">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Clock3 className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Tiempo medio sesión</p>
            <p className="mt-1 text-base font-black tabular-nums text-slate-900 sm:text-lg">
              {avgSeconds === null ? '—' : `${avgSeconds}s`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 text-center shadow-sm sm:p-4">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Zap className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Banco (ámbito)</p>
            <p className="mt-1 text-base font-black tabular-nums text-slate-900 sm:text-lg">{formatCompact(questionsTotal)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-2 shadow-sm">
          <div className="px-4 pb-1 pt-4 sm:px-5">
            <h3 className="text-xs font-black text-slate-900">Actividad reciente</h3>
            <p className="text-[11px] font-semibold text-slate-500">Contexto, no juicio</p>
          </div>
          <StudyCalendar sessions={sessionsForCalendar} className="border-none bg-transparent p-2 shadow-none" />
        </div>

        <div className="flex flex-col justify-center rounded-[2rem] border border-slate-800 bg-slate-900 p-5 text-white shadow-md sm:p-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Horizonte oposición</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight tabular-nums sm:text-4xl">
              {daysToExam === null ? '—' : daysToExam}
            </span>
            <span className="text-sm font-bold text-slate-400">días</span>
          </div>
          <p className="mt-3 text-[11px] font-medium leading-snug text-slate-400">
            El coach prioriza lo mismo aquí y en Home; los números de arriba solo contextualizan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardStatsTab;
