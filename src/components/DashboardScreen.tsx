import React, { Suspense, lazy } from 'react';
import {
  ArrowRight,
  Brain,
  ChartNoAxesColumn,
  Flame,
  Layers3,
  LogOut,
  RotateCcw,
  Shield,
  Target,
  UserRound
} from 'lucide-react';
import { MainTab } from './BottomDock';
import { AccountIdentity } from '../services/accountApi';
import {
  PracticeCoachPlan,
  PracticeExamTarget,
  PracticeLearningDashboard,
  PracticePressureInsights,
  PracticeProfile,
  PracticeSessionSummary,
  WeakQuestionInsight
} from '../practiceTypes';

const AdminConsoleScreen = lazy(() => import('./AdminConsoleScreen'));

type DashboardScreenProps = {
  activeTab: MainTab;
  identity: AccountIdentity;
  coachPlan: PracticeCoachPlan;
  examTarget: PracticeExamTarget | null;
  examTargetError: string | null;
  learningDashboard: PracticeLearningDashboard | null;
  pressureInsights: PracticePressureInsights | null;
  profile: PracticeProfile | null;
  recentSessions: PracticeSessionSummary[];
  questionsCount: number;
  totalBatches: number;
  batchSize: number;
  recommendedBatchNumber: number;
  weakQuestions: WeakQuestionInsight[];
  weakCategories: Array<{ category: string; incorrectAttempts: number; attempts: number }>;
  onStartSimulacro: () => void;
  onStartAntiTrap: () => void;
  onStartRecommended: () => void;
  onStartMixed: () => void;
  onStartRandom: () => void;
  onStartFromBeginning: () => void;
  onStartWeakReview: () => void;
  onReloadQuestions: () => void;
  onSaveExamTarget: (payload: {
    examDate: string | null;
    dailyReviewCapacity: number;
    dailyNewCapacity: number;
  }) => void;
  onSignOut: () => void;
  savingExamTarget: boolean;
};

const formatSessionDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getAccuracy = (correct: number, total: number) =>
  total === 0 ? 0 : Math.round((correct / total) * 100);

const formatPercent = (value: number | null | undefined) =>
  `${Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100)}%`;

const toPercentNumber = (value: number | null | undefined) =>
  Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100);

const formatSignedPoints = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '--';
  const points = Math.round(value * 100);
  return `${points > 0 ? '-' : '+'}${Math.abs(points)} pts`;
};

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const SectionCard: React.FC<
  React.PropsWithChildren<{ title?: string; hint?: string; className?: string }>
> = ({ title, hint, className = '', children }) => (
  <section
    className={`rounded-[1.55rem] border border-white/72 bg-white/88 p-4 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.36)] backdrop-blur sm:p-5 ${className}`}
  >
    {title ? (
      <div className="mb-3">
        <p className="text-[1.02rem] font-extrabold tracking-[-0.02em] text-slate-950 sm:text-lg">
          {title}
        </p>
        {hint ? <p className="mt-1 text-sm leading-6 text-slate-500">{hint}</p> : null}
      </div>
    ) : null}
    {children}
  </section>
);

const HomeMetric: React.FC<{ label: string; value: string; className?: string }> = ({
  label,
  value,
  className = ''
}) => (
  <div
    className={`rounded-[1.15rem] border border-slate-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.88))] px-4 py-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.18)] ${className}`}
  >
    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-2 text-[1.8rem] font-black leading-none text-slate-950">{value}</p>
  </div>
);

const HeroCompactAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, title, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex flex-col items-center justify-center gap-2 rounded-[1.08rem] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.1))] px-3 py-3 text-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[10px] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.12))] hover:shadow-[0_18px_30px_-24px_rgba(15,23,42,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:translate-y-0 active:scale-[0.99] disabled:opacity-45 disabled:hover:translate-y-0"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] border border-white/12 bg-white/10 text-blue-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block text-[9px] font-extrabold uppercase tracking-[0.16em] text-blue-100/72">
        {label}
      </span>
      <span className="mt-1 block text-[0.9rem] font-extrabold leading-none text-white">{title}</span>
    </span>
  </button>
);

const CoachChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_28px_-24px_rgba(15,23,42,0.22)] backdrop-blur-sm">
    <span className="text-white/64">{label}</span>
    <span className="text-sm font-black text-white">{value}</span>
  </span>
);

const HeroMiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[1.05rem] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-sm">
    <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-sky-50/68">{label}</p>
    <p className="mt-1.5 text-sm font-black text-white">{value}</p>
  </div>
);

const StatusStripItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[1.1rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-1.5 text-[1.25rem] font-black leading-none text-slate-950">{value}</p>
  </div>
);

const DailyInsightCard: React.FC<{
  eyebrow: string;
  title: string;
  message: string;
  icon: React.ReactNode;
  accentClassName?: string;
  trailing?: React.ReactNode;
}> = ({ eyebrow, title, message, icon, accentClassName = '', trailing }) => (
  <div
    className={`rounded-[1.18rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-4 py-3.5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)] ${accentClassName}`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(138,144,244,0.18))] text-slate-700">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            {eyebrow}
          </p>
          <p className="mt-1 text-base font-extrabold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-500">{message}</p>
        </div>
      </div>
      {trailing}
    </div>
  </div>
);

const AccentStatTile: React.FC<{
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  className?: string;
}> = ({ label, value, hint, icon, className = '' }) => (
  <article
    className={`rounded-[1.3rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.92))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.16)] ${className}`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-2 text-[2rem] font-black leading-none text-slate-950">{value}</p>
        <p className="mt-2 text-xs font-semibold text-slate-400">{hint}</p>
      </div>
      <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,rgba(125,182,232,0.24),rgba(141,147,242,0.28))] text-slate-700">
        {icon}
      </span>
    </div>
  </article>
);

const SegmentedProgressBar: React.FC<{
  segments: Array<{ label: string; value: number; className: string }>;
}> = ({ segments }) => {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);

  return (
    <div className="overflow-hidden rounded-full border border-white/82 bg-slate-100/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="flex h-4 overflow-hidden rounded-full">
        {segments.map((segment) => {
          const width = total === 0 ? 0 : (Math.max(0, segment.value) / total) * 100;
          return (
            <div
              key={segment.label}
              className={segment.className}
              style={{ width: `${width}%` }}
              title={`${segment.label}: ${segment.value}`}
            />
          );
        })}
      </div>
    </div>
  );
};

const TrendBars: React.FC<{
  items: Array<{ label: string; value: number; meta: string }>;
}> = ({ items }) => (
  <div className="grid grid-cols-6 gap-2">
    {items.map((item) => (
      <div key={item.label} className="flex flex-col items-center gap-2">
        <div className="flex h-28 w-full items-end rounded-[1rem] bg-[linear-gradient(180deg,rgba(241,245,249,0.92),rgba(226,232,240,0.78))] p-1.5">
          <div
            className="w-full rounded-[0.8rem] bg-[linear-gradient(180deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_16px_24px_-20px_rgba(141,147,242,0.4)]"
            style={{ height: `${Math.max(10, Math.min(100, item.value))}%` }}
            title={`${item.label}: ${item.meta}`}
          />
        </div>
        <div className="text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            {item.label}
          </p>
          <p className="mt-1 text-xs font-extrabold text-slate-700">{item.meta}</p>
        </div>
      </div>
    ))}
  </div>
);

const RangeMeter: React.FC<{
  current: number;
  lower: number | null;
  upper: number | null;
  projected: number | null;
}> = ({ current, lower, upper, projected }) => {
  const currentPercent = toPercentNumber(current);
  const lowerPercent = lower === null ? currentPercent : toPercentNumber(lower);
  const upperPercent = upper === null ? currentPercent : toPercentNumber(upper);
  const projectedPercent = projected === null ? null : toPercentNumber(projected);

  return (
    <div>
      <div className="relative mt-3 h-4 overflow-hidden rounded-full border border-white/82 bg-[linear-gradient(180deg,rgba(241,245,249,0.95),rgba(226,232,240,0.85))] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <div
          className="absolute inset-y-1 rounded-full bg-[linear-gradient(90deg,rgba(125,211,252,0.4),rgba(165,180,252,0.44))]"
          style={{
            left: `${Math.min(lowerPercent, upperPercent)}%`,
            width: `${Math.max(3, Math.abs(upperPercent - lowerPercent))}%`
          }}
        />
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)] shadow-[0_12px_24px_-18px_rgba(141,147,242,0.4)]"
          style={{ width: `${currentPercent}%` }}
        />
        {projectedPercent !== null ? (
          <div
            className="absolute bottom-0 top-0 w-[2px] bg-slate-900/75"
            style={{ left: `${projectedPercent}%` }}
          />
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
        <span className="rounded-full bg-slate-100 px-2.5 py-1">Actual {currentPercent}%</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1">
          Rango {lowerPercent}% - {upperPercent}%
        </span>
        {projectedPercent !== null ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1">Proyeccion {projectedPercent}%</span>
        ) : null}
      </div>
    </div>
  );
};

const StatsDisclosure: React.FC<
  React.PropsWithChildren<{ title: string; hint: string; defaultOpen?: boolean }>
> = ({ title, hint, defaultOpen = false, children }) => (
  <details
    open={defaultOpen}
    className="rounded-[1.3rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.16)]"
  >
    <summary className="cursor-pointer list-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold tracking-[-0.02em] text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{hint}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
          detalle
        </span>
      </div>
    </summary>
    <div className="mt-4">{children}</div>
  </details>
);

const StudyModeCard: React.FC<{
  label: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'default';
}> = ({ label, title, description, icon, onClick, disabled, tone = 'default' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`rounded-[1.35rem] border px-4 py-4 text-left shadow-[0_18px_32px_-26px_rgba(141,147,242,0.16)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.99] disabled:opacity-45 disabled:hover:translate-y-0 ${
      tone === 'primary'
        ? 'border-[#bfd2f6] bg-[linear-gradient(135deg,rgba(121,182,233,0.2),rgba(138,144,244,0.28))] text-slate-900 hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-26px_rgba(141,147,242,0.2)]'
        : 'border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(241,247,255,0.92))] text-slate-900 hover:-translate-y-0.5 hover:border-[#c8d8f8] hover:shadow-[0_24px_40px_-26px_rgba(141,147,242,0.16)]'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-2 text-lg font-extrabold">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-[1rem] ${
          tone === 'primary'
            ? 'bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] text-white shadow-[0_14px_24px_-18px_rgba(141,147,242,0.3)]'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {icon}
      </span>
    </div>
  </button>
);

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  activeTab,
  coachPlan,
  examTarget,
  examTargetError,
  identity,
  learningDashboard,
  pressureInsights,
  profile,
  recentSessions,
  questionsCount,
  totalBatches,
  batchSize,
  recommendedBatchNumber,
  weakQuestions,
  weakCategories,
  onStartSimulacro,
  onStartAntiTrap,
  onStartRecommended,
  onStartMixed,
  onStartRandom,
  onStartFromBeginning,
  onStartWeakReview,
  onReloadQuestions,
  onSaveExamTarget,
  onSignOut,
  savingExamTarget
}) => {
  const [examDateInput, setExamDateInput] = React.useState(toDateInputValue(examTarget?.examDate));
  const [dailyReviewCapacityInput, setDailyReviewCapacityInput] = React.useState(
    String(examTarget?.dailyReviewCapacity ?? learningDashboard?.dailyReviewCapacity ?? 35)
  );
  const [dailyNewCapacityInput, setDailyNewCapacityInput] = React.useState(
    String(examTarget?.dailyNewCapacity ?? learningDashboard?.dailyNewCapacity ?? 10)
  );
  const accuracy = getAccuracy(profile?.totalCorrect ?? 0, profile?.totalAnswered ?? 0);
  const readinessLabel = formatPercent(learningDashboard?.readiness ?? null);
  const recommendedToday = learningDashboard?.recommendedTodayCount ?? 0;
  const recommendedReview = learningDashboard?.recommendedReviewCount ?? 0;
  const recommendedNew = learningDashboard?.recommendedNewCount ?? 0;
  const riskBreakdown = learningDashboard?.riskBreakdown ?? [];
  const topRiskBreakdown = riskBreakdown.slice(0, 3);
  const visibleCoachChips = coachPlan.chips
    .filter((chip) => chip.label.toLowerCase() !== 'readiness')
    .slice(0, 2);
  const heroStats =
    visibleCoachChips.length > 0
      ? visibleCoachChips.slice(0, 2)
      : [{ label: 'Foco', value: coachPlan.focusLabel }];
  const pressureGapLabel = formatSignedPoints(pressureInsights?.pressureGap);
  const learningAccuracyLabel = formatPercent(pressureInsights?.learningAccuracy);
  const simulacroAccuracyLabel = formatPercent(pressureInsights?.simulacroAccuracy);
  const examTargetUpdatedLabel =
    examTarget?.updatedAt
      ? formatSessionDate(examTarget.updatedAt)
      : null;
  const coverageRate =
    learningDashboard && learningDashboard.totalQuestions > 0
      ? learningDashboard.seenQuestions / learningDashboard.totalQuestions
      : 0;
  const usefulMasteryRate =
    learningDashboard && learningDashboard.seenQuestions > 0
      ? (learningDashboard.solidCount + learningDashboard.masteredCount) /
        learningDashboard.seenQuestions
      : 0;
  const fragilityRate =
    learningDashboard && learningDashboard.seenQuestions > 0
      ? learningDashboard.fragileCount / learningDashboard.seenQuestions
      : 0;
  const recentTrendItems = recentSessions
    .slice(0, 6)
    .reverse()
    .map((session, index) => {
      const accuracyRate = session.total > 0 ? session.score / session.total : 0;
      return {
        label: `S${index + 1}`,
        value: toPercentNumber(accuracyRate),
        meta: `${session.score}/${session.total}`
      };
    });
  const masterySegments = learningDashboard
    ? [
        {
          label: 'Nuevas',
          value: learningDashboard.newCount,
          className: 'bg-slate-300/95'
        },
        {
          label: 'Fragiles',
          value: learningDashboard.fragileCount,
          className: 'bg-amber-300/95'
        },
        {
          label: 'Consolidan',
          value: learningDashboard.consolidatingCount,
          className: 'bg-sky-300/95'
        },
        {
          label: 'Solidas',
          value: learningDashboard.solidCount,
          className: 'bg-indigo-300/95'
        },
        {
          label: 'Dominadas',
          value: learningDashboard.masteredCount,
          className: 'bg-emerald-300/95'
        }
      ]
    : [];
  const topWeakCategories = weakCategories.slice(0, 5);
  const pressureGapPoints =
    pressureInsights?.pressureGap === null || pressureInsights?.pressureGap === undefined
      ? null
      : Math.round(Math.abs(pressureInsights.pressureGap) * 100);
  const statsLeadLabel = pressureGapPoints && pressureGapPoints >= 12
    ? 'Presion alta'
    : (learningDashboard?.overdueCount ?? 0) > 0
      ? 'Hoy conviene consolidar'
      : 'Sistema estable';
  const statsLeadMessage =
    pressureGapPoints && pressureGapPoints >= 12
      ? `Tu rendimiento cae ${pressureGapPoints} puntos bajo presion. Conviene afinar lectura y simulacro.`
      : coachPlan.impactLabel;

  React.useEffect(() => {
    setExamDateInput(toDateInputValue(examTarget?.examDate));
    setDailyReviewCapacityInput(
      String(examTarget?.dailyReviewCapacity ?? learningDashboard?.dailyReviewCapacity ?? 35)
    );
    setDailyNewCapacityInput(
      String(examTarget?.dailyNewCapacity ?? learningDashboard?.dailyNewCapacity ?? 10)
    );
  }, [
    examTarget?.dailyNewCapacity,
    examTarget?.dailyReviewCapacity,
    examTarget?.examDate,
    learningDashboard?.dailyNewCapacity,
    learningDashboard?.dailyReviewCapacity
  ]);

  const handleExamTargetSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextDailyReviewCapacity = Math.max(
      5,
      Math.min(200, Number.parseInt(dailyReviewCapacityInput, 10) || 35)
    );
    const nextDailyNewCapacity = Math.max(
      0,
      Math.min(100, Number.parseInt(dailyNewCapacityInput, 10) || 10)
    );

    onSaveExamTarget({
      examDate: examDateInput || null,
      dailyReviewCapacity: nextDailyReviewCapacity,
      dailyNewCapacity: nextDailyNewCapacity
    });
  };

  if (activeTab === 'home') {
    return (
      <div className="grid gap-3 sm:gap-4">
        <SectionCard className="relative overflow-hidden border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#6eaee5_0%,#8aa6ee_54%,#8d96f4_100%)] p-4 text-white shadow-[0_28px_72px_-52px_rgba(141,147,242,0.24)] sm:p-5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -left-8 bottom-[-72px] h-44 w-44 rounded-full bg-sky-100/18 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.1),transparent_44%)]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.08))]" />
            <div className="absolute right-6 top-6 h-28 w-28 rounded-full border border-white/18" />
            <div className="absolute right-12 top-10 h-40 w-40 rounded-full border border-white/12" />
          </div>
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-50/88">
                  <span className="h-2 w-2 rounded-full bg-white/92 shadow-[0_0_0_4px_rgba(255,255,255,0.12)]" />
                  Hoy
                </p>
                <p className="mt-2 text-[1.68rem] font-black leading-[0.98] text-white sm:text-[2.05rem]">
                  {coachPlan.title}
                </p>
                <p className="mt-2 max-w-[28rem] text-[0.96rem] leading-6 text-sky-50/86">
                  {coachPlan.summary}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <CoachChip label="Readiness" value={readinessLabel} />
              </div>
            </div>

            <div className="mt-3 rounded-[1.32rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:mt-3.5 sm:rounded-[1.4rem] sm:p-2.5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="grid gap-3">
                <button
                  type="button"
                  onClick={onStartRecommended}
                  className="inline-flex items-center justify-between rounded-[1.28rem] border border-white/74 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(252,252,255,0.95))] px-3.5 py-3 text-left text-slate-950 shadow-[0_26px_42px_-28px_rgba(141,147,242,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_30px_46px_-28px_rgba(141,147,242,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 active:translate-y-0 active:scale-[0.995] sm:rounded-[1.35rem] sm:px-4 sm:py-3.5"
                >
                  <span>
                    <span className="inline-flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7cb6e8]" />
                      <span className="sm:hidden">Recomendado</span>
                      <span className="hidden sm:inline">Sesion recomendada</span>
                    </span>
                    <span className="mt-1 block text-[1.08rem] font-extrabold tracking-[-0.02em] sm:mt-1.5 sm:text-[1.18rem]">
                      {coachPlan.primaryActionLabel}
                    </span>
                    <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 sm:hidden">
                      {coachPlan.focusLabel}
                    </span>
                    <span className="mt-1 hidden max-w-[24rem] text-sm leading-5 text-slate-500 sm:block">
                      {coachPlan.reasons[0] ?? coachPlan.impactLabel}
                    </span>
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#c4d7fb] bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] text-white shadow-[0_16px_28px_-20px_rgba(141,147,242,0.28)] sm:h-12 sm:w-12 sm:rounded-[1.05rem]">
                    <ArrowRight size={17} className="sm:hidden" />
                    <ArrowRight size={18} className="hidden sm:block" />
                  </span>
                </button>

                <div className="grid gap-2 sm:grid-cols-2">
                  {heroStats.map((stat) => (
                    <HeroMiniStat
                      key={`${stat.label}-${stat.value}`}
                      label={stat.label}
                      value={stat.value}
                    />
                  ))}
                </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 lg:grid-cols-1">
                  <HeroCompactAction
                    label={`${recommendedToday > 0 ? recommendedToday : batchSize} hoy`}
                    title="Mixto"
                    onClick={onStartMixed}
                    icon={<Target size={18} />}
                  />
                  <HeroCompactAction
                    label="20 preguntas"
                    title="Aleatorio"
                    onClick={onStartRandom}
                    icon={<Layers3 size={18} />}
                  />
                  <HeroCompactAction
                    label="Top 5"
                    title="Falladas"
                    onClick={onStartWeakReview}
                    disabled={weakQuestions.length === 0}
                    icon={<Brain size={18} />}
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard
            title="Estado de hoy"
            hint="Solo lo que conviene mirar"
            className="p-3.5 sm:p-4"
          >
            <div className="grid gap-2.5 sm:grid-cols-3">
              <StatusStripItem label="Readiness" value={readinessLabel} />
              <StatusStripItem label="Repasos hoy" value={String(recommendedReview)} />
              <StatusStripItem label="Dominio util" value={formatPercent(usefulMasteryRate)} />
            </div>
          </SectionCard>

          <SectionCard title="Claves de hoy" hint="Dos alertas cortas" className="p-3.5 sm:p-4">
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <DailyInsightCard
                  eyebrow="Foco"
                  title={coachPlan.focusLabel}
                  message={coachPlan.reasons[0] ?? coachPlan.impactLabel}
                  icon={<Target size={18} />}
                />

                {topRiskBreakdown[0] ? (
                  <DailyInsightCard
                    eyebrow="Riesgo"
                    title={topRiskBreakdown[0].label}
                    message="Mejor limpiarlo antes de ampliar carga."
                    icon={<Shield size={18} />}
                    trailing={
                      <span className="rounded-full bg-[linear-gradient(135deg,rgba(121,182,233,0.16),rgba(138,144,244,0.18))] px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-700">
                        {topRiskBreakdown[0].count}
                      </span>
                    }
                  />
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pressureInsights ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                    Presion
                    <span className="text-sm font-black text-slate-900">{pressureGapLabel}</span>
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={onReloadQuestions}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-700 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bfd2f6] hover:bg-sky-50/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99]"
                >
                  <RotateCcw size={15} />
                  Sync
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    );
  }

  if (activeTab === 'stats') {
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AccentStatTile
            label="Readiness"
            value={readinessLabel}
            hint="Proyeccion actual"
            icon={<Target size={18} />}
          />
          <AccentStatTile
            label="Precision"
            value={`${accuracy}%`}
            hint="Rendimiento global"
            icon={<ChartNoAxesColumn size={18} />}
          />
          <AccentStatTile
            label="Dominio util"
            value={formatPercent(usefulMasteryRate)}
            hint="Solidas + dominadas"
            icon={<Shield size={18} />}
          />
        </div>

        <SectionCard title="Lectura rapida" hint="Lo importante, sin ruido">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.3rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.16)]">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                    {statsLeadLabel}
                  </p>
                  <p className="mt-2 text-[2.2rem] font-black leading-none text-slate-950">
                    {readinessLabel}
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                  {formatPercent(coverageRate)} cobertura
                </div>
              </div>
              {learningDashboard ? (
                <RangeMeter
                  current={learningDashboard.readiness}
                  lower={learningDashboard.readinessLower}
                  upper={learningDashboard.readinessUpper}
                  projected={learningDashboard.projectedReadiness}
                />
              ) : null}
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
                {statsLeadMessage}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <HomeMetric label="Cobertura" value={formatPercent(coverageRate)} />
              <HomeMetric label="Fragilidad" value={formatPercent(fragilityRate)} />
              <HomeMetric
                label="Presion"
                value={pressureGapPoints === null ? '--' : `${pressureGapPoints} pts`}
              />
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-4 xl:grid-cols-2">
          <StatsDisclosure
            title="Tendencia reciente"
            hint="Ultimos cierres para ver si subes, te estancas o te caes."
            defaultOpen
          >
            {recentTrendItems.length > 0 ? (
              <TrendBars items={recentTrendItems} />
            ) : (
              <p className="text-sm font-medium text-slate-500">
                Aun no hay sesiones suficientes para dibujar tendencia.
              </p>
            )}
          </StatsDisclosure>

          <StatsDisclosure
            title="Mapa de dominio"
            hint="Como se reparte lo que has visto hasta ahora."
          >
            {learningDashboard ? (
              <div className="space-y-4">
                <SegmentedProgressBar segments={masterySegments} />
                <div className="grid gap-2 sm:grid-cols-2">
                  {masterySegments.map((segment) => (
                    <div
                      key={segment.label}
                      className="flex items-center justify-between rounded-[1rem] bg-slate-50/90 px-3 py-2"
                    >
                      <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                        {segment.label}
                      </span>
                      <span className="text-sm font-black text-slate-900">{segment.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-500">
                Aun no hay suficiente informacion de dominio.
              </p>
            )}
          </StatsDisclosure>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <StatsDisclosure
            title="Brecha de presion"
            hint="Diferencia entre entrenar bien y rendir en examen."
          >
            {pressureInsights ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <HomeMetric label="Aprendizaje" value={learningAccuracyLabel} />
                  <HomeMetric label="Simulacro" value={simulacroAccuracyLabel} />
                  <HomeMetric label="Brecha" value={pressureGapLabel} />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      <span>Aprendizaje</span>
                      <span>{learningAccuracyLabel}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)]"
                        style={{ width: `${toPercentNumber(pressureInsights.learningAccuracy)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      <span>Simulacro</span>
                      <span>{simulacroAccuracyLabel}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#94a3b8_0%,#64748b_100%)]"
                        style={{ width: `${toPercentNumber(pressureInsights.simulacroAccuracy)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-[1rem] bg-slate-50/90 px-4 py-3">
                  <p className="text-sm font-semibold leading-6 text-slate-700">
                    {pressureInsights.pressureMessage}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-500">
                Aun no hay senal suficiente de simulacro para comparar aprendizaje y examen.
              </p>
            )}
          </StatsDisclosure>

          <StatsDisclosure
            title="Riesgo y errores"
            hint="Temas y familias donde mas se repite el desgaste."
          >
            <div className="space-y-4">
              <div className="space-y-3">
                {topWeakCategories.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500">
                    Aun no hay datos suficientes por tema.
                  </p>
                ) : (
                  topWeakCategories.map((item) => {
                    const ratio = Math.round(
                      (item.incorrectAttempts / Math.max(item.attempts, 1)) * 100
                    );
                    return (
                      <div
                        key={item.category}
                        className="rounded-[1.12rem] border border-white/85 bg-white/90 px-4 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-extrabold text-slate-900">{item.category}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              {item.incorrectAttempts} fallos de {item.attempts}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-700">
                            {ratio}%
                          </span>
                        </div>
                        <div className="mt-3 h-2.5 rounded-full bg-slate-100">
                          <div
                            className="h-2.5 rounded-full bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)]"
                            style={{ width: `${Math.min(100, ratio)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {topRiskBreakdown.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500 sm:col-span-3">
                    Aun no hay patron suficiente para clasificar errores.
                  </p>
                ) : (
                  topRiskBreakdown.map((risk) => (
                    <div
                      key={risk.errorType}
                      className="rounded-[1rem] bg-slate-50/90 px-3 py-3 text-center"
                    >
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                        {risk.label}
                      </p>
                      <p className="mt-2 text-lg font-black text-slate-900">{risk.count}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </StatsDisclosure>
        </div>

        <StatsDisclosure
          title="Sesiones recientes"
          hint="Ultimos cierres para revisar score y ritmo sin saturar la pantalla."
        >
          <div className="space-y-3">
            {recentSessions.length ? (
              recentSessions.slice(0, 5).map((session) => (
                <article
                  key={session.id}
                  className="rounded-[1.12rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{session.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatSessionDate(session.finishedAt)}
                      </p>
                    </div>
                    <div className="rounded-[1.05rem] border border-[#bfd2f6] bg-[linear-gradient(135deg,rgba(121,182,233,0.16),rgba(138,144,244,0.18))] px-3 py-2 text-right">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                        Score
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-950">
                        {session.score}
                        <span className="text-sm text-slate-400"> / {session.total}</span>
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm font-medium text-slate-500">
                Todavia no hay sesiones guardadas.
              </p>
            )}
          </div>
        </StatsDisclosure>
      </div>
    );
  }

  if (activeTab === 'study') {
    return (
      <div className="grid gap-4">
        <SectionCard title="Modos de estudio" hint="Elige como quieres practicar hoy">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StudyModeCard
              label="Plan del dia"
              title="Mixto adaptativo"
              description={
                learningDashboard
                  ? `${recommendedReview} repasos y ${recommendedNew} nuevas sugeridas hoy.`
                  : 'Combina repaso, fragiles y nuevas en una sola sesion.'
              }
              icon={<Target size={18} />}
              onClick={onStartMixed}
              tone="primary"
            />
            <StudyModeCard
              label="Repaso"
              title="Top 5 falladas"
              description="Ataca las preguntas que mas castigan tu precision."
              icon={<Flame size={18} />}
              onClick={onStartWeakReview}
              disabled={weakQuestions.length === 0}
            />
            <StudyModeCard
              label="Secuencial"
              title="Bloque 1"
              description="Reinicia el recorrido desde el inicio del banco."
              icon={<Layers3 size={18} />}
              onClick={onStartFromBeginning}
            />
            <StudyModeCard
              label="Aleatorio"
              title="20 mezcladas"
              description="Mide recuperacion real con mezcla completa."
              icon={<Brain size={18} />}
              onClick={onStartRandom}
            />
            <StudyModeCard
              label="Anti-trampas"
              title="Plazos y excepciones"
              description="Entrena negaciones, plazos, literalidad y distractores cercanos."
              icon={<Shield size={18} />}
              onClick={onStartAntiTrap}
            />
            <StudyModeCard
              label="Simulacro"
              title="Examen en tiempo real"
              description="Sin correccion inmediata y con temporizador global para medir rendimiento real."
              icon={<ChartNoAxesColumn size={18} />}
              onClick={onStartSimulacro}
            />
          </div>
        </SectionCard>

        {learningDashboard ? (
          <SectionCard title="Carga recomendada" hint="Lo mas rentable para hoy">
            <div className="grid gap-3 sm:grid-cols-3">
              <HomeMetric label="Repasos" value={String(recommendedReview)} />
              <HomeMetric label="Nuevas" value={String(recommendedNew)} />
              <HomeMetric
                label="Capacidad"
                value={String(learningDashboard.dailyReviewCapacity)}
              />
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title="Preguntas mas falladas" hint="Donde mas valor tiene insistir">
          <div className="space-y-3">
            {weakQuestions.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">
                Todavia no hay preguntas marcadas como debiles.
              </p>
            ) : (
              weakQuestions.map(({ question, stat }, index) => (
                <details
                  key={question.id}
                  className="rounded-[1.3rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)]"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
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
                  </summary>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[1.2rem] bg-[linear-gradient(180deg,rgba(236,246,255,0.9),rgba(241,247,255,0.92))] px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                        Respuesta correcta
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {question.correctOption.toUpperCase()}){' '}
                        {question.options[question.correctOption]}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] bg-[linear-gradient(180deg,rgba(232,240,255,0.92),rgba(241,247,255,0.92))] px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">
                        Explicacion
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {question.explanation || 'Sin explicacion disponible.'}
                      </p>
                    </div>
                  </div>
                </details>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4">
      <SectionCard className="relative overflow-hidden border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#79b6e9_0%,#8aa6ee_56%,#8a90f4_100%)] p-4 text-white shadow-[0_28px_72px_-52px_rgba(141,147,242,0.24)] sm:p-5">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/16 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_44%)]" />
        </div>
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-white/18 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-[10px] sm:h-14 sm:w-14 sm:rounded-[1.35rem]">
              <UserRound size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-50/84">
                Cuenta activa
              </p>
              <p className="mt-1.5 text-[1.45rem] font-black leading-none text-white sm:mt-2 sm:text-[1.7rem]">
                {identity.current_username}
              </p>
              <p className="mt-1.5 text-sm font-medium text-sky-50/84 sm:mt-2">
                Perfil {identity.is_admin ? 'administrador' : 'alumno'}
              </p>
            </div>
          </div>
          <div className="rounded-[1.15rem] border border-white/18 bg-white/12 px-3 py-2 text-right backdrop-blur-[10px]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-50/74">
              Rol
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {identity.is_admin ? 'Admin' : 'Alumno'}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Panel de cuenta" hint="Resumen rapido del perfil">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <StatusStripItem label="Rol" value={identity.is_admin ? 'Admin' : 'Alumno'} />
          <StatusStripItem label="Banco" value={String(questionsCount)} />
          <StatusStripItem label="Bloques" value={String(totalBatches)} />
          <StatusStripItem label="Tamano" value={String(batchSize)} />
          {learningDashboard ? (
            <>
              <StatusStripItem label="Readiness" value={readinessLabel} />
              <StatusStripItem
                label="Capacidad"
                value={String(learningDashboard.dailyReviewCapacity)}
              />
            </>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
          <StatsDisclosure
            title="Configuracion de examen"
            hint={
              examTargetUpdatedLabel
                ? `Ultima actualizacion ${examTargetUpdatedLabel}`
                : 'Ajusta fecha y carga diaria solo cuando lo necesites.'
            }
          >
            <form onSubmit={handleExamTargetSubmit} className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                    Fecha de examen
                  </span>
                  <input
                    type="date"
                    value={examDateInput}
                    onChange={(event) => setExamDateInput(event.target.value)}
                    className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)] outline-none transition focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                    Repasos diarios
                  </span>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    step={1}
                    value={dailyReviewCapacityInput}
                    onChange={(event) => setDailyReviewCapacityInput(event.target.value)}
                    className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)] outline-none transition focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                    Nuevas al dia
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={dailyNewCapacityInput}
                    onChange={(event) => setDailyNewCapacityInput(event.target.value)}
                    className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)] outline-none transition focus:border-[#bfd2f6] focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </div>

              {examTargetError ? (
                <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  {examTargetError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold leading-5 text-slate-400">
                  Sin fecha, el sistema sigue guiando el estudio pero sin compresion por examen.
                </p>
                <button
                  type="submit"
                  disabled={savingExamTarget}
                  className="inline-flex items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] px-4 py-3 text-sm font-extrabold text-white shadow-[0_18px_30px_-24px_rgba(141,147,242,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_34px_-24px_rgba(141,147,242,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                >
                  {savingExamTarget ? 'Guardando...' : 'Guardar configuracion'}
                </button>
              </div>
            </form>
          </StatsDisclosure>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 rounded-[1rem] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,245,247,0.94))] px-4 py-3 text-sm font-extrabold text-rose-700 shadow-[0_18px_34px_-28px_rgba(244,114,182,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,242,246,0.96))] hover:shadow-[0_24px_38px_-30px_rgba(244,114,182,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-100 active:translate-y-0 active:scale-[0.995]"
          >
            <LogOut size={16} />
            Cerrar sesion
          </button>
        </div>
      </SectionCard>

      {identity.is_admin ? (
        <SectionCard title="Panel admin" hint="Abre la gestion solo cuando la necesites">
          <StatsDisclosure
            title="Gestion de alumnos"
            hint="La administracion ya no ocupa toda la pantalla del perfil."
          >
            <div className="rounded-[1.25rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] p-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)]">
              <Suspense
                fallback={
                  <p className="text-sm font-medium text-slate-500">
                    Cargando panel de administracion...
                  </p>
                }
              >
                <AdminConsoleScreen />
              </Suspense>
            </div>
          </StatsDisclosure>
        </SectionCard>
      ) : null}
    </div>
  );
};

export default DashboardScreen;
