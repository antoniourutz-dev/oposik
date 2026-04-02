import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
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
  /** Lectura de trayectoria con datos ya disponibles (sesiones + racha). */
  trajectoryLine: string | null;
  /** Nota secundaria si hay deuda y no es el estado dominante. */
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
    title: 'La presión te resta más que el temario',
    summary: 'El patrón dominante es ejecución bajo cronó, no vacío de estudio.',
    severity: 'high',
  },
  backlog: {
    title: 'La deuda te frena más que el nivel',
    summary: 'Lo vencido roba foco a lo nuevo; conviene limpiar antes de ampliar.',
    severity: 'medium',
  },
  recovery: {
    title: 'Lo que falla es el ritmo, no la capacidad',
    summary: 'Volver a cerrar días es la palanca más barata ahora.',
    severity: 'low',
  },
  growth: {
    title: 'La base aguanta más exigencia',
    summary: 'Puedes subir el listón sin romper lo que ya funciona.',
    severity: 'medium',
  },
  errors: {
    title: 'Hay un patrón que se repite',
    summary: 'Corregirlo ahora evita que se fije como costumbre.',
    severity: 'medium',
  },
  memory: {
    title: 'La retención pide fijación antes de volumen',
    summary: 'Mejor menos tema nuevo y más cierre de lo ya visto.',
    severity: 'low',
  },
  gray_zone: {
    title: 'Hace falta una foto más nítida',
    summary: 'Sin señal clara, conviene medir con sesiones cortas y ordenadas.',
    severity: 'low',
  },
};

function sessionAccuracyPct(s: PracticeSessionSummary): number {
  return Math.round((s.score / Math.max(1, s.total)) * 100);
}

function buildTrajectoryLine(
  recentSessions: PracticeSessionSummary[] | null | undefined,
  streakDays: number,
): string | null {
  const list = recentSessions ?? [];
  if (list.length >= 2) {
    const last = sessionAccuracyPct(list[0]);
    const prev = sessionAccuracyPct(list[1]);
    const d = last - prev;
    if (d >= 10) return 'Trayectoria: la última sesión fue claramente mejor que la anterior.';
    if (d <= -10) return 'Trayectoria: la última sesión bajó frente a la anterior.';
    if (d >= 4) return 'Trayectoria: ligera mejora respecto a la sesión previa.';
    if (d <= -4) return 'Trayectoria: ligera caída respecto a la sesión previa.';
    return 'Trayectoria: estable respecto a la sesión anterior.';
  }
  if (streakDays >= 10) return 'Constancia: racha alta; buen contexto para exigir con control.';
  if (streakDays >= 3) return 'Constancia: ritmo reciente coherente.';
  if (streakDays === 0 && list.length > 0) return 'Constancia: un día cerrado ya recupera el hilo.';
  return null;
}

export function buildStatsAdapterOutput(input: {
  planV2: CoachPlanV2;
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  recentSessions?: PracticeSessionSummary[] | null;
  streakDays: number;
  weakCategories?: PracticeCategoryRiskSummary[] | null;
}): StatsAdapterOutput {
  const { planV2, learningDashboardV2, pressureInsightsV2, recentSessions, streakDays, weakCategories } = input;

  const dominantState = resolveDominantState({
    learningDashboardV2,
    pressureInsightsV2,
    weakCategories,
    recentSessions,
    streakDays,
  });

  const coachMessage = buildCoachTwoLineMessageV2({ planV2, dominantState });

  const topCards: StatsAdapterOutput['topCards'] = [
    { label: 'Estado', value: nextActionLabelByState[dominantState] },
    { label: 'Tono', value: planV2.tone },
  ];

  const primaryInsight = insightByState[dominantState];
  const trajectoryLine = buildTrajectoryLine(recentSessions, streakDays);

  const overdue = learningDashboardV2?.backlogOverdueCount ?? 0;
  const footnote =
    overdue > 0 && dominantState !== 'backlog'
      ? `${overdue} repaso${overdue === 1 ? '' : 's'} vencido${overdue === 1 ? '' : 's'} también influyen en lo que verás en Home.`
      : undefined;

  return {
    dominantState,
    topCards,
    primaryInsight,
    trajectoryLine,
    footnote,
    coachBridge: {
      visibleReason: coachMessage.line2,
      nextActionLabel: nextActionLabelByState[dominantState],
      bridgeLead: 'Por eso Home te orienta así',
    },
  };
}

