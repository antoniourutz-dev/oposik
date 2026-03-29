import React from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, TrendingUp, Info, Activity, Target, ShieldCheck } from 'lucide-react';

export const formatSessionDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const getAccuracy = (correct: number, total: number) =>
  total === 0 ? 0 : Math.round((correct / total) * 100);

export const formatPercent = (value: number | null | undefined) =>
  `${Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100)}%`;

export const formatOptionalPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? '--' : formatPercent(value);

export const toPercentNumber = (value: number | null | undefined) =>
  Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100);

export const formatSignedPoints = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '--';
  const points = Math.round(value * 100);
  return `${points >= 0 ? '+' : '-'}${Math.abs(points)} pts`;
};

export const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const SectionCard: React.FC<
  React.PropsWithChildren<{ title?: string; hint?: string; className?: string; translucent?: boolean }>
> = ({ title, hint, className = '', translucent = true, children }) => (
  <section
    className={`group relative overflow-hidden rounded-[1.6rem] border border-slate-200/60 p-5 transition-all duration-500 hover:shadow-[0_45px_100px_-50px_rgba(31,38,135,0.14)] sm:p-6 ${translucent ? 'bg-white/88 backdrop-blur-xl' : 'bg-white'} ${className}`}
  >
    <div className="relative z-10">
      {title ? (
        <div className="mb-6">
          <p className="text-[1.15rem] font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
            {title}
          </p>
          {hint ? (
             <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-slate-400">
               {hint}
             </p>
           ) : null}
        </div>
      ) : null}
      {children}
    </div>
  </section>
);

export const AnalyticsMiniTile: React.FC<{
  label: string;
  value: string;
  caption?: string;
  accent?: boolean;
}> = ({ label, value, caption, accent = false }) => (
  <div
    className={`rounded-[1.4rem] border px-4 py-4.5 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 ${
      accent
        ? 'border-sky-200/50 bg-sky-50/50 backdrop-blur-lg'
        : 'border-white/60 bg-white/60 backdrop-blur-lg'
    }`}
  >
    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500/80">{label}</p>
    <p className="mt-2 text-2xl font-black leading-none tracking-tight text-slate-950">{value}</p>
    {caption ? (
      <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-slate-400">
        {caption}
      </p>
    ) : null}
  </div>
);

export const SegmentedProgressBar: React.FC<{
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

export const RankedMeterRow: React.FC<{
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

export const RadialProgress: React.FC<{
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  accentColor?: string;
}> = ({ value, label, size = 180, strokeWidth = 14, color = "rgba(226, 232, 240, 0.4)", accentColor = "url(#radialGradient)" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const id = React.useId();

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg] transform" width={size} height={size}>
        <defs>
          <linearGradient id={`${id}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7cb6e8" />
            <stop offset="100%" stopColor="#8d93f2" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${id}-gradient)`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transition-all="true"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[2.2rem] font-black tracking-tighter text-slate-950">
          {Math.round(value)}%
        </span>
        <span className="max-w-[80px] text-[10px] font-extrabold uppercase leading-tight tracking-[0.12em] text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
};

export const SparklineChart: React.FC<{
  items: Array<{ label: string; value: number; meta: string }>;
}> = ({ items }) => {
  const width = 450;
  const height = 180;
  const paddingX = 20;
  const paddingY = 20;
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

  // Calculate bezier curves
  const getCurve = (pts: {x: number, y: number}[]) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const curr = pts[i];
        const next = pts[i+1];
        const cp1x = curr.x + (next.x - curr.x) / 3;
        const cp2x = curr.x + (2 * (next.x - curr.x)) / 3;
        d += ` C ${cp1x} ${curr.y}, ${cp2x} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const path = getCurve(points) || (points.length > 0 ? `M ${points[0].x} ${points[0].y}` : '');
  const areaPath = points.length
    ? `${path} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div className="relative overflow-hidden pt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7cb6e8" />
            <stop offset="100%" stopColor="#8d93f2" />
          </linearGradient>
          <linearGradient id={areaId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(141,147,242,0.18)" />
            <stop offset="100%" stopColor="rgba(141,147,242,0.01)" />
          </linearGradient>
        </defs>

        {[50, 100].map((tick) => {
          const y = paddingY + chartHeight - (tick / 100) * chartHeight;
          return (
            <line
              key={tick}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth="1"
            />
          );
        })}

        {points.length > 0 ? <path d={areaPath} fill={`url(#${areaId})`} /> : null}
        {points.length > 0 ? (
          <path
            d={path}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        
        {points.map((point, idx) => (
          <g key={point.label} className="group">
             <circle 
               cx={point.x} 
               cy={point.y} 
               r="6" 
               fill="white" 
               stroke={`url(#${gradientId})`} 
               strokeWidth="4"
               className="transition-all duration-300 group-hover:r-8 shadow-sm"
             />
             <text
               x={point.x}
               y={height - 2}
               textAnchor="middle"
               fontSize="11"
               fontWeight="900"
               fill="rgba(100,116,139,0.7)"
               className="uppercase tracking-tight"
             >
               {point.label}
             </text>
          </g>
        ))}
      </svg>
    </div>
  );
};


export const RangeMeter: React.FC<{
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
        <div className="rounded-[0.95rem] bg-white/78 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Proyeccion</p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {projectedPercent === null ? '--' : `${projectedPercent}%`}
          </p>
        </div>
      </div>
    </div>
  );
};

export const PressureComparisonMeter: React.FC<{
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
            gradient: 'bg-[linear-gradient(90deg,#7cb6e8_0%,#8d93f2_100%)]',
            valueClass: 'text-slate-950'
          },
          {
            label: 'Simulacro',
            value: simulacroPercent,
            gradient: 'bg-[linear-gradient(90deg,#94a3b8_0%,#64748b_100%)]',
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

export const StatsDisclosure: React.FC<
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
          ver
          <ArrowRight size={12} />
        </span>
      </div>
    </summary>
    <div className="mt-4">{children}</div>
  </details>
);

export const StudyActionCard: React.FC<{
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

export const DashboardTabFallback: React.FC<{ label: string }> = ({ label }) => (
  <SectionCard title={label} hint="Cargando panel optimizado">
    <div className="rounded-[1.18rem] border border-slate-100/85 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(242,247,255,0.92))] px-4 py-6 text-sm font-semibold text-slate-500 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)]">
      Preparando contenido...
    </div>
  </SectionCard>
);

export const CircularGauge: React.FC<{
  value: number;
  label: string;
  subLabel?: string;
  size?: number;
  strokeWidth?: number;
}> = ({ value, label, subLabel, size = 180, strokeWidth = 12 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const idValue = React.useId().replace(/:/g, '');

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg] transform" width={size} height={size}>
        <defs>
          <linearGradient id={`gauge-${idValue}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7cb6e8" />
            <stop offset="100%" stopColor="#8d93f2" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(148,163,184,0.06)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#gauge-${idValue})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <p className="text-[2.25rem] font-black tracking-[-0.05em] text-slate-900 leading-none">
          {Math.round(value)}%
        </p>
        <div className="mt-1 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
             {label}
          </p>
          {subLabel && (
             <p className="text-[11px] font-bold text-slate-300 mt-0.5">{subLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const DashboardMetricTile: React.FC<{
  label: string;
  value: string;
  caption?: string;
  icon?: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  accent?: boolean;
}> = ({ label, value, caption, icon, trend, trendLabel, accent }) => (
  <div className={`group flex flex-col rounded-2xl border ${accent ? 'border-korrika-pink/10 bg-white/60 shadow-[0_16px_40px_-24px_rgba(242,107,173,0.12)]' : 'border-slate-100/80 bg-white/40 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.08)]'} p-5 transition-all duration-300 hover:border-slate-200 hover:bg-white`}>
    <div className="flex items-center justify-between gap-3">
       <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all group-hover:scale-110 ${accent ? 'bg-korrika-pink/10 text-korrika-pink' : 'bg-slate-50 text-slate-400'}`}>
         {icon || <Activity size={20} />}
       </div>
       {trend !== undefined && (
          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
             {trend >= 0 ? '+' : ''}{trend}%
          </div>
       )}
    </div>
    
    <div className="mt-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className={`text-2xl font-black ${accent ? 'text-slate-950' : 'text-slate-900'}`}>{value}</p>
        {trendLabel && <span className="text-xs font-bold text-slate-400">{trendLabel}</span>}
      </div>
      {caption && <p className="mt-1 text-[11px] font-semibold text-slate-400/80 line-clamp-1">{caption}</p>}
    </div>
  </div>
);

export const SectionHeader: React.FC<{
  title: string;
  hint?: string;
  right?: React.ReactNode;
}> = ({ title, hint, right }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4 px-2">
    <div>
      <h2 className="text-2xl font-black tracking-tight text-slate-900 xl:text-3xl">
        {title}
      </h2>
      {hint && (
        <p className="mt-1 text-[15px] font-semibold text-slate-400/90">
          {hint}
        </p>
      )}
    </div>
    {right}
  </div>
);
