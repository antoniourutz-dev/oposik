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
import { SIMULACRO_BATCH_SIZE } from '../practiceConfig';
import QuestionExplanation from './QuestionExplanation';

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

const formatOptionalPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? '--' : formatPercent(value);

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
  caption?: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}> = ({ icon, label, title, caption, onClick, disabled, accent = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group inline-flex h-full min-h-[8.65rem] w-full flex-col justify-between rounded-[1.1rem] border px-3 py-3 text-left text-slate-950 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.99] disabled:opacity-45 disabled:hover:translate-y-0 ${
      accent
        ? 'border-[#c8d8fb] bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(236,244,255,0.95))] shadow-[0_18px_34px_-24px_rgba(141,147,242,0.22)] hover:border-[#b8cff8] hover:shadow-[0_20px_36px_-22px_rgba(141,147,242,0.24)]'
        : 'border-slate-100/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] shadow-[0_16px_28px_-24px_rgba(15,23,42,0.14)] hover:border-[#bfd2f6] hover:shadow-[0_18px_30px_-22px_rgba(141,147,242,0.18)]'
    }`}
  >
    <span className="flex w-full items-start justify-between gap-2">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] border text-slate-700 ${
          accent
            ? 'border-[#c6d7fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.2),rgba(141,147,242,0.24))] text-slate-800'
            : 'border-[#d7e4fb] bg-[linear-gradient(135deg,rgba(121,182,233,0.14),rgba(141,147,242,0.16))]'
        }`}
      >
        {icon}
      </span>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
          accent
            ? 'border-[#c6d7fb] bg-white/92 text-slate-700 shadow-[0_12px_24px_-18px_rgba(141,147,242,0.3)]'
            : 'border-slate-200/90 bg-slate-50/90 text-slate-500'
        }`}
      >
        <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </span>
    <span className="mt-3 min-w-0">
      <span className="block text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <span className="mt-1.5 block text-[0.96rem] font-black leading-[1.05] text-slate-950 sm:text-[1rem]">
        {title}
      </span>
      {caption ? (
        <span className="mt-1.75 block text-[11px] font-semibold leading-4 text-slate-500">
          {caption}
        </span>
      ) : null}
    </span>
  </button>
);

const CoachChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
    <span className="text-white/62">{label}</span>
    <span className="text-[0.9rem] font-black text-white">{value}</span>
  </span>
);

const HeroMiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[0.98rem] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.07))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
    <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-sky-50/68">{label}</p>
    <p className="mt-1 text-[1.02rem] font-black leading-none text-white">{value}</p>
  </div>
);

const StatusStripItem: React.FC<{
  label: string;
  value: string;
  caption?: string;
  accent?: boolean;
}> = ({ label, value, caption, accent = false }) => (
  <div
    className={`h-full rounded-[1rem] border px-3 py-2.5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)] ${
      accent
        ? 'border-[#d2defb] bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(237,245,255,0.94))]'
        : 'border-slate-100/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))]'
    }`}
  >
    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-1.5 text-[1.15rem] font-black leading-none text-slate-950 sm:text-[1.22rem]">
      {value}
    </p>
    {caption ? <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-400">{caption}</p> : null}
  </div>
);

const AnalyticsMiniTile: React.FC<{
  label: string;
  value: string;
  caption?: string;
  accent?: boolean;
}> = ({ label, value, caption, accent = false }) => (
  <div
    className={`rounded-[1.08rem] border px-3 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)] ${
      accent
        ? 'border-[#c8d8f8] bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(237,245,255,0.94))]'
        : 'border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))]'
    }`}
  >
    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-1.5 text-[1.35rem] font-black leading-none text-slate-950">{value}</p>
    {caption ? <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">{caption}</p> : null}
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

const CircularStat: React.FC<{
  label: string;
  value: number | null | undefined;
  valueText: string;
  caption: string;
  tone?: 'primary' | 'secondary';
}> = ({ label, value, valueText, caption, tone = 'primary' }) => {
  const gradientId = React.useId();
  const percent = toPercentNumber(value);
  const size = 116;
  const stroke = 9;
  const radius = size / 2 - stroke - 4;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;
  const gradientStops =
    tone === 'secondary'
      ? ['#bfdbfe', '#7cb6e8', '#5b8fe5']
      : ['#7cb6e8', '#8aa6ee', '#8d93f2'];

  return (
    <div className="rounded-[1.35rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.16)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">{valueText}</p>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">{caption}</p>
        </div>
        <div className="relative flex h-[7.25rem] w-[7.25rem] items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradientStops[0]} />
                <stop offset="55%" stopColor={gradientStops[1]} />
                <stop offset="100%" stopColor={gradientStops[2]} />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(226,232,240,0.95)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-[22px] flex items-center justify-center rounded-full border border-slate-100 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <span className="text-lg font-black tracking-[-0.04em] text-slate-950">{valueText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RankedMeterRow: React.FC<{
  label: string;
  detail: string;
  value: number;
  valueLabel: string;
  maxValue?: number;
  tone?: 'primary' | 'secondary';
}> = ({ label, detail, value, valueLabel, maxValue = 100, tone = 'primary' }) => {
  const width = maxValue <= 0 ? 0 : Math.max(8, Math.min(100, (value / maxValue) * 100));
  const barClassName =
    tone === 'secondary'
      ? 'bg-[linear-gradient(90deg,#cbd5e1_0%,#94a3b8_100%)]'
      : 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)]';

  return (
    <div className="rounded-[1.08rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.92))] px-4 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-900">{label}</p>
          <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            {detail}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-700">
          {valueLabel}
        </span>
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-slate-100">
        <div className={`h-2.5 rounded-full ${barClassName}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const SparklineChart: React.FC<{
  items: Array<{ label: string; value: number; meta: string }>;
}> = ({ items }) => {
  const width = 420;
  const height = 190;
  const paddingX = 18;
  const paddingY = 22;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const lastIndex = Math.max(items.length - 1, 1);
  const gradientId = React.useId();
  const areaId = React.useId();
  const points = items.map((item, index) => {
    const x = paddingX + (chartWidth * index) / lastIndex;
    const y = paddingY + chartHeight - (Math.max(0, Math.min(100, item.value)) / 100) * chartHeight;

    return { ...item, x, y };
  });

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = points.length
    ? `${path} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div className="rounded-[1.2rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.9))] px-3 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7cb6e8" />
            <stop offset="100%" stopColor="#8d93f2" />
          </linearGradient>
          <linearGradient id={areaId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(124,182,232,0.22)" />
            <stop offset="100%" stopColor="rgba(141,147,242,0.02)" />
          </linearGradient>
        </defs>

        {[25, 50, 75].map((tick) => {
          const y = paddingY + chartHeight - (tick / 100) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.18)"
                strokeDasharray="4 6"
              />
              <text x={4} y={y + 4} fontSize="10" fontWeight="800" fill="rgba(100,116,139,0.7)">
                {tick}
              </text>
            </g>
          );
        })}

        {points.length > 0 ? <path d={areaPath} fill={`url(#${areaId})`} /> : null}
        {points.length > 0 ? (
          <path
            d={path}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5.5" fill="white" stroke={`url(#${gradientId})`} strokeWidth="3" />
            <text
              x={point.x}
              y={height - 2}
              textAnchor="middle"
              fontSize="10"
              fontWeight="800"
              fill="rgba(100,116,139,0.82)"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

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
    <div className="rounded-[1.18rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(242,247,255,0.92))] px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)] sm:px-4">
      <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <span className="h-2 w-2 rounded-full bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)]" />
          actual
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,rgba(125,211,252,0.5),rgba(165,180,252,0.55))]" />
          rango
        </span>
        {projectedPercent !== null ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <span className="h-3 w-[2px] rounded-full bg-slate-900/70" />
            proyeccion
          </span>
        ) : null}
      </div>

      <div className="relative h-4 overflow-hidden rounded-full border border-white/82 bg-[linear-gradient(180deg,rgba(241,245,249,0.95),rgba(226,232,240,0.85))] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
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

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-[0.95rem] bg-white/78 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Actual</p>
          <p className="mt-1 text-sm font-black text-slate-950">{currentPercent}%</p>
        </div>
        <div className="rounded-[0.95rem] bg-white/78 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Rango</p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {lowerPercent}% - {upperPercent}%
          </p>
        </div>
        {projectedPercent !== null ? (
          <div className="rounded-[0.95rem] bg-white/78 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Proyeccion</p>
            <p className="mt-1 text-sm font-black text-slate-950">{projectedPercent}%</p>
          </div>
        ) : (
          <div className="rounded-[0.95rem] bg-white/78 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Proyeccion</p>
            <p className="mt-1 text-sm font-black text-slate-950">--</p>
          </div>
        )}
      </div>
    </div>
  );
};

const PressureComparisonMeter: React.FC<{
  learning: number | null | undefined;
  simulacro: number | null | undefined;
  gapLabel: string;
}> = ({ learning, simulacro, gapLabel }) => {
  const learningPercent = toPercentNumber(learning);
  const simulacroPercent = toPercentNumber(simulacro);
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="rounded-[1.18rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(242,247,255,0.92))] px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)] sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
          Comparativa directa
        </p>
        <span className="rounded-full bg-white/82 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          Brecha {gapLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-[4.9rem_minmax(0,1fr)_2.8rem] items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
          <span />
          <div className="grid grid-cols-5">
            {ticks.map((tick) => (
              <span key={tick} className="text-center">
                {tick}
              </span>
            ))}
          </div>
          <span />
        </div>

        {[
          {
            label: 'Aprendizaje',
            value: learningPercent,
            gradient:
              'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)]',
            valueClass: 'text-slate-950'
          },
          {
            label: 'Simulacro',
            value: simulacroPercent,
            gradient:
              'bg-[linear-gradient(90deg,#94a3b8_0%,#64748b_100%)]',
            valueClass: 'text-slate-700'
          }
        ].map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[4.9rem_minmax(0,1fr)_2.8rem] items-center gap-2"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
              {row.label}
            </span>
            <div className="relative h-3.5 overflow-hidden rounded-full bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              <div
                className={`h-full rounded-full ${row.gradient}`}
                style={{ width: `${row.value}%` }}
              />
            </div>
            <span className={`text-right text-sm font-black ${row.valueClass}`}>{row.value}%</span>
          </div>
        ))}
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

const StudyActionCard: React.FC<{
  label: string;
  title: string;
  description: string;
  meta: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'default';
}> = ({ label, title, description, meta, icon, onClick, disabled, tone = 'default' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`rounded-[1.22rem] border px-4 py-3.5 text-left shadow-[0_18px_32px_-26px_rgba(141,147,242,0.16)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80 active:translate-y-0 active:scale-[0.99] disabled:opacity-45 disabled:hover:translate-y-0 ${
      tone === 'primary'
        ? 'border-[#bfd2f6] bg-[linear-gradient(135deg,rgba(121,182,233,0.18),rgba(138,144,244,0.22))] text-slate-900 hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-26px_rgba(141,147,242,0.2)]'
        : 'border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.92))] text-slate-900 hover:-translate-y-0.5 hover:border-[#c8d8f8] hover:shadow-[0_24px_40px_-26px_rgba(141,147,242,0.16)]'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-2 text-base font-extrabold leading-5 text-slate-950">{title}</p>
        <p className="mt-1.5 text-sm leading-5 text-slate-500">{description}</p>
      </div>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] ${
          tone === 'primary'
            ? 'bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] text-white shadow-[0_14px_24px_-18px_rgba(141,147,242,0.3)]'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {icon}
      </span>
    </div>
    <div className="mt-3 flex items-center justify-between gap-3">
      <span className="rounded-full bg-white/78 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        {meta}
      </span>
      <ArrowRight size={16} className="text-slate-500" />
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
  const pressureGapLabel = formatSignedPoints(pressureInsights?.pressureGap);
  const learningAccuracyLabel = formatOptionalPercent(pressureInsights?.learningAccuracy);
  const simulacroAccuracyLabel = formatOptionalPercent(pressureInsights?.simulacroAccuracy);
  const recommendedSessionSize =
    coachPlan.mode === 'simulacro' ? SIMULACRO_BATCH_SIZE : batchSize;
  const weakReviewSlotCount = Math.min(weakQuestions.length, 5);
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
  const primaryCtaDetail =
    coachPlan.mode === 'mixed' && (recommendedReview > 0 || recommendedNew > 0)
      ? `${recommendedReview} repasos + ${recommendedNew} nuevas con mezcla controlada.`
      : coachPlan.mode === 'simulacro'
        ? 'Presion real, sin correccion inmediata y con tiempo global.'
        : coachPlan.mode === 'anti_trap'
          ? 'Afina lectura, negaciones, plazos y distractores cercanos.'
          : coachPlan.mode === 'random'
            ? 'Mide recuperacion real sin orden previsible.'
            : studyFocusLine;
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
  const readinessRangeLabel =
    learningDashboard?.readinessLower === null ||
    learningDashboard?.readinessLower === undefined ||
    learningDashboard?.readinessUpper === null ||
    learningDashboard?.readinessUpper === undefined
      ? 'Rango pendiente'
      : `${formatPercent(learningDashboard.readinessLower)} - ${formatPercent(learningDashboard.readinessUpper)}`;
  const projectedReadinessLabel =
    learningDashboard?.projectedReadiness === null || learningDashboard?.projectedReadiness === undefined
      ? 'Sin fecha objetivo'
      : formatPercent(learningDashboard.projectedReadiness);
  const overconfidenceLabel = formatOptionalPercent(pressureInsights?.overconfidenceRate);
  const fatigueLabel = formatOptionalPercent(pressureInsights?.avgSimulacroFatigue);
  const lastSimulacroLabel = pressureInsights?.lastSimulacroFinishedAt
    ? formatSessionDate(pressureInsights.lastSimulacroFinishedAt)
    : 'Sin simulacro';
  const masteryBase = Math.max(learningDashboard?.totalQuestions ?? questionsCount ?? 0, 1);
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
    recentTrendItems.length > 0
      ? Math.max(...recentTrendItems.map((item) => item.value))
      : null;
  const trendSpreadValue =
    recentTrendItems.length > 0
      ? Math.max(...recentTrendItems.map((item) => item.value)) -
        Math.min(...recentTrendItems.map((item) => item.value))
      : null;
  const riskBreakdownTotal = topRiskBreakdown.reduce((total, risk) => total + risk.count, 0);
  const maxWeakCategoryRatio = topWeakCategories.reduce((max, item) => {
    const ratio = Math.round((item.incorrectAttempts / Math.max(item.attempts, 1)) * 100);
    return Math.max(max, ratio);
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
  const studyPrimarySummary = learningDashboard
    ? `${recommendedReview} repasos y ${recommendedNew} nuevas para sostener progreso sin ruido.`
    : 'Combina repaso, fragiles y nuevas en una sola sesion adaptativa.';
  const studyFocusLine =
    topRiskBreakdown[0]?.label
      ? `Vigila ${topRiskBreakdown[0].label.toLowerCase()} antes de ampliar carga.`
      : coachPlan.reasons[0] ?? coachPlan.impactLabel;
  const weakQuestionsVisible = weakQuestions.slice(0, 4);
  const statsLeadLabel = pressureGapPoints && pressureGapPoints >= 12
    ? 'Presion alta'
    : (learningDashboard?.overdueCount ?? 0) > 0
      ? 'Hoy conviene consolidar'
      : 'Sistema estable';
  const statsLeadMessage =
    pressureGapPoints && pressureGapPoints >= 12
      ? `Tu rendimiento cae ${pressureGapPoints} puntos bajo presion. Conviene afinar lectura y simulacro.`
      : coachPlan.impactLabel;
  const statsLeadCompactMessage =
    pressureGapPoints && pressureGapPoints >= 12
      ? 'Conviene afinar lectura y simulacro.'
      : coachPlan.reasons[0] ?? coachPlan.focusLabel;

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
        <SectionCard className="relative overflow-hidden border-[#bdd3f1]/60 bg-[linear-gradient(135deg,#6eaee5_0%,#8aa6ee_54%,#8d96f4_100%)] p-3.25 text-white shadow-[0_24px_60px_-44px_rgba(141,147,242,0.22)] sm:p-4.25">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/18 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
            <div className="absolute right-5 top-5 h-28 w-28 rounded-full border border-white/14" />
          </div>
          <div className="relative grid gap-2.5 sm:gap-3">
            <div className="flex items-start justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-50/88">
                  <span className="h-2 w-2 rounded-full bg-white/92 shadow-[0_0_0_4px_rgba(255,255,255,0.12)]" />
                  Hoy
                </p>
                <p className="mt-1.5 max-w-[13.2rem] text-[1.56rem] font-black leading-[0.96] tracking-[-0.04em] text-white sm:max-w-[17rem] sm:text-[1.92rem]">
                  {coachPlan.title}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <CoachChip label="Readiness" value={readinessLabel} />
              </div>
            </div>

            <div className="grid max-w-[28.5rem] gap-2.25 sm:gap-2.5">
              <p className="max-w-[24rem] text-[0.92rem] font-medium leading-5.5 text-sky-50/84 sm:text-[0.95rem] sm:leading-6">
                {studyPrimarySummary}
              </p>

              <button
                type="button"
                onClick={onStartRecommended}
                className="group grid grid-cols-[minmax(0,1fr)_3.55rem] items-stretch gap-3 rounded-[1.2rem] border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(252,252,255,0.96))] px-3.5 py-3 text-left text-slate-950 shadow-[0_24px_38px_-28px_rgba(141,147,242,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_42px_-28px_rgba(141,147,242,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 active:translate-y-0 active:scale-[0.995] sm:grid-cols-[minmax(0,1fr)_4rem] sm:rounded-[1.26rem] sm:px-4 sm:py-3.25"
              >
                <span className="min-w-0 self-center">
                  <span className="inline-flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7cb6e8]" />
                    Accion recomendada
                  </span>
                  <span className="mt-1 block text-[1.16rem] font-black leading-[1.01] tracking-[-0.035em] text-slate-950 sm:mt-1.25 sm:text-[1.24rem]">
                    {primaryCtaCommand}
                  </span>
                  <span className="mt-1.75 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-600 sm:text-[10px]">
                      {recommendedSessionSize} preguntas
                    </span>
                    <span className="rounded-full bg-[linear-gradient(135deg,rgba(121,182,233,0.12),rgba(141,147,242,0.14))] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-700 sm:text-[10px]">
                      {primaryCtaMetaLabel}
                    </span>
                  </span>
                  <span className="mt-1.75 block max-w-[22.5rem] text-[12px] leading-5 text-slate-500 sm:text-sm">
                    {primaryCtaDetail}
                  </span>
                </span>
                <span className="flex flex-col items-center justify-center gap-1 rounded-[0.98rem] border border-[#c4d7fb] bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] text-white shadow-[0_16px_28px_-20px_rgba(141,147,242,0.28)] transition-transform duration-200 group-hover:translate-x-0.5 sm:rounded-[1.02rem]">
                  <ArrowRight size={17} className="sm:hidden" />
                  <ArrowRight size={18} className="hidden sm:block" />
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-white/84 sm:text-[9px]">
                    Ir
                  </span>
                </span>
              </button>

              <div className="grid max-w-[18.5rem] grid-cols-2 gap-2">
                <HeroMiniStat label="Repasos hoy" value={String(recommendedReview)} />
                <HeroMiniStat label="Nuevas hoy" value={String(recommendedNew)} />
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-[1.14fr_0.93fr_0.93fr] gap-2.5">
          <HeroCompactAction
            label={recommendedToday > 0 ? 'sesion del dia' : 'ruta adaptativa'}
            title="Mixto"
            caption={`${recommendedSessionSize} preguntas con mezcla util`}
            onClick={onStartMixed}
            icon={<Target size={18} />}
            accent
          />
          <HeroCompactAction
            label={`${batchSize} preguntas`}
            title="Aleatorio"
            caption="recuerdo sin patron"
            onClick={onStartRandom}
            icon={<Layers3 size={18} />}
          />
          <HeroCompactAction
            label={weakReviewSlotCount > 0 ? `Top ${weakReviewSlotCount}` : 'sin deuda'}
            title="Falladas"
            caption={
              weakReviewSlotCount > 0 ? 'limpiar errores caros' : 'sin foco critico'
            }
            onClick={onStartWeakReview}
            disabled={weakQuestions.length === 0}
            icon={<Brain size={18} />}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard
            title="Estado de hoy"
            hint="Solo lo que conviene mirar"
            className="p-3 sm:p-4"
          >
            <div className="grid grid-cols-3 gap-2">
              <StatusStripItem
                label="Precision"
                value={`${accuracy}%`}
                caption="rendimiento actual"
                accent
              />
              <StatusStripItem
                label="Cobertura"
                value={formatPercent(coverageRate)}
                caption="banco visto"
              />
              <StatusStripItem
                label="Dominio util"
                value={formatPercent(usefulMasteryRate)}
                caption="memoria estable"
              />
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
      <div className="grid gap-3 sm:gap-4">
        <SectionCard title="Panel de rendimiento" hint="Lectura matematica del avance real, sin ruido innecesario">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(17rem,0.92fr)]">
            <div className="grid gap-4">
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(237,245,255,0.94))] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                    {statsLeadLabel}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                    Rango {readinessRangeLabel}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                    Proyeccion {projectedReadinessLabel}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-[2.35rem] font-black leading-none tracking-[-0.05em] text-slate-950">
                    {readinessLabel}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 sm:hidden">
                    {statsLeadCompactMessage}
                  </p>
                  <p className="mt-2 hidden max-w-[38rem] text-sm font-semibold leading-6 text-slate-600 sm:block">
                    {statsLeadMessage}
                  </p>
                </div>
              </div>

              {learningDashboard ? (
                <RangeMeter
                  current={learningDashboard.readiness}
                  lower={learningDashboard.readinessLower}
                  upper={learningDashboard.readinessUpper}
                  projected={learningDashboard.projectedReadiness}
                />
              ) : (
                <p className="text-sm font-medium text-slate-500">
                  Aun no hay base suficiente para proyectar readiness.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <AnalyticsMiniTile
                  label="Cobertura"
                  value={formatPercent(coverageRate)}
                  caption={
                    learningDashboard
                      ? `${learningDashboard.seenQuestions} de ${learningDashboard.totalQuestions}`
                      : 'Banco sin muestra'
                  }
                />
                <AnalyticsMiniTile
                  label="Precision"
                  value={`${accuracy}%`}
                  caption="rendimiento global"
                />
                <AnalyticsMiniTile
                  label="Dominio util"
                  value={formatPercent(usefulMasteryRate)}
                  caption={
                    learningDashboard
                      ? `${learningDashboard.solidCount + learningDashboard.masteredCount} preguntas`
                      : 'sin muestra'
                  }
                  accent
                />
                <AnalyticsMiniTile
                  label="Backlog"
                  value={learningDashboard ? String(learningDashboard.backlogCount) : '--'}
                  caption={
                    learningDashboard
                      ? `${learningDashboard.overdueCount} urgentes`
                      : 'sin carga vencida'
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <CircularStat
                label="Readiness"
                value={learningDashboard?.readiness}
                valueText={readinessLabel}
                caption={
                  learningDashboard?.projectedReadiness === null ||
                  learningDashboard?.projectedReadiness === undefined
                    ? 'sin fecha objetivo'
                    : `proyeccion ${formatPercent(learningDashboard.projectedReadiness)}`
                }
              />
              <CircularStat
                label="Cobertura"
                value={coverageRate}
                valueText={formatPercent(coverageRate)}
                caption={
                  learningDashboard
                    ? `${learningDashboard.seenQuestions} vistas`
                    : 'sin muestra suficiente'
                }
                tone="secondary"
              />
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
          <SectionCard title="Dominio del banco" hint="Distribucion real y carga de mantenimiento">
            {learningDashboard ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
                <div className="grid gap-4">
                  <SegmentedProgressBar segments={masterySegments} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {masterySegments.map((segment) => (
                      <div
                        key={segment.label}
                        className="rounded-[1rem] border border-slate-100/85 bg-slate-50/90 px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${segment.className}`} />
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                              {segment.label}
                            </span>
                          </div>
                          <span className="text-sm font-black text-slate-950">{segment.value}</span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-400">
                          {Math.round((segment.value / masteryBase) * 100)}% del banco
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <AnalyticsMiniTile
                    label="Banco visto"
                    value={String(learningDashboard.seenQuestions)}
                    caption={`de ${learningDashboard.totalQuestions}`}
                  />
                  <AnalyticsMiniTile
                    label="Fragiles"
                    value={String(learningDashboard.fragileCount)}
                    caption={formatPercent(fragilityRate)}
                  />
                  <AnalyticsMiniTile
                    label="Repaso hoy"
                    value={String(recommendedReview)}
                    caption={`${learningDashboard.dailyReviewCapacity} de capacidad`}
                  />
                  <AnalyticsMiniTile
                    label="Nuevas hoy"
                    value={String(recommendedNew)}
                    caption={`${learningDashboard.dailyNewCapacity} objetivo`}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-500">
                Aun no hay suficiente informacion de dominio.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Presion de examen" hint="Distancia entre entrenar bien y sostener nota bajo tiempo">
            {pressureInsights ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                  <AnalyticsMiniTile
                    label="Aprendizaje"
                    value={learningAccuracyLabel}
                    caption="entrenamiento guiado"
                    accent
                  />
                  <AnalyticsMiniTile
                    label="Simulacro"
                    value={simulacroAccuracyLabel}
                    caption={lastSimulacroLabel}
                  />
                  <AnalyticsMiniTile
                    label="Brecha"
                    value={pressureGapLabel}
                    caption="caida bajo presion"
                  />
                </div>

                <PressureComparisonMeter
                  learning={pressureInsights.learningAccuracy}
                  simulacro={pressureInsights.simulacroAccuracy}
                  gapLabel={pressureGapLabel}
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <AnalyticsMiniTile label="Fatiga" value={fatigueLabel} caption="caida media por simulacro" />
                  <AnalyticsMiniTile
                    label="Sobreconfianza"
                    value={overconfidenceLabel}
                    caption="fallos rapidos o cambios a peor"
                  />
                </div>

                <div className="rounded-[1.05rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(242,247,255,0.92))] px-4 py-3">
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
          </SectionCard>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SectionCard title="Tendencia reciente" hint="Serie corta para ver deriva, consistencia y ritmo real">
            {recentTrendItems.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(15rem,0.96fr)]">
                <div className="space-y-3">
                  <SparklineChart items={recentTrendItems} />
                  <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                    <AnalyticsMiniTile
                      label="Ultimo"
                      value={latestTrendValue === null ? '--' : `${latestTrendValue}%`}
                      caption="cierre mas reciente"
                      accent
                    />
                    <AnalyticsMiniTile
                      label="Delta"
                      value={trendDeltaLabel}
                      caption="contra el primer cierre"
                    />
                    <AnalyticsMiniTile
                      label="Media"
                      value={recentAverageLabel.replace(' media', '')}
                      caption={`${recentTrendItems.length} cierres`}
                    />
                    <AnalyticsMiniTile
                      label="Dispersión"
                      value={trendSpreadValue === null ? '--' : `${trendSpreadValue} pts`}
                      caption={trendPeakValue === null ? 'sin muestra' : `pico ${trendPeakValue}%`}
                    />
                  </div>
                </div>

                <div className="rounded-[1.18rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(242,247,255,0.92))] px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                      Ultimos cierres
                    </p>
                    <span className="rounded-full bg-white/82 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      {recentTrendItems.length} muestras
                    </span>
                  </div>
                  <div className="space-y-2">
                  {recentSessions.slice(0, 5).map((session) => (
                    <article
                      key={session.id}
                      className="rounded-[1rem] border border-white/85 bg-white/88 px-3 py-2.5 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.12)]"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-900">{session.title}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {formatSessionDate(session.finishedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-black leading-none text-slate-950">
                              {Math.round((session.score / Math.max(session.total, 1)) * 100)}%
                            </p>
                            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                              {session.score}/{session.total}
                            </p>
                          </div>
                          <div className="h-9 w-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="w-full rounded-full bg-[linear-gradient(180deg,#7cb6e8_0%,#8d93f2_100%)]"
                              style={{
                                height: `${Math.max(
                                  10,
                                  Math.round((session.score / Math.max(session.total, 1)) * 100)
                                )}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-500">
                Aun no hay sesiones suficientes para dibujar tendencia.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Riesgo y errores" hint="Mapa de erosion de la nota por tema y patron de fallo">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <AnalyticsMiniTile
                  label="Tema critico"
                  value={maxWeakCategoryRatio === 0 ? '--' : `${maxWeakCategoryRatio}%`}
                  caption={topWeakCategories[0] ? hottestCategoryLabel : 'sin muestra'}
                  accent
                />
                <AnalyticsMiniTile
                  label="Patron dominante"
                  value={topRiskBreakdown[0] ? String(topRiskBreakdown[0].count) : '--'}
                  caption={dominantRiskLabel}
                />
                <AnalyticsMiniTile
                  label="Fallos visibles"
                  value={String(visibleWeakFailures)}
                  caption="suma de temas calientes"
                />
                <AnalyticsMiniTile
                  label="Riesgo maximo"
                  value={maxWeakCategoryRatio === 0 ? '--' : `${maxWeakCategoryRatio}%`}
                  caption="peor ratio por tema"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <div className="rounded-[1.18rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(242,247,255,0.92))] px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                      Temas mas expuestos
                    </p>
                    <span className="rounded-full bg-white/82 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      {topWeakCategories.length} visibles
                    </span>
                  </div>
                  <div className="space-y-2.5">
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
                          <RankedMeterRow
                            key={item.category}
                            label={item.category}
                            detail={`${item.incorrectAttempts} fallos de ${item.attempts}`}
                            value={ratio}
                            valueLabel={`${ratio}%`}
                            maxValue={Math.max(maxWeakCategoryRatio, 1)}
                          />
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-[1.18rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(242,247,255,0.92))] px-3.5 py-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                      Familias de error
                    </p>
                    <span className="rounded-full bg-white/82 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      {riskBreakdownTotal} incidencias
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {topRiskBreakdown.length === 0 ? (
                      <p className="text-sm font-medium text-slate-500">
                        Aun no hay patron suficiente para clasificar errores.
                      </p>
                    ) : (
                      topRiskBreakdown.map((risk) => {
                        const share =
                          riskBreakdownTotal === 0
                            ? 0
                            : Math.round((risk.count / riskBreakdownTotal) * 100);
                        return (
                          <RankedMeterRow
                            key={risk.errorType}
                            label={risk.label}
                            detail={`${risk.count} incidencias visibles`}
                            value={share}
                            valueLabel={`${share}%`}
                            maxValue={Math.max(maxRiskShare, 1)}
                            tone="secondary"
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    );
  }

  if (activeTab === 'study') {
    return (
      <div className="grid gap-3 sm:gap-4">
        <SectionCard title="Sesion del dia" hint="Inicio decide. Estudio te deja ejecutar o cambiar el modo con criterio.">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(17rem,0.98fr)]">
            <div className="rounded-[1.35rem] border border-[#c8d8f8] bg-[linear-gradient(135deg,rgba(121,182,233,0.16),rgba(138,144,244,0.18))] p-4 shadow-[0_22px_42px_-30px_rgba(141,147,242,0.18)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  Ruta sugerida
                </span>
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  {coachPlan.focusLabel}
                </span>
              </div>
              <p className="mt-3 text-[1.55rem] font-black leading-[0.98] tracking-[-0.04em] text-slate-950 sm:text-[1.8rem]">
                {coachPlan.primaryActionLabel}
              </p>
              <p className="mt-2 max-w-[34rem] text-sm leading-6 text-slate-600">
                {studyPrimarySummary}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  Readiness {readinessLabel}
                </span>
                <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  {recommendedReview} repasos
                </span>
                <span className="rounded-full bg-white/84 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  {recommendedNew} nuevas
                </span>
              </div>

              <button
                type="button"
                onClick={onStartRecommended}
                className="mt-4 inline-flex w-full items-center justify-between rounded-[1.18rem] border border-white/86 bg-white/94 px-4 py-3 text-left text-slate-950 shadow-[0_20px_34px_-26px_rgba(141,147,242,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_38px_-26px_rgba(141,147,242,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 active:translate-y-0 active:scale-[0.995] sm:w-auto sm:min-w-[18rem]"
              >
                <span>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                    Abrir ahora
                  </span>
                  <span className="mt-1 block text-[1.04rem] font-extrabold tracking-[-0.02em]">
                    {coachPlan.primaryActionLabel}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-slate-500">
                    {studyFocusLine}
                  </span>
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#c4d7fb] bg-[linear-gradient(135deg,#7cb6e8_0%,#8d93f2_100%)] text-white shadow-[0_16px_28px_-20px_rgba(141,147,242,0.28)]">
                  <ArrowRight size={18} />
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <AnalyticsMiniTile label="Readiness" value={readinessLabel} caption="nota esperada hoy" accent />
              <AnalyticsMiniTile label="Repasos" value={String(recommendedReview)} caption="carga rentable" />
              <AnalyticsMiniTile label="Nuevas" value={String(recommendedNew)} caption="ampliacion controlada" />
              <AnalyticsMiniTile
                label="Presion"
                value={pressureGapPoints === null ? '--' : `${pressureGapPoints} pts`}
                caption={pressureInsights ? 'brecha de examen' : 'sin simulacro'}
              />
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
          <SectionCard title="Modos disponibles" hint="Cada modo sirve para una necesidad distinta. Aqui eliges herramienta, no direccion.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StudyActionCard
                label="Plan del dia"
                title="Mixto adaptativo"
                description="Combina repaso, nuevas y fragiles en una sola sesion rentable."
                meta={`${recommendedReview} + ${recommendedNew}`}
                icon={<Target size={18} />}
                onClick={onStartMixed}
                tone="primary"
              />
              <StudyActionCard
                label="Repaso"
                title="Top falladas"
                description="Ataca las preguntas que mas castigan tu precision actual."
                meta={`${weakQuestions.length} visibles`}
                icon={<Flame size={18} />}
                onClick={onStartWeakReview}
                disabled={weakQuestions.length === 0}
              />
              <StudyActionCard
                label="Aleatorio"
                title="20 mezcladas"
                description="Mide recuperacion real con mezcla completa de banco."
                meta="sin patron fijo"
                icon={<Brain size={18} />}
                onClick={onStartRandom}
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
                label="Anti-trampas"
                title="Plazos y excepciones"
                description="Entrena negaciones, plazos, literalidad y distractores cercanos."
                meta={dominantRiskLabel}
                icon={<Shield size={18} />}
                onClick={onStartAntiTrap}
              />
              <StudyActionCard
                label="Simulacro"
                title="Examen real"
                description="Sin feedback inmediato y con temporizador global."
                meta={pressureInsights?.lastSimulacroFinishedAt ? 'con muestra real' : 'sin ultima muestra'}
                icon={<ChartNoAxesColumn size={18} />}
                onClick={onStartSimulacro}
              />
            </div>
          </SectionCard>

          <SectionCard title="Radar de hoy" hint="Senales operativas para ajustar la sesion antes de empezar">
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
                  value={maxWeakCategoryRatio === 0 ? '--' : `${maxWeakCategoryRatio}%`}
                  caption={hottestCategoryLabel}
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
          </SectionCard>
        </div>

        <SectionCard title="Preguntas delicadas" hint="Las que mas erosionan la precision y conviene revisar con detalle">
          {weakQuestionsVisible.length === 0 ? (
            <p className="text-sm font-medium text-slate-500">
              Todavia no hay preguntas marcadas como debiles.
            </p>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {weakQuestionsVisible.map(({ question, stat }, index) => (
                <details
                  key={question.id}
                  className="rounded-[1.22rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.9))] px-4 py-4 shadow-[0_18px_34px_-28px_rgba(141,147,242,0.14)]"
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
        </SectionCard>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 sm:gap-4 ${
        identity.is_admin ? 'xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start' : ''
      }`}
    >
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
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
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

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <StatsDisclosure
              title="Configuracion de examen"
              hint={
                examTargetUpdatedLabel
                  ? `Ultima actualizacion ${examTargetUpdatedLabel}`
                  : 'Ajusta fecha y carga diaria solo cuando lo necesites.'
              }
            >
              <form onSubmit={handleExamTargetSubmit} className="grid gap-4">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  <label className="col-span-2 grid gap-2 xl:col-span-1">
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
      </div>

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
