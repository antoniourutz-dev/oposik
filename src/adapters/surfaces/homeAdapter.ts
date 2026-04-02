import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type {
  PracticeCategoryRiskSummary,
  PracticeCoachPlan,
  PracticeLearningDashboardV2,
  PracticePressureInsightsV2,
  PracticeSessionSummary,
} from '../../practiceTypes';
import type { HomePausedSessionSnapshot } from '../../components/dashboard/types';
import { buildCoachTwoLineMessageV2 } from '../../domain/coachCopyV2';
import { resolveDominantState } from './dominantState';
import type { SurfaceDominantState, SurfaceTension } from './surfaceTypes';

export type HomeAdapterOutput = {
  dominantState: SurfaceDominantState;
  tone: CoachPlanV2['tone'];
  tension: SurfaceTension;
  hero: {
    eyebrow?: string;
    title: string;
    summary?: string;
    cta: string;
  };
  pausedSessionCard?: {
    remainingQuestions: number;
    progress: number;
    cta: string;
  };
  secondaryOption?: {
    mode: 'simulacro' | 'weak' | 'random' | 'mistakes';
    title: string;
    summary: string;
    cta: string;
  };
  statsJustification?: {
    label: string;
    value?: string;
  };
};

const tensionByState: Record<SurfaceDominantState, SurfaceTension> = {
  backlog: 'medium',
  errors: 'medium',
  pressure: 'high',
  recovery: 'low',
  memory: 'low',
  growth: 'medium',
  gray_zone: 'low',
};

const primaryCtaByState: Record<SurfaceDominantState, string> = {
  backlog: 'Empezar sesión',
  errors: 'Corregir ahora',
  pressure: 'Hacer simulacro',
  recovery: 'Empieza suave',
  memory: 'Empezar',
  growth: 'Subir nivel',
  gray_zone: 'Empezar',
};

export function buildHomeAdapterOutput(input: {
  planV2: CoachPlanV2;
  coachPlan: PracticeCoachPlan; // compat UI / fallback
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  recentSessions?: PracticeSessionSummary[] | null;
  homePausedSession?: HomePausedSessionSnapshot | null;
  streakDays: number;
  weakCategories?: PracticeCategoryRiskSummary[] | null;
}): HomeAdapterOutput {
  const {
    planV2,
    coachPlan: _coachPlan,
    learningDashboardV2,
    pressureInsightsV2,
    homePausedSession,
    streakDays,
    weakCategories,
  } = input;

  const dominantState = resolveDominantState({
    learningDashboardV2,
    pressureInsightsV2,
    weakCategories,
    streakDays,
  });

  const heroMessage = buildCoachTwoLineMessageV2({
    planV2,
    dominantState,
  });

  const tension = tensionByState[dominantState];
  const heroCta = primaryCtaByState[dominantState];

  const hasPausedSession =
    homePausedSession != null &&
    homePausedSession.totalQuestions > 0 &&
    homePausedSession.currentQuestionIndex < homePausedSession.totalQuestions;

  const remainingQuestions = hasPausedSession
    ? Math.max(0, homePausedSession.totalQuestions - homePausedSession.currentQuestionIndex)
    : 0;

  const progress =
    hasPausedSession && homePausedSession!.totalQuestions > 0
      ? Math.round((homePausedSession!.currentQuestionIndex / homePausedSession!.totalQuestions) * 100)
      : 0;

  const pausedSessionCard = hasPausedSession
    ? {
        remainingQuestions,
        progress,
        cta: 'Continuar sesión',
      }
    : undefined;

  // Una sola alternativa en Home (sin grid de modos).
  const secondaryOption: HomeAdapterOutput['secondaryOption'] =
    dominantState === 'pressure'
      ? {
          mode: 'mistakes',
          title: 'Falladas',
          summary: 'Si hoy no es día de presión, limpia errores rápido.',
          cta: 'Repasar falladas',
        }
      : dominantState === 'errors'
        ? {
            mode: 'random',
            title: 'Aleatoria',
            summary: 'Si te saturas, genera señal con variedad.',
            cta: 'Hacer una sesión',
          }
        : dominantState === 'backlog'
          ? {
              mode: 'mistakes',
              title: 'Falladas',
              summary: 'Alternativa corta para consolidar.',
              cta: 'Repasar falladas',
            }
          : dominantState === 'growth'
            ? {
                mode: 'simulacro',
                title: 'Simulacro',
                summary: 'Si te ves fuerte, prueba presión real.',
                cta: 'Entrenar examen',
              }
            : {
                mode: 'random',
                title: 'Aleatoria',
                summary: 'Sesión sencilla para mantener ritmo.',
                cta: 'Empezar',
              };

  // Justificación compacta (sin métricas técnicas): útil para “por qué” sin saturar.
  const statsJustification =
    dominantState === 'backlog'
      ? { label: 'Señal', value: 'repasos vencidos' }
      : dominantState === 'pressure'
        ? { label: 'Señal', value: 'bajo presión' }
        : dominantState === 'errors'
          ? { label: 'Señal', value: 'errores repetidos' }
          : dominantState === 'recovery'
            ? { label: 'Señal', value: 'constancia' }
            : dominantState === 'growth'
              ? { label: 'Señal', value: 'base sólida' }
              : undefined;

  return {
    dominantState,
    tone: planV2.tone,
    tension,
    hero: {
      eyebrow: 'Hoy toca esto',
      title: heroMessage.line1,
      summary: heroMessage.line2,
      cta: heroCta,
    },
    pausedSessionCard,
    secondaryOption,
    statsJustification,
  };
}

