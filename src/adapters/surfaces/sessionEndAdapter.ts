import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type {
  ActivePracticeSession,
  PracticeAnswer,
  PracticeCategoryRiskSummary,
  PracticeLearningDashboardV2,
  PracticePressureInsightsV2,
  PracticeProfile,
  PracticeSessionSummary,
} from '../../practiceTypes';
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
  /** Puente emocional hacia la próxima apertura (Home). */
  continuityBridge: string;
  /** Señales de proceso sobrias (máx. 2 en builder). */
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
};

const continuityBridgeByState: Record<SurfaceDominantState, string> = {
  recovery:
    'Ayer reactivaste el ritmo; hoy una tanda corta fija el hilo sin exigirte un maratón.',
  backlog:
    'Ayer moviste deuda; hoy conviene seguir por lo pendiente antes de abrir mapa nuevo.',
  errors:
    'Ayer aislamos patrón; hoy repetición corta sobre fallos vale más que tema nuevo.',
  pressure:
    'Ayer entrenaste transferencia; hoy puedes repetir exposición con el mismo foco.',
  growth:
    'Ayer subiste listón con control; hoy mantén exigencia sin saltar pasos.',
  memory:
    'Ayer priorizaste fijar; hoy refuerza lo mismo antes de sumar volumen.',
  gray_zone:
    'Ayer generaste señal; hoy una sesión ordenada afina la foto de tu nivel.',
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

  const incorrect = answers.reduce((acc, a) => acc + (a.isCorrect ? 0 : 1), 0);
  const correct = answers.length - incorrect;

  const closingMessage: SessionEndAdapterOutput['closingMessage'] = (() => {
    switch (dominantState) {
      case 'recovery':
        return {
          title: 'Cierre de vuelta al hábito',
          summary: 'El valor de hoy es haber roto el cero: la nota es secundaria.',
        };
      case 'backlog':
        return {
          title: 'Cierre con deuda movida',
          summary: 'Cada repaso cerrado libera cabeza para lo siguiente.',
        };
      case 'errors':
        return {
          title: 'Cierre con patrón visible',
          summary: 'Ya sabes dónde duele; el siguiente paso es corregir, no acumular tema.',
        };
      case 'pressure':
        return {
          title: 'Cierre de entrenamiento de examen',
          summary: 'Lo que importa es cómo respondes con el cronómetro encendido.',
        };
      case 'growth':
        return {
          title: 'Cierre con margen real',
          summary: 'Tu base permite subir exigencia sin improvisar.',
        };
      case 'memory':
        return {
          title: 'Cierre de fijación',
          summary: 'Hoy ganó la claridad sobre el volumen.',
        };
      default:
        return {
          title: 'Sesión cerrada con intención',
          summary: 'Señal útil para calibrar sin obsesionarte con el porcentaje.',
        };
    }
  })();

  const nextStep: SessionEndAdapterOutput['nextStep'] = (() => {
    if (activeSession.mode === 'simulacro') {
      return {
        cta: 'Volver al panel',
        description: 'Una sola jugada: elige el siguiente bloque con la cabeza fría.',
      };
    }
    if (dominantState === 'pressure')
      return {
        cta: 'Otro entrenamiento examen',
        description: 'Misma intención, cronómetro encendido.',
      };
    if (dominantState === 'errors')
      return {
        cta: 'Repetir sobre el patrón',
        description: 'Antes de tema nuevo: una vuelta corta a lo que falló.',
      };
    if (dominantState === 'recovery')
      return {
        cta: 'Volver mañana con una tanda corta',
        description: 'Sin heroísmos: constancia mínima que cuente.',
      };
    if (dominantState === 'backlog')
      return {
        cta: 'Seguir consolidando',
        description: 'Cierra lo pendiente; luego amplías mapa.',
      };
    if (dominantState === 'growth')
      return {
        cta: 'Subir exigencia controlada',
        description: 'Misma técnica, un peldaño más de dificultad.',
      };
    return {
      cta: 'Cerrar por hoy o seguir suave',
      description: 'Siguiente sesión con la corrección en mente.',
    };
  })();

  const progressSignal =
    answers.length > 0
      ? {
          label: 'Lectura del resultado',
          value: correct > incorrect ? 'Proceso sólido' : incorrect > 0 ? 'Ajuste localizado' : 'Ok',
        }
      : undefined;

  const avgFirstMs =
    answers.length > 0
      ? answers.reduce((s, a) => s + (a.timeToFirstSelectionMs ?? a.responseTimeMs ?? 0), 0) / answers.length
      : null;
  const hadChangedAnswerToCorrect = answers.some((a) => a.changedAnswer && a.isCorrect);

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

  return {
    dominantState,
    tone: planV2.tone,
    closingMessage,
    continuityBridge: continuityBridgeByState[dominantState],
    microRewards,
    progressSignal,
    nextStep,
  };
}

