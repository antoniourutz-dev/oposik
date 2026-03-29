import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Cell as PieCell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

// --- STYLES & TOKENS ---
const COLORS = {
  primary: '#8d93f2',
  secondary: '#7cb6e8',
  accent: '#f26ba1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: 'rgba(148, 163, 184, 0.1)',
  text: '#64748b'
};

const CHART_STYLES = {
  grid: { stroke: 'rgba(148,163,184,0.06)', strokeDasharray: '3 3' },
  tooltip: {
    contentStyle: { display: 'none' },
    wrapperClassName: 'premium-tooltip'
  }
};

// --- COMPONENTS ---

/**
 * EvolutionAreaChart
 * High-end Area chart with gradient and dual series
 */
export const EvolutionAreaChart: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={320}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.16} />
          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} {...CHART_STYLES.grid} />
      <XAxis
        dataKey="label"
        axisLine={false}
        tickLine={false}
        tick={{ fill: COLORS.text, fontSize: 11, fontWeight: 700 }}
        dy={10}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: COLORS.text, fontSize: 11, fontWeight: 700 }}
        dx={-10}
      />
      <Tooltip {...CHART_STYLES.tooltip} />
      <Area
        type="monotone"
        dataKey="value"
        stroke={COLORS.primary}
        strokeWidth={4}
        fillOpacity={1}
        fill="url(#colorValue)"
        animationDuration={1500}
      />
    </AreaChart>
  </ResponsiveContainer>
);

/**
 * DistributionDonutChart
 * Distribution chart for Mastery
 */
export const DistributionDonutChart: React.FC<{ data: any[] }> = ({ data }) => {
  const innerRadius = 70;
  const outerRadius = 100;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={8}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip {...CHART_STYLES.tooltip} />
      </PieChart>
    </ResponsiveContainer>
  );
};

/**
 * PerformanceBarChart
 * Comparison chart for Subject Accuracy
 */
export const PerformanceBarChart: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
      <CartesianGrid horizontal={false} {...CHART_STYLES.grid} />
      <XAxis type="number" hide />
      <YAxis
        dataKey="category"
        type="category"
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#475569', fontSize: 12, fontWeight: 800 }}
        width={100}
      />
      <Tooltip {...CHART_STYLES.tooltip} cursor={{ fill: 'rgba(148,163,184,0.04)' }} />
      <Bar dataKey="accuracy" radius={[0, 8, 8, 0]} barSize={20}>
         {data.map((entry, index) => (
           <PieCell key={`bar-${index}`} fill={entry.accuracy >= 70 ? COLORS.success : entry.accuracy >= 50 ? COLORS.primary : COLORS.danger} />
         ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

/**
 * KPIPulseCard
 * Small metric card with minimal sparkline
 */
export const KPIPulseCard: React.FC<{
  label: string;
  value: string | number;
  trend: number;
  icon: React.ReactNode;
}> = ({ label, value, trend, icon }) => (
  <div className="rounded-[1.8rem] border border-slate-100 bg-white p-6 shadow-[0_15px_30px_-15px_rgba(148,163,184,0.12)] transition-all hover:-translate-y-1 hover:shadow-[0_45px_100px_-50px_rgba(31,38,135,0.1)]">
    <div className="flex items-center justify-between">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        {icon}
      </div>
      <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black tracking-tight ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
      </div>
    </div>
    <div className="mt-4">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-[-0.03em] text-slate-950">{value}</p>
    </div>
  </div>
);

/**
 * BehavioralRadarChart
 * Polar chart for multi-dimensional cognitive analysis
 */
export const BehavioralRadarChart: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
      <PolarGrid stroke={COLORS.muted} strokeWidth={1} />
      <PolarAngleAxis 
        dataKey="subject" 
        tick={{ fill: COLORS.text, fontSize: 10, fontWeight: 800 }} 
      />
      <PolarRadiusAxis 
        angle={30} 
        domain={[0, 100]} 
        tick={false} 
        axisLine={false} 
      />
      <Radar
        name="Performance"
        dataKey="value"
        stroke={COLORS.primary}
        strokeWidth={3}
        fill={COLORS.primary}
        fillOpacity={0.15}
        animationDuration={2000}
      />
      <Tooltip {...CHART_STYLES.tooltip} />
    </RadarChart>
  </ResponsiveContainer>
);
