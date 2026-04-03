import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type { ActiveLearningContext } from '../../domain/learningContext/types';
import type {
  PracticeCategoryRiskSummary,
  PracticeLearningDashboardV2,
  PracticePressureInsightsV2,
  PracticeSessionSummary,
} from '../../practiceTypes';
import { buildCoachTwoLineMessageV2 } from '../../domain/coachCopyV2';
import { resolveDominantState } from './dominantState';
import type { SurfaceDominantState, SurfaceTension } from './surfaceTypes';

export type StatsAdapterOutput = {
  dominantState: SurfaceDominantState;
  topCards: Array<{
    label: string;
    value: string;
    support?: string;
  }>;
  primaryInsight: {
    title: string;
    summary: string;
    severity: SurfaceTension;
  };
  trajectoryLine: string | null;
  footnote?: string;
  secondaryInsight?: {
    title: string;
    summary: string;
  };
  coachBridge: {
    visibleReason: string;
    nextActionLabel: string;
    bridgeLead: string;
  };
};

const nextActionLabelByState: Record<SurfaceDominantState, string> = {
  backlog: 'Hoy toca consolidar',
  errors: 'Hoy toca corregir',
  pressure: 'Hoy toca entrenar examen',
  recovery: 'Hoy toca reenganchar',
  memory: 'Hoy toca fijar',
  growth: 'Hoy toca subir nivel',
  gray_zone: 'Hoy toca afinar',
};

const insightByState: Record<
  SurfaceDominantState,
  { title: string; summary: string; severity: SurfaceTension }
> = {
  pressure: {
    title: 'La presion te resta mas que el temario',
    summary: 'El patron dominante es ejecucion bajo crono, no vacio de estudio.',
    severity: 'high',
  },
  backlog: {
    title: 'La deuda te frena mas que el nivel',
    summary: 'Lo vencido roba foco a lo nuevo; conviene limpiar antes de ampliar.',
    severity: 'medium',
  },
  recovery: {
    title: 'Lo que falla es el ritmo, no la capacidad',
    summary: 'Volver a cerrar dias es la palanca mas barata ahora.',
    severity: 'low',
  },
  growth: {
    title: 'La base aguanta mas exigencia',
    summary: 'Puedes subir el liston sin romper lo que ya funciona.',
    severity: 'medium',
  },
  errors: {
    title: 'Hay un patron que se repite',
    summary: 'Corregirlo ahora evita que se fije como costumbre.',
    severity: 'medium',
  },
  memory: {
    title: 'La retencion pide fijacion antes de volumen',
    summary: 'Mejor menos tema nuevo y mas cierre de lo ya visto.',
    severity: 'low',
  },
  gray_zone: {
    title: 'Hace falta una foto mas nitida',
    summary: 'Sin senal clara, conviene medir con sesiones cortas y ordenadas.',
    severity: 'low',
  },
};

function sessionAccuracyPct(session: PracticeSessionSummary): number {
  return Math.round((session.score / Math.max(1, session.total)) * 100);
}

function buildTrajectoryLine(
  recentSessions: PracticeSessionSummary[] | null | undefined,
  streakDays: number,
): string | null {
  const list = recentSessions ?? [];
  if (list.length >= 2) {
    const last = sessionAccuracyPct(list[0]);
    const prev = sessionAccuracyPct(list[1]);
    const delta = last - prev;
    if (delta >= 10) return 'Trayectoria: la ultima sesion fue claramente mejor que la anterior.';
    if (delta <= -10) return 'Trayectoria: la ultima sesion bajo frente a la anterior.';
    if (delta >= 4) return 'Trayectoria: ligera mejora respecto a la sesion previa.';
    if (delta <= -4) return 'Trayectoria: ligera caida respecto a la sesion previa.';
    return 'Trayectoria: estable respecto a la sesion anterior.';
  }
  if (streakDays >= 10) return 'Constancia: racha alta; buen contexto para exigir con control.';
  if (streakDays >= 3) return 'Constancia: ritmo reciente coherente.';
  if (streakDays === 0 && list.length > 0) return 'Constancia: un dia cerrado ya recupera el hilo.';
  return null;
}

export function buildStatsAdapterOutput(input: {
  planV2: CoachPlanV2;
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  recentSessions?: PracticeSessionSummary[] | null;
  streakDays: number;
  weakCategories?: PracticeCategoryRiskSummary[] | null;
  activeLearningContext?: ActiveLearningContext | null;
}): StatsAdapterOutput {
  const {
    planV2,
    learningDashboardV2,
    pressureInsightsV2,
    recentSessions,
    streakDays,
    weakCategories,
    activeLearningContext,
  } = input;

  const dominantState = resolveDominantState({
    learningDashboardV2,
    pressureInsightsV2,
    weakCategories,
    recentSessions,
    streakDays,
  });

  const coachMessage = buildCoachTwoLineMessageV2({ planV2, dominantState });
  const contextConfig = activeLearningContext?.config;
  const pressureActionLabel =
    contextConfig?.statsLabels.pressureActionLabel ?? nextActionLabelByState.pressure;
  const pressureInsightTitle =
    contextConfig?.statsLabels.pressureInsightTitle ?? insightByState.pressure.title;
  const pressureInsightSummary =
    contextConfig?.statsLabels.pressureInsightSummary ?? insightByState.pressure.summary;

  const topCards: StatsAdapterOutput['topCards'] = [
    { label: 'Estado', value: dominantState === 'pressure' ? pressureActionLabel : nextActionLabelByState[dominantState] },
    { label: 'Tono', value: planV2.tone },
  ];

  const primaryInsight =
    dominantState === 'pressure'
      ? {
          title: pressureInsightTitle,
          summary: pressureInsightSummary,
          severity: insightByState.pressure.severity,
        }
      : insightByState[dominantState];

  const trajectoryLine = buildTrajectoryLine(recentSessions, streakDays);

  const overdue = learningDashboardV2?.backlogOverdueCount ?? 0;
  const footnote =
    overdue > 0 && dominantState !== 'backlog'
      ? `${overdue} repaso${overdue === 1 ? '' : 's'} vencido${overdue === 1 ? '' : 's'} tambien influyen en lo que veras en Home.`
      : undefined;

  return {
    dominantState,
    topCards,
    primaryInsight,
    trajectoryLine,
    footnote,
    coachBridge: {
      visibleReason: coachMessage.line2,
      nextActionLabel:
        dominantState === 'pressure' ? pressureActionLabel : nextActionLabelByState[dominantState],
      bridgeLead: 'Por eso Home te orienta asi',
    },
  };
}
