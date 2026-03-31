import React, { useMemo } from 'react';
import { AlertTriangle, Flame, RotateCcw, Shield, Target } from 'lucide-react';
import type { DashboardContentProps } from './types';
import { toCoachTwoLineMessage } from '../../domain/learningEngine';

type InsightCardProps = {
  title: string;
  problem: string;
  actionLabel: string;
  onAction: () => void;
  icon: React.ReactNode;
};

const InsightCard: React.FC<InsightCardProps> = ({ title, problem, actionLabel, onAction, icon }) => (
  <div className="rounded-2xl border border-slate-200/85 bg-white/92 p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.12)]">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/85 bg-slate-50 text-slate-700">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{title}</p>
        <p className="mt-2 text-[14px] font-semibold leading-relaxed text-slate-700">{problem}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  </div>
);

/**
 * STATS → ENTENDER (OPCIONAL)
 * Stats no es un “panel de métricas”: es un puente a acción.
 * Cada bloque responde a: “¿Qué hago con esto?”
 */
const DashboardStatsTab: React.FC<DashboardContentProps> = ({
  coachPlan,
  learningDashboard,
  learningDashboardV2,
  pressureInsights,
  pressureInsightsV2,
  onReloadQuestions,
  onStartAntiTrap,
  onStartRecommended,
  onStartWeakReview,
  weakCategories,
}) => {
  const coach = useMemo(
    () =>
      toCoachTwoLineMessage({
        mode: coachPlan.mode,
        tone: coachPlan.tone,
        focusMessage: learningDashboardV2?.focusMessage ?? learningDashboard?.focusMessage ?? null,
        reasons: coachPlan.reasons,
        summary: coachPlan.summary,
      }),
    [
      coachPlan.mode,
      coachPlan.reasons,
      coachPlan.summary,
      coachPlan.tone,
      learningDashboard?.focusMessage,
      learningDashboardV2?.focusMessage,
    ],
  );

  const overdue = learningDashboardV2?.backlogOverdueCount ?? learningDashboard?.overdueCount ?? 0;
  const pressureGap = pressureInsightsV2?.pressureGapRaw ?? pressureInsights?.pressureGap ?? null;
  const hasPressureSignal = pressureGap !== null && pressureGap !== undefined;
  const weakTop = weakCategories?.[0] ?? null;

  const cards: InsightCardProps[] = [
    {
      title: 'Siguiente paso',
      problem: `${coach.line1} ${coach.line2}`,
      actionLabel: 'Empezar sesión recomendada',
      onAction: onStartRecommended,
      icon: <Target size={18} aria-hidden />,
    },
  ];

  if (overdue > 0) {
    cards.push({
      title: 'Repasos',
      problem: 'Hay repasos urgentes. Si los dejas, cuestan más mañana.',
      actionLabel: 'Consolidar ahora',
      onAction: onStartRecommended,
      icon: <AlertTriangle size={18} aria-hidden />,
    });
  }

  if (hasPressureSignal && Math.abs(pressureGap ?? 0) >= 0.12) {
    cards.push({
      title: 'Presión',
      problem: 'En simulacro baja el acierto. Conviene entrenar lectura fina.',
      actionLabel: 'Entrenar anti-trampas',
      onAction: onStartAntiTrap,
      icon: <Shield size={18} aria-hidden />,
    });
  }

  if (weakTop) {
    cards.push({
      title: 'Errores',
      problem: 'Se repiten fallos en preguntas vistas. Un repaso corto lo limpia rápido.',
      actionLabel: 'Repasar falladas',
      onAction: onStartWeakReview,
      icon: <Flame size={18} aria-hidden />,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-16 xl:max-w-6xl">
      <header className="flex items-center justify-between gap-3 pt-2 xl:pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Estadísticas (opcional)
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            Si miras datos, que sea para elegir una acción.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onReloadQuestions()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80"
        >
          <RotateCcw size={14} className="text-slate-500" aria-hidden />
          Sincronizar
        </button>
      </header>

      <div className="grid gap-3 xl:grid-cols-2">
        {cards.slice(0, 3).map((card) => (
          <InsightCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
};

export default DashboardStatsTab;

