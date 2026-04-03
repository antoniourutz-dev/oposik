import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type { ActiveLearningContext } from '../../domain/learningContext/types';
import type {
  ActivePracticeSession,
  PracticeAnswer,
  PracticeCategoryRiskSummary,
  PracticeLearningDashboardV2,
  PracticePressureInsightsV2,
  PracticeProfile,
  PracticeSessionSummary,
} from '../../practiceTypes';
import {
  appendTerritoryToContinuityBridge,
  type LawTerritoryContinuityHint,
} from '../../domain/generalLaw';
import { buildSessionMicroRewards } from '../../domain/rewards/buildSessionMicroRewards';
import { resolveDominantState } from './dominantState';
import type { SurfaceDominantState } from './surfaceTypes';

export type SessionEndAdapterOutput = {
  dominantState: SurfaceDominantState;
  tone: CoachPlanV2['tone'];
  closingMessage: {
    title: string;
    summary: string;
  };
  continuityBridge: string;
  microRewards: string[];
  progressSignal?: {
    label: string;
    value?: string;
  };
  nextStep: {
    cta: string;
    description?: string;
  };
};

export type SessionEndAdapterSurfaceContext = {
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  weakCategories?: PracticeCategoryRiskSummary[] | null;
  recentSessions?: PracticeSessionSummary[] | null;
  streakDays?: number;
  profile?: PracticeProfile | null;
  activeLearningContext?: ActiveLearningContext | null;
  /**
   * Territorio `general_law`: intención de ley y microfoco de bloque con masa útil.
   * Si viene informado, se fusiona con la línea de continuidad para Home.
   */
  lawTerritoryContinuity?: LawTerritoryContinuityHint | null;
};

const continuityBridgeByState: Record<SurfaceDominantState, string> = {
  recovery: 'Ayer reactivaste el ritmo; hoy una tanda corta fija el hilo sin exigirte un maraton.',
  backlog:
    'Ayer retomaste repasos pendientes; hoy sigue por lo que aun queda antes de empezar un bloque nuevo.',
  errors: 'Ayer aislamos patron; hoy repeticion corta sobre fallos vale mas que tema nuevo.',
  pressure: 'Ayer entrenaste transferencia; hoy puedes repetir exposicion con el mismo foco.',
  growth: 'Ayer subiste liston con control; hoy manten exigencia sin saltar pasos.',
  memory: 'Ayer priorizaste fijar; hoy refuerza lo mismo antes de sumar volumen.',
  gray_zone: 'Ayer generaste senal; hoy una sesion ordenada afina la foto de tu nivel.',
};

export function buildSessionEndAdapterOutput(input: {
  planV2: CoachPlanV2;
  answers: PracticeAnswer[];
  activeSession: ActivePracticeSession;
  surfaceContext?: SessionEndAdapterSurfaceContext | null;
}): SessionEndAdapterOutput {
  const { planV2, answers, activeSession, surfaceContext } = input;

  const dominantState = resolveDominantState({
    learningDashboardV2: surfaceContext?.learningDashboardV2,
    pressureInsightsV2: surfaceContext?.pressureInsightsV2,
    weakCategories: surfaceContext?.weakCategories,
    recentSessions: surfaceContext?.recentSessions,
    profile: surfaceContext?.profile,
    streakDays: surfaceContext?.streakDays,
  });

  const incorrect = answers.reduce((acc, answer) => acc + (answer.isCorrect ? 0 : 1), 0);
  const correct = answers.length - incorrect;
  const contextConfig = surfaceContext?.activeLearningContext?.config;
  const supportsExamMode = contextConfig?.capabilities.supportsExamMode ?? true;

  const closingMessage: SessionEndAdapterOutput['closingMessage'] = (() => {
    switch (dominantState) {
      case 'recovery':
        return {
          title: 'Cierre de vuelta al habito',
          summary: 'El valor de hoy es haber roto el cero: la nota es secundaria.',
        };
      case 'backlog':
        return {
          title: 'Cierre con pendientes avanzados',
          summary: 'Cada repaso que cierras te deja margen para lo siguiente.',
        };
      case 'errors':
        return {
          title: 'Cierre con patron visible',
          summary: 'Ya sabes donde duele; el siguiente paso es corregir, no acumular tema.',
        };
      case 'pressure':
        return {
          title:
            contextConfig?.coachOverrides.sessionEndPressureTitle ??
            'Cierre de entrenamiento de examen',
          summary:
            contextConfig?.coachOverrides.sessionEndPressureSummary ??
            'Lo que importa es como respondes con el cronometro encendido.',
        };
      case 'growth':
        return {
          title: 'Cierre con margen real',
          summary: 'Tu base permite subir exigencia sin improvisar.',
        };
      case 'memory':
        return {
          title: 'Cierre de fijacion',
          summary: 'Hoy gano la claridad sobre el volumen.',
        };
      default:
        return {
          title: 'Sesion cerrada con intencion',
          summary: 'Senal util para calibrar sin obsesionarte con el porcentaje.',
        };
    }
  })();

  const nextStep: SessionEndAdapterOutput['nextStep'] = (() => {
    if (activeSession.mode === 'simulacro' && supportsExamMode) {
      return {
        cta: 'Volver al panel',
        description: 'Una sola jugada: elige el siguiente bloque con la cabeza fria.',
      };
    }
    if (dominantState === 'pressure') {
      return {
        cta:
          contextConfig?.coachOverrides.sessionEndPressureCta ?? 'Otro entrenamiento examen',
        description: supportsExamMode
          ? 'Misma intencion, cronometro encendido.'
          : 'Misma intencion, lectura precisa y foco sostenido.',
      };
    }
    if (dominantState === 'errors') {
      return {
        cta: 'Repetir sobre el patron',
        description: 'Antes de tema nuevo: una vuelta corta a lo que fallo.',
      };
    }
    if (dominantState === 'recovery') {
      return {
        cta: 'Volver manana con una tanda corta',
        description: 'Sin heroismos: constancia minima que cuente.',
      };
    }
    if (dominantState === 'backlog') {
      return {
        cta: 'Seguir consolidando',
        description: 'Cierra lo pendiente; luego amplias mapa.',
      };
    }
    if (dominantState === 'growth') {
      return {
        cta: 'Subir exigencia controlada',
        description: 'Misma tecnica, un peldano mas de dificultad.',
      };
    }
    return {
      cta: 'Cerrar por hoy o seguir suave',
      description: 'Siguiente sesion con la correccion en mente.',
    };
  })();

  const progressSignal =
    answers.length > 0
      ? {
          label: 'Lectura del resultado',
          value: correct > incorrect ? 'Proceso solido' : incorrect > 0 ? 'Ajuste localizado' : 'Ok',
        }
      : undefined;

  const avgFirstMs =
    answers.length > 0
      ? answers.reduce(
          (sum, answer) => sum + (answer.timeToFirstSelectionMs ?? answer.responseTimeMs ?? 0),
          0,
        ) / answers.length
      : null;
  const hadChangedAnswerToCorrect = answers.some((answer) => answer.changedAnswer && answer.isCorrect);

  const microRewards = buildSessionMicroRewards({
    dominantState,
    correct,
    incorrect,
    total: answers.length,
    mode: activeSession.mode,
    avgTimeToFirstMs:
      typeof avgFirstMs === 'number' && Number.isFinite(avgFirstMs) ? Math.round(avgFirstMs) : null,
    hadChangedAnswerToCorrect,
  });

  const baseContinuity = continuityBridgeByState[dominantState];
  const continuityBridge = appendTerritoryToContinuityBridge(
    baseContinuity,
    surfaceContext?.lawTerritoryContinuity ?? undefined,
  );

  return {
    dominantState,
    tone: planV2.tone,
    closingMessage,
    continuityBridge,
    microRewards,
    progressSignal,
    nextStep,
  };
}
