import React from 'react';
import { AlertTriangle, TrendingUp, CheckCircle, ChevronRight, Activity, CalendarDays, BookOpen, Clock, Target, ListTodo, Shield, Scale, FileText, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  React.PropsWithChildren<{ title?: string; hint?: string; className?: string }>
> = ({ title, hint, className = '', children }) => (
  <section
    className={`group relative overflow-hidden rounded-[2.2rem] border border-white/40 bg-white/60 p-6 shadow-2xl shadow-indigo-500/5 transition-all duration-500 backdrop-blur-2xl hover:shadow-indigo-500/10 sm:p-8 ${className}`}
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

export const LawPerformanceCard: React.FC<{
  ley_referencia: string;
  accuracyRate?: number;
  accuracy?: number;
  attempts: number;
  questionCount?: number;
  onClick?: (ley: string) => void;
}> = ({ ley_referencia, accuracyRate, accuracy, attempts, questionCount, onClick }) => {
  const resolvedAccuracy = accuracyRate ?? accuracy ?? 0;
  const displayAccuracy = Math.round(Number(resolvedAccuracy) || 0);
  const isHealthy = displayAccuracy >= 75;
  const isCritical = displayAccuracy < 50;
  const hasAttempted = attempts > 0;

  const getStatusColor = () => {
    if (!hasAttempted) return {
       bg: 'bg-slate-300', softBg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', shadow: 'shadow-slate-500/10'
    };
    if (isHealthy) return {
       bg: 'bg-emerald-500', softBg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', shadow: 'shadow-emerald-500/20'
    };
    if (isCritical) return {
       bg: 'bg-rose-500', softBg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', shadow: 'shadow-rose-500/20'
    };
    return {
       bg: 'bg-amber-500', softBg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', shadow: 'shadow-amber-500/20'
    };
  };

  const colors = getStatusColor();

  return (
    <div
      onClick={() => onClick?.(ley_referencia)}
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-[1.8rem] border bg-white/70 backdrop-blur-md p-6 transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:bg-white' : ''
      } ${colors.border} shadow-sm`}
    >
       <div className="flex items-start justify-between gap-5">
          <div className="flex-1 min-w-0">
             <div className="flex items-start gap-2.5 mb-2">
               <FileText size={16} className={`shrink-0 mt-0.5 ${hasAttempted ? colors.text : 'text-slate-400'}`} />
               <p className="line-clamp-3 text-[14px] leading-tight font-black uppercase text-slate-800" title={ley_referencia}>
                 {ley_referencia}
               </p>
             </div>
             <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-3">
               {questionCount !== undefined && <span className="text-slate-800 font-black">{questionCount} preg. &bull; </span>} 
               {hasAttempted ? `${attempts} vistas` : 'Sin empezar'}
             </p>
          </div>
          
          <div className={`flex h-[3.25rem] w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-[1.1rem] border border-white/60 ${colors.softBg} shadow-sm transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2`}>
             <span className={`text-[1.15rem] font-black leading-none tracking-tight ${colors.text}`}>
               {hasAttempted ? displayAccuracy : '--'}<span className="text-[10px]">%</span>
             </span>
          </div>
       </div>

       <div className="relative mt-auto pt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 shadow-inner">
             {hasAttempted && (
               <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: `${displayAccuracy}%` }}
                 transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                 className={`h-full rounded-full ${colors.bg} ${colors.shadow}`}
               />
             )}
          </div>
          {onClick && (
            <div className={`absolute -right-3 top-0 flex h-7 w-7 translate-y-[1px] items-center justify-center rounded-full bg-white opacity-0 shadow-md border ${colors.border} transition-all duration-300 group-hover:-right-1 group-hover:opacity-100`}>
               <ChevronRight size={14} className={colors.text} />
            </div>
          )}
       </div>
    </div>
  );
};

export const NormativeRadar: React.FC<{
  laws: Array<{ ley_referencia: string; accuracy?: number; accuracyRate?: number; attempts: number; scope?: string }>;
  onLawClick?: (ley: string) => void;
}> = ({ laws, onLawClick }) => {
  const common = laws.filter(l => l.scope === 'common');
  const specific = laws.filter(l => l.scope === 'specific');
  const unknown = laws.filter(l => l.scope !== 'common' && l.scope !== 'specific');

  const renderSection = (title: string, list: typeof laws, icon: React.ReactNode, wrapperColors: string, headerColors: string) => {
    if (list.length === 0) return null;
    return (
      <div className={`mb-8 overflow-hidden rounded-[2.5rem] border ${wrapperColors} transition-all`}>
        <div className={`flex items-center gap-3 border-b px-8 py-5 ${headerColors}`}>
          <div className="flex bg-white/50 backdrop-blur-sm shadow-sm h-10 w-10 items-center justify-center rounded-xl">
             {icon}
          </div>
          <h4 className="text-lg font-black text-slate-900 tracking-tight">{title}</h4>
          <span className="ml-auto rounded-full bg-white/60 px-3 py-1 text-[10px] font-black tracking-widest text-slate-500">{list.length}</span>
        </div>
        <div className="p-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {list.map((law, idx) => (
              <LawPerformanceCard key={idx} {...law} onClick={onLawClick} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {renderSection(
        'Legislación Común', 
        common, 
        <Scale size={18} className="text-indigo-600" />, 
        'border-indigo-100/50 bg-indigo-50/10',
        'border-indigo-100/50 bg-indigo-50/30'
      )}
      {renderSection(
        'Temario Específico', 
        specific, 
        <BookOpen size={18} className="text-emerald-600" />, 
        'border-emerald-100/50 bg-emerald-50/10',
        'border-emerald-100/50 bg-emerald-50/30'
      )}
      {renderSection(
        'Otros Marcos / Sin Clasificar', 
        unknown, 
        <ListTodo size={18} className="text-slate-500" />, 
        'border-slate-100 bg-slate-50/10',
        'border-slate-100 bg-slate-50'
      )}
    </div>
  );
};


export const AnalyticsMiniTile: React.FC<{
  label: string;
  value: string;
  caption?: string;
  accent?: boolean;
}> = ({ label, value, caption, accent = false }) => (
  <div
    className={`rounded-[1.8rem] border p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 ${
      accent
        ? 'border-indigo-100 bg-indigo-50/40 backdrop-blur-xl'
        : 'border-white/40 bg-white/40 backdrop-blur-xl shadow-slate-200/40'
    }`}
  >
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-2 text-[1.75rem] font-black leading-none tracking-tight text-slate-950">{value}</p>
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
    <div className="overflow-hidden rounded-full border border-white/80 bg-slate-100/50 p-1 backdrop-blur-sm shadow-inner">
      <div className="flex h-4 overflow-hidden rounded-full">
        {segments.map((segment) => {
          const width = total === 0 ? 0 : (Math.max(0, segment.value) / total) * 100;
          return (
            <motion.div
              key={segment.label}
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ duration: 1, ease: "circOut" }}
              className={`${segment.className} h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`}
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
      : 'brand-gradient-h';

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
      <div className="mt-3 h-2.5 rounded-full bg-slate-100 shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-2.5 rounded-full ${barClassName} shadow-[0_4px_12px_rgba(141,147,242,0.2)]`} 
        />
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
}> = ({ value, label, size = 180, strokeWidth = 14, color = "rgba(226, 232, 240, 0.4)" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const id = React.useId();

  return (
    <div className="relative flex items-center justify-center" style={{ width: `${size}px`, height: `${size}px` }}>
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
          <span className="h-2 w-2 rounded-full korrika-bg-gradient" />
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
          className="h-full rounded-full brand-gradient-h shadow-[0_12px_24px_-18px_rgba(141,147,242,0.4)]"
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
            gradient: 'brand-gradient-h',
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
            ? 'korrika-bg-gradient text-white shadow-[0_14px_24px_-18px_rgba(141,147,242,0.3)]'
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
    <div className="relative flex items-center justify-center shrink-0" style={{ width: `${size}px`, height: `${size}px` }}>
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
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#gauge-${idValue})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          strokeLinecap="round"
          transition={{ duration: 1.5, ease: "circOut" }}
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
