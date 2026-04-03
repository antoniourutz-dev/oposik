import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type { ActiveLearningContext } from '../../domain/learningContext/types';
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
  backlog: 'Empezar sesion',
  errors: 'Corregir ahora',
  pressure: 'Hacer simulacro',
  recovery: 'Empieza suave',
  memory: 'Empezar',
  growth: 'Subir nivel',
  gray_zone: 'Empezar',
};

export function buildHomeAdapterOutput(input: {
  planV2: CoachPlanV2;
  coachPlan: PracticeCoachPlan;
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  recentSessions?: PracticeSessionSummary[] | null;
  homePausedSession?: HomePausedSessionSnapshot | null;
  streakDays: number;
  weakCategories?: PracticeCategoryRiskSummary[] | null;
  activeLearningContext?: ActiveLearningContext | null;
}): HomeAdapterOutput {
  const {
    planV2,
    coachPlan: _coachPlan,
    learningDashboardV2,
    pressureInsightsV2,
    homePausedSession,
    streakDays,
    weakCategories,
    activeLearningContext,
  } = input;

  const dominantState = resolveDominantState({
    learningDashboardV2,
    pressureInsightsV2,
    weakCategories,
    streakDays,
  });

  const contextConfig = activeLearningContext?.config;
  const supportsExamMode = contextConfig?.capabilities.supportsExamMode ?? true;
  const supportsPressureTraining =
    contextConfig?.capabilities.supportsPressureTraining ?? true;

  const heroMessage = buildCoachTwoLineMessageV2({
    planV2,
    dominantState,
  });

  const tension = tensionByState[dominantState];
  const heroCta =
    dominantState === 'pressure' && !supportsPressureTraining
      ? contextConfig?.coachOverrides.pressurePrimaryCta ?? 'Practicar bloque'
      : primaryCtaByState[dominantState];

  const hasPausedSession =
    homePausedSession != null &&
    homePausedSession.totalQuestions > 0 &&
    homePausedSession.currentQuestionIndex < homePausedSession.totalQuestions;

  const remainingQuestions = hasPausedSession
    ? Math.max(0, homePausedSession.totalQuestions - homePausedSession.currentQuestionIndex)
    : 0;

  const progress =
    hasPausedSession && homePausedSession.totalQuestions > 0
      ? Math.round((homePausedSession.currentQuestionIndex / homePausedSession.totalQuestions) * 100)
      : 0;

  const pausedSessionCard = hasPausedSession
    ? {
        remainingQuestions,
        progress,
        cta: 'Continuar sesion',
      }
    : undefined;

  const secondaryOption: HomeAdapterOutput['secondaryOption'] =
    dominantState === 'pressure'
      ? {
          mode: 'mistakes',
          title:
            supportsPressureTraining
              ? 'Falladas'
              : contextConfig?.coachOverrides.pressureSecondaryTitle ?? 'Bloque aleatorio',
          summary:
            supportsPressureTraining
              ? 'Si hoy no toca presion, limpia errores rapido.'
              : contextConfig?.coachOverrides.pressureSecondarySummary ??
                'Si no toca intensidad, vuelve a la ley con una tanda limpia.',
          cta:
            supportsPressureTraining
              ? 'Repasar falladas'
              : contextConfig?.coachOverrides.pressureSecondaryCta ?? 'Practicar ahora',
        }
      : dominantState === 'errors'
        ? {
            mode: 'random',
            title: 'Aleatoria',
            summary: 'Si te saturas, genera senal con variedad.',
            cta: 'Hacer una sesion',
          }
        : dominantState === 'backlog'
          ? {
              mode: 'mistakes',
              title: 'Falladas',
              summary: 'Alternativa corta para consolidar.',
              cta: 'Repasar falladas',
            }
          : dominantState === 'growth'
            ? supportsExamMode
              ? {
                  mode: 'simulacro',
                  title: 'Simulacro',
                  summary: 'Si te ves fuerte, prueba presion real.',
                  cta: 'Entrenar examen',
                }
              : {
                  mode: 'random',
                  title: 'Bloque aleatorio',
                  summary: 'Si la base responde, mete variedad sin perder foco.',
                  cta: 'Practicar bloque',
                }
            : {
                mode: 'random',
                title: 'Aleatoria',
                summary: 'Sesion sencilla para mantener ritmo.',
                cta: 'Empezar',
              };

  const statsJustification =
    dominantState === 'backlog'
      ? { label: 'Senal', value: 'repasos vencidos' }
      : dominantState === 'pressure'
        ? {
            label: 'Senal',
            value: supportsPressureTraining ? 'bajo presion' : 'lectura acelerada',
          }
        : dominantState === 'errors'
          ? { label: 'Senal', value: 'errores repetidos' }
          : dominantState === 'recovery'
            ? { label: 'Senal', value: 'constancia' }
            : dominantState === 'growth'
              ? { label: 'Senal', value: 'base solida' }
              : undefined;

  return {
    dominantState,
    tone: planV2.tone,
    tension,
    hero: {
      eyebrow: contextConfig?.copyDictionary.homeHeroEyebrow ?? 'Hoy toca esto',
      title: heroMessage.line1,
      summary: heroMessage.line2,
      cta: heroCta,
    },
    pausedSessionCard,
    secondaryOption,
    statsJustification,
  };
}
